const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');

const {loadEnv}=require('./env.cjs');
const {loadState,saveState,getWorkspace,atomicWrite}=require('./server/state.cjs');
const {createLlm,estimatedUsage,serializeRequestBody,MAX_REQUEST_BYTES,ENDPOINT}=require('./llm.cjs');
const {measureStructuredOutputSchema,assertStructuredOutputSchemaWithinLimits}=require('./openai-schema.cjs');
const {createSynthesisCoordinator}=require('./onboarding/synthesis-runner.cjs');
const {buildSynthesisRequest,PROMPT_VERSION}=require('./onboarding/synthesize.cjs');
const {COMPANIES,createPersistentAdapter,snapshotFor,actualCostUsd}=require('./stage2-recovery-acceptance.cjs');
const {ACCEPTANCE_STATE_FILE,workspaceForCompany,preparedState,auditWorkspace}=require('./stage2-packet-redraft.cjs');

const ROOT=path.resolve(__dirname,'..');
const WORKING_STATE_FILE=path.join(ROOT,'.whynow','stage2-fixed-schema-redraft-state.json');
const REPORT_FILE=path.join(ROOT,'.whynow','stage2-fixed-schema-redraft-report.json');
const RUN_MARKER_FILE=path.join(ROOT,'.whynow','stage2-fixed-schema-redraft-started.json');
const SNAPSHOT_DIR=path.join(ROOT,'tests','fixtures','onboarding');
const PROCESS_CAP_USD=0.05;
const ESTIMATE_STOP_USD=0.04;
const AUTHORIZED_SCHEMA_COMMIT='6fd10a4c11316dbce11839cfd48d4301b327ee56';

function loadedEnvironment(){const env={};loadEnv(path.join(ROOT,'.env'),env);return env;}
function commitHash(){return execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim();}
function providerDefaults(){const env=loadedEnvironment();return {openaiDisabled:env.OPENAI_ENABLED==='false',openaiLocalLimitZero:Number(env.OPENAI_MONTHLY_LIMIT_USD)===0};}
function estimateFor(state,company){
  const workspace=workspaceForCompany(state,company),built=buildSynthesisRequest(state,workspace.id);
  const metrics=assertStructuredOutputSchemaWithinLimits(built.request.schema);
  const body=serializeRequestBody({model:'gpt-4o-mini',messages:built.request.messages,schema:built.request.schema,name:built.request.name,maxOutputTokens:built.request.maxOutputTokens});
  const requestBytes=Buffer.byteLength(body),usage=estimatedUsage({bodyBytes:requestBytes,maxOutputTokens:built.request.maxOutputTokens});
  if(requestBytes>MAX_REQUEST_BYTES)throw new Error(`${company.name}: request exceeds the local ${MAX_REQUEST_BYTES}-byte ceiling.`);
  return {company:company.name,domain:company.domain,workspaceId:workspace.id,packetBytes:built.evidence.bytes,receiptCount:built.evidence.receiptCount,requestBytes,
    schemaLimitCheck:{passes:true,enumValues:metrics.enumValues,largestEnumStringLength:metrics.largestEnumStringLength,objectProperties:metrics.objectProperties,nestingLevels:metrics.nestingLevels,schemaStringLength:metrics.schemaStringLength},
    estimatedInputTokens:usage.inputTokens,estimatedInputCostUsd:Number((usage.inputMicros/1e6).toFixed(6)),maxOutputTokens:usage.maxOutputTokens,
    maxOutputCostUsd:Number((usage.outputMicros/1e6).toFixed(6)),estimatedMaxCostUsd:Number((usage.reserveMicros/1e6).toFixed(6))};
}
function preflight(){
  if(fs.existsSync(RUN_MARKER_FILE)||fs.existsSync(REPORT_FILE))throw new Error('The authorized fixed-schema redraft has already started or completed.');
  if(commitHash()!==AUTHORIZED_SCHEMA_COMMIT)throw new Error(`Run this authorization from fixed-schema commit ${AUTHORIZED_SCHEMA_COMMIT.slice(0,7)}.`);
  const env=loadedEnvironment(),defaults=providerDefaults();
  if(!defaults.openaiDisabled||!defaults.openaiLocalLimitZero)throw new Error('Normal local OpenAI settings must be disabled with a zero local limit before the bounded run.');
  if(!env.OPENAI_API_KEY?.trim())throw new Error('The local OpenAI key is missing.');
  const state=preparedState(loadState(ACCEPTANCE_STATE_FILE)),estimates=COMPANIES.map(company=>estimateFor(state,company));
  const totals={packetBytes:estimates.reduce((sum,item)=>sum+item.packetBytes,0),requestBytes:estimates.reduce((sum,item)=>sum+item.requestBytes,0),
    estimatedInputTokens:estimates.reduce((sum,item)=>sum+item.estimatedInputTokens,0),estimatedInputCostUsd:Number(estimates.reduce((sum,item)=>sum+item.estimatedInputCostUsd,0).toFixed(6)),
    estimatedMaxCostUsd:Number(estimates.reduce((sum,item)=>sum+item.estimatedMaxCostUsd,0).toFixed(6))};
  if(totals.estimatedMaxCostUsd>ESTIMATE_STOP_USD)throw new Error(`Estimated maximum cost $${totals.estimatedMaxCostUsd.toFixed(6)} exceeds the authorized $${ESTIMATE_STOP_USD.toFixed(2)} stop threshold.`);
  return {state,estimates,totals,providerDefaultsBeforeRun:defaults,pageFetches:0,serperQueries:0,logicalGptCalls:3,processCapUsd:PROCESS_CAP_USD};
}
function costByCompany(apiUsage){return Object.fromEntries(COMPANIES.map(company=>[company.name,Number(actualCostUsd(apiUsage.filter(item=>item.company===company.name)).toFixed(6))]));}
function writeFailureReport({startedAt,check,adapter,currentCompany,logicalCalls,providerAttempts,apiUsage,error}){
  const state=adapter.read(),workspace=workspaceForCompany(state,COMPANIES.find(item=>item.name===currentCompany)),safeError=workspace.research?.synthesisJob?.error||{code:error?.code||'RUN_FAILED',message:'The bounded run stopped.'};
  const report={schemaVersion:1,status:'failed',startedAt,stoppedAt:new Date().toISOString(),authorizedOn:'2026-10-19',authorizedSchemaCommit:AUTHORIZED_SCHEMA_COMMIT,
    commitHash:commitHash(),model:'gpt-4o-mini',promptVersion:PROMPT_VERSION,pageFetches:0,serperQueries:0,logicalGptCalls:logicalCalls,providerAttempts,
    processCapUsd:PROCESS_CAP_USD,estimates:check.estimates,estimateTotals:check.totals,stoppedAtSeller:currentCompany,safeError,
    actualCostUsd:Number(actualCostUsd(apiUsage).toFixed(6)),actualCostComplete:false,apiUsage,autoApproved:false,acceptanceStateChanged:false,providerDefaultsAfterRun:providerDefaults()};
  atomicWrite(REPORT_FILE,`${JSON.stringify(report,null,2)}\n`);return report;
}
function finalizeRecoveredOutputs(){
  if(!fs.existsSync(RUN_MARKER_FILE)||!fs.existsSync(WORKING_STATE_FILE))throw new Error('The fixed-schema run state is missing.');
  if(fs.existsSync(REPORT_FILE))throw new Error('The fixed-schema run already has a report.');
  if(commitHash()!==AUTHORIZED_SCHEMA_COMMIT)throw new Error(`Finalize from fixed-schema commit ${AUTHORIZED_SCHEMA_COMMIT.slice(0,7)}.`);
  const marker=JSON.parse(fs.readFileSync(RUN_MARKER_FILE,'utf8')),finalState=loadState(WORKING_STATE_FILE);
  const estimates=COMPANIES.map(company=>estimateFor(preparedState(loadState(ACCEPTANCE_STATE_FILE)),company));
  const totals={packetBytes:estimates.reduce((sum,item)=>sum+item.packetBytes,0),requestBytes:estimates.reduce((sum,item)=>sum+item.requestBytes,0),
    estimatedInputTokens:estimates.reduce((sum,item)=>sum+item.estimatedInputTokens,0),estimatedInputCostUsd:Number(estimates.reduce((sum,item)=>sum+item.estimatedInputCostUsd,0).toFixed(6)),
    estimatedMaxCostUsd:Number(estimates.reduce((sum,item)=>sum+item.estimatedMaxCostUsd,0).toFixed(6))};
  const commit=commitHash(),snapshots=[],audits=[];let providerAttempts=0,reservedMicros=0;
  for(const company of COMPANIES){
    const workspace=workspaceForCompany(finalState,company),job=workspace.research?.synthesisJob,usage=workspace.budgets?.openai;
    if(workspace.status!=='needs_review'||workspace.research?.status!=='review_required'||job?.status!=='complete'||job?.cached)throw new Error(`${company.name}: no completed uncached review draft is available to finalize.`);
    if(usage?.calls!==1)throw new Error(`${company.name}: expected exactly one provider attempt in recovered state.`);
    providerAttempts+=usage.calls;reservedMicros+=usage.reservedMicros||0;
    const snapshot={...snapshotFor(workspace,{capturedOn:new Date().toISOString(),commit}),source:'Recovered offline from the completed owner-authorized saved-pages-only Stage 2 redraft using the fixed evidence packet and fixed receipt schema; no additional provider call was made during finalization.'};
    const snapshotFile=path.join(SNAPSHOT_DIR,`${company.slug}-live-icp.json`);atomicWrite(snapshotFile,`${JSON.stringify(snapshot,null,2)}\n`);snapshots.push(path.relative(ROOT,snapshotFile));
    audits.push({...auditWorkspace(workspace,company),actualCostUsd:null});
  }
  saveState(finalState,ACCEPTANCE_STATE_FILE);
  const after=providerDefaults();if(!after.openaiDisabled||!after.openaiLocalLimitZero)throw new Error('Normal local OpenAI settings were not restored to disabled and zero.');
  const report={schemaVersion:1,status:'complete_recovered_after_local_finalize_error',startedAt:marker.startedAt,completedAt:new Date().toISOString(),authorizedOn:'2026-10-19',authorizedSchemaCommit:AUTHORIZED_SCHEMA_COMMIT,
    commitHash:commit,model:'gpt-4o-mini',promptVersion:PROMPT_VERSION,pageFetches:0,serperQueries:0,logicalGptCalls:3,providerAttempts,processCapUsd:PROCESS_CAP_USD,
    estimates,estimateTotals:totals,actualCostUsd:null,actualCostComplete:false,actualCostUnavailableReason:'All three provider calls succeeded, but a local snapshot-path error ended the process before its in-memory API usage array was written. No repeat call was made.',
    conservativeReservedCostUsd:Number((reservedMicros/1e6).toFixed(6)),apiUsage:null,snapshots,audits,autoApproved:false,providerDefaultsAfterRun:after};
  atomicWrite(REPORT_FILE,`${JSON.stringify(report,null,2)}\n`);return {stateFile:ACCEPTANCE_STATE_FILE,reportFile:REPORT_FILE,report};
}
async function run(){
  const check=preflight(),startedAt=new Date().toISOString();
  atomicWrite(RUN_MARKER_FILE,`${JSON.stringify({schemaVersion:1,startedAt,authorizedOn:'2026-10-19',authorizedSchemaCommit:AUTHORIZED_SCHEMA_COMMIT,logicalGptCalls:3,pageFetches:0,serperQueries:0,processCapUsd:PROCESS_CAP_USD},null,2)}\n`);
  saveState(check.state,WORKING_STATE_FILE);
  const adapter=createPersistentAdapter(WORKING_STATE_FILE),loaded=loadedEnvironment();
  const paidEnv={...loaded,OPENAI_ENABLED:'true',OPENAI_MONTHLY_LIMIT_USD:String(PROCESS_CAP_USD),OPENAI_WORKSPACE_MONTHLY_CALL_LIMIT:'2',OPENAI_MODEL:'gpt-4o-mini'};
  let currentCompany='unknown',logicalCalls=0,providerAttempts=0;const apiUsage=[];
  const fetchImpl=async(url,options)=>{
    if(url!==ENDPOINT)throw new Error('The fixed-schema redraft may contact only the approved OpenAI endpoint.');
    providerAttempts++;const response=await fetch(url,options);
    if(response.ok)try{const payload=await response.clone().json(),usage=payload.usage||{};apiUsage.push({company:currentCompany,model:payload.model||'gpt-4o-mini',promptTokens:usage.prompt_tokens||0,completionTokens:usage.completion_tokens||0,totalTokens:usage.total_tokens||0});}catch{}
    return response;
  };
  const llm=createLlm({...adapter,env:paidEnv,fetchImpl}),countedLlm={generate:request=>{logicalCalls++;if(logicalCalls>3)throw new Error('This authorization permits exactly three logical GPT calls.');return llm.generate(request);}};
  const synthesis=createSynthesisCoordinator({...adapter,llm:countedLlm}),generated=[];
  for(const company of COMPANIES){
    currentCompany=company.name;const workspace=workspaceForCompany(adapter.read(),company);
    try{
      await synthesis.start(workspace.id);
      const result=getWorkspace(adapter.read(),workspace.id);
      if(result.status!=='needs_review'||result.research?.status!=='review_required')throw new Error(`${company.name}: generated profile was not persisted in needs_review.`);
      generated.push({company,workspaceId:workspace.id});
    }catch(error){await adapter.settled();writeFailureReport({startedAt,check,adapter,currentCompany,logicalCalls,providerAttempts,apiUsage,error});throw error;}
  }
  await adapter.settled();
  if(logicalCalls!==3)throw new Error(`Expected exactly three logical GPT calls; saw ${logicalCalls}.`);
  const finalState=adapter.read(),costs=costByCompany(apiUsage),audits=COMPANIES.map(company=>({...auditWorkspace(workspaceForCompany(finalState,company),company),actualCostUsd:costs[company.name]}));
  if(audits.some(item=>item.status!=='needs_review'))throw new Error('Every profile must remain in needs_review.');
  const commit=commitHash(),snapshots=[];
  for(const {company,workspaceId} of generated){
    const workspace=getWorkspace(finalState,workspaceId),snapshot={...snapshotFor(workspace,{capturedOn:new Date().toISOString(),commit}),source:'Owner-authorized saved-pages-only Stage 2 redraft using the fixed evidence packet and fixed receipt schema; no page fetches and no Serper queries.'};
    const snapshotFile=path.join(SNAPSHOT_DIR,`${company.slug}-live-icp.json`);atomicWrite(snapshotFile,`${JSON.stringify(snapshot,null,2)}\n`);snapshots.push(path.relative(ROOT,snapshotFile));
  }
  saveState(finalState,ACCEPTANCE_STATE_FILE);
  const after=providerDefaults();if(!after.openaiDisabled||!after.openaiLocalLimitZero)throw new Error('Normal local OpenAI settings were not restored to disabled and zero.');
  const report={schemaVersion:1,status:'complete',startedAt,completedAt:new Date().toISOString(),authorizedOn:'2026-10-19',authorizedSchemaCommit:AUTHORIZED_SCHEMA_COMMIT,
    commitHash:commit,model:'gpt-4o-mini',promptVersion:PROMPT_VERSION,pageFetches:0,serperQueries:0,logicalGptCalls:logicalCalls,providerAttempts,
    processCapUsd:PROCESS_CAP_USD,estimates:check.estimates,estimateTotals:check.totals,actualCostUsd:Number(actualCostUsd(apiUsage).toFixed(6)),actualCostComplete:apiUsage.length===3,
    apiUsage,snapshots,audits,autoApproved:false,providerDefaultsAfterRun:after};
  atomicWrite(REPORT_FILE,`${JSON.stringify(report,null,2)}\n`);return {stateFile:ACCEPTANCE_STATE_FILE,reportFile:REPORT_FILE,report};
}
async function main(){
  if(process.argv[2]==='--preflight'){const {state:ignored,...report}=preflight();console.log(JSON.stringify(report,null,2));}
  else if(process.argv[2]==='--run')console.log(JSON.stringify(await run(),null,2));
  else if(process.argv[2]==='--finalize-recovered')console.log(JSON.stringify(finalizeRecoveredOutputs(),null,2));
  else throw new Error('Use --preflight, --run or --finalize-recovered.');
}
if(require.main===module)main().catch(error=>{console.error(`[failed] ${error.message}`);process.exitCode=1;});

module.exports={ROOT,WORKING_STATE_FILE,REPORT_FILE,RUN_MARKER_FILE,SNAPSHOT_DIR,PROCESS_CAP_USD,ESTIMATE_STOP_USD,AUTHORIZED_SCHEMA_COMMIT,providerDefaults,estimateFor,preflight,costByCompany,finalizeRecoveredOutputs,run};
