import {createRequire} from 'node:module';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {expect,it} from 'vitest';
const require=createRequire(import.meta.url),{createRouter}=require('../scripts/server/router.cjs'),{defaultState,loadState,saveState}=require('../scripts/server/state.cjs'),{loadResolveReferenceDemo}=require('../scripts/reference-demo.cjs');

it('creates and copies a Demo template draft while exposing no send action',async()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'whynow-chunk3-')),stateFile=path.join(directory,'state.json');let server;
  const state=loadResolveReferenceDemo(defaultState(),{now:()=> '2026-10-21T00:00:00.000Z'}),workspace=state.workspaces[state.activeWorkspaceId];workspace.accounts.push({schemaVersion:1,id:'acct-acme',name:'Acme Cloud',domain:'acme.example',icpSegment:'data_ai_infrastructure',status:'new',signals:{},kills:[],triggers:[{id:'trigger-1',type:'reliability_hiring',title:'Acme Cloud is hiring a Senior Site Reliability Engineer',evidenceText:'Acme Cloud is hiring a Senior Site Reliability Engineer to improve production incident response.',evidenceUrl:'https://acme.example/jobs/sre',occurredAt:'2026-10-20T00:00:00.000Z',decaysAt:'2026-12-20T00:00:00.000Z',citable:true}]});saveState(state,stateFile);
  const start=async()=>{server=http.createServer(createRouter({stateFile,env:{NODE_ENV:'development',OPENAI_ENABLED:'false',SERPER_ENABLED:'false'},phaseBRefreshCoordinator:{start:async()=>({id:'refresh'})},phaseBRefreshAllCoordinator:{start:async()=>({id:'all'})},discoveryCoordinator:{start:async()=>({id:'discover'})}}));await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});return `http://127.0.0.1:${server.address().port}`;};
  try{const base=await start(),before=await(await fetch(`${base}/accounts/acct-acme`)).text();expect(before).toContain('Demo · copy only · no send path');expect(before).toContain('Create template draft');const response=await fetch(`${base}/accounts/acct-acme/drafts/template`,{method:'POST',headers:{Origin:base},body:new URLSearchParams({firstName:'Ava',title:'VP Engineering',senderFirstName:'Shayan',triggerId:'trigger-1'}),redirect:'manual'});expect(response.status).toBe(303);const saved=loadState(stateFile).workspaces[workspace.id].drafts[0];expect(saved).toMatchObject({deliveryMode:'demo',generatedBy:'deterministic_template',model:null});const after=await(await fetch(`${base}/accounts/acct-acme`)).text();expect(after).toContain('Copy email');expect(after).toContain('navigator.clipboard.writeText');expect(after).toContain('Open receipt');expect(after).not.toMatch(/<form[^>]+action="[^"]*send/i);}
  finally{if(server?.listening)await new Promise(resolve=>server.close(resolve));fs.rmSync(directory,{recursive:true,force:true});}
});
