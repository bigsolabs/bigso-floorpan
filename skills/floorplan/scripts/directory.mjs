#!/usr/bin/env node
// Discover existing Floorplan maps beneath a folder and write a small local directory for them.
// usage: node directory.mjs [root] [--out <directory>] [--max-depth 8] [--json]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseArgs, readJsonFile, toPosix } from './lib/common.mjs';

const args = parseArgs(process.argv.slice(2));
const activeRoot = (settingsPath) => {
  try {
    const settings = readJsonFile(settingsPath);
    const workspaces = Array.isArray(settings.workspaces) ? settings.workspaces : [];
    const active = workspaces.find((workspace) => workspace.id === settings.activeWorkspaceId) || workspaces[0];
    return typeof active?.root === 'string' ? path.resolve(active.root) : typeof settings.root === 'string' ? path.resolve(settings.root) : null;
  } catch { return null; }
};
function findWorkspaceConfig(start) {
  let folder = path.resolve(start);
  while (true) {
    const out = path.join(folder, '.floorplan-directory');
    const root = activeRoot(path.join(out, 'settings.json'));
    if (root) return { out, root };
    const parent = path.dirname(folder);
    if (parent === folder) return null;
    folder = parent;
  }
}
const positionalRoot = args._[0] ? path.resolve(args._[0]) : null;
const explicitOut = args.out ? path.resolve(args.out) : null;
const discovered = positionalRoot ? null : explicitOut
  ? { out: explicitOut, root: activeRoot(path.join(explicitOut, 'settings.json')) }
  : findWorkspaceConfig(process.cwd());
const root = positionalRoot || discovered?.root || path.resolve('.');
const outDir = explicitOut || discovered?.out || path.join(root, '.floorplan-directory');
if (args.stop) {
  let state; try { state = JSON.parse(fs.readFileSync(path.join(outDir, 'server.json'), 'utf8')); } catch {}
  let stopped = false;
  if (state?.pid) { try { process.kill(state.pid); stopped = true; } catch {} }
  console.log(stopped ? `Stopped the directory launcher (${state.url}).` : 'The directory launcher was not running.');
  process.exit(0);
}
const maxDepth = Number.isInteger(Number(args['max-depth'])) ? Math.max(0, Number(args['max-depth'])) : 8;
const MAX_GRAPH_BYTES = 5 * 1024 * 1024;
const SKIP = new Set([
  '.git', 'node_modules', '.pnpm-store', '.yarn', '__pycache__', '.venv', 'venv', 'site-packages',
  '.tox', '.mypy_cache', '.pytest_cache', '.ruff_cache', '.next', '.nuxt', '.svelte-kit', '.turbo',
  '.parcel-cache', '.gradle', '.idea', 'dist', 'build', 'out', 'target', 'coverage', 'vendor', 'bin', 'obj', 'env',
]);

const fail = (message) => {
  if (args.json) console.log(JSON.stringify({ schema: 'floorplan/directory-result@1', ok: false, error: message }, null, 2));
  else console.error(`✗ ${message}`);
  process.exit(1);
};
const safeJson = (value) => JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (c) => ({ '<': '\\u003c', '>': '\\u003e', '&': '\\u0026', '\u2028': '\\u2028', '\u2029': '\\u2029' }[c]));
const readMap = (mapDir) => {
  const graph = path.join(mapDir, 'graph.json');
  let stat;
  try { stat = fs.statSync(graph); } catch { return null; }
  if (!stat.isFile() || stat.size > MAX_GRAPH_BYTES) return null;
  try {
    const value = readJsonFile(graph);
    if (!value || typeof value !== 'object' || !value.project || typeof value.project.name !== 'string') return null;
    return value;
  } catch { return null; }
};

let rootStat;
try { rootStat = fs.statSync(root); } catch { fail(`Folder not found: ${root}`); }
if (!rootStat.isDirectory()) fail(`Not a folder: ${root}`);

const maps = [];
const walk = (dir, depth) => {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    if (entry.isSymbolicLink() || !entry.isDirectory()) continue;
    const child = path.join(dir, entry.name);
    if (entry.name === 'floorplan') {
      const graph = readMap(child);
      if (graph) {
        const project = path.dirname(child);
        const projectPath = toPosix(path.relative(root, project)) || '.';
        maps.push({
          id: 'map-' + crypto.createHash('sha1').update(projectPath).digest('hex').slice(0, 12),
          projectPath,
          mapDir: toPosix(path.relative(root, child)),
          href: toPosix(path.relative(outDir, path.join(child, 'index.html'))),
          name: graph.project.name.slice(0, 300),
          generatedAt: typeof graph.meta?.generatedAt === 'string' ? graph.meta.generatedAt : null,
          files: Number.isFinite(graph.meta?.counts?.files) ? graph.meta.counts.files : null,
          nodes: Array.isArray(graph.nodes) ? graph.nodes.length : null,
        });
      }
      continue;
    }
    if (depth >= maxDepth || entry.name.startsWith('.') || SKIP.has(entry.name)) continue;
    walk(child, depth + 1);
  }
};
walk(root, 0);
maps.sort((a, b) => a.projectPath.localeCompare(b.projectPath) || a.name.localeCompare(b.name));
const index = {
  schema: 'floorplan/directory@1',
  generatedAt: new Date().toISOString(),
  rootName: path.basename(root),
  maps,
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, '.gitignore'), '# Floorplan directory is generated locally.\n*\n');
fs.writeFileSync(path.join(outDir, 'directory.json'), JSON.stringify(index, null, 2) + '\n');
const here = path.dirname(fileURLToPath(import.meta.url));
const template = fs.readFileSync(path.join(here, '..', 'assets', 'directory.html'), 'utf8');
const logo = fs.readFileSync(path.join(here, '..', 'assets', 'logo.png')).toString('base64');
fs.writeFileSync(path.join(outDir, 'index.html'), template.replaceAll('__FLOORPLAN_LOGO__', `data:image/png;base64,${logo}`).replace('</body>', `<script>window.FLOORPLAN_DIRECTORY=${safeJson(index)};</script></body>`));

const result = { schema: 'floorplan/directory-result@1', ok: true, root: toPosix(root), output: toPosix(outDir), maps: maps.length };
if (args.json) console.log(JSON.stringify(result, null, 2));
else {
  console.log(`Floorplan directory: ${toPosix(path.relative(process.cwd(), path.join(outDir, 'index.html')) || 'index.html')}`);
  console.log(`${maps.length} ${maps.length === 1 ? 'map' : 'maps'} found under ${path.basename(root)}.`);
  if (!args['build-only']) {
    const stateFile = path.join(outDir, 'server.json');
    let state; try { state = JSON.parse(fs.readFileSync(stateFile, 'utf8')); } catch {}
    let running = false; try { if (state?.pid) { process.kill(state.pid, 0); running = true; } } catch {}
    if (!running) {
      fs.mkdirSync(outDir, { recursive: true });
      const log = fs.openSync(path.join(outDir, 'server.log'), 'a');
      const serverScript = path.join(path.dirname(fileURLToPath(import.meta.url)), 'directory-server.mjs');
      const pass = ['--out', outDir, ...(args.port ? ['--port', String(args.port)] : [])];
      spawn(process.execPath, [serverScript, root, ...pass], { detached: true, stdio: ['ignore', log, log], windowsHide: true }).unref();
      for (let i = 0; i < 40; i++) {
        await new Promise((resolve) => setTimeout(resolve, 150));
        try { state = JSON.parse(fs.readFileSync(stateFile, 'utf8')); if (state?.pid) { process.kill(state.pid, 0); running = true; break; } } catch {}
      }
    }
    if (running) {
      console.log(`Launcher: ${state.url}`);
      if (!args['no-open']) {
        const opener = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', state.url]] : process.platform === 'darwin' ? ['open', [state.url]] : ['xdg-open', [state.url]];
        try { spawn(opener[0], opener[1], { detached: true, stdio: 'ignore', windowsHide: true }).unref(); } catch {}
      }
    } else console.error(`✗ Launcher server did not start. Check ${path.join(outDir, 'server.log')}`);
  }
}
