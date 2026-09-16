import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {requestResearch}=require('../scripts/onboarding/research-request.cjs');
const {researchPage,nameEntryPage}=require('../scripts/onboarding/research-page.cjs');
const {defaultState,loadState}=require('../scripts/server/state.cjs');
const {createRouter}=require('../scripts/server/router.cjs');
it('Vercel creates only research intent, with no fabricated facts or approval',()=>{
  const state=requestResearch(defaultState(),'Vercel'),w=state.workspaces[state.activeWorkspaceId];
  expect(w.status).toBe('draft');expect(w.research).toMatchObject({status:'not_configured',companyName:'Vercel',facts:[],sources:[],icp:null});
  expect(w.sellerProfile.approvedAt).toBeUndefined();expect(w.onboarding).toBeUndefined();
  expect(researchPage(state)).toContain('Research not configured');expect(researchPage(state)).toContain('<button disabled>Approve profile</button>');
  expect(researchPage(state)).not.toContain('vercel.com');
  expect(w.research.steps.every(s=>s.status==='not_started')).toBe(true);
});
it('repeated submissions reuse waiting requests and keep other workspaces intact',()=>{
  const a=requestResearch(defaultState(),'Vercel'),id=a.activeWorkspaceId;
  const b=requestResearch(a,'Another company');
  const c=requestResearch(b,' vercel ');
  expect(Object.keys(c.workspaces)).toHaveLength(2);expect(c.activeWorkspaceId).toBe(id);
  expect(c.workspaces[b.activeWorkspaceId]).toEqual(b.workspaces[b.activeWorkspaceId]);
  expect(Object.keys(a.workspaces)).toHaveLength(1);
});
it('rejects empty names and escapes company names',()=>{
  expect(()=>requestResearch(defaultState(),' ')).toThrow();
  const page=researchPage(requestResearch(defaultState(),'<script>alert(1)</script>'));
  expect(page).toContain('&lt;script&gt;');expect(page).not.toContain('<script>alert(1)</script>');
  expect(nameEntryPage(defaultState())).not.toContain('name="website"');
});
it('name-only HTTP flow needs no provider, survives restart, rejects cross-origin and cannot approve an empty profile',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'whynow-name-')),stateFile=path.join(dir,'state.json');let server;
  const start=async()=>{server=http.createServer(createRouter({stateFile,env:{SERPER_API_KEY:'fixture-present',OPENAI_API_KEY:'fixture-present'},runtimeFactory:()=>{throw Error('No providers allowed');}}));await new Promise((ok,bad)=>{server.once('error',bad);server.listen(0,'127.0.0.1',ok);});return `http://127.0.0.1:${server.address().port}`;};
  const stop=()=>new Promise(ok=>server.close(ok));
  try{
    let base=await start();
    const submit=origin=>fetch(base+'/onboarding/start',{method:'POST',redirect:'manual',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:'name=Vercel'});
    expect((await submit('https://other.org')).status).toBe(403);
    expect((await submit(base)).status).toBe(303);
    const state=loadState(stateFile),id=state.activeWorkspaceId;
    const approval=await fetch(base+'/onboarding/profile/approve',{method:'POST',headers:{Origin:base},body:new URLSearchParams({workspaceId:id,revision:'0',acknowledged:'on'})});
    expect(approval.status).toBe(400);expect(loadState(stateFile).workspaces[id].status).toBe('draft');
    await stop();base=await start();
    const html=await(await fetch(base+'/onboarding/results')).text();expect(html).toContain('Vercel');expect(html).toContain('No facts found yet.');
    expect((await fetch(base+'/onboarding/manual')).status).toBe(200);
  }finally{if(server?.listening)await stop();fs.rmSync(dir,{recursive:true,force:true});}
});
