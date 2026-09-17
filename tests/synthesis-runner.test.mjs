import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {defaultState,createWorkspace,updateWorkspace}=require('../scripts/server/state.cjs');
const {recordSource}=require('../scripts/sources.cjs');
const {createSynthesisCoordinator}=require('../scripts/onboarding/synthesis-runner.cjs');

function fixture(){
  let state=createWorkspace(defaultState(),{name:'Vercel'}),id=state.activeWorkspaceId;
  const saved=recordSource(state,{url:'https://vercel.com/docs',title:'Vercel docs',text:'Vercel is a platform for developers.',fetchedAt:'2026-09-17T12:00:00.000Z'});state=saved.state;
  state=updateWorkspace(state,id,w=>{w.research={schemaVersion:1,companyName:'Vercel',status:'evidence_ready',revision:3,runId:'research-1',selectedCandidate:{id:'vercel',name:'Vercel',domain:'vercel.com',website:'https://vercel.com'},sources:[{schemaVersion:1,sourceId:saved.source.id,url:saved.source.url,title:saved.source.title,fetchedAt:saved.source.fetchedAt,kind:'seller_site',ownerDomain:'vercel.com',chars:saved.source.text.length}],steps:[{key:'identify',label:'Identify',status:'complete'},{key:'research',label:'Research',status:'complete'},{key:'draft',label:'Draft',status:'not_started'},{key:'review',label:'Review',status:'not_started'}]};});
  return {state,id};
}

it('records a safe, retryable failure when paid OpenAI drafting is disabled',async()=>{
  const f=fixture();let state=f.state,writes=Promise.resolve(),calls=0;
  const mutate=fn=>{const work=writes.then(()=>{state=fn(state);return structuredClone(state);});writes=work.catch(()=>{});return work;};
  const coordinator=createSynthesisCoordinator({read:()=>structuredClone(state),mutate,llm:{generate:async()=>{calls++;throw Object.assign(new Error('secret provider detail'),{code:'DISABLED'});}},now:()=> '2026-09-17T12:01:00.000Z',randomId:()=> 'draft-1'});
  await expect(coordinator.start(f.id)).rejects.toMatchObject({code:'DISABLED'});
  const workspace=state.workspaces[f.id];
  expect(calls).toBe(1);
  expect(workspace.research.status).toBe('evidence_ready');
  expect(workspace.research.synthesisJob).toMatchObject({id:'draft-1',status:'failed',error:{code:'DISABLED',message:'OpenAI drafting is disabled. No paid request was made.'}});
  expect(workspace.research.steps.find(step=>step.key==='draft').status).toBe('failed');
  expect(JSON.stringify(state)).not.toContain('secret provider detail');
  expect(workspace.sellerProfile.category).toBeUndefined();
});

it('does not begin drafting from a stale tab after the active workspace changes',async()=>{
  const f=fixture();let state=createWorkspace(f.state,{name:'Another workspace'}),calls=0,writes=Promise.resolve();
  const mutate=fn=>{const work=writes.then(()=>{state=fn(state);return structuredClone(state);});writes=work.catch(()=>{});return work;};
  const coordinator=createSynthesisCoordinator({read:()=>structuredClone(state),mutate,llm:{generate:async()=>{calls++;throw new Error('must not run');}}});
  await expect(coordinator.start(f.id,{requireActive:true})).rejects.toMatchObject({code:'WORKSPACE_CHANGED'});
  expect(calls).toBe(0);expect(state.workspaces[f.id].research.synthesisJob).toBeUndefined();
});
