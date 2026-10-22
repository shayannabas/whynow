import {createRequire} from 'node:module';
import {describe,expect,it,vi} from 'vitest';
const require=createRequire(import.meta.url);
const {defaultState}=require('../scripts/server/state.cjs');
const {loadResolveReferenceDemo,REFERENCE_WORKSPACE_ID}=require('../scripts/reference-demo.cjs');
const {createDiscoveryCoordinator}=require('../scripts/discovery-runner.cjs');

function harness(overrides={}){
  let state=loadResolveReferenceDemo(defaultState(),{now:()=> '2026-10-20T00:00:00.000Z'}),writes=Promise.resolve();
  const read=()=>structuredClone(state),mutate=fn=>{const work=writes.then(()=>{state=fn(structuredClone(state));return structuredClone(state);});writes=work.catch(()=>{});return work;};
  const env={SERPER_ENABLED:'true',SERPER_API_KEY:'recorded-test-key',SERPER_MAX_QUERIES_PER_RUN:'4',SERPER_MONTHLY_QUERY_LIMIT:'105',DISCOVERY_MAX_SERPER_QUERIES_PER_RUN:'60',DISCOVERY_TARGET_COUNT:'25'};
  const searchProvider=overrides.searchProvider||vi.fn(async(_query,{task})=>[{title:`${task.terms[0]} Labs | Official`,url:`https://${task.terms[0]}-labs.example/about`,snippet:`${task.segmentLabel} company`}]);
  const coordinator=createDiscoveryCoordinator({read,mutate,env,runtimeFactory:()=>({identity:()=> 'test',snapshot:()=>({usage:{},health:{}})}),searchProvider,now:()=>new Date('2026-10-20T01:00:00.000Z'),id:()=> 'discovery_run_1'});
  return {read,coordinator,searchProvider};
}

describe('background company discovery',()=>{
  it('uses one initial query per segment, persists its cap and promotes 25 balanced prospects',async()=>{
    const h=harness(),started=await h.coordinator.start(REFERENCE_WORKSPACE_ID),run=await h.coordinator.wait(started.id),workspace=h.read().workspaces[REFERENCE_WORKSPACE_ID];
    expect(run).toMatchObject({status:'complete',serperQueries:10,newAccounts:25,passedNoiseGate:25});expect(h.searchProvider).toHaveBeenCalledTimes(10);
    expect(workspace.budgets.serperQueries).toEqual({month:'2026-10',queries:10});expect(workspace.accounts).toHaveLength(25);
    expect(new Set(workspace.accounts.map(row=>row.icpSegment)).size).toBe(10);
    expect(workspace.accounts.some(row=>['Coinbase','Salesforce','Zscaler','Fireworks AI'].includes(row.name))).toBe(false);
  });

  it('isolates a search failure and still keeps the config-backed universe usable',async()=>{
    let calls=0;const h=harness({searchProvider:vi.fn(async(_query,{task})=>{calls+=1;if(calls===1)throw Object.assign(new Error('recorded provider failure'),{code:'HTTP_ERROR',status:503});return [{title:`${task.terms[0]} Labs`,url:`https://${task.terms[0]}-labs.example`,snippet:task.segmentLabel}];})});
    const started=await h.coordinator.start(REFERENCE_WORKSPACE_ID),run=await h.coordinator.wait(started.id);
    expect(run).toMatchObject({status:'complete_with_errors',serperQueries:10,newAccounts:25});expect(run.errors[0]).toMatchObject({code:'HTTP_ERROR',status:503});
  });

  it('refuses to start when the explicit discovery cap is off',async()=>{
    let state=loadResolveReferenceDemo(defaultState()),read=()=>state,mutate=async fn=>(state=fn(state));
    const coordinator=createDiscoveryCoordinator({read,mutate,env:{SERPER_ENABLED:'true',SERPER_API_KEY:'x',SERPER_MAX_QUERIES_PER_RUN:'4',SERPER_MONTHLY_QUERY_LIMIT:'60',DISCOVERY_MAX_SERPER_QUERIES_PER_RUN:'0'}});
    await expect(coordinator.start(REFERENCE_WORKSPACE_ID)).rejects.toThrow(/DISCOVERY_MAX_SERPER/);
  });
  it('accepts a lower run-local cap for a larger bounded workflow',async()=>{
    const h=harness(),started=await h.coordinator.start(REFERENCE_WORKSPACE_ID,{queryCap:3}),run=await h.coordinator.wait(started.id);
    expect(run.queryCap).toBe(3);expect(run.serperQueries).toBe(3);expect(h.searchProvider).toHaveBeenCalledTimes(3);
  });
});
