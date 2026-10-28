import {it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),runner=require('../scripts/run-gong-live-research.cjs');
const {defaultState,createWorkspace,updateWorkspace}=require('../scripts/server/state.cjs');
const {recordSource}=require('../scripts/sources.cjs');
function fixture(){
  let state=createWorkspace(defaultState(),{name:'Gong'}),id=state.activeWorkspaceId;
  const recorded=recordSource(state,{url:'https://www.gong.io/customers',title:'Customer stories',text:'Google sales team uses Gong. Anthropic uses Gong for revenue workflows. Nasdaq uses Gong to support sales teams.',fetchedAt:'2026-10-27T00:00:00Z'});state=recorded.state;
  state=updateWorkspace(state,id,w=>{w.research={status:'evidence_ready',revision:1,runId:'offline',selectedCandidate:{name:'Gong',domain:'gong.io'},sources:[{sourceId:recorded.source.id,kind:'seller_site',ownerDomain:'gong.io'}]};});return {state,id};
}
it('reserves only the authorized Gong batch, keeps settings explicit, and forbids repeated/approved runs',()=>{
  const {state,id}=fixture(),prepared=runner.prepare(state,{OPENAI_ENABLED:'false',OPENAI_MONTHLY_LIMIT_USD:'0'},{rawPages:new Map()});
  expect(runner).toMatchObject({MODEL:'gpt-5.5',CALLS:3,OPENAI_CAP_USD:.9,SERPER_CAP:10});
  expect(prepared.paidEnv).toMatchObject({OPENAI_ENABLED:'true',OPENAI_RETRY_LIMIT:'0',OPENAI_MONTHLY_LIMIT_USD:'0.9',SERPER_ENABLED:'false'});
  expect(Object.values(prepared.built.requests).every(row=>row.maxOutputTokens===8000&&row.reasoningEffort==='low')).toBe(true);expect(prepared.estimate.totalMaximumCostUsd).toBeLessThan(.9);
  expect(()=>runner.prepare(state,{OPENAI_ENABLED:'true'})).toThrow('false and 0');state.workspaces[id].llmCache={already:{}};expect(()=>runner.prepare(state,{OPENAI_ENABLED:'false',OPENAI_MONTHLY_LIMIT_USD:'0'})).toThrow('duplicate');
});
it('stops on an incomplete first response, keeps token/cost diagnostics, and never calls the next purpose or saves a profile',async()=>{
  const {state}=fixture(),prepared=runner.prepare(state,{OPENAI_ENABLED:'false',OPENAI_MONTHLY_LIMIT_USD:'0'},{rawPages:new Map()}),generate=vi.fn().mockRejectedValue(Object.assign(Error('Incomplete output'),{code:'INCOMPLETE',incompleteReason:'length',usage:{inputTokens:100,outputTokens:8000,reasoningTokens:8000},costUsd:.2405})),mutate=vi.fn(),onCall=vi.fn();
  await expect(runner.execute({...prepared,state,llm:{generate},mutate,onCall})).rejects.toMatchObject({code:'INCOMPLETE'});expect(generate).toHaveBeenCalledTimes(1);expect(mutate).not.toHaveBeenCalled();expect(onCall.mock.calls[0][0][0]).toMatchObject({purpose:'sellerFacts',failed:true,costUsd:.2405,usage:{reasoningTokens:8000}});
});
