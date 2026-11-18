#!/usr/bin/env node
// Local launcher for a directory of existing Floorplan maps.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { withPolicy } from '../assets/page-safety.mjs';
import { readJsonFile } from './lib/common.mjs';
import { pickFolder } from './lib/folder-picker.mjs';
import { openFile } from './lib/open-file.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(process.argv[2] || '.');
const outIndex = process.argv.indexOf('--out');
const outDir = path.resolve(outIndex >= 0 ? process.argv[outIndex + 1] : path.join(root, '.floorplan-directory'));
const portArg = process.argv.indexOf('--port');
const wantedPort = Number(portArg >= 0 ? process.argv[portArg + 1] : 4378) || 4378;
const settingFile = path.join(outDir, 'settings.json');
const stateFile = path.join(outDir, 'server.json');
const token = crypto.randomBytes(24).toString('hex');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const alive = pid => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
const workspaceId = folder => `ws-${crypto.createHash('sha1').update(path.resolve(folder)).digest('hex').slice(0, 12)}`;
function loadSettings() {
  let stored; try { stored = readJsonFile(settingFile); } catch { stored = { root }; }
  let workspaces = Array.isArray(stored.workspaces) ? stored.workspaces : [];
  if (!workspaces.length && stored.root) workspaces = [{ id: workspaceId(stored.root), name: path.basename(path.resolve(stored.root)) || path.resolve(stored.root), root: path.resolve(stored.root) }];
  workspaces = workspaces.filter(w => typeof w.root === 'string').map(w => ({ id: workspaceId(w.root), name: String(w.name || path.basename(path.resolve(w.root)) || path.resolve(w.root)), root: path.resolve(w.root) }));
  const activeWorkspaceId = workspaces.some(w => w.id === stored.activeWorkspaceId) ? stored.activeWorkspaceId : workspaces[0]?.id;
  return { workspaces, activeWorkspaceId, updatedAt: stored.updatedAt || new Date().toISOString() };
}
let settings = loadSettings();
function activeWorkspace() { return settings.workspaces.find(w => w.id === settings.activeWorkspaceId) || settings.workspaces[0]; }
function persistSettings(next = settings) {
  settings = { ...next, updatedAt: new Date().toISOString() };
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(settingFile, JSON.stringify(settings, null, 2) + '\n');
}

function refreshRegistry(nextRoot = activeWorkspace()?.root || root) {
  const resolved = path.resolve(nextRoot);
  if (!fs.statSync(resolved).isDirectory()) throw new Error('The selected path is not a folder.');
  const buildScript = path.join(here, 'directory.mjs');
  const result = JSON.parse(execFileSync(process.execPath, [buildScript, resolved, '--out', outDir, '--json'], { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 }));
  if (!result.ok) throw new Error(result.error || 'Could not scan this folder.');
  return JSON.parse(fs.readFileSync(path.join(outDir, 'directory.json'), 'utf8'));
}
if (!settings.workspaces.length) settings.workspaces.push({ id: workspaceId(root), name: path.basename(root) || root, root });
if (!settings.activeWorkspaceId) settings.activeWorkspaceId = settings.workspaces[0].id;
persistSettings();
let directory = refreshRegistry(activeWorkspace().root);
function maps() {
  directory = JSON.parse(fs.readFileSync(path.join(outDir, 'directory.json'), 'utf8'));
  return directory.maps.flatMap(m => {
    if (!/^map-[a-f0-9]{12}$/.test(m.id)) return [];
    const dir = path.resolve(activeWorkspace().root, m.mapDir);
    if (!dir.startsWith(path.resolve(activeWorkspace().root) + path.sep) || !fs.existsSync(path.join(dir, 'index.html')) || !fs.existsSync(path.join(dir, 'serve.mjs'))) return [];
    let server = null;
    try { server = readJsonFile(path.join(dir, '.cache', 'server.json')); } catch {}
    if (!server?.pid || !alive(server.pid) || !/^http:\/\/127\.0\.0\.1:\d+$/.test(server.url || '')) server = null;
    return [{ ...m, dir, running: !!server, server }];
  });
}
const view = () => { const active = activeWorkspace(); return { root: active.root, rootName: active.name, workspaceId: active.id, settingsPath: settingFile, workspaces: settings.workspaces.map(w => ({ ...w, active: w.id === active.id })), maps: maps().map(m => ({ id:m.id,name:m.name,projectPath:m.projectPath,generatedAt:m.generatedAt,files:m.files,nodes:m.nodes,running:m.running })) }; };
async function startMap(id) {
  const m = maps().find(x => x.id === id); if (!m) return { ok:false,error:'Unknown map.' };
  if (m.running) return { ok:true,running:true };
  spawn(process.execPath,[path.join(m.dir,'serve.mjs'),'--no-open'],{cwd:path.dirname(m.dir),detached:true,stdio:'ignore',windowsHide:true}).unref();
  for(let i=0;i<40;i++){await sleep(200);if(maps().find(x=>x.id===id)?.running)return {ok:true,running:true}}
  return {ok:false,error:'Map server did not start. Check the project’s .cache/server.log.'};
}
function stopMap(id) {
  const m=maps().find(x=>x.id===id);if(!m)return{ok:false,error:'Unknown map.'};if(!m.server)return{ok:true,running:false};
  try{process.kill(m.server.pid);return{ok:true,running:false}}catch{return{ok:false,error:'Could not stop map server.'}}
}
function safeRequest(req,res) {
  const origin=req.headers.origin;
  if(origin && origin!==`http://127.0.0.1:${port}` && origin!==`http://localhost:${port}`) {res.writeHead(403);res.end();return false}
  if(req.headers['x-floorplan-token']!==token){res.writeHead(403,{'Content-Type':'application/json'});res.end('{"error":"forbidden"}');return false}
  return true;
}
function json(res,data,status=200){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data))}
function body(req){return new Promise((resolve,reject)=>{let raw='';req.on('data',c=>{raw+=c;if(raw.length>4000){reject(new Error('Request too large'));req.destroy()}});req.on('end',()=>{try{resolve(JSON.parse(raw||'{}'))}catch{reject(new Error('Invalid JSON'))}})})}
function proxy(req,res,m,pathname) {
  const target=new URL(m.server.url);const upstreamPath=pathname.replace(`/map/${m.id}`,'')||'/';
  const headers={...req.headers,host:target.host,origin:target.origin};delete headers['x-forwarded-for'];
  const upstream=http.request({hostname:target.hostname,port:target.port,path:upstreamPath+new URL(req.url,'http://localhost').search,method:req.method,headers},response=>{
    const outHeaders={...response.headers};delete outHeaders['content-security-policy'];delete outHeaders['content-length'];
    const type=String(outHeaders['content-type']||'');
    if(type.includes('text/html')){let data='';response.setEncoding('utf8');response.on('data',c=>data+=c);response.on('end',()=>{data=data.replaceAll('/api/','/map/'+m.id+'/api/').replace('</head>','<script>window.FLOORPLAN_LAUNCHER=true;</script></head>');data=withPolicy(data,'local');res.writeHead(response.statusCode||200,outHeaders);res.end(data)})}
    else{res.writeHead(response.statusCode||200,outHeaders);response.pipe(res)}
  });upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502);res.end('Map server unavailable')});req.pipe(upstream);
}
const logo=fs.readFileSync(path.join(here,'..','assets','logo.png')).toString('base64');
const template=fs.readFileSync(path.join(here,'..','assets','directory.html'),'utf8').replaceAll('__FLOORPLAN_LOGO__',`data:image/png;base64,${logo}`);
const server=http.createServer(async(req,res)=>{
  let url;try{url=new URL(req.url,'http://127.0.0.1')}catch{res.writeHead(400);return res.end()}
  if(url.pathname.startsWith('/api/')){
    if(!safeRequest(req,res))return;
    if(req.method==='GET'&&url.pathname==='/api/directory')return json(res,view());
    if(req.method==='POST'&&url.pathname==='/api/settings'){
      try{const b=await body(req);const current=activeWorkspace();if(!current)throw new Error('No active workspace.');if(typeof b.root!=='string'||!b.root.trim())throw new Error('Choose a folder path first.');const resolved=path.resolve(b.root.trim());directory=refreshRegistry(resolved);const updated={id:workspaceId(resolved),root:resolved,name:String(b.name||path.basename(resolved)||resolved).trim().slice(0,120)||path.basename(resolved)||resolved};const workspaces=settings.workspaces.filter(w=>w.id!==current.id&&w.id!==updated.id);workspaces.push(updated);persistSettings({...settings,workspaces,activeWorkspaceId:updated.id});return json(res,{ok:true,...view()})}catch(e){return json(res,{error:e.message},400)}
    }
    if(req.method==='POST'&&url.pathname==='/api/workspaces'){
      try{const b=await body(req);if(b.action==='select'){const workspace=settings.workspaces.find(w=>w.id===b.id);if(!workspace)throw new Error('Unknown workspace.');directory=refreshRegistry(workspace.root);persistSettings({...settings,activeWorkspaceId:workspace.id});return json(res,{ok:true,...view()})}if(b.action==='add'){if(typeof b.root!=='string'||!b.root.trim())throw new Error('Choose a folder path first.');const resolved=path.resolve(b.root.trim());directory=refreshRegistry(resolved);const id=workspaceId(resolved);const existing=settings.workspaces.find(w=>w.id===id);const workspace={id,root:resolved,name:String(b.name||path.basename(resolved)||resolved).trim().slice(0,120)||path.basename(resolved)||resolved};const workspaces=existing?settings.workspaces.map(w=>w.id===id?workspace:w):[...settings.workspaces,workspace];persistSettings({...settings,workspaces,activeWorkspaceId:id});return json(res,{ok:true,...view()})}if(b.action==='remove'){const workspace=settings.workspaces.find(w=>w.id===b.id);if(!workspace)throw new Error('Unknown workspace.');if(settings.workspaces.length<=1)throw new Error('The last workspace cannot be removed.');const workspaces=settings.workspaces.filter(w=>w.id!==workspace.id);const activeWorkspaceId=workspace.id===settings.activeWorkspaceId?workspaces[0].id:settings.activeWorkspaceId;if(activeWorkspaceId!==settings.activeWorkspaceId)directory=refreshRegistry(workspaces.find(w=>w.id===activeWorkspaceId).root);persistSettings({...settings,workspaces,activeWorkspaceId});return json(res,{ok:true,removedWorkspace:workspace,...view()})}throw new Error('Unknown workspace action.')}catch(e){return json(res,{error:e.message},400)}
    }
    if(req.method==='POST'&&url.pathname==='/api/browse'){
      try{return json(res,pickFolder())}catch(e){return json(res,{error:e.message},501)}
    }
    if(req.method==='POST'&&url.pathname==='/api/open-settings'){
      try{await openFile(settingFile);return json(res,{ok:true,path:settingFile})}catch(e){return json(res,{error:`Could not open the workspace settings file: ${e.message}`},500)}
    }
    if(req.method==='POST'&&url.pathname==='/api/maps'){
      try{const b=await body(req);const result=b.action==='start'?await startMap(b.id):b.action==='stop'?stopMap(b.id):{ok:false,error:'Unknown action.'};return json(res,result,result.ok?200:400)}catch(e){return json(res,{error:e.message},400)}
    }
    const match=url.pathname.match(/^\/api\/proxy\/(map-[a-f0-9]{12})(\/.*)?$/);
    if(match){const m=maps().find(x=>x.id===match[1]);if(!m?.running){res.writeHead(503);return res.end()}return proxy(req,res,m,`/map/${m.id}${match[2]||'/'}`)}
    res.writeHead(404);return res.end();
  }
  const match=url.pathname.match(/^\/map\/(map-[a-f0-9]{12})(\/.*)?$/);
  if(match){const m=maps().find(x=>x.id===match[1]);if(!m){res.writeHead(404);return res.end('Map not found')}
    if(match[2]?.startsWith('/api/'))return proxy(req,res,m,`/map/${m.id}${match[2]}`);
    if(match[2]?.startsWith('/static')){const file=path.join(m.dir,'index.html');res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});return fs.createReadStream(file).pipe(res)}
    if(m.running)return proxy(req,res,m,`/map/${m.id}${match[2]||'/'}`);
    const file=path.join(m.dir,'index.html');res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});return fs.createReadStream(file).pipe(res);
  }
  if(url.pathname==='/'||url.pathname==='/index.html'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});return res.end(template.replace('</head>',`<script>window.DIRECTORY_TOKEN=${JSON.stringify(token)};</script></head>`))}
  res.writeHead(404);res.end();
});
let port=wantedPort;server.on('error',e=>{if(e.code==='EADDRINUSE'&&port<wantedPort+20){port++;server.listen(port,'127.0.0.1')}else{console.error(e.message);process.exit(1)}});server.listen(port,'127.0.0.1');
server.on('listening',()=>{const url=`http://127.0.0.1:${port}`;fs.writeFileSync(stateFile,JSON.stringify({pid:process.pid,port,url,startedAt:new Date().toISOString()},null,2));console.log(`Floorplan launcher: ${url}`);const forget=()=>{try{if(JSON.parse(fs.readFileSync(stateFile,'utf8')).pid===process.pid)fs.unlinkSync(stateFile)}catch{}};process.on('exit',forget);for(const sig of ['SIGINT','SIGTERM','SIGHUP'])process.on(sig,()=>process.exit(0))});
