'use strict';

const {randomUUID}=require('node:crypto');
const {discoverySettings}=require('./discovery-runner.cjs');
const {refreshAllSettings}=require('./refresh-all-runner.cjs');

const HARD_MAX_PREPARE_DEMO_SERPER_QUERIES=150;
function positiveInteger(value,max){const number=Number(value);return Number.isInteger(number)&&number>0?Math.min(max,number):0;}
function prepareDemoSettings(env={}){return {maxQueries:positiveInteger(env.PREPARE_DEMO_MAX_SERPER_QUERIES_PER_RUN,HARD_MAX_PREPARE_DEMO_SERPER_QUERIES)||HARD_MAX_PREPARE_DEMO_SERPER_QUERIES};}
function findRun(workspace,id){return workspace.runs.find(row=>row.type==='prepare_demo'&&row.id===id);}
function safeError(error){return {code:String(error?.code||'PREPARE_DEMO_FAILED'),message:String(error?.message||'Prepare demo failed.').slice(0,300),status:Number.isInteger(error?.status)?error.status:null};}

function createPrepareDemoCoordinator({read,mutate,discoveryCoordinator,refreshAllCoordinator,env=process.env,now=()=>new Date(),id=()=>randomUUID()}={}){
  if(!discoveryCoordinator?.start||!discoveryCoordinator?.wait||!refreshAllCoordinator?.start||!refreshAllCoordinator?.wait)throw new Error('Discovery and refresh-all coordinators are required.');
  const pending=new Map(),updateRun=(workspaceId,runId,fn)=>mutate(state=>{const workspace=state.workspaces[workspaceId],run=findRun(workspace,runId);if(!run)throw new Error('Prepare-demo run disappeared.');fn(run,workspace);return state;});
  async function execute(workspaceId,runId){
    const initial=read().workspaces[workspaceId],runSettings=findRun(initial,runId),triggerFirst=runSettings.strategy==='trigger_first',lookalike=runSettings.strategy==='lookalike',settings={maxQueries:runSettings.queryCap},discovered=initial.accounts.filter(row=>row.discoveryQuality?.sourceKind).length,target=Math.max(discovered,discoverySettings(env).targetCount),perAccount=refreshAllSettings(env).perAccountQueries,discoveryCap=triggerFirst?Math.min(40,settings.maxQueries-10*perAccount):Math.min(60,settings.maxQueries-(target*perAccount));
    if(discoveryCap<1)throw new Error(`The ${settings.maxQueries}-query cap cannot cover discovery and ${target} account refreshes.`);
    await updateRun(workspaceId,runId,run=>{run.status='running';run.stage='discovery';run.progress={completed:0,total:3,label:'Discovering prospects'};run.discoveryQueryCap=discoveryCap;});
    const discovery=await discoveryCoordinator.start(workspaceId,lookalike?{strategy:'lookalike'}:triggerFirst?{queryCap:discoveryCap,strategy:'trigger_first'}:{queryCap:discoveryCap}),discoveryResult=await discoveryCoordinator.wait(discovery.id);
    if(!discoveryResult||discoveryResult.status==='failed')throw new Error('Discovery did not complete successfully.');
    await updateRun(workspaceId,runId,run=>{run.discoveryRunId=discoveryResult.id;run.serperQueries=Number(discoveryResult.serperQueries||0);run.apolloCalls=Number(discoveryResult.apolloCalls||0);run.stage='refresh_all';run.progress={completed:1,total:3,label:'Refreshing discovered accounts'};});
    const remaining=settings.maxQueries-Number(discoveryResult.serperQueries||0),eligible=read().workspaces[workspaceId].accounts.filter(row=>row.discoveryQuality?.sourceKind&&(!triggerFirst||row.discoveryQuality.quality==='first_party_operating_company'&&!row.kills?.length)).slice(0,triggerFirst?10:Infinity),accountCount=eligible.length;
    if(!accountCount){await updateRun(workspaceId,runId,run=>{run.status='complete_with_errors';run.stage='reranked';run.finishedAt=now().toISOString();run.accountsPrepared=0;run.errors.push({code:'NO_VERIFIED_BUYERS',message:'No verified buyer companies passed discovery; no refresh calls were made.'});run.progress={completed:3,total:3,label:'No verified buyers; review discovery rejections'};});return findRun(read().workspaces[workspaceId],runId);}
    if(accountCount*perAccount>remaining)throw new Error(`Refreshing ${accountCount} discovered accounts could exceed the ${settings.maxQueries}-query prepare-demo cap.`);
    const refresh=await refreshAllCoordinator.start(workspaceId,triggerFirst?{queryCap:remaining,accountIds:eligible.map(row=>row.id)}:{queryCap:remaining}),refreshResult=await refreshAllCoordinator.wait(refresh.id);
    if(!refreshResult||refreshResult.status==='failed')throw new Error('Refresh all did not complete successfully.');
    await updateRun(workspaceId,runId,run=>{run.refreshAllRunId=refreshResult.id;run.serperQueries+=Number(refreshResult.serperQueries||0);run.stage='reranked';run.progress={completed:3,total:3,label:'Discovery, collection and ranking complete'};run.status=refreshResult.status==='complete_with_errors'||discoveryResult.status==='complete_with_errors'?'complete_with_errors':'complete';run.finishedAt=now().toISOString();run.accountsPrepared=Number(refreshResult.completedAccounts||0);run.errors=[...(discoveryResult.errors||[]),...(refreshResult.errors||[])];});
    return findRun(read().workspaces[workspaceId],runId);
  }
  async function start(workspaceId){
    const workspace=read().workspaces[workspaceId];if(!workspace)throw new Error('Workspace not found.');
    if(workspace.status!=='active'||!workspace.sellerProfile?.approvedAt)throw new Error('Prepare demo requires an owner-approved workspace.');
    if(String(env.OPENAI_ENABLED).toLowerCase()==='true')throw new Error('Turn OpenAI off before preparing a demo. Drafts are a separate manual action.');
    if(workspace.runs.some(row=>row.type==='prepare_demo'&&['queued','running'].includes(row.status)))throw new Error('Prepare demo is already running.');
    const run={schemaVersion:1,id:id(),type:'prepare_demo',status:'queued',stage:'queued',startedAt:now().toISOString(),finishedAt:'',queryCap:prepareDemoSettings(env).maxQueries,serperQueries:0,discoveryQueryCap:0,discoveryRunId:'',refreshAllRunId:'',accountsPrepared:0,progress:{completed:0,total:3,label:'Queued'},errors:[]};
    run.strategy=workspace.referenceDemo?.loadOnly?'icp_queries':workspace.discoveryStrategy||'lookalike';if(run.strategy==='trigger_first')run.queryCap=Math.min(100,run.queryCap);
    await mutate(state=>{state.workspaces[workspaceId].runs.push(run);return state;});
    const promise=Promise.resolve().then(()=>execute(workspaceId,run.id)).catch(async error=>{try{await updateRun(workspaceId,run.id,saved=>{saved.status='failed';saved.finishedAt=now().toISOString();saved.errors.push(safeError(error));});}catch{}return null;}).finally(()=>pending.delete(run.id));pending.set(run.id,promise);return run;
  }
  async function wait(runId){if(pending.has(runId))await pending.get(runId);for(const workspace of Object.values(read().workspaces)){const run=findRun(workspace,runId);if(run)return structuredClone(run);}return null;}
  return {start,wait};
}

module.exports={HARD_MAX_PREPARE_DEMO_SERPER_QUERIES,createPrepareDemoCoordinator,prepareDemoSettings,safeError};
