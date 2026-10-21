'use strict';

const path=require('node:path');
const {loadEnv}=require('./env.cjs');
const {CollectorRuntime}=require('./collectors/runtime.cjs');
const {createPhaseBRefreshCoordinator}=require('./phase-b-runner.cjs');
const {createRefreshAllCoordinator}=require('./refresh-all-runner.cjs');
const {activeTriggers}=require('./decisioning.cjs');
const {todayQueue}=require('./account-lifecycle.cjs');
const {SIGNAL_KEYS}=require('./signal-rubric.cjs');
const {atomicWrite,loadState,saveState,statePath}=require('./server/state.cjs');
const {REFERENCE_WORKSPACE_ID}=require('./reference-demo.cjs');
const {assertSerperReady,serperSettings}=require('./serper.cjs');

function fitDistribution(accounts=[]){
  const scores=accounts.map(row=>Number(row.fitScore||0)).sort((a,b)=>a-b),buckets={'0-19':0,'20-39':0,'40-59':0,'60-79':0,'80-100':0};
  for(const score of scores)buckets[score<20?'0-19':score<40?'20-39':score<60?'40-59':score<80?'60-79':'80-100']+=1;
  return {count:scores.length,min:scores[0]??0,median:scores.length?scores[Math.floor((scores.length-1)/2)]:0,max:scores.at(-1)??0,buckets};
}
function accountSummary(account,now){
  const triggers=activeTriggers(account,now),top=triggers.sort((a,b)=>Date.parse(b.occurredAt||b.detectedAt||'')-Date.parse(a.occurredAt||a.detectedAt||''))[0]||null,unknownSignals=SIGNAL_KEYS.filter(key=>!account.signals?.[key]);
  return {id:account.id,name:account.name,domain:account.domain,status:account.status,tier:account.tier,tierProvisional:Boolean(account.tierProvisional),tierReason:account.tierReason||'',sizeReceipt:account.tierEvidenceReceipt||'',fitScore:Number(account.fitScore||0),fitConfidence:Number(account.fitConfidence||0),unknownSignals,activeTriggerCount:triggers.length,topWhyNow:top?{title:top.title||top.evidenceText||top.type,type:top.type||top.triggerType,occurredAt:top.occurredAt||top.detectedAt,evidenceUrl:top.evidenceUrl}:null,kills:(account.kills||[]).map(row=>({code:row.code,reason:row.reason,evidenceUrl:row.evidenceUrl}))};
}

async function main(){
  loadEnv(path.resolve(__dirname,'../.env'));if(process.env.OPENAI_ENABLED==='true')throw new Error('Refresh all refuses to run while OpenAI is enabled.');
  if(!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(String(process.env.CRAWLER_CONTACT_EMAIL||'')))throw new Error('Set CRAWLER_CONTACT_EMAIL before Refresh all.');assertSerperReady(serperSettings(process.env));
  const file=statePath(process.env),cacheDir=path.join(path.dirname(file),'collector-cache'),initial=loadState(file),workspace=initial.workspaces[REFERENCE_WORKSPACE_ID];if(!workspace)throw new Error('Load the Resolve reference demo first.');
  const discovered=workspace.accounts.filter(row=>row.discoveryQuality?.sourceKind);if(discovered.length!==25)throw new Error(`Expected 25 discovered accounts; found ${discovered.length}.`);
  const month=new Date().toISOString().slice(0,7),alreadyUsed=workspace.budgets.serperQueries?.month===month?workspace.budgets.serperQueries.queries:0;
  process.env.PHASE_B_MAX_SERPER_QUERIES_PER_ACCOUNT='5';process.env.REFRESH_ALL_MAX_SERPER_QUERIES_PER_RUN='150';process.env.SERPER_MONTHLY_QUERY_LIMIT=String(alreadyUsed+150);process.env.PHASE_B_RESET_RUNTIME_BUDGETS='true';process.env.EDGAR_ENABLED='true';
  let writes=Promise.resolve(),read=()=>loadState(file),mutate=fn=>{const work=writes.then(()=>{const next=fn(read());saveState(next,file);return next;});writes=work.catch(()=>{});return work;};
  const accountCoordinator=createPhaseBRefreshCoordinator({read,mutate,env:process.env,runtimeFactory:options=>new CollectorRuntime({...options,cacheDir})}),coordinator=createRefreshAllCoordinator({read,mutate,env:process.env,accountCoordinator});
  const started=await coordinator.start(REFERENCE_WORKSPACE_ID),run=await coordinator.wait(started.id),saved=read().workspaces[REFERENCE_WORKSPACE_ID],now=new Date(),refreshed=saved.accounts.filter(row=>run.accountIds.includes(row.id)),queue=todayQueue(saved,now),refreshedSummaries=refreshed.map(row=>accountSummary(row,now)),top10=queue.slice(0,10).map(row=>accountSummary(row,now));
  const report={schemaVersion:1,capturedAt:now.toISOString(),workspaceId:REFERENCE_WORKSPACE_ID,runId:run.id,status:run.status,queryCap:run.queryCap,serperQueries:run.serperQueries,openAiCalls:0,totalAccounts:run.totalAccounts,completedAccounts:run.completedAccounts,failedAccounts:run.failedAccounts,accountsWithActiveTrigger:refreshedSummaries.filter(row=>row.activeTriggerCount>0&&!row.kills.length&&row.status!=='skipped').length,todayAccountsWithActiveTrigger:queue.filter(row=>activeTriggers(row,now).length>0).length,fitDistribution:fitDistribution(refreshedSummaries),top10,accounts:refreshedSummaries,runErrors:run.errors,accountRuns:run.accountRuns};
  atomicWrite(path.join(path.dirname(file),'step1-refresh-all-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({status:run.status,accounts:run.totalAccounts,completed:run.completedAccounts,serperQueries:run.serperQueries,openAiCalls:0,accountsWithActiveTrigger:report.accountsWithActiveTrigger,top10:top10.map(row=>row.name)}));
}

main().catch(error=>{console.error(JSON.stringify({status:'failed',code:error.code||'REFRESH_ALL_LIVE_FAILED',message:error.message,statusCode:Number.isInteger(error.status)?error.status:null}));process.exitCode=1;});
