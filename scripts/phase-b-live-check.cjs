'use strict';

const path=require('node:path');
const {loadEnv}=require('./env.cjs');
const {loadState,saveState,statePath,atomicWrite}=require('./server/state.cjs');
const {loadResolveReferenceDemo,REFERENCE_WORKSPACE_ID}=require('./reference-demo.cjs');
const {addManualAccountToState}=require('./accounts.cjs');
const {sameEntity}=require('./entity-rules.cjs');
const {createPhaseBRefreshCoordinator}=require('./phase-b-runner.cjs');
const {CollectorRuntime}=require('./collectors/runtime.cjs');
const {serperSettings,assertSerperReady}=require('./serper.cjs');
const {SIGNAL_KEYS}=require('./signal-rubric.cjs');

const PROSPECTS=[
  {name:'Databricks',domain:'databricks.com',segment:'data_ai_infrastructure',sourceUrl:'https://www.databricks.com/company/about-us'},
  {name:'Uber Eats',domain:'ubereats.com',segment:'delivery_marketplaces',sourceUrl:'https://www.ubereats.com/'},
  {name:'Binance',domain:'binance.com',segment:'crypto_fintech',sourceUrl:'https://www.binance.com/en/about'},
  {name:'Replicate',domain:'replicate.com',segment:'data_ai_infrastructure',sourceUrl:'https://replicate.com/about'},
  {name:'DraftKings',domain:'draftkings.com',segment:'sports_betting',sourceUrl:'https://www.draftkings.com/about/'},
];

async function main(){
  loadEnv(path.resolve(__dirname,'../.env'));
  if(process.env.OPENAI_ENABLED==='true')throw new Error('Live Phase B verification refuses to run while OpenAI is enabled.');
  const email=String(process.env.CRAWLER_CONTACT_EMAIL||'');if(!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email))throw new Error('Set CRAWLER_CONTACT_EMAIL before live collector verification.');
  assertSerperReady(serperSettings(process.env));
  process.env.PHASE_B_MAX_SERPER_QUERIES_PER_ACCOUNT='5';
  process.env.PHASE_B_RESET_RUNTIME_BUDGETS='true';
  process.env.EDGAR_ENABLED='true';
  const stateFile=statePath(process.env),cacheDir=path.join(path.dirname(stateFile),'collector-cache');
  let writes=Promise.resolve(),read=()=>loadState(stateFile),mutate=fn=>{const work=writes.then(()=>{const next=fn(read());saveState(next,stateFile);return next;});writes=work.catch(()=>{});return work;};
  if(!read().workspaces[REFERENCE_WORKSPACE_ID])await mutate(state=>loadResolveReferenceDemo(state));
  else await mutate(state=>({...state,activeWorkspaceId:REFERENCE_WORKSPACE_ID}));
  for(const prospect of PROSPECTS){
    const state=read(),workspace=state.workspaces[REFERENCE_WORKSPACE_ID],existing=workspace.accounts.find(row=>sameEntity(row,prospect,workspace.icpConfig.entityRules||[]));
    if(!existing)await mutate(current=>addManualAccountToState(current,REFERENCE_WORKSPACE_ID,prospect));
  }
  const coordinator=createPhaseBRefreshCoordinator({read,mutate,env:process.env,runtimeFactory:options=>new CollectorRuntime({...options,cacheDir})});
  const results=[];
  for(const prospect of PROSPECTS){
    const workspace=read().workspaces[REFERENCE_WORKSPACE_ID],account=workspace.accounts.find(row=>sameEntity(row,prospect,workspace.icpConfig.entityRules||[])),started=await coordinator.start(REFERENCE_WORKSPACE_ID,account.id),run=await coordinator.wait(started.id),saved=read().workspaces[REFERENCE_WORKSPACE_ID].accounts.find(row=>row.id===account.id);
    results.push({
      name:saved.name,domain:saved.domain,segment:saved.icpSegment,runStatus:run.status,serperQueries:run.serperQueries,
      signals:Object.fromEntries(SIGNAL_KEYS.map(key=>{const row=saved.signals?.[key]||{};return [key,{score:Number(row.score||1),evidenceUrl:String(row.evidenceUrl||''),evidenceText:String(row.evidenceText||''),inferred:Boolean(row.inferred)}];})),
      triggers:(saved.triggers||[]).map(row=>({type:row.type||row.triggerType,title:row.title||'',evidenceUrl:row.evidenceUrl||'',occurredAt:row.occurredAt||row.detectedAt||''})),
      kills:(saved.kills||[]).map(row=>({code:row.code,reason:row.reason,evidenceUrl:row.evidenceUrl})),
      fitScore:saved.fitScore,tier:saved.tier,tierReason:saved.tierReason,tierProvisional:Boolean(saved.tierProvisional),priority:saved.priority,
      firmographics:{employeeCount:saved.firmographics?.employeeCount??null,revenueEstimate:saved.firmographics?.revenueEstimate??null,revenueBand:saved.firmographics?.revenueBand||'',fundingStage:saved.firmographics?.fundingStage||'',totalRaised:saved.firmographics?.totalRaised??null,valuation:saved.firmographics?.valuation??null,isPublic:saved.firmographics?.isPublic??null,confidence:saved.firmographics?.confidence??0,confidenceLabel:saved.firmographics?.confidenceLabel||'',fields:saved.firmographics?.fields||{}},
      collectorCounts:Object.fromEntries((run.collectors||[]).map(row=>[row.collectorId,{status:row.status,signals:row.signals,events:row.events,killHints:row.killHints,itemsFound:row.itemsFound}])),
      errors:run.errors||[],
    });
  }
  const report={schemaVersion:1,capturedAt:new Date().toISOString(),workspaceId:REFERENCE_WORKSPACE_ID,sourceCommit:read().workspaces[REFERENCE_WORKSPACE_ID].referenceDemo.sourceCommit,openAiCalls:0,totalSerperQueries:results.reduce((total,row)=>total+row.serperQueries,0),results};
  atomicWrite(path.join(path.dirname(stateFile),'phase-b-live-report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({status:'complete',companies:results.length,totalSerperQueries:report.totalSerperQueries,reportFile:path.join(path.dirname(stateFile),'phase-b-live-report.json')}));
}

main().catch(error=>{console.error(JSON.stringify({status:'failed',code:error.code||'LIVE_CHECK_FAILED',message:error.message,statusCode:Number.isInteger(error.status)?error.status:null}));process.exitCode=1;});
