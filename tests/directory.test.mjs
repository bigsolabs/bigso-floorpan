import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { spawn } from 'node:child_process';
import http from 'node:http';
import { EventEmitter } from 'node:events';
import { REPO, cleanup, makeProject, readJson, writeJson } from './helpers.mjs';
import { createFolderPicker } from '../skills/floorplan/scripts/lib/folder-picker.mjs';
import { openFile } from '../skills/floorplan/scripts/lib/open-file.mjs';

const script = path.join(REPO, 'skills', 'floorplan', 'scripts', 'directory.mjs');
const map = (root, project, name, { files = 4, nodes = 2 } = {}) => {
  const dir = path.join(root, project, 'floorplan');
  writeJson(path.join(dir, 'graph.json'), {
    project: { name }, meta: { generatedAt: '2026-11-13T12:00:00.000Z', counts: { files } }, nodes: Array.from({ length: nodes }, () => ({})),
  });
  fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><title>map</title>');
  fs.writeFileSync(path.join(dir, 'serve.mjs'), `
    import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
    const dir=path.dirname(new URL(import.meta.url).pathname); const server=http.createServer((q,s)=>{if(q.url==='/api/status'){s.writeHead(200,{'content-type':'application/json'});return s.end('{"ok":true}')}s.writeHead(200,{'content-type':'text/html'});s.end('<!doctype html><html><head></head><body><script>fetch("/api/status")</script></body></html>')});
    server.listen(0,'127.0.0.1',()=>{const a=server.address();fs.mkdirSync(path.join(dir,'.cache'),{recursive:true});fs.writeFileSync(path.join(dir,'.cache/server.json'),JSON.stringify({pid:process.pid,url:'http://127.0.0.1:'+a.port,port:a.port,token:'test'}))});
  `);
};
const run = (root, ...args) => JSON.parse(execFileSync(process.execPath, [script, root, ...args, '--json'], { encoding: 'utf8' }));

test('directory finds valid maps, ignores map-like folders, and writes relative links', () => {
  const root = makeProject({});
  try {
    map(root, 'clients/alpha', 'Alpha');
    map(root, 'clients/beta/service', 'Beta service', { files: 9, nodes: 3 });
    fs.mkdirSync(path.join(root, 'clients', 'not-a-map', 'floorplan'), { recursive: true });
    map(root, 'node_modules/not-listed', 'Dependency map');
    map(root, '.hidden/not-listed', 'Hidden map');

    const result = run(root);
    assert.equal(result.ok, true);
    assert.equal(result.maps, 2);
    const output = path.join(root, '.floorplan-directory');
    const index = readJson(path.join(output, 'directory.json'));
    assert.deepEqual(index.maps.map((item) => item.projectPath), ['clients/alpha', 'clients/beta/service']);
    assert.equal(index.maps[0].href, '../clients/alpha/floorplan/index.html');
    assert.match(fs.readFileSync(path.join(output, 'index.html'), 'utf8'), /Alpha/);
    assert.equal(fs.readFileSync(path.join(output, '.gitignore'), 'utf8'), '# Floorplan directory is generated locally.\n*\n');
  } finally { cleanup(root); }
});

test('directory honors a custom output path and does not touch maps', () => {
  const root = makeProject({});
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'floorplan-directory-output-'));
  try {
    map(root, 'app', 'App');
    const before = fs.readFileSync(path.join(root, 'app', 'floorplan', 'graph.json'), 'utf8');
    const result = run(root, '--out', output);
    assert.equal(result.output, output.replace(/\\/g, '/'));
    assert.equal(readJson(path.join(output, 'directory.json')).maps[0].href, path.relative(output, path.join(root, 'app', 'floorplan', 'index.html')).replace(/\\/g, '/'));
    assert.equal(fs.readFileSync(path.join(root, 'app', 'floorplan', 'graph.json'), 'utf8'), before);
  } finally { cleanup(root); fs.rmSync(output, { recursive: true, force: true }); }
});

test('directory launch without a path reuses the nearest saved active workspace', () => {
  const sandbox = makeProject({});
  const workspace = path.join(sandbox, 'workspace');
  const commandDir = path.join(sandbox, 'repositories', 'floorplan-project');
  const output = path.join(sandbox, 'repositories', '.floorplan-directory');
  try {
    fs.mkdirSync(commandDir, { recursive: true });
    map(workspace, 'apps/active', 'Saved active workspace');
    writeJson(path.join(output, 'settings.json'), {
      activeWorkspaceId: 'ws-active',
      workspaces: [
        { id: 'ws-inactive', name: 'Inactive', root: sandbox },
        { id: 'ws-active', name: 'Active', root: workspace },
      ],
    });
    const result = JSON.parse(execFileSync(process.execPath, [script, '--build-only', '--json'], { cwd: commandDir, encoding: 'utf8' }));
    assert.equal(result.root, workspace);
    assert.equal(result.output, fs.realpathSync(output));
    assert.equal(result.maps, 1);
    assert.equal(readJson(path.join(output, 'directory.json')).maps[0].name, 'Saved active workspace');
  } finally { cleanup(sandbox); }
});

test('directory escapes map metadata before embedding it in the page', () => {
  const root = makeProject({});
  try {
    map(root, 'app', '<script>not-code</script>');
    run(root);
    const page = fs.readFileSync(path.join(root, '.floorplan-directory', 'index.html'), 'utf8');
    assert.doesNotMatch(page, /const DIRECTORY = .*<script>not-code<\/script>/);
    assert.match(page, /\\u003cscript\\u003enot-code\\u003c\/script\\u003e/);
  } finally { cleanup(root); }
});

test('native folder picker uses a fixed macOS command and treats cancellation as a no-op', () => {
  let command;
  const choose = createFolderPicker((...args) => { command = args; return ' /Users/test/Workspace/\n'; });
  assert.deepEqual(choose('darwin'), { cancelled: false, path: '/Users/test/Workspace' });
  assert.equal(command[0], 'osascript');
  assert.deepEqual(command[1], ['-e', 'POSIX path of (choose folder with prompt "Choose a Floorplan workspace")']);
  assert.equal(command[2].timeout, 120_000);
  assert.deepEqual(createFolderPicker(() => { throw new Error('execution error: User canceled. (-128)'); })('darwin'), { cancelled: true });
  assert.throws(() => choose('linux'), /currently available on macOS/);
});

test('opens the fixed workspace settings file with the platform file opener', async () => {
  const calls = [];
  await openFile('/tmp/floorplan/settings.json', 'darwin', (command, args, options) => {
    calls.push({ command, args, options });
    const child = new EventEmitter();
    child.unref = () => { child.detached = true; };
    queueMicrotask(() => child.emit('spawn'));
    return child;
  });
  assert.deepEqual(calls, [{
    command: 'open', args: ['/tmp/floorplan/settings.json'],
    options: { detached: true, stdio: 'ignore', windowsHide: true },
  }]);
  await openFile('C:\\Floorplan\\settings.json', 'win32', (command, args) => {
    assert.equal(command, 'explorer.exe');
    assert.deepEqual(args, ['C:\\Floorplan\\settings.json']);
    const child = new EventEmitter();
    child.unref = () => {};
    queueMicrotask(() => child.emit('spawn'));
    return child;
  });
});

test('launcher root, settings, static routes, map proxy, and server controls work together', async () => {
  const root = makeProject({});
  const other = makeProject({});
  const third = makeProject({});
  const serverFile = path.join(REPO, 'skills', 'floorplan', 'scripts', 'directory-server.mjs');
  const out = path.join(root, '.floorplan-directory');
  const portProbe = http.createServer();
  await new Promise(resolve => portProbe.listen(0, '127.0.0.1', resolve));
  const port = portProbe.address().port;
  await new Promise(resolve => portProbe.close(resolve));
  let child;
  try {
    map(root, 'apps/alpha', 'Alpha');
    map(other, 'services/beta', 'Beta');
    writeJson(path.join(out,'settings.json'),{root,updatedAt:'2026-01-01T00:00:00.000Z'});
    child = spawn(process.execPath, [serverFile, root, '--out', out, '--port', String(port)], { stdio: 'ignore' });
    let html, token;
    for (let i=0;i<50;i++) {
      try { const response=await fetch(`http://127.0.0.1:${port}/`);html=await response.text();token=/DIRECTORY_TOKEN="([^"]+)/.exec(html)?.[1];if(token)break; } catch {}
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    assert.ok(token, 'launcher starts and serves root');
    assert.match(html, /Project launcher/);
    assert.doesNotMatch(html, /window\.FLOORPLAN\s*=/);
    assert.match(html, /window\.floorplanTheme/);
    assert.match(html, /id="themeToggle"/);
    assert.match(html, /id="workspaceSelect"/);
    assert.match(html, /id="workspaceAdd"/);
    assert.match(html, /class="workspace-select-wrap"/);
    assert.match(html, /class="select-chevron"/);
    assert.match(html, /id="openSettingsFile"/);
    assert.match(html, /id="removeWorkspace"/);
    assert.match(html, /class="welcome loading-view" role="status"/);
    assert.match(html, /class="card skeleton-card"/);
    assert.match(html, /prefers-reduced-motion:reduce/);
    assert.doesNotMatch(html, /id="settingsSide"|id="configureInline"/);
    assert.doesNotMatch(html, /class="(?:tree-map-icon|folder-icon)"|◇|▰/);
    assert.match(html, /class="tree-folder"[^>]*aria-expanded=/);
    assert.match(html, /class="tree-children"/);
    assert.match(html, /id="browse"/);
    assert.match(html, /#close\{width:38px;height:38px/);
    assert.match(html, /data:image\/png;base64,/);
    const headers={'x-floorplan-token':token};
    let response=await fetch(`http://127.0.0.1:${port}/api/directory`,{headers});
    let data=await response.json();
    assert.equal(data.root,root);
    assert.equal(data.settingsPath,path.join(out,'settings.json'));
    assert.equal(data.workspaces.length,1);
    assert.equal(data.workspaces[0].root,root);
    assert.match(fs.readFileSync(path.join(out,'settings.json'),'utf8'),/"workspaces"/,'legacy single-root settings migrate on startup');
    assert.equal(data.maps.length,1);
    assert.equal((await fetch(`http://127.0.0.1:${port}/api/directory`)).status,403);
    const id=data.maps[0].id;
    response=await fetch(`http://127.0.0.1:${port}/map/${id}/static/`);
    assert.equal(response.status,200);
    assert.match(await response.text(),/<title>map<\/title>/);
    response=await fetch(`http://127.0.0.1:${port}/api/maps`,{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({action:'start',id})});
    assert.equal(response.status,200);
    data=await (await fetch(`http://127.0.0.1:${port}/api/directory`,{headers})).json();
    assert.equal(data.maps[0].running,true);
    response=await fetch(`http://127.0.0.1:${port}/map/${id}`);
    assert.match(await response.text(),new RegExp(`/map/${id}/api/status`));
    response=await fetch(`http://127.0.0.1:${port}/map/${id}/api/status`);
    assert.equal(response.status,200);
    response=await fetch(`http://127.0.0.1:${port}/api/maps`,{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({action:'stop',id})});
    assert.equal(response.status,200);
    response=await fetch(`http://127.0.0.1:${port}/api/settings`,{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({root:other})});
    assert.equal(response.status,200);
    data=await response.json();
    assert.equal(data.root,other);
    assert.equal(data.maps[0].name,'Beta');
    map(third,'tools/gamma','Gamma');
    response=await fetch(`http://127.0.0.1:${port}/api/workspaces`,{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({action:'add',root:third,name:'Tools'})});
    assert.equal(response.status,200);
    data=await response.json();
    assert.equal(data.root,third);
    assert.equal(data.workspaces.length,2);
    assert.equal(data.maps[0].name,'Gamma');
    response=await fetch(`http://127.0.0.1:${port}/api/workspaces`,{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({action:'add',root,name:'Original'})});
    assert.equal(response.status,200);
    data=await response.json();
    assert.equal(data.workspaces.length,3);
    response=await fetch(`http://127.0.0.1:${port}/api/workspaces`,{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({action:'select',id:data.workspaces.find(w=>w.root===root).id})});
    assert.equal(response.status,200);
    data=await response.json();
    assert.equal(data.root,root);
    assert.equal(data.maps[0].name,'Alpha');
    response=await fetch(`http://127.0.0.1:${port}/api/settings`,{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({root:path.join(other,'missing')})});
    assert.equal(response.status,400);
    let workspaces=data.workspaces;
    response=await fetch(`http://127.0.0.1:${port}/api/workspaces`,{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({action:'remove',id:workspaces.find(w=>w.root===other).id})});
    assert.equal(response.status,200,'removing an inactive workspace succeeds');
    data=await response.json();
    assert.equal(data.root,root,'inactive removal preserves the active workspace');
    assert.equal(data.workspaces.some(w=>w.root===other),false);
    assert.ok(fs.existsSync(path.join(other,'services','beta','floorplan','graph.json')),'removing a workspace does not delete its files');
    response=await fetch(`http://127.0.0.1:${port}/api/workspaces`,{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({action:'remove',id:data.workspaceId})});
    assert.equal(response.status,200,'removing the active workspace succeeds when another remains');
    data=await response.json();
    assert.equal(data.root,third,'active removal switches to and scans a remaining workspace');
    assert.ok(fs.existsSync(path.join(root,'apps','alpha','floorplan','graph.json')),'active removal leaves the workspace folder untouched');
    response=await fetch(`http://127.0.0.1:${port}/api/workspaces`,{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({action:'remove',id:data.workspaceId})});
    assert.equal(response.status,400,'the last workspace cannot be removed');
    data=await (await fetch(`http://127.0.0.1:${port}/api/directory`,{headers})).json();
    assert.equal(data.workspaces.length,1);
    assert.equal(data.root,third);
  } finally {
    if (child?.pid) child.kill('SIGTERM');
    cleanup(root);cleanup(other);cleanup(third);
  }
});
