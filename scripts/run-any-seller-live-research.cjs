#!/usr/bin/env node
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {loadEnv}=require('./env.cjs');
const {CollectorRuntime}=require('./collectors/runtime.cjs');
const {requestResearch}=require('./onboarding/research-request.cjs');
const {createResearchCoordinator}=require('./onboarding/research.cjs');
const {buildFocusedSynthesisRequests,estimateFocusedSynthesisCost,generateSynthesis}=require('./onboarding/synthesize.cjs');
const {rawPageMap}=require('./onboarding/extract-organizations.cjs');
const {saveGeneratedProfile,workspaceQualityFindings}=require('./onboarding/validate.cjs');
const {createLlm}=require('./llm.cjs');
const {loadState,saveState,statePath,atomicWrite,updateWorkspace}=require('./server/state.cjs');

const ROOT=path.resolve(__dirname,'..'),REPORT_FILE=path.join(ROOT,'.whynow','any-seller-live-research-report.json');
const TARGETS=Object.freeze([{name:'Vercel',domain:'vercel.com'},{name:'Gong',domain:'gong.io'}]);
const OPENAI_CAP_USD=1.30,SERPER_CAP=20,MODEL='gpt-5.5';
function loadedEnv(){const env={...process.env};loadEnv(path.join(ROOT,'.env'),env);return env;}
function providerDefaults(env=loadedEnv()){return {openaiEnabled:String(env.OPENAI_ENABLED||'').toLowerCase()==='true',openaiLimitUsd:Number(env.OPENAI_MONTHLY_LIMIT_USD||0)};}
function assertProviderDefaultsOff(env){const defaults=providerDefaults(env);if(defaults.openaiEnabled||defaults.openaiLimitUsd!==0)throw Error('Persistent OpenAI defaults must be false and 0 before this bounded run.');return defaults;}
function serializedState(file){let queue=Promise.resolve();return {read:()=>loadState(file),mutate:fn=>{const operation=queue.then(()=>{const next=fn(loadState(file));saveState(next,file);return loadState(file);});queue=operation.catch(()=>{});return operation;}};}
function monthUsage(state,month){let serper=0;for(const workspace of Object.values(state.workspaces))if(workspace.budgets?.serper?.month===month)serper+=workspace.budgets.serper.queries||0;return serper;}
function workspaceFor(state,{name,domain}){return Object.values(state.workspaces).find(workspace=>workspace.research?.selectedCandidate?.domain===domain&&workspace.name.toLowerCase()===name.toLowerCase());}
function reuseSavedVercelCustomerPages(state,file){
  const acceptanceFile=path.join(path.dirname(file),'acceptance-state.json');let saved;try{saved=loadState(acceptanceFile);}catch{return state;}
  const target=workspaceFor(state,TARGETS[0]),sourceWorkspace=workspaceFor(saved,TARGETS[0]);if(!target||!sourceWorkspace)return state;
  const reusable=(sourceWorkspace.research?.sources||[]).filter(ref=>{const source=saved.sources[ref.sourceId];try{return /^\/customers(?:\/|$)/.test(new URL(source?.url||'').pathname);}catch{return false;}});if(!reusable.length)return state;
  const next=structuredClone(state);for(const ref of reusable){const source=saved.sources[ref.sourceId];if(source)next.sources[ref.sourceId]=structuredClone(source);}
  const workspace=next.workspaces[target.id],priority=[...reusable.map(ref=>structuredClone(ref)),...(workspace.research.sources||[])],deduped=[];for(const ref of priority)if(ref?.sourceId&&!deduped.some(row=>row.sourceId===ref.sourceId))deduped.push(ref);workspace.research.sources=deduped.slice(0,20);workspace.research.revision=(workspace.research.revision||0)+1;return next;
}
function publicResult(workspace){
  const findings=workspaceQualityFindings(workspace),evidence=workspace.sellerProfile.evidence||{};
  const org=(kind,rows)=>(rows||[]).map((row,index)=>({name:row.name,domain:row.domain||'',sourceUrl:row.sourceUrl||evidence[`${kind}.${index}`]?.sourceUrl||'',quote:row.evidenceQuote||evidence[`${kind}.${index}`]?.evidenceQuote||''}));
  return {workspaceId:workspace.id,status:workspace.status,customers:org('customers',workspace.sellerProfile.customers),competitors:org('competitors',workspace.sellerProfile.competitors),segments:(workspace.icpConfig.segments||[]).map(row=>({label:row.label,subIndustries:row.subIndustries,queryTemplates:row.queryTemplates})),personas:workspace.icpConfig.personas,sizeMetric:workspace.icpConfig.killPatterns?.sizeMetric,targetCompanySize:workspace.sellerProfile.targetCompanySize,blockingWarnings:findings.filter(row=>row.severity==='blocking').map(row=>({code:row.code,path:row.path,message:row.message})),advisoryWarnings:findings.filter(row=>row.severity==='advisory').map(row=>({code:row.code,path:row.path,message:row.message}))};
}
async function prepare(){
  const baseEnv=loadedEnv(),defaultsBefore=assertProviderDefaultsOff(baseEnv),file=statePath(baseEnv),store=serializedState(file),month=new Date().toISOString().slice(0,7),before=monthUsage(store.read(),month);
  const env={...baseEnv,SERPER_ENABLED:'true',SERPER_MONTHLY_QUERY_LIMIT:String(before+SERPER_CAP),SERPER_RESEARCH_QUERY_LIMIT:'4',WORKSPACE_MAX_SERPER_QUERIES_PER_RUN:'4',ONBOARDING_MAX_PAGES:'20',OPENAI_ENABLED:'false',OPENAI_MONTHLY_LIMIT_USD:'0'};
  await store.mutate(current=>reuseSavedVercelCustomerPages(current,file));let state=store.read(),gong=workspaceFor(state,TARGETS[1]);
  if(!gong){await store.mutate(current=>requestResearch(current,'Gong'));state=store.read();gong=Object.values(state.workspaces).find(row=>row.name==='Gong'&&row.status==='draft');}
  const coordinator=createResearchCoordinator({read:store.read,mutate:store.mutate,env,runtimeFactory:options=>new CollectorRuntime({...options,env,cacheDir:path.join(path.dirname(file),'collector-cache')})});
  if(!gong.research?.selectedCandidate){
    if(gong.research?.status!=='confirmation_required')await coordinator.start(gong.id);
    gong=workspaceFor(store.read(),TARGETS[1])||store.read().workspaces[gong.id];
    const candidate=(gong.research?.candidates||[]).find(row=>row.domain==='gong.io');
    if(!candidate)throw Error('The bounded identity search did not return Gong at gong.io; stopping before paid calls.');
    await coordinator.confirm(gong.id,candidate.id,gong.research.revision);
  } else if(gong.research.status!=='evidence_ready') await coordinator.start(gong.id);
  gong=workspaceFor(store.read(),TARGETS[1]);
  if(gong.research.status==='evidence_ready'&&gong.research.organizationPlanVersion!=='priority-customer-path-v2'){
    await store.mutate(current=>updateWorkspace(current,gong.id,row=>{row.research.status='failed';row.research.error={code:'PRIORITY_RESEARCH_REQUIRED',message:'Rebuild the saved plan with customer-story priority.'};row.research.organizationPlanVersion='priority-customer-path-v2';return row;}));
    await coordinator.retry(gong.id);
  }
  state=store.read();const vercel=workspaceFor(state,TARGETS[0]);gong=workspaceFor(state,TARGETS[1]);
  for(const [target,workspace] of [[TARGETS[0],vercel],[TARGETS[1],gong]])if(!workspace||workspace.status!=='draft'||workspace.research?.status!=='evidence_ready')throw Error(`${target.name} is not a draft workspace with saved evidence; stopping before paid calls.`);
  const after=monthUsage(state,month),serperQueries=after-before;if(serperQueries>SERPER_CAP)throw Error('The research run exceeded its authorized Serper cap.');
  const paidEnv={...baseEnv,OPENAI_ENABLED:'true',OPENAI_MONTHLY_LIMIT_USD:String(OPENAI_CAP_USD),OPENAI_WORKSPACE_MONTHLY_CALL_LIMIT:'3',OPENAI_RETRY_LIMIT:'0',OPENAI_MODEL:MODEL,OPENAI_SELLER_FACTS_MODEL:MODEL,OPENAI_ORGANIZATION_REVIEW_MODEL:MODEL,OPENAI_ICP_TARGETING_MODEL:MODEL};
  const rawPages=rawPageMap([path.join(path.dirname(file),'collector-cache'),path.join(path.dirname(file),'stage2-final-live-cache')]);
  const sellers=TARGETS.map(target=>{const workspace=workspaceFor(state,target),built=buildFocusedSynthesisRequests(state,workspace.id,{env:paidEnv,rawPages}),estimate=estimateFocusedSynthesisCost(state,workspace.id,{env:paidEnv,rawPages});if(!built.candidates.customers.length)throw Error(`${target.name} still has no deterministic customer candidates; stopping before paid calls.`);return {name:target.name,domain:target.domain,workspaceId:workspace.id,savedPages:workspace.research.sources.length,evidence:built.evidence,candidates:{customers:built.candidates.customers.length,customerDomains:built.candidates.customers.filter(row=>row.domain).length,competitors:built.candidates.competitors.length},estimate};});
  const totalMaximumCostUsd=Number(sellers.reduce((sum,row)=>sum+row.estimate.totalMaximumCostUsd,0).toFixed(6));if(totalMaximumCostUsd>OPENAI_CAP_USD)throw Error(`The exact six-call maximum estimate is $${totalMaximumCostUsd}, above the authorized $${OPENAI_CAP_USD.toFixed(2)} cap; stopping before paid calls.`);
  const report={schemaVersion:1,status:'prepared',preparedAt:new Date().toISOString(),commit:execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim(),authorization:{targets:TARGETS,model:MODEL,focusedCallsPerSeller:3,openaiCapUsd:OPENAI_CAP_USD,serperCap:SERPER_CAP,retryLimit:0,noApproval:true,noPrepareDemo:true},providerDefaultsBefore:defaultsBefore,serperQueries,sellers,totalMaximumCostUsd};atomicWrite(REPORT_FILE,JSON.stringify(report,null,2));return report;
}
async function run(){
  const env=loadedEnv(),defaultsBefore=assertProviderDefaultsOff(env),file=statePath(env),store=serializedState(file),prepared=JSON.parse(require('node:fs').readFileSync(REPORT_FILE,'utf8'));
  if(prepared.status!=='prepared'||prepared.commit!==execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim())throw Error('Run preparation again from the current commit before paid calls.');
  const paidEnv={...env,OPENAI_ENABLED:'true',OPENAI_MONTHLY_LIMIT_USD:String(OPENAI_CAP_USD),OPENAI_WORKSPACE_MONTHLY_CALL_LIMIT:'3',OPENAI_RETRY_LIMIT:'0',OPENAI_MODEL:MODEL,OPENAI_SELLER_FACTS_MODEL:MODEL,OPENAI_ORGANIZATION_REVIEW_MODEL:MODEL,OPENAI_ICP_TARGETING_MODEL:MODEL};
  const llm=createLlm({read:store.read,mutate:store.mutate,env:paidEnv}),results=[];let failure=null;
  try{
    for(const target of TARGETS){
      const state=store.read(),workspace=workspaceFor(state,target);if(!workspace||workspace.status!=='draft'||workspace.research?.status!=='evidence_ready')throw Error(`${target.name} is no longer ready for the bounded draft.`);
      const generated=await generateSynthesis({state,workspaceId:workspace.id,llm,env:paidEnv});
      if(generated.calls.length!==3||generated.calls.some(row=>row.cached))throw Error(`${target.name} did not use exactly three new focused calls.`);
      await store.mutate(current=>{let next=saveGeneratedProfile(current,workspace.id,{output:generated.output,...generated.guard,model:generated.model,promptVersion:generated.promptVersion});return updateWorkspace(next,workspace.id,row=>{row.research.synthesisJob={schemaVersion:1,id:`bounded-${Date.now()}`,status:'complete',startedAt:prepared.preparedAt,completedAt:new Date().toISOString(),error:null,cached:false,evidence:generated.evidence,calls:generated.calls,actualCostUsd:generated.actualCostUsd};return row;});});
      const saved=store.read().workspaces[workspace.id];if(saved.status!=='needs_review'||saved.sellerProfile.approvedAt)throw Error(`${target.name} was not left unapproved in needs_review.`);
      results.push({...publicResult(saved),calls:generated.calls,actualCostUsd:generated.actualCostUsd});
    }
  }catch(error){failure={code:String(error.code||'RUN_FAILED').slice(0,80),message:String(error.message||'The bounded run failed.').slice(0,300),...(Number.isInteger(error.httpStatus)?{httpStatus:error.httpStatus}:{}),...(error.finishReason?{finishReason:error.finishReason}:{}),...(error.usage?{usage:error.usage,costUsd:error.costUsd}: {})};}
  const actualCostUsd=Number(results.reduce((sum,row)=>sum+row.actualCostUsd,0)+(failure?.costUsd||0)).toFixed(6),defaultsAfter=providerDefaults();
  const report={...prepared,status:failure?'failed':'complete',finishedAt:new Date().toISOString(),results,failure,actualCostUsd:Number(actualCostUsd),providerDefaultsBefore:defaultsBefore,providerDefaultsAfter:defaultsAfter};atomicWrite(REPORT_FILE,JSON.stringify(report,null,2));
  if(defaultsAfter.openaiEnabled||defaultsAfter.openaiLimitUsd!==0)throw Error('Persistent OpenAI defaults were not restored to false and 0.');if(failure)throw Object.assign(Error(failure.message),failure);return report;
}
async function main(){const mode=process.argv[2];const report=mode==='--prepare'?await prepare():mode==='--run'?await run():null;if(!report)throw Error('Use --prepare or --run.');process.stdout.write(`${JSON.stringify(report,null,2)}\n`);}
if(require.main===module)main().catch(error=>{process.stderr.write(`${JSON.stringify({code:error.code||'RUN_FAILED',message:error.message,httpStatus:error.httpStatus||null,finishReason:error.finishReason||null})}\n`);process.exitCode=1;});
module.exports={OPENAI_CAP_USD,SERPER_CAP,MODEL,TARGETS,REPORT_FILE,providerDefaults,assertProviderDefaultsOff,monthUsage,workspaceFor,reuseSavedVercelCustomerPages,publicResult,prepare,run};
