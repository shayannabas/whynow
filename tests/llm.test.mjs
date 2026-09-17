import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {createLlm,settings}=require('../scripts/llm.cjs');
const {defaultState,createWorkspace,loadState,saveState}=require('../scripts/server/state.cjs');
const env={OPENAI_ENABLED:'true',OPENAI_API_KEY:'test-only-placeholder',OPENAI_MONTHLY_LIMIT_USD:'1'};
const schema={type:'object',properties:{facts:{type:'array',items:{type:'string'}}},required:['facts'],additionalProperties:false};
const request={promptVersion:'test-v1',messages:[{role:'system',content:'Return an empty facts list. This is a protocol test, not company evidence.'}],schema,validate:value=>Array.isArray(value.facts)&&value.facts.length===0};
const success=()=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:'{"facts":[]}'}}]}),{status:200});
function harness(options={}) {
  let state=createWorkspace(defaultState(),{name:'Protocol test'}),queue=Promise.resolve();
  const id=state.activeWorkspaceId;
  const read=()=>structuredClone(state);
  const mutate=fn=>{const result=queue.then(()=>{state=fn(state);return read();});queue=result.catch(()=>{});return result;};
  const client=createLlm({read,mutate,env,fetchImpl:success,now:()=> '2026-09-16T12:00:00Z',sleep:async()=>{},...options});
  return {client,read,mutate,id,run:(extra={})=>client.generate({...request,workspaceId:id,...extra})};
}
it('fails closed with paid calls disabled, absent key or absent approved budget',async()=>{
  let calls=0;
  for(const config of [{},{...env,OPENAI_ENABLED:'false'},{...env,OPENAI_API_KEY:''},{...env,OPENAI_MONTHLY_LIMIT_USD:'0'},{...env,OPENAI_MODEL:'different-model'}]) {
    const h=harness({env:config,fetchImpl:()=>{calls++;return success();}});
    await expect(h.run()).rejects.toThrow();
  }
  expect(calls).toBe(0);expect(settings({}).model).toBe('gpt-4o-mini');
});
it('matches the friend’s model and Chat Completions endpoint, with strict schema and no secret persistence',async()=>{
  let seen;
  const h=harness({fetchImpl:async(url,options)=>{seen={url,options};return success();}});
  expect(await h.run()).toMatchObject({value:{facts:[]},cached:false,model:'gpt-4o-mini'});
  expect(seen.url).toBe('https://api.openai.com/v1/chat/completions');
  const body=JSON.parse(seen.options.body);
  expect(body).toMatchObject({model:'gpt-4o-mini',store:false,response_format:{type:'json_schema',json_schema:{strict:true,schema}}});
  expect(seen.options.redirect).toBe('error');
  expect(JSON.stringify(h.read())).not.toContain(env.OPENAI_API_KEY);
  expect(h.read().workspaces[h.id].sellerProfile.approvedAt).toBeUndefined();
});
it('caches by prompt version/input, scopes cache and prevents duplicate concurrent calls',async()=>{
  let calls=0;const h=harness({fetchImpl:async()=>{calls++;return success();}});
  await Promise.all([h.run(),h.run()]);expect(calls).toBe(1);
  expect((await h.run()).cached).toBe(true);
  await h.run({promptVersion:'test-v2'});expect(calls).toBe(2);
  await h.mutate(state=>createWorkspace(state,{name:'Second protocol test'}));
  await h.run({workspaceId:h.read().activeWorkspaceId});expect(calls).toBe(3);
});
it('reserves before retry and enforces workspace call and shared spending caps',async()=>{
  let calls=0;
  const h=harness({env:{...env,OPENAI_WORKSPACE_MONTHLY_CALL_LIMIT:'1'},fetchImpl:async()=>{calls++;return new Response('',{status:429});}});
  await expect(h.run()).rejects.toMatchObject({code:'BUDGET_EXHAUSTED'});expect(calls).toBe(1);
  expect(h.read().workspaces[h.id].budgets.openai.calls).toBe(1);
  const tiny=harness({env:{...env,OPENAI_MONTHLY_LIMIT_USD:'0.000001'},fetchImpl:()=>{throw Error('No request permitted');}});
  await expect(tiny.run()).rejects.toMatchObject({code:'BUDGET_EXHAUSTED'});
});
it('bounds retries, handles refusal/incomplete/invalid output, never logs provider errors',async()=>{
  let calls=0;
  const retry=harness({fetchImpl:async()=>{calls++;return calls===1?new Response('',{status:503}):success();}});
  await retry.run();expect(calls).toBe(2);expect(retry.read().workspaces[retry.id].budgets.openai.calls).toBe(2);
  for(const payload of [
    {choices:[{finish_reason:'stop',message:{refusal:'declined'}}]},
    {choices:[{finish_reason:'length',message:{content:'{"facts":[]}'}}]},
    {choices:[{finish_reason:'stop',message:{content:'broken'}}]},
    {choices:[{finish_reason:'stop',message:{content:'{"facts":["unsupported"]}'}}]}
  ]) {
    const h=harness({fetchImpl:async()=>new Response(JSON.stringify(payload))});
    await expect(h.run()).rejects.toThrow();expect(h.read().workspaces[h.id].llmCache).toBeUndefined();
  }
  const error=harness({fetchImpl:async()=>new Response(JSON.stringify({error:{message:env.OPENAI_API_KEY}}),{status:401})});
  await expect(error.run()).rejects.not.toThrow(env.OPENAI_API_KEY);
});
it('rejects oversized inputs, invalid schemas/validators and archived workspace requests',async()=>{
  const h=harness({fetchImpl:()=>{throw Error('Must not call');}});
  await expect(h.run({messages:[{role:'user',content:'a'.repeat(49000)}]})).rejects.toMatchObject({code:'INPUT_TOO_LARGE'});
  await expect(h.run({validate:null})).rejects.toMatchObject({code:'INVALID_INPUT'});
  await h.mutate(state=>{state.workspaces[h.id].status='archived';return state;});
  await expect(h.run()).rejects.toMatchObject({code:'ARCHIVED'});
});
it('persists charges and cached responses across restart without a network request',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'whynow-llm-')),file=path.join(dir,'state.json');
  try {
    const state=createWorkspace(defaultState(),{name:'Protocol persistence test'});saveState(state,file);
    const read=()=>loadState(file),mutate=async fn=>saveState(fn(read()),file);
    const make=fetchImpl=>createLlm({read,mutate,env,fetchImpl});
    await make(success).generate({...request,workspaceId:state.activeWorkspaceId});
    const restored=await make(()=>{throw Error('Should be cached');}).generate({...request,workspaceId:state.activeWorkspaceId});
    expect(restored.cached).toBe(true);expect(read().workspaces[state.activeWorkspaceId].budgets.openai.calls).toBe(1);
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
