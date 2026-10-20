const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');

const {loadEnv}=require('./env.cjs');
const {loadState,saveState,getWorkspace,updateWorkspace,atomicWrite}=require('./server/state.cjs');
const {createLlm,estimatedUsage,serializeRequestBody,MAX_REQUEST_BYTES,ENDPOINT}=require('./llm.cjs');
const {createSynthesisCoordinator}=require('./onboarding/synthesis-runner.cjs');
const {buildSynthesisRequest,PROMPT_VERSION}=require('./onboarding/synthesize.cjs');
const {workspaceQualityFindings}=require('./onboarding/validate.cjs');
const {COMPANIES,createPersistentAdapter,snapshotFor,actualCostUsd}=require('./stage2-recovery-acceptance.cjs');

const ROOT=path.resolve(__dirname,'..');
const ACCEPTANCE_STATE_FILE=path.join(ROOT,'.whynow','acceptance-state.json');
const WORKING_STATE_FILE=path.join(ROOT,'.whynow','stage2-packet-redraft-state.json');
const REPORT_FILE=path.join(ROOT,'.whynow','stage2-packet-redraft-report.json');
const RUN_MARKER_FILE=path.join(ROOT,'.whynow','stage2-packet-redraft-started.json');
const SNAPSHOT_DIR=path.join(ROOT,'tests','fixtures','onboarding');
const PROCESS_CAP_USD=0.05;
const ESTIMATE_STOP_USD=0.04;
const AUTHORIZED_PACKET_COMMIT='68774af23c9268e6da4693beda23f95f9ae67f6c';

function loadedEnvironment() {const env={};loadEnv(path.join(ROOT,'.env'),env);return env;}
function commitHash() {return execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim();}
function normalizedDomain(value) {return String(value||'').toLowerCase().replace(/^www\./,'');}
function workspaceForCompany(state,company) {
  const workspace=Object.values(state.workspaces).find(item=>normalizedDomain(item.sellerProfile?.domain||item.research?.selectedCandidate?.domain)===company.domain);
  if(!workspace)throw new Error(`${company.name}: saved final-run workspace is missing.`);
  return workspace;
}
function firstParty(url,domain) {
  try{const host=new URL(url).hostname.toLowerCase().replace(/^www\./,'');return host===domain||host.endsWith(`.${domain}`);}catch{return false;}
}
function prepareWorkspace(state,id,company) {
  return updateWorkspace(state,id,workspace=>{
    if(workspace.status!=='needs_review'||workspace.research?.status!=='review_required')throw new Error(`${company.name}: expected the saved final-run profile in needs_review.`);
    if(!(workspace.research?.sources||[]).length)throw new Error(`${company.name}: saved final-run sources are missing.`);
    workspace.status='draft';workspace.deliveryMode='demo';workspace.llmCache={};workspace.budgets.openai={};
    workspace.sellerProfile={schemaVersion:1,deliveryAllowed:false};workspace.icpConfig={schemaVersion:1};
    workspace.research={...workspace.research,status:'evidence_ready',revision:(workspace.research.revision||0)+1,runId:`packet-redraft-${company.slug}`,
      synthesis:null,synthesisJob:null,error:null,steps:(workspace.research.steps||[]).map(step=>({...step,status:step.key==='identify'||step.key==='research'?'complete':'not_started'}))};
  });
}
function preparedState(source) {
  let state=structuredClone(source);
  for(const company of COMPANIES)state=prepareWorkspace(state,workspaceForCompany(state,company).id,company);
  return state;
}
function estimateFor(state,company) {
  const workspace=workspaceForCompany(state,company),built=buildSynthesisRequest(state,workspace.id);
  const body=serializeRequestBody({model:'gpt-4o-mini',messages:built.request.messages,schema:built.request.schema,name:built.request.name,maxOutputTokens:built.request.maxOutputTokens});
  const requestBytes=Buffer.byteLength(body),usage=estimatedUsage({bodyBytes:requestBytes,maxOutputTokens:built.request.maxOutputTokens});
  if(requestBytes>MAX_REQUEST_BYTES)throw new Error(`${company.name}: request exceeds the local ${MAX_REQUEST_BYTES}-byte ceiling.`);
  return {company:company.name,domain:company.domain,workspaceId:workspace.id,packetBytes:built.evidence.bytes,requestBytes,
    estimatedInputTokens:usage.inputTokens,estimatedInputCostUsd:Number((usage.inputMicros/1e6).toFixed(6)),
    maxOutputTokens:usage.maxOutputTokens,maxOutputCostUsd:Number((usage.outputMicros/1e6).toFixed(6)),estimatedMaxCostUsd:Number((usage.reserveMicros/1e6).toFixed(6))};
}
function preflight() {
  if(fs.existsSync(RUN_MARKER_FILE)||fs.existsSync(REPORT_FILE))throw new Error('The authorized saved-pages packet redraft has already started or completed.');
  if(commitHash()!==AUTHORIZED_PACKET_COMMIT)throw new Error(`Run this authorization from fixed-packet commit ${AUTHORIZED_PACKET_COMMIT.slice(0,7)}.`);
  const env=loadedEnvironment();
  if(env.OPENAI_ENABLED!=='false'||Number(env.OPENAI_MONTHLY_LIMIT_USD)!==0)throw new Error('Normal local OpenAI settings must be disabled with a zero local limit before the bounded run.');
  if(!env.OPENAI_API_KEY?.trim())throw new Error('The local OpenAI key is missing.');
  const state=preparedState(loadState(ACCEPTANCE_STATE_FILE)),estimates=COMPANIES.map(company=>estimateFor(state,company));
  const totals={packetBytes:estimates.reduce((sum,item)=>sum+item.packetBytes,0),requestBytes:estimates.reduce((sum,item)=>sum+item.requestBytes,0),
    estimatedInputTokens:estimates.reduce((sum,item)=>sum+item.estimatedInputTokens,0),estimatedInputCostUsd:Number(estimates.reduce((sum,item)=>sum+item.estimatedInputCostUsd,0).toFixed(6)),
    estimatedMaxCostUsd:Number(estimates.reduce((sum,item)=>sum+item.estimatedMaxCostUsd,0).toFixed(6))};
  if(totals.estimatedMaxCostUsd>ESTIMATE_STOP_USD)throw new Error(`Estimated maximum cost $${totals.estimatedMaxCostUsd.toFixed(6)} exceeds the authorized $${ESTIMATE_STOP_USD.toFixed(2)} stop threshold.`);
  return {state,estimates,totals,providerDefaultsBeforeRun:{openaiDisabled:true,openaiLocalLimitZero:true},pageFetches:0,serperQueries:0,logicalGptCalls:3,processCapUsd:PROCESS_CAP_USD};
}
function auditWorkspace(workspace,company) {
  const findings=workspaceQualityFindings(workspace),blocking=findings.filter(item=>item.severity==='blocking'),advisory=findings.filter(item=>item.severity==='advisory');
  const reasons=new Map();for(const finding of blocking){const key=`${finding.code}: ${finding.message}`;reasons.set(key,(reasons.get(key)||0)+1);}
  return {company:company.name,domain:company.domain,status:workspace.status,
    customers:(workspace.sellerProfile.customers||[]).map(item=>({name:item.name,domain:item.domain,sourceUrl:item.sourceUrl,firstPartySource:firstParty(item.sourceUrl,company.domain)})),
    competitors:(workspace.sellerProfile.competitors||[]).map(item=>({name:item.name,domain:item.domain,sourceUrl:item.sourceUrl,sourcePresent:Boolean(item.sourceUrl)})),
    targetCompanySize:workspace.sellerProfile.targetCompanySize||'',sizeMetric:structuredClone(workspace.icpConfig.killPatterns?.sizeMetric||{}),
    sizeMatchesTarget:!blocking.some(item=>item.code==='SIZE_METRIC_UNMEASURABLE'||item.code==='SIZE_FLOOR_CONTRADICTS_TARGET'),
    buyerTitles:[...(workspace.icpConfig.personas?.buyerTitles||[])],championTitles:[...(workspace.icpConfig.personas?.championTitles||[])],
    blockingWarnings:blocking.length,advisoryWarnings:advisory.length,
    topBlockingReasons:[...reasons].map(([reason,count])=>({reason,count})).sort((a,b)=>b.count-a.count||a.reason.localeCompare(b.reason)).slice(0,5),
    receiptReport:structuredClone(workspace.research?.synthesis?.report||{})};
}
async function run() {
  const check=preflight(),startedAt=new Date().toISOString();
  atomicWrite(RUN_MARKER_FILE,`${JSON.stringify({schemaVersion:1,startedAt,authorizedOn:'2026-10-19',authorizedPacketCommit:AUTHORIZED_PACKET_COMMIT,logicalGptCalls:3,pageFetches:0,serperQueries:0,processCapUsd:PROCESS_CAP_USD},null,2)}\n`);
  saveState(check.state,WORKING_STATE_FILE);
  const adapter=createPersistentAdapter(WORKING_STATE_FILE),loaded=loadedEnvironment();
  const paidEnv={...loaded,OPENAI_ENABLED:'true',OPENAI_MONTHLY_LIMIT_USD:String(PROCESS_CAP_USD),OPENAI_WORKSPACE_MONTHLY_CALL_LIMIT:'2',OPENAI_MODEL:'gpt-4o-mini'};
  let currentCompany='unknown',logicalCalls=0,providerAttempts=0;const apiUsage=[];
  const fetchImpl=async(url,options)=>{
    if(url!==ENDPOINT)throw new Error('The saved-pages redraft may contact only the approved OpenAI endpoint.');
    providerAttempts++;
    const response=await fetch(url,options);
    if(response.ok)try{const payload=await response.clone().json(),usage=payload.usage||{};apiUsage.push({company:currentCompany,model:payload.model||'gpt-4o-mini',promptTokens:usage.prompt_tokens||0,completionTokens:usage.completion_tokens||0,totalTokens:usage.total_tokens||0});}catch{}
    return response;
  };
  const llm=createLlm({...adapter,env:paidEnv,fetchImpl}),countedLlm={generate:request=>{logicalCalls++;if(logicalCalls>3)throw new Error('This authorization permits exactly three logical GPT calls.');return llm.generate(request);}};
  const synthesis=createSynthesisCoordinator({...adapter,llm:countedLlm}),commit=commitHash(),snapshots=[];
  for(const company of COMPANIES) {
    currentCompany=company.name;const workspace=workspaceForCompany(adapter.read(),company);
    await synthesis.start(workspace.id);
    const generated=getWorkspace(adapter.read(),workspace.id);
    if(generated.status!=='needs_review'||generated.research?.status!=='review_required')throw new Error(`${company.name}: generated profile was not persisted in needs_review.`);
    const snapshot={...snapshotFor(generated,{capturedOn:new Date().toISOString(),commit}),source:'Owner-authorized saved-pages-only Stage 2 redraft using the fixed 120 KB evidence packet; no page fetches and no Serper queries.'};
    const snapshotFile=path.join(SNAPSHOT_DIR,`${company.slug}-live-icp.json`);atomicWrite(snapshotFile,`${JSON.stringify(snapshot,null,2)}\n`);snapshots.push(path.relative(ROOT,snapshotFile));
  }
  await adapter.settled();
  if(logicalCalls!==3)throw new Error(`Expected exactly three logical GPT calls; saw ${logicalCalls}.`);
  const finalState=adapter.read(),audits=COMPANIES.map(company=>auditWorkspace(workspaceForCompany(finalState,company),company));
  if(audits.some(item=>item.status!=='needs_review'))throw new Error('Every profile must remain in needs_review.');
  saveState(finalState,ACCEPTANCE_STATE_FILE);
  const normal=loadedEnvironment(),providerDefaultsAfterRun={openaiDisabled:normal.OPENAI_ENABLED==='false',openaiLocalLimitZero:Number(normal.OPENAI_MONTHLY_LIMIT_USD)===0};
  if(!providerDefaultsAfterRun.openaiDisabled||!providerDefaultsAfterRun.openaiLocalLimitZero)throw new Error('Normal local OpenAI settings were not restored to disabled and zero.');
  const report={schemaVersion:1,startedAt,completedAt:new Date().toISOString(),authorizedOn:'2026-10-19',authorizedPacketCommit:AUTHORIZED_PACKET_COMMIT,
    commitHash:commit,model:'gpt-4o-mini',promptVersion:PROMPT_VERSION,pageFetches:0,serperQueries:0,logicalGptCalls:logicalCalls,providerAttempts,
    processCapUsd:PROCESS_CAP_USD,estimates:check.estimates,estimateTotals:check.totals,actualCostUsd:Number(actualCostUsd(apiUsage).toFixed(6)),actualCostComplete:apiUsage.length===3,
    apiUsage,snapshots,audits,autoApproved:false,providerDefaultsAfterRun};
  atomicWrite(REPORT_FILE,`${JSON.stringify(report,null,2)}\n`);
  return {stateFile:ACCEPTANCE_STATE_FILE,reportFile:REPORT_FILE,report};
}

async function main() {
  if(process.argv[2]==='--preflight'){const {state:ignored,...report}=preflight();console.log(JSON.stringify(report,null,2));}
  else if(process.argv[2]==='--run')console.log(JSON.stringify(await run(),null,2));
  else throw new Error('Use --preflight or --run.');
}
if(require.main===module)main().catch(error=>{console.error(`[failed] ${error.message}`);process.exitCode=1;});

module.exports={ROOT,ACCEPTANCE_STATE_FILE,WORKING_STATE_FILE,REPORT_FILE,RUN_MARKER_FILE,PROCESS_CAP_USD,ESTIMATE_STOP_USD,AUTHORIZED_PACKET_COMMIT,
  workspaceForCompany,preparedState,estimateFor,preflight,auditWorkspace,run};
