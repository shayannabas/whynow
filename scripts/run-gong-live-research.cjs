#!/usr/bin/env node
// October 27 owner-authorized batch. Saved pages only; no Serper or fetching.
const fs=require('node:fs'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {loadEnv}=require('./env.cjs');
const {loadState,saveState,statePath,atomicWrite,updateWorkspace}=require('./server/state.cjs');
const {buildFocusedSynthesisRequests,estimateFocusedSynthesisCost,generateSynthesis}=require('./onboarding/synthesize.cjs');
const {rawPageMap}=require('./onboarding/extract-organizations.cjs');
const {saveGeneratedProfile}=require('./onboarding/validate.cjs');
const {createLlm}=require('./llm.cjs');
const {assertStructuredOutputSchemaWithinLimits}=require('./openai-schema.cjs');
const base=require('./run-any-seller-live-research.cjs');
const {monthOpenAiUsage,safeFailure}=require('./run-vercel-live-research-rerun.cjs');
const ROOT=path.resolve(__dirname,'..'),TARGET={name:'Gong',domain:'gong.io'},MODEL='gpt-5.5',CALLS=3,OPENAI_CAP_USD=.90,SERPER_CAP=10;
function environment(){const env={...process.env};loadEnv(path.join(ROOT,'.env'),env);return env;}
function paidEnvFor(state,workspace,env,month){const total=monthOpenAiUsage(state,month),usage=workspace.budgets?.openai?.month===month?workspace.budgets.openai:{calls:0};return {...env,SERPER_ENABLED:'false',OPENAI_ENABLED:'true',OPENAI_MONTHLY_LIMIT_USD:String(total.reservedMicros/1e6+OPENAI_CAP_USD),OPENAI_WORKSPACE_MONTHLY_CALL_LIMIT:String(usage.calls+CALLS),OPENAI_RETRY_LIMIT:'0',OPENAI_MODEL:MODEL,OPENAI_SELLER_FACTS_MODEL:MODEL,OPENAI_ORGANIZATION_REVIEW_MODEL:MODEL,OPENAI_ICP_TARGETING_MODEL:MODEL};}
function prepare(state,env,{rawPages}={}){
  base.assertProviderDefaultsOff(env);const workspace=base.workspaceFor(state,TARGET);
  if(!workspace||workspace.status!=='draft'||workspace.research?.status!=='evidence_ready'||workspace.sellerProfile.approvedAt)throw Error('Gong must be an unapproved evidence-ready draft.');
  if(Object.keys(workspace.llmCache||{}).length)throw Error('Gong already has saved AI output; do not duplicate this batch.');
  const paidEnv=paidEnvFor(state,workspace,env,new Date().toISOString().slice(0,7)),built=buildFocusedSynthesisRequests(state,workspace.id,{env:paidEnv,rawPages}),estimate=estimateFocusedSynthesisCost(state,workspace.id,{env:paidEnv,rawPages});
  for(const request of Object.values(built.requests)){if(request.model!==MODEL||request.maxOutputTokens!==8000||request.reasoningEffort!=='low')throw Error('Unexpected request settings.');assertStructuredOutputSchemaWithinLimits(request.schema);}
  if(estimate.totalMaximumCostUsd>OPENAI_CAP_USD)throw Error(`Maximum estimate $${estimate.totalMaximumCostUsd} exceeds $0.90; no paid call allowed.`);
  return {workspaceId:workspace.id,built,estimate,paidEnv};
}
async function execute({state,workspaceId,built,paidEnv,llm,mutate,onCall=()=>{}}){
  const calls=[],purposes=['sellerFacts','organizationReview','icpTargeting'];let index=0;
  const recordingLlm={generate:async request=>{
    if(index>=CALLS||request.name!==built.requests[purposes[index]].name)throw Error('Unexpected focused call order.');
    const purpose=purposes[index++];try{const result=await llm.generate(request);if(result.cached)throw Error('Expected one new call per purpose, not a cached result.');calls.push({purpose,model:result.model,usage:result.usage,costUsd:result.costUsd});await onCall(calls);return result;}catch(error){if(error.usage){calls.push({purpose,failed:true,usage:error.usage,costUsd:error.costUsd||0,code:error.code,incompleteReason:error.incompleteReason||null});await onCall(calls);}throw error;}
  }};
  const generated=await generateSynthesis({state,workspaceId,llm:recordingLlm,env:paidEnv,rawPages:built.rawPages});
  if(calls.length!==CALLS||generated.actualCostUsd>OPENAI_CAP_USD)throw Error('The bounded three-call contract was not met.');
  await mutate(current=>{
    let next=saveGeneratedProfile(current,workspaceId,{output:generated.output,organizationReview:generated.organizationReview,...generated.guard,model:generated.model,promptVersion:generated.promptVersion});
    return updateWorkspace(next,workspaceId,w=>{w.research.synthesisJob={schemaVersion:1,status:'complete',completedAt:new Date().toISOString(),calls,actualCostUsd:generated.actualCostUsd,evidence:generated.evidence,cached:false};});
  });
  return generated;
}
async function main(){
  const env=environment(),file=statePath(env),state=loadState(file),rawPages=rawPageMap([path.join(path.dirname(file),'collector-cache'),path.join(path.dirname(file),'stage2-final-live-cache')]),prepared=prepare(state,env,{rawPages});prepared.built.rawPages=rawPages;
  const dir=path.join(path.dirname(file),'gong-research-oct27'),reportFile=path.join(path.dirname(file),'gong-research-oct27-report.json'),commit=execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim();
  const report={schemaVersion:1,status:'prepared',commit,preparedAt:new Date().toISOString(),authorization:{model:MODEL,calls:CALLS,maxOutputTokens:8000,reasoningEffort:'low',capUsd:OPENAI_CAP_USD,serperCap:SERPER_CAP,retryLimit:0,noApproval:true,noPrepareDemo:true},evidence:prepared.built.evidence,estimate:prepared.estimate,serperQueries:0,pageFetches:0,calls:[],actualCostUsd:0};
  if(process.argv[2]==='--prepare'){console.log(JSON.stringify(report,null,2));return;}
  if(process.argv[2]!=='--run')throw Error('Use --prepare or --run.');
  fs.mkdirSync(dir); // Exclusive durable marker: a stopped run cannot be started twice.
  report.status='running';atomicWrite(reportFile,JSON.stringify(report,null,2));let queue=Promise.resolve();
  const read=()=>loadState(file),mutate=fn=>{const op=queue.then(()=>{const next=fn(read());saveState(next,file);return read();});queue=op.catch(()=>{});return op;};
  try{
    const llm=createLlm({read,mutate,env:prepared.paidEnv});
    await execute({...prepared,state,llm,mutate,onCall:calls=>{report.calls=structuredClone(calls);report.actualCostUsd=Number(calls.reduce((sum,row)=>sum+row.costUsd,0).toFixed(6));atomicWrite(reportFile,JSON.stringify(report,null,2));}});
    const saved=read().workspaces[prepared.workspaceId];if(saved.status!=='needs_review'||saved.sellerProfile.approvedAt)throw Error('Gong was not left unapproved.');report.result=base.publicResult(saved);report.status='complete';
  }catch(error){report.status='failed';report.failure=safeFailure(error);process.exitCode=1;}
  finally{prepared.paidEnv.OPENAI_ENABLED='false';prepared.paidEnv.OPENAI_MONTHLY_LIMIT_USD='0';report.providerDefaultsAfter=base.providerDefaults(environment());report.finishedAt=new Date().toISOString();atomicWrite(reportFile,JSON.stringify(report,null,2));}
  if(report.providerDefaultsAfter.openaiEnabled||report.providerDefaultsAfter.openaiLimitUsd!==0)throw Error('OpenAI defaults are not disabled/zero.');console.log(JSON.stringify(report,null,2));
}
if(require.main===module)main().catch(error=>{console.error(JSON.stringify(safeFailure(error)));process.exitCode=1;});
module.exports={TARGET,MODEL,CALLS,OPENAI_CAP_USD,SERPER_CAP,paidEnvFor,prepare,execute};
