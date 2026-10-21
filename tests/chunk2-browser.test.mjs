import {createRequire} from 'node:module';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {expect,it} from 'vitest';
const require=createRequire(import.meta.url);
const {createRouter}=require('../scripts/server/router.cjs');
const {defaultState,loadState,saveState}=require('../scripts/server/state.cjs');
const {loadResolveReferenceDemo}=require('../scripts/reference-demo.cjs');
const {addManualAccountToState}=require('../scripts/accounts.cjs');

it('shows Discovery and Today, updates explicit account status and keeps actions local',async()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'whynow-chunk2-')),stateFile=path.join(directory,'state.json');let server,calls=[],refreshAllCalls=[];
  let state=loadResolveReferenceDemo(defaultState(),{now:()=> '2026-10-20T00:00:00.000Z'}),workspaceId=state.activeWorkspaceId;
  state=addManualAccountToState(state,workspaceId,{name:'Acme',domain:'acme.example',segment:'data_ai_infrastructure',sourceUrl:'https://acme.example/about'},{id:()=> 'acct-acme',now:()=> '2026-10-20T10:00:00.000Z'});
  state.workspaces[workspaceId].accounts[0].triggers=[{type:'reliability_hiring',title:'Acme is hiring SREs',evidenceUrl:'https://acme.example/jobs',occurredAt:'2026-10-20T10:00:00.000Z',decaysAt:'2026-11-20T10:00:00.000Z'}];saveState(state,stateFile);
  const discoveryCoordinator={start:async id=>{calls.push(id);return {id:'discovery-1',status:'queued'};}};
  const start=async()=>{server=http.createServer(createRouter({stateFile,env:{NODE_ENV:'development',OPENAI_ENABLED:'false',SERPER_ENABLED:'false'},discoveryCoordinator,phaseBRefreshCoordinator:{start:async()=>({id:'refresh-1'})},phaseBRefreshAllCoordinator:{start:async id=>{refreshAllCalls.push(id);return {id:'refresh-all-1'};}}}));await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});return `http://127.0.0.1:${server.address().port}`;},stop=()=>new Promise(resolve=>server.close(resolve));
  try{
    const base=await start(),today=await(await fetch(`${base}/today`)).text(),discovery=await(await fetch(`${base}/discovery`)).text();expect(today).toContain('Acme is hiring SREs');expect(today).toContain('https://acme.example/jobs');expect(today).toContain('Refresh all');expect(discovery).toContain('Run discovery');
    const refreshAll=await fetch(`${base}/accounts/refresh-all`,{method:'POST',headers:{Origin:base},redirect:'manual'});expect(refreshAll.status).toBe(303);expect(refreshAllCalls).toEqual([workspaceId]);
    const run=await fetch(`${base}/discovery/run`,{method:'POST',headers:{Origin:base},redirect:'manual'});expect(run.status).toBe(303);expect(calls).toEqual([workspaceId]);
    const post=fields=>fetch(`${base}/accounts/acct-acme/status`,{method:'POST',headers:{Origin:base},body:new URLSearchParams(fields),redirect:'manual'}),updatedAt=loadState(stateFile).workspaces[workspaceId].accounts[0].updatedAt;
    expect((await post({status:'skipped',expectedUpdatedAt:updatedAt})).status).toBe(400);expect((await post({status:'skipped',reason:'Not actionable today',expectedUpdatedAt:updatedAt})).status).toBe(303);
    const after=loadState(stateFile);expect(after.workspaces[workspaceId].accounts[0]).toMatchObject({status:'skipped',statusReason:'Not actionable today'});expect(after.auditLog.at(-1)).toMatchObject({type:'account_status_changed',reason:'Not actionable today'});expect(await(await fetch(`${base}/today`)).text()).not.toContain('Acme is hiring SREs');
  }finally{if(server?.listening)await stop();fs.rmSync(directory,{recursive:true,force:true});}
});
