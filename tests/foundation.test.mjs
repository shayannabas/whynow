import { describe, it, expect, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
const require=createRequire(import.meta.url);
const {defaultState,loadState,saveState,createWorkspace,getWorkspace,updateWorkspace}=require('../scripts/server/state.cjs');
const {esc,stableId}=require('../scripts/utils.cjs');
const {loadEnv}=require('../scripts/env.cjs');
const {createRouter}=require('../scripts/server/router.cjs');
const folders=[];
const fixture=()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'whynow-test-'));folders.push(dir);return path.join(dir,'state.json');};
afterEach(()=>{for(const dir of folders.splice(0))fs.rmSync(dir,{recursive:true,force:true});});
describe('durability and isolation',()=>{
  it('initializes empty state and preserves the live file if a save fails before rename',()=>{
    const file=fixture();const initial=loadState(file);
    const next=createWorkspace(initial,{name:'Workspace under test'});
    expect(()=>saveState(next,file,()=>{throw Error('Simulated interruption');})).toThrow('Simulated interruption');
    expect(loadState(file)).toEqual(initial);
    expect(fs.readdirSync(path.dirname(file)).some(f=>f.endsWith('.tmp'))).toBe(false);
    saveState(next,file);expect(loadState(file)).toEqual(next);
  });
  it('restores the last good backup after corruption',()=>{
    const file=fixture();const first=createWorkspace(defaultState(),{name:'First'});saveState(first,file);
    saveState(createWorkspace(first,{name:'Second'}),file);fs.writeFileSync(file,'{"broken":');
    expect(loadState(file)).toEqual(first);
    expect(JSON.parse(fs.readFileSync(file,'utf8'))).toEqual(first);
  });
  it('refuses to reset corrupt state without a valid backup',()=>{
    const file=fixture();fs.writeFileSync(file,'broken');expect(()=>loadState(file)).toThrow('refusing');expect(fs.readFileSync(file,'utf8')).toBe('broken');
  });
  it('copies workspace reads and limits updates to the selected workspace',()=>{
    const first=createWorkspace(defaultState(),{name:'First'});const a=first.activeWorkspaceId;
    const state=createWorkspace(first,{name:'Second'});const b=state.activeWorkspaceId;
    const read=getWorkspace(state,a);read.name='Changed';expect(getWorkspace(state,a).name).toBe('First');
    const next=updateWorkspace(state,a,w=>{w.name='Renamed';});
    expect(next.workspaces[b]).toEqual(state.workspaces[b]);expect(state.workspaces[a].name).toBe('First');
    expect(()=>getWorkspace(state,'__proto__')).toThrow();expect(()=>updateWorkspace(state,a,w=>{w.id=b;})).toThrow();
    expect(next.workspaces[a].sellerProfile.deliveryAllowed).toBe(false);
  });
});
it('escapes all HTML-sensitive characters and has deterministic IDs',()=>{
  expect(esc('<script>"&\'')).toBe('&lt;script&gt;&quot;&amp;&#39;');expect(stableId('same')).toBe(stableId('same'));
});
it('loads local configuration without overriding the environment',()=>{
  const file=fixture();fs.writeFileSync(file,'PORT=4000\nHOST="127.0.0.1"\n# ignored');const env={PORT:'5000'};loadEnv(file,env);expect(env).toEqual({PORT:'5000',HOST:'127.0.0.1'});
});
it('serves health, empty overview, local font, creation and switching across restart',async()=>{
  const file=fixture();let server;
  const start=async()=>{server=http.createServer(createRouter({stateFile:file}));await new Promise(r=>server.listen(0,'127.0.0.1',r));return `http://127.0.0.1:${server.address().port}`;};
  const stop=()=>new Promise(r=>server.close(r));
  try {
    let base=await start();expect((await fetch(`${base}/health`)).status).toBe(200);
    expect(await (await fetch(base)).text()).toContain('No workspaces yet');
    expect((await fetch(`${base}/fonts/manrope-latin-wght-normal.woff2`)).status).toBe(200);
    expect((await fetch(`${base}/missing`)).status).toBe(404);
    const post=(url,body)=>fetch(url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body,redirect:'manual'});
    expect((await post(`${base}/workspaces`,'name=')).status).toBe(400);
    expect((await post(`${base}/workspaces`,'name=Interview+preparation')).status).toBe(303);
    const id=loadState(file).activeWorkspaceId;
    await post(`${base}/workspaces`,'name=Second+workspace');
    expect((await post(`${base}/workspaces/switch`,`id=${id}`)).status).toBe(303);
    await stop();base=await start();
    const page=await(await fetch(base)).text();expect(page).toContain('<h1>Interview preparation</h1>');expect(page).toContain('0 accounts');
    expect(Object.keys(loadState(file).workspaces)).toHaveLength(2);
  } finally {if(server?.listening)await stop();}
});
