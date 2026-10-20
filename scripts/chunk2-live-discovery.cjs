'use strict';

const path=require('node:path');
const {loadEnv}=require('./env.cjs');
const {CollectorRuntime}=require('./collectors/runtime.cjs');
const {createDiscoveryCoordinator}=require('./discovery-runner.cjs');
const {loadResolveReferenceDemo,REFERENCE_WORKSPACE_ID}=require('./reference-demo.cjs');
const {atomicWrite,loadState,saveState,statePath}=require('./server/state.cjs');
const {phaseAConfigForWorkspace}=require('./phase-a-config.cjs');
const {sameEntity}=require('./entity-rules.cjs');

async function main(){
  loadEnv(path.resolve(__dirname,'../.env'));if(process.env.OPENAI_ENABLED==='true')throw new Error('Chunk 2 discovery refuses to run while OpenAI is enabled.');
  if(!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(String(process.env.CRAWLER_CONTACT_EMAIL||'')))throw new Error('Set CRAWLER_CONTACT_EMAIL before live discovery.');
  const file=statePath(process.env);let state=loadResolveReferenceDemo(loadState(file));saveState(state,file);
  const workspace=state.workspaces[REFERENCE_WORKSPACE_ID],month=new Date().toISOString().slice(0,7),alreadyUsed=workspace.budgets.serperQueries?.month===month?workspace.budgets.serperQueries.queries:0;
  process.env.DISCOVERY_MAX_SERPER_QUERIES_PER_RUN='60';process.env.DISCOVERY_TARGET_COUNT='25';process.env.SERPER_MONTHLY_QUERY_LIMIT=String(alreadyUsed+60);
  let writes=Promise.resolve(),read=()=>loadState(file),mutate=fn=>{const work=writes.then(()=>{const next=fn(read());saveState(next,file);return next;});writes=work.catch(()=>{});return work;};
  const coordinator=createDiscoveryCoordinator({read,mutate,env:process.env,runtimeFactory:options=>new CollectorRuntime({...options,cacheDir:path.join(path.dirname(file),'collector-cache')})});
  const started=await coordinator.start(REFERENCE_WORKSPACE_ID),run=await coordinator.wait(started.id),saved=read().workspaces[REFERENCE_WORKSPACE_ID],config=phaseAConfigForWorkspace(saved),accounts=run.newAccountIds.map(id=>saved.accounts.find(row=>row.id===id)).filter(Boolean);
  const forbidden=[config.seller,...config.customers,...config.competitors],leaks=accounts.filter(account=>forbidden.some(row=>sameEntity(account,row,config.entityRules))).map(row=>row.name);
  const report={schemaVersion:1,capturedAt:new Date().toISOString(),workspaceId:REFERENCE_WORKSPACE_ID,runId:run.id,status:run.status,serperQueries:run.serperQueries,openAiCalls:0,rawFound:run.rawFound,passedNoiseGate:run.passedNoiseGate,newAccounts:accounts.length,errors:run.errors,forbiddenLeaks:leaks,accounts:accounts.map(row=>({name:row.name,domain:row.domain,segment:row.icpSegment,sourceUrl:row.sourceUrl,status:row.status,tier:row.tier,fitScore:row.fitScore}))};
  atomicWrite(path.join(path.dirname(file),'chunk2-discovery-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({status:run.status,serperQueries:run.serperQueries,openAiCalls:0,newAccounts:accounts.length,forbiddenLeaks:leaks.length}));
}

main().catch(error=>{console.error(JSON.stringify({status:'failed',code:error.code||'CHUNK2_DISCOVERY_FAILED',message:error.message,statusCode:Number.isInteger(error.status)?error.status:null}));process.exitCode=1;});
