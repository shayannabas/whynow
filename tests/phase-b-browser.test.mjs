import {expect,it} from 'vitest';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {createRouter}=require('../scripts/server/router.cjs');
const {defaultState,saveState}=require('../scripts/server/state.cjs');
const {loadResolveReferenceDemo}=require('../scripts/reference-demo.cjs');
const {addManualAccountToState}=require('../scripts/accounts.cjs');

it('shows account receipts and starts Refresh account as a local background action',async()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'whynow-phase-b-browser-')),stateFile=path.join(directory,'state.json');let server,calls=[];
  let state=loadResolveReferenceDemo(defaultState()),workspaceId=state.activeWorkspaceId;
  state=addManualAccountToState(state,workspaceId,{name:'Acme',domain:'acme.example',segment:'data_ai_infrastructure',sourceUrl:'https://acme.example/about'},{id:()=> 'acct-acme',now:()=> '2026-10-20T12:00:00.000Z'});
  state.workspaces[workspaceId].accounts[0].signals.techStack={key:'techStack',score:5,evidenceUrl:'https://acme.example/engineering',evidenceText:'Acme uses Kubernetes.',observedAt:'2026-10-20T12:00:00.000Z',inferred:false};saveState(state,stateFile);
  const phaseBRefreshCoordinator={start:async(id,accountId)=>{calls.push({id,accountId});return {id:'run-1',status:'queued'};}};
  const start=async env=>{server=http.createServer(createRouter({stateFile,env,phaseBRefreshCoordinator}));await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});return `http://127.0.0.1:${server.address().port}`;},stop=()=>new Promise(resolve=>server.close(resolve));
  try{
    let base=await start({NODE_ENV:'development',OPENAI_ENABLED:'false',SERPER_ENABLED:'false'}),page=await(await fetch(`${base}/accounts/acct-acme`)).text();
    expect(page).toContain('Refresh account');expect(page).toContain('Open receipt');expect(page).toContain('https://acme.example/engineering');
    const post=origin=>fetch(`${base}/accounts/acct-acme/refresh`,{method:'POST',headers:{Origin:origin},redirect:'manual'});
    expect((await post('https://other.example')).status).toBe(403);const response=await post(base);expect(response.status).toBe(303);expect(response.headers.get('location')).toBe('/accounts/acct-acme');expect(calls).toEqual([{id:workspaceId,accountId:'acct-acme'}]);
    await stop();base=await start({NODE_ENV:'production'});expect((await post(base)).status).toBe(403);
  }finally{if(server?.listening)await stop();fs.rmSync(directory,{recursive:true,force:true});}
});
