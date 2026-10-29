'use strict';

const {randomUUID}=require('node:crypto');
const {CollectorRuntime}=require('./collectors/runtime.cjs');
const {search,serperSettings,assertSerperReady}=require('./serper.cjs');
const {buildDiscoveryTasks,candidateFromResult,promoteDiscoveryCandidates,seedCandidates,selectBalancedCandidates}=require('./company-discovery.cjs');
const {phaseAConfigForWorkspace}=require('./phase-a-config.cjs');

function positiveInteger(value,max){const number=Number(value);return Number.isInteger(number)&&number>0?Math.min(max,number):0;}
function discoverySettings(env={}){return {maxQueries:positiveInteger(env.DISCOVERY_MAX_SERPER_QUERIES_PER_RUN,60),targetCount:Math.max(20,Math.min(30,positiveInteger(env.DISCOVERY_TARGET_COUNT,30)||25))};}
function assertDiscoveryReady(env={}){const settings=discoverySettings(env);assertSerperReady(serperSettings(env));if(!settings.maxQueries)throw new Error('Set DISCOVERY_MAX_SERPER_QUERIES_PER_RUN to a positive value up to 60.');return settings;}
function findRun(workspace,id){return workspace.runs.find(row=>row.type==='company_discovery'&&row.id===id);}
function safeError(error){return {code:String(error?.code||'DISCOVERY_FAILED'),message:String(error?.message||'Discovery failed.').slice(0,300),status:Number.isInteger(error?.status)?error.status:null};}

function createDiscoveryCoordinator({read,mutate,env=process.env,runtimeFactory=options=>new CollectorRuntime(options),searchProvider=(query,options)=>search(query,options),triggerVerifier,now=()=>new Date(),id=()=>randomUUID()}={}){
  const pending=new Map();
  const updateRun=(workspaceId,runId,fn)=>mutate(state=>{const workspace=state.workspaces[workspaceId],run=findRun(workspace,runId);if(!run)throw new Error('Discovery run disappeared.');fn(run,workspace);return state;});
  const reserveQuery=(workspaceId,runId,settings)=>updateRun(workspaceId,runId,(run,workspace)=>{
    if(run.serperQueries>=settings.maxQueries){const error=new Error('The discovery run query cap is exhausted.');error.code='DISCOVERY_RUN_LIMIT';throw error;}
    const month=now().toISOString().slice(0,7),configured=serperSettings(env).monthlyLimit,current=workspace.budgets.serperQueries?.month===month?workspace.budgets.serperQueries.queries:0;
    if(current>=configured){const error=new Error('The workspace Serper monthly query cap is exhausted.');error.code='SERPER_MONTHLY_LIMIT';throw error;}
    workspace.budgets.serperQueries={month,queries:current+1};run.serperQueries+=1;
  });
  async function execute(workspaceId,runId){
    assertSerperReady(serperSettings(env));const saved=findRun(read().workspaces[workspaceId],runId),settings={...discoverySettings(env),maxQueries:saved.queryCap};await updateRun(workspaceId,runId,run=>{run.status='running';});
    const initial=read(),workspace=initial.workspaces[workspaceId];phaseAConfigForWorkspace(workspace);const runtime=runtimeFactory({env});runtime.identity();
    if(saved.strategy==='trigger_first')return require('./trigger-first-runner.cjs').executeTriggerFirst({read,mutate,workspaceId,runId,runtime,searchProvider,reserveQuery,settings,env,now,verify:triggerVerifier});
    const tasks=buildDiscoveryTasks(workspace,{maxQueries:settings.maxQueries}),seeded=seedCandidates(workspace),live=[],reports=[],minimumQueries=phaseAConfigForWorkspace(workspace).segments.filter(row=>row.enabled!==false).length;
    for(const task of tasks){
      try{
        await reserveQuery(workspaceId,runId,settings);const results=await searchProvider(task.query,{runtime,env,num:10,task});const candidates=(results||[]).map(row=>candidateFromResult(task,row)).filter(Boolean);live.push(...candidates);reports.push({taskId:task.id,segment:task.segment,status:'complete',results:(results||[]).length,candidates:candidates.length});
      }catch(error){reports.push({taskId:task.id,segment:task.segment,status:'error',results:0,candidates:0,error:safeError(error)});if(['DISCOVERY_RUN_LIMIT','SERPER_MONTHLY_LIMIT'].includes(error.code))break;}
      const currentQueries=findRun(read().workspaces[workspaceId],runId).serperQueries,selection=selectBalancedCandidates(workspace,[...seeded,...live],{limit:settings.targetCount});if(currentQueries>=minimumQueries&&selection.selected.length>=settings.targetCount)break;
    }
    const selection=selectBalancedCandidates(workspace,[...seeded,...live],{limit:settings.targetCount});
    await mutate(state=>{const promoted=promoteDiscoveryCandidates(state,workspaceId,selection.selected);state=promoted.state;const currentWorkspace=state.workspaces[workspaceId],run=findRun(currentWorkspace,runId);run.status=reports.some(row=>row.status==='error')?'complete_with_errors':'complete';run.finishedAt=now().toISOString();run.tasks=reports;run.rawFound=seeded.length+live.length;run.passedNoiseGate=selection.selected.length;run.newAccounts=promoted.added.length;run.newAccountIds=promoted.added.map(row=>row.id);run.rejectedCount=selection.rejected.length;run.errors=reports.filter(row=>row.error).map(row=>({taskId:row.taskId,segment:row.segment,...row.error}));currentWorkspace.budgets.discoveryCollector={day:now().toISOString().slice(0,10),...runtime.snapshot()};return state;});
    return findRun(read().workspaces[workspaceId],runId);
  }
  async function start(workspaceId,options={}){
    const workspace=read().workspaces[workspaceId];if(!workspace)throw new Error('Workspace not found.');phaseAConfigForWorkspace(workspace);assertSerperReady(serperSettings(env));const settings=discoverySettings(env),requested=positiveInteger(options.queryCap,60),queryCap=requested||settings.maxQueries;if(!queryCap)throw new Error('Set DISCOVERY_MAX_SERPER_QUERIES_PER_RUN to a positive value up to 60.');
    if(workspace.runs.some(row=>row.type==='company_discovery'&&['queued','running'].includes(row.status)))throw new Error('A discovery run is already active.');
    const run={schemaVersion:1,id:id(),type:'company_discovery',status:'queued',profileRevision:workspace.profileRevision||0,startedAt:now().toISOString(),finishedAt:'',queryCap,serperQueries:0,tasks:[],rawFound:0,passedNoiseGate:0,newAccounts:0,newAccountIds:[],rejectedCount:0,errors:[]};
    run.strategy=options.strategy||((workspace.universeSeeds||[]).length?'icp_queries':'trigger_first');
    await mutate(state=>{state.workspaces[workspaceId].runs.push(run);return state;});
    const promise=Promise.resolve().then(()=>execute(workspaceId,run.id)).catch(async error=>{try{await updateRun(workspaceId,run.id,saved=>{saved.status='failed';saved.finishedAt=now().toISOString();saved.errors.push(safeError(error));});}catch{}return null;}).finally(()=>pending.delete(run.id));pending.set(run.id,promise);return run;
  }
  async function wait(runId){if(pending.has(runId))await pending.get(runId);for(const workspace of Object.values(read().workspaces)){const run=findRun(workspace,runId);if(run)return structuredClone(run);}return null;}
  return {start,wait};
}

module.exports={assertDiscoveryReady,createDiscoveryCoordinator,discoverySettings,safeError};
