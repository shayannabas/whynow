#!/usr/bin/env node
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {loadEnv}=require('./env.cjs');
const {buildFocusedSynthesisRequests,estimateFocusedSynthesisCost,generateSynthesis}=require('./onboarding/synthesize.cjs');
const {rawPageMap}=require('./onboarding/extract-organizations.cjs');
const {saveGeneratedProfile}=require('./onboarding/validate.cjs');
const {createLlm}=require('./llm.cjs');
const {loadState,saveState,statePath,atomicWrite,updateWorkspace}=require('./server/state.cjs');
const base=require('./run-any-seller-live-research.cjs');

const ROOT=path.resolve(__dirname,'..'),REPORT_FILE=path.join(ROOT,'.whynow','vercel-live-research-rerun-report.json');
const TARGET=Object.freeze({name:'Vercel',domain:'vercel.com'}),MODEL='gpt-5.5',OPENAI_CAP_USD=1.20,SERPER_CAP=10,CALLS=3;
function loadedEnv(){const env={...process.env};loadEnv(path.join(ROOT,'.env'),env);return env;}
function serializedState(file){let queue=Promise.resolve();return {read:()=>loadState(file),mutate:fn=>{const operation=queue.then(()=>{const next=fn(loadState(file));saveState(next,file);return loadState(file);});queue=operation.catch(()=>{});return operation;}};}
function monthOpenAiUsage(state,month){let calls=0,reservedMicros=0;for(const workspace of Object.values(state.workspaces)){const usage=workspace.budgets?.openai;if(usage?.month!==month)continue;calls+=usage.calls||0;reservedMicros+=usage.reservedMicros||0;}return {calls,reservedMicros};}
function paidEnvFor(state,workspace,baseEnv,month){const shared=monthOpenAiUsage(state,month),workspaceUsage=workspace.budgets?.openai?.month===month?workspace.budgets.openai:{calls:0,reservedMicros:0};return {...baseEnv,OPENAI_ENABLED:'true',OPENAI_MONTHLY_LIMIT_USD:String((shared.reservedMicros/1e6)+OPENAI_CAP_USD),OPENAI_WORKSPACE_MONTHLY_CALL_LIMIT:String((workspaceUsage.calls||0)+CALLS),OPENAI_RETRY_LIMIT:'0',OPENAI_MODEL:MODEL,OPENAI_SELLER_FACTS_MODEL:MODEL,OPENAI_ORGANIZATION_REVIEW_MODEL:MODEL,OPENAI_ICP_TARGETING_MODEL:MODEL};}
function safeFailure(error){return {code:String(error.code||'RUN_FAILED').slice(0,80),message:String(error.message||'The bounded run failed.').slice(0,300),...(Number.isInteger(error.httpStatus)?{httpStatus:error.httpStatus}:{}),...(error.finishReason?{finishReason:error.finishReason}:{}),...(error.incompleteReason?{incompleteReason:error.incompleteReason}:{}),...(error.usage?{usage:error.usage,costUsd:error.costUsd}:{})};}
async function prepare(){
  const baseEnv=loadedEnv(),defaultsBefore=base.assertProviderDefaultsOff(baseEnv),file=statePath(baseEnv),store=serializedState(file),month=new Date().toISOString().slice(0,7),serperBefore=base.monthUsage(store.read(),month);
  const acceptance=loadState(path.join(path.dirname(file),'acceptance-state.json'));await store.mutate(current=>base.mergeSavedVercelPriorityPages(current,acceptance));
  const state=store.read(),workspace=base.workspaceFor(state,TARGET);if(!workspace||workspace.status!=='draft'||workspace.research?.status!=='evidence_ready')throw Error('Vercel is not an unapproved draft workspace with saved evidence; stopping before paid calls.');
  const serperQueries=base.monthUsage(state,month)-serperBefore;if(serperQueries!==0)throw Error('The saved-page preparation unexpectedly used Serper; stopping before paid calls.');
  const env=paidEnvFor(state,workspace,baseEnv,month),rawPages=rawPageMap([path.join(path.dirname(file),'collector-cache'),path.join(path.dirname(file),'stage2-final-live-cache')]),built=buildFocusedSynthesisRequests(state,workspace.id,{env,rawPages}),estimate=estimateFocusedSynthesisCost(state,workspace.id,{env,rawPages});
  if(!built.candidates.customers.length||!built.candidates.competitors.length)throw Error('Vercel still lacks deterministic customer or competitor candidates; stopping before paid calls.');
  if(Object.values(built.requests).some(request=>request.maxOutputTokens!==8000||request.reasoningEffort!=='low'))throw Error('The focused research request contract is not 8,000 tokens with low reasoning.');
  if(estimate.totalMaximumCostUsd>OPENAI_CAP_USD)throw Error(`The exact three-call maximum estimate is $${estimate.totalMaximumCostUsd}, above the authorized $${OPENAI_CAP_USD.toFixed(2)} cap; stopping before paid calls.`);
  const baseline=monthOpenAiUsage(state,month),workspaceUsage=workspace.budgets?.openai?.month===month?workspace.budgets.openai:{calls:0,reservedMicros:0};
  const report={schemaVersion:1,status:'prepared',preparedAt:new Date().toISOString(),commit:execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim(),authorization:{target:TARGET,model:MODEL,calls:CALLS,maxOutputTokens:8000,reasoningEffort:'low',openaiCapUsd:OPENAI_CAP_USD,serperCap:SERPER_CAP,retryLimit:0,noApproval:true,noPrepareDemo:true,noGong:true},providerDefaultsBefore:defaultsBefore,serperQueries,baseline,workspaceBaseline:{calls:workspaceUsage.calls||0,reservedMicros:workspaceUsage.reservedMicros||0},evidence:built.evidence,candidates:{customers:built.candidates.customers.map(row=>({name:row.name,domain:row.domain,sourceUrl:row.sourceUrl,receipt:row.evidenceQuote})),competitors:built.candidates.competitors.map(row=>({name:row.name,domain:row.domain,sourceUrl:row.sourceUrl,receipt:row.evidenceQuote}))},estimate};
  atomicWrite(REPORT_FILE,JSON.stringify(report,null,2));return report;
}
async function run(){
  const baseEnv=loadedEnv(),defaultsBefore=base.assertProviderDefaultsOff(baseEnv),file=statePath(baseEnv),store=serializedState(file),prepared=JSON.parse(fs.readFileSync(REPORT_FILE,'utf8')),commit=execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim(),month=new Date().toISOString().slice(0,7);
  if(prepared.status!=='prepared'||prepared.commit!==commit)throw Error('Run preparation again from the current commit before paid calls.');
  const state=store.read(),workspace=base.workspaceFor(state,TARGET);if(!workspace||workspace.status!=='draft'||workspace.research?.status!=='evidence_ready')throw Error('Vercel is no longer ready for the bounded draft.');
  const baseline=monthOpenAiUsage(state,month),workspaceUsage=workspace.budgets?.openai?.month===month?workspace.budgets.openai:{calls:0,reservedMicros:0};if(JSON.stringify(baseline)!==JSON.stringify(prepared.baseline)||workspaceUsage.calls!==prepared.workspaceBaseline.calls||workspaceUsage.reservedMicros!==prepared.workspaceBaseline.reservedMicros)throw Error('OpenAI budget state changed after preparation; stop and prepare again.');
  const env=paidEnvFor(state,workspace,baseEnv,month),llm=createLlm({read:store.read,mutate:store.mutate,env});let result=null,failure=null;
  try{
    const generated=await generateSynthesis({state,workspaceId:workspace.id,llm,env});if(generated.calls.length!==CALLS||generated.calls.some(row=>row.cached))throw Error('Vercel did not use exactly three new focused calls.');
    await store.mutate(current=>{let next=saveGeneratedProfile(current,workspace.id,{output:generated.output,...generated.guard,model:generated.model,promptVersion:generated.promptVersion});return updateWorkspace(next,workspace.id,row=>{row.research.synthesisJob={schemaVersion:1,id:`vercel-rerun-${Date.now()}`,status:'complete',startedAt:prepared.preparedAt,completedAt:new Date().toISOString(),error:null,cached:false,evidence:generated.evidence,calls:generated.calls,actualCostUsd:generated.actualCostUsd};return row;});});
    const saved=store.read().workspaces[workspace.id];if(saved.status!=='needs_review'||saved.sellerProfile.approvedAt)throw Error('Vercel was not left unapproved in needs_review.');result={...base.publicResult(saved),calls:generated.calls,actualCostUsd:generated.actualCostUsd};
  }catch(error){failure=safeFailure(error);}
  const defaultsAfter=base.providerDefaults(),actualCostUsd=Number((result?.actualCostUsd||failure?.costUsd||0).toFixed(6)),report={...prepared,status:failure?'failed':'complete',finishedAt:new Date().toISOString(),result,failure,actualCostUsd,providerDefaultsBefore:defaultsBefore,providerDefaultsAfter:defaultsAfter};atomicWrite(REPORT_FILE,JSON.stringify(report,null,2));
  if(defaultsAfter.openaiEnabled||defaultsAfter.openaiLimitUsd!==0)throw Error('Persistent OpenAI defaults were not restored to false and 0.');if(failure)throw Object.assign(Error(failure.message),failure);return report;
}
async function main(){const mode=process.argv[2],report=mode==='--prepare'?await prepare():mode==='--run'?await run():null;if(!report)throw Error('Use --prepare or --run.');process.stdout.write(`${JSON.stringify(report,null,2)}\n`);}
if(require.main===module)main().catch(error=>{process.stderr.write(`${JSON.stringify(safeFailure(error))}\n`);process.exitCode=1;});
module.exports={ROOT,REPORT_FILE,TARGET,MODEL,OPENAI_CAP_USD,SERPER_CAP,CALLS,monthOpenAiUsage,paidEnvFor,safeFailure,prepare,run};
