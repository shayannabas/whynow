'use strict';

// One-use owner authorization, November 16, 2026. No other live workflow is started.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const robotsParser=require('robots-parser');
const {loadEnv}=require('./env.cjs');
const {loadState,saveState,statePath,atomicWrite}=require('./server/state.cjs');
const {CollectorRuntime}=require('./collectors/runtime.cjs');
const apollo=require('./collectors/apollo.cjs');
const {runLookalike,derivePattern}=require('./lookalike-discovery.cjs');
const {buildPlaybookResearchRequest,saveGeneratedPlaybook}=require('./onboarding/draft-playbook.cjs');
const {createLlm}=require('./llm.cjs');

const BATCH='phase2-vercel-nov16-2026';
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const ROBOTS='https://api.apollo.io/robots.txt';
function safeFailure(error){return {code:typeof error.code==='string'?error.code:'FAILED',httpStatus:error.httpStatus||error.status||null,...(error.usage?{usage:error.usage}:{}),...(Number.isFinite(error.costUsd)?{costUsd:error.costUsd}:{}),...(error.incompleteReason?{incompleteReason:error.incompleteReason}:{}),...(error.finishReason?{finishReason:error.finishReason}:{})};}
function preservation(state,workspaceId){
  const profile=structuredClone(state.workspaces[workspaceId].sellerProfile);delete profile.playbook;
  return {profile:hash(profile),approval:state.workspaces[workspaceId].sellerProfile.approvedAt,revision:state.workspaces[workspaceId].profileRevision,resolve:hash(Object.entries(state.workspaces).filter(([,w])=>w.referenceDemo?.loadOnly)),drafts:hash(Object.entries(state.workspaces).map(([id,w])=>[id,w.drafts]))};
}
function preflight(state,env,{domain='vercel.com',now=new Date()}={}){
  if(env.OPENAI_ENABLED!=='false'||Number(env.OPENAI_MONTHLY_LIMIT_USD)!==0||env.APOLLO_ENABLED==='true'||Number(env.APOLLO_MAX_CALLS_PER_RUN||0)!==0||Number(env.APOLLO_MONTHLY_CALL_LIMIT||0)!==0)throw Error('Persistent provider defaults must be disabled/zero.');
  const workspace=Object.values(state.workspaces).find(w=>w.sellerProfile?.domain===domain);
  if(!workspace||workspace.status!=='active'||!workspace.sellerProfile.approvedAt)throw Error('An owner-approved seller profile is required.');
  const month=now.toISOString().slice(0,7),priorApollo=workspace.budgets.apollo?.month===month?workspace.budgets.apollo.calls:0;
  const priorOpenai=Object.values(state.workspaces).reduce((n,w)=>n+(w.budgets.openai?.month===month?w.budgets.openai.reservedMicros:0),0);
  const paidEnv={...env,APOLLO_ENABLED:'true',APOLLO_MAX_CALLS_PER_RUN:'5',APOLLO_MONTHLY_CALL_LIMIT:String(priorApollo+5),APOLLO_MAX_CUSTOMERS_PER_RUN:'3',APOLLO_MAX_COMPANIES_PER_RUN:'25',OPENAI_ENABLED:'true',OPENAI_MONTHLY_LIMIT_USD:String((priorOpenai+500000)/1e6),OPENAI_WORKSPACE_MONTHLY_CALL_LIMIT:String((workspace.budgets.openai?.month===month?workspace.budgets.openai.calls:0)+1),OPENAI_MODEL:'gpt-5.5',OPENAI_ICP_TARGETING_MODEL:'gpt-5.5',OPENAI_RETRY_LIMIT:'0',SERPER_ENABLED:'false',GDELT_ENABLED:'false',EDGAR_ENABLED:'false',SCHEDULER_ENABLED:'false',GITHUB_ENABLED:'false'};
  const built=buildPlaybookResearchRequest(state,workspace.id,paidEnv);
  if(built.estimate.maximumCostUsd>0.50)throw Error('The saved-page playbook request exceeds the $0.50 process cap.');
  const customers=workspace.sellerProfile.customers.filter(c=>apollo.publicDomain(c.domain)).slice(0,3).map(c=>({name:c.name,domain:c.domain}));
  return {workspaceId:workspace.id,profileRevision:workspace.profileRevision,built,customers,paidEnv,preserved:preservation(state,workspace.id)};
}
function companyOnly(raw={}){
  if(!raw||typeof raw!=='object')return {};
  return Object.fromEntries(['name','primary_domain','website_url','industry','estimated_num_employees','country','technology_names'].filter(k=>raw[k]!==undefined).map(k=>[k,raw[k]]));
}
function numeric(value){return value!==null&&value!==''&&Number.isFinite(Number(value))&&Number(value)>=0?Number(value):null;}
function sanitizeApollo(payload,entry){
  entry.creditsUsed=numeric(payload.credits_used??payload.credits_consumed??entry.creditsUsed);
  entry.paidCreditsUsed=numeric(payload.paid_credits_used??payload.usage?.paid_credits_used);
  entry.costUsd=numeric(payload.cost_usd??payload.usage?.cost_usd);
  return {...(payload.organization?{organization:companyOnly(payload.organization)}:{}),...(Array.isArray(payload.organizations)?{organizations:payload.organizations.map(companyOnly)}:{})};
}
function boundedRuntime(runtime,report,checkpoint){
  const originalFetch=runtime.fetch;
  runtime.fetch=async(url,options)=>{
    const u=new URL(url),robot=u.href===ROBOTS;
    if(robot){if(report.robots.attempts>=1)throw Object.assign(Error('Robots check limit reached.'),{code:'ROBOTS_CAP'});report.robots.attempts++;}
    else{
      if(u.origin!=='https://api.apollo.io'||!apollo.ENDPOINTS.some(p=>u.pathname==='/api/v1/'+p)||report.apollo.attempts>=5)throw Object.assign(Error('Destination or attempt is outside this authorization.'),{code:'BATCH_CAP'});
      report.apollo.attempts++;
    }
    checkpoint();
    const response=await originalFetch(url,options);
    if(robot){report.robots.httpStatus=response.status;checkpoint();return response;}
    const entry={endpoint:u.pathname,method:options.method,httpStatus:response.status,creditsUsed:numeric(response.headers.get('x-credits-used')??response.headers.get('x-apollo-credits-used'))};report.apollo.responses.push(entry);checkpoint();
    return {...response,text:async()=>{
      const text=await response.text();let value;
      try{value=JSON.parse(text);}catch{return '{}';}
      const clean=sanitizeApollo(value,entry);checkpoint();return JSON.stringify(clean);
    }};
  };
  return runtime;
}
async function runBatch({file,artifactDir,env,runtimeFactory=opts=>new CollectorRuntime(opts),llmFactory=createLlm,openaiFetch=fetch,apolloSleep,now=()=>new Date(),domain='vercel.com',envFile}={}){
  const start=loadState(file);
  if(start.auditLog.some(entry=>entry.batch===BATCH)||Object.values(start.workspaces).some(w=>w.runs.some(run=>run.id===BATCH)))throw Object.assign(Error('This one-use authorization is already used.'),{code:'BATCH_USED'});
  const prepared=preflight(start,env,{domain,now:now()}),envHash=envFile?hash(fs.readFileSync(envFile,'utf8')):null;
  // mkdir is exclusive: even an interrupted or failed batch can never run again.
  fs.mkdirSync(artifactDir);
  const reportFile=path.join(artifactDir,'report.json'),report={batch:BATCH,used:true,startedAt:now().toISOString(),workspaceId:prepared.workspaceId,profileRevision:prepared.profileRevision,estimate:prepared.built.estimate,customers:prepared.customers,robots:{attempts:0,status:'pending'},apollo:{status:'pending',attempts:0,responses:[],pattern:null,candidates:[],rejections:[]},openai:{status:'pending',attempts:0,actualCostUsd:0},serperQueries:0,pageFetches:0,collectorRefreshes:0,contactLookups:0};
  const checkpoint=()=>atomicWrite(reportFile,JSON.stringify(report,null,2));checkpoint();
  let writes=Promise.resolve();const read=()=>loadState(file),mutate=fn=>{const op=writes.then(()=>{const next=fn(read());saveState(next,file);return next;});writes=op.catch(()=>{});return op;};
  try{
    await mutate(s=>{const w=s.workspaces[prepared.workspaceId];w.runs.push({schemaVersion:1,id:BATCH,type:'company_discovery',strategy:'lookalike',status:'running',startedAt:now().toISOString(),profileRevision:prepared.profileRevision,apolloCalls:0,serperQueries:0,errors:[]});s.auditLog.push({schemaVersion:1,type:'bounded_phase2_authorization_used',workspaceId:w.id,occurredAt:now().toISOString(),batch:BATCH,limits:{apolloAttempts:5,robotsChecks:1,openaiCalls:1,openaiUsd:0.5}});return s;});
    try{
      if(!prepared.customers.length)throw Object.assign(Error('No confirmed customer domain.'),{code:'NO_CUSTOMER_DOMAIN'});
      apollo.assertReady(prepared.paidEnv);
      const runtime=boundedRuntime(runtimeFactory({env:prepared.paidEnv,cacheDir:path.join(path.dirname(file),'collector-cache')}),report,checkpoint);
      const checked=await runtime.request('robots',ROBOTS,{allowedRedirectDomain:'api.apollo.io',userAgent:runtime.identity('apollo')});
      const rules=robotsParser(ROBOTS,checked.status===404?'':checked.text);
      report.robots.allowed=apollo.ENDPOINTS.map(p=>({path:'/api/v1/'+p,allowed:rules.isAllowed(apollo.BASE+p,runtime.identity('apollo'))!==false}));
      if(report.robots.allowed.some(row=>!row.allowed)){report.robots.status='disallowed';throw Object.assign(Error('Robots disallows the API.'),{code:'ROBOTS_DISALLOWED'});}
      report.robots.status='allowed';checkpoint();
      const client=apollo.createApolloClient({read,mutate,env:prepared.paidEnv,runtime,now,sleep:apolloSleep});
      // Step A is reused in the pipeline below; it is never enriched twice.
      const first=prepared.customers[0],enriched=await client.enrich(prepared.workspaceId,BATCH,first.domain);
      report.apollo.stepA={status:'succeeded',customer:first,...enriched};report.apollo.pattern=derivePattern([enriched]);checkpoint();
      if(report.apollo.responses.some(r=>r.paidCreditsUsed>0||r.costUsd>0))throw Object.assign(Error('A paid credit or dollar charge was reported.'),{code:'UNEXPECTED_PAID_COST'});
      await runLookalike({read,mutate,workspaceId:prepared.workspaceId,runId:BATCH,env:prepared.paidEnv,now,client:{enrich:async(w,r,d)=>d===first.domain?enriched:client.enrich(w,r,d),search:async(w,r,p)=>{if(report.apollo.responses.some(row=>row.paidCreditsUsed>0||row.costUsd>0))throw Object.assign(Error('Unexpected paid usage.'),{code:'UNEXPECTED_PAID_COST'});return client.search(w,r,p);}}});
      const w=read().workspaces[prepared.workspaceId],run=w.runs.find(r=>r.id===BATCH);report.apollo.pattern=run.pattern;
      report.apollo.candidates=w.accounts.filter(a=>run.newAccountIds.includes(a.id)).map(a=>({id:a.id,name:a.name,domain:a.domain,segment:a.icpSegment,tier:a.tier,fit:a.fitScore,foundVia:a.discovery,kills:a.kills}));
      report.apollo.rejections=w.rejectedDiscovery?.filter(r=>r.rejectedAt>=report.startedAt)||[];report.apollo.status='complete';
      if(report.apollo.responses.some(row=>row.paidCreditsUsed>0||row.costUsd>0))throw Object.assign(Error('Unexpected paid usage.'),{code:'UNEXPECTED_PAID_COST'});
    }catch(error){report.apollo.status=error.code==='ROBOTS_DISALLOWED'?'blocked_by_robots':'stopped';report.apollo.failure=safeFailure(error);if(report.robots.status==='pending')report.robots.status='failed';await mutate(s=>{const run=s.workspaces[prepared.workspaceId].runs.find(r=>r.id===BATCH);run.status='failed';run.finishedAt=now().toISOString();run.errors.push(report.apollo.failure);return s;});}
    checkpoint();
    // Separately authorized: run once even if robots or Apollo refused access.
    try{
      if(JSON.stringify(preservation(read(),prepared.workspaceId))!==JSON.stringify(prepared.preserved))throw Object.assign(Error('The approved profile or protected demo state changed.'),{code:'STALE_PROFILE'});
      const llm=llmFactory({read,mutate,env:prepared.paidEnv,now:()=>now().toISOString(),fetchImpl:async(url,options)=>{
        if(url!=='https://api.openai.com/v1/chat/completions'||report.openai.attempts>=1)throw Error('OpenAI batch call cap reached.');
        report.openai.attempts++;checkpoint();return openaiFetch(url,options);
      }});
      const result=await llm.generate(prepared.built.request);
      if(result.cached)throw Object.assign(Error('A cached result is not a live verification.'),{code:'UNEXPECTED_CACHE'});
      report.openai={...report.openai,status:'generated',usage:result.usage,actualCostUsd:result.costUsd,model:result.model};checkpoint();
      await mutate(s=>saveGeneratedPlaybook(s,prepared.workspaceId,result.value,prepared.built,now().toISOString()));
      const p=read().workspaces[prepared.workspaceId].sellerProfile.playbook;report.openai.status='saved_needs_review';report.playbook=p;
    }catch(error){report.openai.status='failed';report.openai.failure=safeFailure(error);if(error.usage)report.openai.usage=error.usage;if(Number.isFinite(error.costUsd))report.openai.actualCostUsd=error.costUsd;}
  }finally{
    Object.assign(prepared.paidEnv,{APOLLO_ENABLED:'false',APOLLO_MAX_CALLS_PER_RUN:'0',APOLLO_MONTHLY_CALL_LIMIT:'0',OPENAI_ENABLED:'false',OPENAI_MONTHLY_LIMIT_USD:'0'});
    report.disabledAfter={APOLLO_ENABLED:prepared.paidEnv.APOLLO_ENABLED,APOLLO_MAX_CALLS_PER_RUN:prepared.paidEnv.APOLLO_MAX_CALLS_PER_RUN,APOLLO_MONTHLY_CALL_LIMIT:prepared.paidEnv.APOLLO_MONTHLY_CALL_LIMIT,OPENAI_ENABLED:prepared.paidEnv.OPENAI_ENABLED,OPENAI_MONTHLY_LIMIT_USD:prepared.paidEnv.OPENAI_MONTHLY_LIMIT_USD};
    report.preserved=JSON.stringify(preservation(read(),prepared.workspaceId))===JSON.stringify(prepared.preserved);
    report.envUnchanged=!envFile||hash(fs.readFileSync(envFile,'utf8'))===envHash;
    report.finishedAt=now().toISOString();report.used=true;checkpoint();
  }
  return report;
}
async function main(){
  const env={},envFile=path.resolve(__dirname,'../.env');loadEnv(envFile,env);const file=statePath(env);
  if(process.argv[2]==='--prepare'){const p=preflight(loadState(file),env);console.log(JSON.stringify({workspaceId:p.workspaceId,customers:p.customers,estimate:p.built.estimate,limits:{apolloAttempts:5,robotsChecks:1,openaiCalls:1,openaiUsd:0.5}}));return;}
  if(process.argv[2]!=='--run')throw Error('Use --prepare or --run.');
  const report=await runBatch({file,artifactDir:path.join(path.dirname(file),BATCH),env,envFile});console.log(JSON.stringify({batch:report.batch,used:report.used,robots:report.robots,apollo:{status:report.apollo.status,attempts:report.apollo.attempts,failure:report.apollo.failure},openai:report.openai,playbookStatus:report.playbook?.status,warnings:report.playbook?.warnings,disabledAfter:report.disabledAfter,preserved:report.preserved,envUnchanged:report.envUnchanged},null,2));
}
if(require.main===module)main().catch(error=>{console.error(JSON.stringify(safeFailure(error)));process.exitCode=1;});
module.exports={BATCH,ROBOTS,preflight,preservation,sanitizeApollo,boundedRuntime,runBatch};
