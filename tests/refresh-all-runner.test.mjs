import {describe,expect,it} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {defaultState}=require('../scripts/server/state.cjs');
const {loadResolveReferenceDemo}=require('../scripts/reference-demo.cjs');
const {createRefreshAllCoordinator,refreshAllSettings}=require('../scripts/refresh-all-runner.cjs');

function setup(count=2){
  let state=loadResolveReferenceDemo(defaultState(),{now:()=> '2026-10-20T12:00:00.000Z'}),workspaceId=state.activeWorkspaceId;
  state.workspaces[workspaceId].accounts=Array.from({length:count},(_,index)=>({id:`acct-${index+1}`,name:`Prospect ${index+1}`,domain:`prospect-${index+1}.example`,discoveryQuality:{sourceKind:'seed'},signals:{},triggers:[],killHints:[]}));
  return {workspaceId,read:()=>structuredClone(state),mutate:async fn=>{state=fn(structuredClone(state));return structuredClone(state);},value:()=>state};
}

describe('Refresh all coordinator',()=>{
  it('refreshes every discovered account sequentially inside the hard aggregate cap',async()=>{
    const h=setup(),started=[];
    const accountCoordinator={start:async(_workspaceId,accountId)=>{started.push(accountId);return {id:`run-${accountId}`};},wait:async runId=>({id:runId,status:'complete',serperQueries:5,errors:[]})};
    const coordinator=createRefreshAllCoordinator({read:h.read,mutate:h.mutate,accountCoordinator,env:{PHASE_B_MAX_SERPER_QUERIES_PER_ACCOUNT:'5',REFRESH_ALL_MAX_SERPER_QUERIES_PER_RUN:'10'},now:()=>new Date('2026-10-20T12:00:00.000Z'),id:()=> 'refresh-all-1'});
    const queued=await coordinator.start(h.workspaceId),finished=await coordinator.wait(queued.id);
    expect(started).toEqual(['acct-1','acct-2']);expect(finished).toMatchObject({status:'complete',totalAccounts:2,completedAccounts:2,failedAccounts:0,serperQueries:10,queryCap:10});expect(finished.accountRuns).toHaveLength(2);
  });

  it('fails closed before starting when the discovered set could exceed the aggregate cap',async()=>{
    const h=setup(3),accountCoordinator={start:async()=>{throw new Error('must not run');},wait:async()=>null},coordinator=createRefreshAllCoordinator({read:h.read,mutate:h.mutate,accountCoordinator,env:{PHASE_B_MAX_SERPER_QUERIES_PER_ACCOUNT:'5',REFRESH_ALL_MAX_SERPER_QUERIES_PER_RUN:'10'}});
    await expect(coordinator.start(h.workspaceId)).rejects.toThrow('could exceed the 10-query cap');
    expect(h.value().workspaces[h.workspaceId].runs.filter(row=>row.type==='account_collector_refresh_all')).toHaveLength(0);
  });

  it('keeps the process default disabled and never allows more than 150 queries',()=>{
    expect(refreshAllSettings({})).toMatchObject({maxQueries:0});
    expect(refreshAllSettings({REFRESH_ALL_MAX_SERPER_QUERIES_PER_RUN:'999',PHASE_B_MAX_SERPER_QUERIES_PER_ACCOUNT:'5'})).toEqual({maxQueries:150,perAccountQueries:5});
  });
  it('accepts an explicit lower cap from the bounded prepare-demo workflow',async()=>{
    const h=setup(),accountCoordinator={start:async(_workspaceId,accountId)=>({id:`run-${accountId}`}),wait:async runId=>({id:runId,status:'complete',serperQueries:4,errors:[]})};
    const coordinator=createRefreshAllCoordinator({read:h.read,mutate:h.mutate,accountCoordinator,env:{PHASE_B_MAX_SERPER_QUERIES_PER_ACCOUNT:'5',REFRESH_ALL_MAX_SERPER_QUERIES_PER_RUN:'150'},id:()=> 'refresh-all-local-cap'});
    const queued=await coordinator.start(h.workspaceId,{queryCap:10}),finished=await coordinator.wait(queued.id);
    expect(finished).toMatchObject({queryCap:10,serperQueries:8,status:'complete'});
  });
});
