'use strict';

const {randomUUID}=require('node:crypto');
const {phaseBSerperLimit}=require('./phase-b-runner.cjs');

const HARD_MAX_REFRESH_ALL_SERPER_QUERIES=150;
function positiveInteger(value,max){const number=Number(value);return Number.isInteger(number)&&number>0?Math.min(max,number):0;}
function refreshAllSettings(env={}){return {maxQueries:positiveInteger(env.REFRESH_ALL_MAX_SERPER_QUERIES_PER_RUN,HARD_MAX_REFRESH_ALL_SERPER_QUERIES),perAccountQueries:phaseBSerperLimit(env)};}
function findRun(workspace,id){return workspace.runs.find(row=>row.type==='account_collector_refresh_all'&&row.id===id);}
function safeError(error){return {code:String(error?.code||'REFRESH_ALL_FAILED'),message:String(error?.message||'Refresh all failed.').slice(0,300),status:Number.isInteger(error?.status)?error.status:null};}

function createRefreshAllCoordinator({read,mutate,accountCoordinator,env=process.env,now=()=>new Date(),id=()=>randomUUID()}={}){
  if(!accountCoordinator?.start||!accountCoordinator?.wait)throw new Error('Account refresh coordinator is required.');
  const pending=new Map(),updateRun=(workspaceId,runId,fn)=>mutate(state=>{const workspace=state.workspaces[workspaceId],run=findRun(workspace,runId);if(!run)throw new Error('Refresh-all run disappeared.');fn(run,workspace);return state;});
  async function execute(workspaceId,runId){
    await updateRun(workspaceId,runId,run=>{run.status='running';});
    const ids=findRun(read().workspaces[workspaceId],runId).accountIds;
    for(const accountId of ids){
      try{
        const parent=findRun(read().workspaces[workspaceId],runId);if(parent.serperQueries+parent.perAccountQueryCeiling>parent.queryCap){const error=new Error('The refresh-all Serper cap would be exceeded.');error.code='REFRESH_ALL_QUERY_LIMIT';throw error;}
        const child=await accountCoordinator.start(workspaceId,accountId),finished=await accountCoordinator.wait(child.id);if(!finished)throw new Error('Account refresh did not return a saved result.');
        await updateRun(workspaceId,runId,run=>{run.serperQueries+=Number(finished.serperQueries||0);run.completedAccounts+=1;run.accountRuns.push({accountId,runId:finished.id,status:finished.status,serperQueries:Number(finished.serperQueries||0),errorCount:(finished.errors||[]).length});if(finished.status==='failed')run.failedAccounts+=1;});
      }catch(error){await updateRun(workspaceId,runId,run=>{run.failedAccounts+=1;run.errors.push({accountId,...safeError(error)});});}
    }
    await updateRun(workspaceId,runId,run=>{run.status=run.failedAccounts||run.accountRuns.some(row=>row.errorCount)?'complete_with_errors':'complete';run.finishedAt=now().toISOString();});
    return findRun(read().workspaces[workspaceId],runId);
  }
  async function start(workspaceId,options={}){
    const workspace=read().workspaces[workspaceId];if(!workspace)throw new Error('Workspace not found.');
    const settings=refreshAllSettings(env),requested=positiveInteger(options.queryCap,HARD_MAX_REFRESH_ALL_SERPER_QUERIES),maxQueries=requested||settings.maxQueries;if(!maxQueries)throw new Error('Set REFRESH_ALL_MAX_SERPER_QUERIES_PER_RUN to a positive value up to 150.');
    if(workspace.runs.some(row=>row.type==='account_collector_refresh_all'&&['queued','running'].includes(row.status)))throw new Error('Refresh all is already running.');
    const accountIds=workspace.accounts.filter(row=>row.discoveryQuality?.sourceKind).map(row=>row.id);if(!accountIds.length)throw new Error('No discovered accounts are available to refresh.');
    if(accountIds.length*settings.perAccountQueries>maxQueries)throw new Error(`Refreshing ${accountIds.length} accounts could exceed the ${maxQueries}-query cap.`);
    const run={schemaVersion:1,id:id(),type:'account_collector_refresh_all',status:'queued',startedAt:now().toISOString(),finishedAt:'',accountIds,totalAccounts:accountIds.length,completedAccounts:0,failedAccounts:0,queryCap:maxQueries,perAccountQueryCeiling:settings.perAccountQueries,serperQueries:0,accountRuns:[],errors:[]};
    await mutate(state=>{state.workspaces[workspaceId].runs.push(run);return state;});
    const promise=Promise.resolve().then(()=>execute(workspaceId,run.id)).catch(async error=>{try{await updateRun(workspaceId,run.id,saved=>{saved.status='failed';saved.finishedAt=now().toISOString();saved.errors.push(safeError(error));});}catch{}return null;}).finally(()=>pending.delete(run.id));pending.set(run.id,promise);return run;
  }
  async function wait(runId){if(pending.has(runId))await pending.get(runId);for(const workspace of Object.values(read().workspaces)){const run=findRun(workspace,runId);if(run)return structuredClone(run);}return null;}
  return {start,wait};
}

module.exports={HARD_MAX_REFRESH_ALL_SERPER_QUERIES,createRefreshAllCoordinator,refreshAllSettings,safeError};
