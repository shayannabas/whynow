import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {defaultState,loadState,saveState}=require('../scripts/server/state.cjs');
const {requestResearch}=require('../scripts/onboarding/research-request.cjs');
const {changeArchive,workspacesPage}=require('../scripts/server/workspaces.cjs');
const {createRouter}=require('../scripts/server/router.cjs');
const input={revision:0,profileRevision:0,now:()=> '2026-09-16T12:00:00.000Z'};

it('archives without losing data, switches away and does not alter other workspaces',()=>{
  const first=requestResearch(defaultState(),'Vercel'),a=first.activeWorkspaceId;
  const state=requestResearch(first,'Resolve AI'),b=state.activeWorkspaceId;
  const next=changeArchive(state,b,input);
  expect(next.workspaces[b]).toMatchObject({status:'archived',archivedAt:input.now(),research:state.workspaces[b].research});
  expect(next.activeWorkspaceId).toBe(a);expect(next.workspaces[a]).toEqual(state.workspaces[a]);
  expect(state.workspaces[b].status).toBe('draft');
  expect(next.auditLog.at(-1)).toMatchObject({workspaceId:b,type:'workspace_archived'});
  const all=changeArchive(next,a,input);expect(all.activeWorkspaceId).toBeNull();
  expect(workspacesPage(all)).toContain('Restore workspace');
  expect(workspacesPage(all)).not.toContain('<option value=');
});
it('restores drafts but requires re-review for approved profiles, rejects stale or repeated actions',()=>{
  const state=requestResearch(defaultState(),'Vercel'),id=state.activeWorkspaceId;
  state.workspaces[id].status='active';state.workspaces[id].sellerProfile.approvedAt=input.now();
  const archived=changeArchive(state,id,input);
  expect(()=>changeArchive(archived,id,input)).toThrow();
  expect(()=>changeArchive(archived,id,{...input,restore:true})).toThrow();
  const restored=changeArchive(archived,id,{...input,revision:1,restore:true});
  expect(restored.workspaces[id]).toMatchObject({status:'needs_review',deliveryMode:'demo',profileRevision:1,sellerProfile:{approvedAt:null,deliveryAllowed:false}});
  expect(restored.auditLog.at(-1).type).toBe('workspace_restored');
  const draft=requestResearch(defaultState(),'Vercel');
  const archivedDraft=changeArchive(draft,draft.activeWorkspaceId,input);
  const unarchived=changeArchive(archivedDraft,draft.activeWorkspaceId,{...input,revision:1,restore:true});
  expect(unarchived.workspaces[draft.activeWorkspaceId].status).toBe('draft');
  expect(Object.keys(requestResearch(archivedDraft,'Vercel').workspaces)).toHaveLength(2);
});
it('shows honest empty status, dates, safe names and explicit archive confirmation',()=>{
  expect(workspacesPage(defaultState())).toContain('No companies yet');
  const page=workspacesPage(requestResearch(defaultState(),'<script>'));
  expect(page).toContain('&lt;script&gt;');expect(page).not.toContain('<h2><script>');
  expect(page).toContain('Profile approved: Not yet');expect(page).toContain('name="acknowledged" required');
});
it('protects archive routes, rejects archived switching and persists restore across restart',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'whynow-workspaces-')),stateFile=path.join(dir,'state.json');let server;
  const state=requestResearch(defaultState(),'Vercel'),id=state.activeWorkspaceId;saveState(state,stateFile);
  const start=async(env={})=>{server=http.createServer(createRouter({stateFile,env,runtimeFactory:()=>{throw Error('No providers allowed');}}));await new Promise((ok,bad)=>{server.once('error',bad);server.listen(0,'127.0.0.1',ok);});return `http://127.0.0.1:${server.address().port}`;};
  const stop=()=>new Promise(ok=>server.close(ok));
  try {
    let base=await start({SERPER_API_KEY:'fixture-present'});
    const post=(url,fields,origin=base)=>fetch(base+url,{method:'POST',headers:{Origin:origin},body:new URLSearchParams(fields),redirect:'manual'});
    expect((await fetch(base+'/workspaces')).status).toBe(200);
    // Manual fallback remains offline, even with a configured key.
    expect((await post('/onboarding/resolve',{workspaceId:id,name:'Vercel'})).status).toBe(303);
    expect(loadState(stateFile).workspaces[id].onboarding.status).toBe('website_required');
    const fields={id,revision:'0',profileRevision:'0',acknowledged:'on'};
    expect((await post('/workspaces/archive',fields,'https://elsewhere.example')).status).toBe(403);
    expect((await post('/workspaces/archive',{id})).status).toBe(400);
    expect((await post('/workspaces/archive',fields)).status).toBe(303);
    expect(loadState(stateFile).activeWorkspaceId).toBeNull();
    expect((await post('/workspaces/switch',{id})).status).toBe(400);
    expect((await post('/workspaces/restore',{...fields,revision:'1'})).status).toBe(303);
    await stop();base=await start();
    expect(loadState(stateFile).workspaces[id].status).toBe('draft');
    expect((await post('/workspaces/switch',{id})).status).toBe(303);
    expect(loadState(stateFile).activeWorkspaceId).toBe(id);
    await stop();base=await start({NODE_ENV:'production'});
    expect((await fetch(base+'/workspaces')).status).toBe(403);
    expect((await post('/workspaces/archive',{...fields,revision:'2',profileRevision:'1'})).status).toBe(403);
  } finally {if(server?.listening)await stop();fs.rmSync(dir,{recursive:true,force:true});}
});
