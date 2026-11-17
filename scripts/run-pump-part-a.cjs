'use strict';

const fs=require('node:fs');
const path=require('node:path');
const {createHash}=require('node:crypto');
const {loadEnv}=require('./env.cjs');
const {statePath,loadState,saveState,createWorkspace,updateWorkspace,atomicWrite}=require('./server/state.cjs');
const {CollectorRuntime,DEFAULT_BUDGETS}=require('./collectors/runtime.cjs');
const {rawPageMap}=require('./onboarding/extract-organizations.cjs');
const {stripHtml}=require('./collectors/common.cjs');
const {recordSource}=require('./sources.cjs');
const {homepageTargets,sitemapTargets,normalizeResearchUrl,rankUrl,titleFromHtml,truncateUtf8,internalTarget,isCustomerStory,MAX_CUSTOMER_STORIES,MAX_STORED_TEXT_PER_PAGE,MAX_STORED_TEXT_PER_RUN}=require('./onboarding/research.cjs');
const {estimateFocusedSynthesisCost,generateSynthesis}=require('./onboarding/synthesize.cjs');
const {saveGeneratedProfile}=require('./onboarding/validate.cjs');
const {createLlm}=require('./llm.cjs');
const {publicResult}=require('./run-any-seller-live-research.cjs');

const RUN_ID='pump-part-a-nov17-2026-one-use';
const RERUN_ID='pump-part-a-nov17-2026-priority-rerun';
const RERUN_TOTAL=15;
const RERUN_LIMITS=Object.freeze({seller_site:15,seller_sitemap:2,robots:3});
const COMPANY=Object.freeze({name:'Pump',domain:'pump.co',website:'https://pump.co/'});
const LIMITS=Object.freeze({seller_site:20,seller_sitemap:2,robots:3});
const CAP_USD=1.35;
const BASE_DISABLED=Object.freeze({
  OPENAI_ENABLED:'false',OPENAI_MONTHLY_LIMIT_USD:'0',OPENAI_WORKSPACE_MONTHLY_CALL_LIMIT:'0',
  APOLLO_ENABLED:'false',APOLLO_COMPANY_SEARCH_ENABLED:'false',APOLLO_MAX_CALLS_PER_RUN:'0',APOLLO_MONTHLY_CALL_LIMIT:'0',
  SERPER_ENABLED:'false',SERPER_MONTHLY_QUERY_LIMIT:'0',WORKSPACE_MAX_SERPER_QUERIES_PER_RUN:'0',
  SCHEDULER_ENABLED:'false',GDELT_ENABLED:'false',EDGAR_ENABLED:'false',GITHUB_ENABLED:'false'
});

function safeFailure(error) {
  return {
    code:error.code||'PUMP_RESEARCH_FAILED',
    ...(Number.isInteger(error.httpStatus)?{httpStatus:error.httpStatus}:{}),
    ...(error.usage?{usage:error.usage,costUsd:error.costUsd}:{}),
    ...(error.finishReason?{finishReason:error.finishReason}:{}),
    ...(error.incompleteReason?{incompleteReason:error.incompleteReason}:{})
  };
}

function createResearchRuntime({env,cacheDir,beforeRequest=()=>{},options={},limits=LIMITS,totalLimit=25}) {
  const budgets=Object.fromEntries(Object.entries(limits).map(([source,limit])=>[
    source,{...DEFAULT_BUDGETS[source==='seller_sitemap'?'seller_site':source],limit}
  ]));
  const runtime=new CollectorRuntime({...options,env,cacheDir,budgets});
  const transport=runtime.fetch;
  runtime.fetch=(url,request)=>{
    if(!normalizeResearchUrl(url,COMPANY.domain)||request.method!=='GET')throw new Error('Only first-party Pump GET requests are authorized.');
    const counts=Object.fromEntries(Object.keys(limits).map(key=>[key,runtime.usage[key].requests]));
    if(Object.values(counts).reduce((sum,count)=>sum+count,0)>totalLimit)throw Error('The authorized first-party request limit was reached.');
    beforeRequest(url,counts);
    return transport(url,request);
  };
  return runtime;
}

async function collectPages(runtime,{onPage=()=>{},onError=()=>{},saved=[],seeds=[],totalLimit=25}={}) {
  const pending=new Map(),pages=new Map(saved.map(page=>[page.url,page]));
  const key=value=>{const parsed=new URL(value);parsed.hostname=parsed.hostname.replace(/^www\./,'');return parsed.toString().replace(/\/$/,'');};
  const visited=new Set(saved.map(page=>key(page.url)));
  let storedBytes=saved.reduce((total,page)=>total+Buffer.byteLength(page.text),0);
  let stories=saved.filter(page=>isCustomerStory(page.url)).length;
  const requestCount=()=>Object.values(runtime.usage).reduce((sum,row)=>sum+row.requests,0);
  function enqueue(target) {
    const url=target?.url;
    if(url&&target.kind!=='seller_partner_page'&&!visited.has(key(url)))pending.set(key(url),target);
  }
  const origin=saved.find(page=>new URL(page.url).pathname==='/')?.url||COMPANY.website;
  const company={...COMPANY,website:origin};
  enqueue({url:origin,kind:'seller_site'});
  if(!saved.length)enqueue({url:new URL('/sitemap.xml',COMPANY.website).href,kind:'seller_sitemap'});
  for(const pathname of ['/about','/pricing','/how-it-works','/security'])enqueue(internalTarget(company,new URL(pathname,origin).href));
  for(const target of seeds)enqueue(target);
  while(pending.size&&requestCount()<totalLimit) {
    const available=[...pending.values()].filter(target=>{
      const source=target.kind==='seller_sitemap'?'seller_sitemap':'seller_site';
      return runtime.usage[source].requests<runtime.budgets[source].limit&&!visited.has(key(target.url))&&
        (!isCustomerStory(target.url)||stories<MAX_CUSTOMER_STORIES);
    });
    if(!available.length)break;
    const target=available.sort((a,b)=>rankUrl(a.url,company)-rankUrl(b.url,company))[0];
    pending.delete(key(target.url));visited.add(key(target.url));
    if(isCustomerStory(target.url))stories++;
    const sitemap=target.kind==='seller_sitemap';
    try {
      const page=await runtime.request(sitemap?'seller_sitemap':'seller_site',target.url,{allowedRedirectDomain:COMPANY.domain});
      const url=normalizeResearchUrl(page.url,COMPANY.domain);
      if(!url)throw new Error('The page left the approved seller domain.');
      visited.add(key(url));
      const linked=sitemap?sitemapTargets(COMPANY,page.text,url):homepageTargets(COMPANY,page.text,url);
      for(const row of linked)enqueue(row);
      if(sitemap||pages.has(url))continue;
      const text=truncateUtf8(stripHtml(page.text),Math.min(MAX_STORED_TEXT_PER_PAGE,MAX_STORED_TEXT_PER_RUN-storedBytes));
      if(!text)continue;
      storedBytes+=Buffer.byteLength(text);
      const evidence={url,text,title:titleFromHtml(page.text),fetchedAt:page.fetchedAt,kind:target.kind,rawHtml:page.text};
      pages.set(url,evidence);
      onPage(evidence);
    } catch(error) {
      onError({url:target.url,code:error.code||'PAGE_FAILED',status:error.status||null});
    }
  }
  return [...pages.values()];
}

function previousResearch(state,cacheDir) {
  const workspace=Object.values(state.workspaces).find(w=>w.name==='Pump'&&w.research?.runId===RUN_ID);
  if(!workspace||workspace.status!=='draft'||workspace.research.status!=='evidence_ready'||workspace.profileRevision||
      workspace.sellerProfile.approvedAt||workspace.budgets.openai||workspace.research.sources.length!==18) {
    throw Object.assign(Error('The original Pump evidence checkpoint is required.'),{code:'PUMP_SAVED_EVIDENCE_REQUIRED'});
  }
  const raw=rawPageMap([cacheDir]);
  const pages=workspace.research.sources.map(ref=>{
    const source=state.sources[ref.sourceId];
    if(!source?.text||!normalizeResearchUrl(source.url,COMPANY.domain))throw Error('Saved Pump evidence could not be verified.');
    return {url:source.url,text:source.text,title:source.title,fetchedAt:source.fetchedAt,kind:ref.kind,rawHtml:raw.get(source.url)?.text||''};
  });
  const seeds=pages.flatMap(page=>homepageTargets(COMPANY,page.rawHtml,page.url));
  for(const entry of fs.readdirSync(cacheDir)) {
    if(!entry.endsWith('.json'))continue;
    const cached=JSON.parse(fs.readFileSync(path.join(cacheDir,entry),'utf8'));
    if(normalizeResearchUrl(cached.url,COMPANY.domain)&&new URL(cached.url).pathname.endsWith('sitemap.xml'))seeds.push(...sitemapTargets(COMPANY,cached.text,cached.url));
  }
  return {workspace,pages,seeds};
}

function emptyPumpDraft(state) {
  const matches=Object.values(state.workspaces).filter(w=>/^pump$/i.test(w.name.trim())||w.research?.selectedCandidate?.domain===COMPANY.domain);
  if(!matches.length)return null;
  const [workspace]=matches;
  const research=workspace.research;
  if(matches.length!==1||workspace.status!=='draft'||workspace.sellerProfile.approvedAt||workspace.profileRevision||
    workspace.accounts.length||workspace.drafts.length||workspace.runs.length||workspace.budgets.openai||
    research?.runId||research?.sources?.length||(research?.selectedCandidate&&research.selectedCandidate.domain!==COMPANY.domain)) {
    throw Object.assign(Error('Pump already has saved research or a profile.'),{code:'PUMP_ALREADY_EXISTS'});
  }
  return workspace;
}

function addResearch(state,pages,requests,pageErrors,now,{existing=emptyPumpDraft(state),runId=RUN_ID}={}) {
  let next=existing?structuredClone(state):createWorkspace(state,{name:COMPANY.name});
  const id=existing?.id||next.activeWorkspaceId;
  next.activeWorkspaceId=state.activeWorkspaceId;
  const sources=[];
  for(const {url,text,title,fetchedAt,kind} of pages) {
    const recorded=recordSource(next,{url,text,title,fetchedAt});
    next=recorded.state;
    sources.push({schemaVersion:1,sourceId:recorded.source.id,url,title,fetchedAt,kind,ownerDomain:COMPANY.domain,chars:text.length,bytes:Buffer.byteLength(text)});
  }
  next=updateWorkspace(next,id,w=>{
    w.research={
      schemaVersion:1,revision:(w.research?.revision||0)+1,status:'evidence_ready',runId,
      companyName:COMPANY.name,selectedCandidate:{...COMPANY},sources,pageErrors,
      completedAt:now,updatedAt:now,
      usage:{queriesReserved:0,pagesAttempted:requests.seller_site,pagesSaved:sources.length,storedBytes:sources.reduce((sum,row)=>sum+row.bytes,0)}
    };
  });
  next.auditLog.push({schemaVersion:1,type:'bounded_seller_research_saved',workspaceId:id,runId,occurredAt:now});
  return {state:next,id};
}

function paidEnvironment(state,env,now) {
  const month=now.slice(0,7);
  const previouslyReserved=Object.values(state.workspaces).reduce((sum,w)=>{
    const saved=w.budgets.openai;
    if(saved?.month!==month)return sum;
    if(!Number.isSafeInteger(saved.reservedMicros)||saved.reservedMicros<0)throw Error('Saved OpenAI budget is invalid.');
    return sum+saved.reservedMicros;
  },0);
  return {...env,...BASE_DISABLED,
    OPENAI_ENABLED:'true',OPENAI_MONTHLY_LIMIT_USD:String((previouslyReserved+1350000)/1000000),
    OPENAI_WORKSPACE_MONTHLY_CALL_LIMIT:'3',OPENAI_RETRY_LIMIT:'0',
    OPENAI_MODEL:'gpt-5.5',OPENAI_SELLER_FACTS_MODEL:'gpt-5.5',
    OPENAI_ORGANIZATION_REVIEW_MODEL:'gpt-5.5',OPENAI_ICP_TARGETING_MODEL:'gpt-5.5'
  };
}

function verifyEstimate(estimate,maxInputTokens=40000) {
  if(estimate.calls.length!==3||estimate.totalMaximumCostUsd>CAP_USD||estimate.calls.some(call=>
    call.model!=='gpt-5.5'||call.reasoningEffort!=='low'||call.maxOutputTokens!==8000||call.estimatedInputTokens>maxInputTokens
  ))throw Object.assign(Error('The saved evidence exceeds the approved request bounds.'),{code:'PUMP_PREFLIGHT_LIMIT'});
}

async function run({file,env,envFile,rerun=false,artifactDir=path.join(path.dirname(file),rerun?RERUN_ID:RUN_ID),runtimeOptions,fetchImpl=fetch,now=()=>new Date().toISOString(),onPreflight=()=>{}}) {
  if(env.OPENAI_ENABLED!=='false'||Number(env.OPENAI_MONTHLY_LIMIT_USD)!==0)throw Object.assign(Error('OpenAI defaults must be disabled/zero.'),{code:'OPENAI_DEFAULTS_NOT_OFF'});
  if(!env.OPENAI_API_KEY?.trim())throw Object.assign(Error('OpenAI configuration is missing.'),{code:'OPENAI_KEY_MISSING'});
  const read=()=>loadState(file),mutate=async change=>{const next=change(read());saveState(next,file);return next;};
  const before=read();
  const prior=rerun?previousResearch(before,path.join(path.dirname(file),RUN_ID,'cache')):null;
  const existing=prior?.workspace||emptyPumpDraft(before);
  const runId=rerun?RERUN_ID:RUN_ID,totalLimit=rerun?RERUN_TOTAL:25;
  const digest=value=>createHash('sha256').update(value).digest('hex');
  const envHash=envFile?digest(fs.readFileSync(envFile)):null;
  const off={...env,...BASE_DISABLED},report={
    runId,status:'started',reusedPages:prior?.pages.length||0,startedAt:now(),capUsd:CAP_USD,requests:{seller_site:0,seller_sitemap:0,robots:0},
    requestUrls:[],savedSources:[],pageErrors:[],apolloAttempts:0,serperQueries:0,openaiAttempts:0,calls:[]
  };
  const checkpoint=()=>atomicWrite(path.join(artifactDir,'report.json'),JSON.stringify(report,null,2));
  const runtime=createResearchRuntime({env:off,cacheDir:path.join(artifactDir,'cache'),options:runtimeOptions,totalLimit,limits:rerun?RERUN_LIMITS:LIMITS,
    beforeRequest:(url,counts)=>{report.requests=counts;report.requestUrls.push(url);checkpoint();}
  });
  runtime.identity();
  fs.mkdirSync(artifactDir); // Exclusive marker before the first request. Never resume this allowance.
  let paidEnv;
  try {
    checkpoint();
    const pages=await collectPages(runtime,{
      saved:prior?.pages||[],seeds:prior?.seeds||[],totalLimit,
      onPage:page=>{report.savedSources.push({url:page.url,kind:page.kind});checkpoint();},
      onError:error=>{report.pageErrors.push(error);checkpoint();}
    });
    if(!pages.length)throw Object.assign(Error('No readable first-party pages.'),{code:'NO_SOURCES'});
    await mutate(current=>{
      const saved=prior?current.workspaces[existing.id]:emptyPumpDraft(current);
      if(saved?.id!==existing?.id||(prior&&JSON.stringify(saved)!==JSON.stringify(existing)))throw Object.assign(Error('The Pump workspace changed during research.'),{code:'PUMP_WORKSPACE_CHANGED'});
      const research=addResearch(current,pages,report.requests,report.pageErrors,now(),{existing,runId});
      report.workspaceId=research.id;
      return research.state;
    });
    const state=read(),rawPages=new Map(pages.map(page=>[page.url,{url:page.url,text:page.rawHtml}]));
    paidEnv=paidEnvironment(state,off,now());
    const generationOptions={env:paidEnv,rawPages};
    report.estimate=estimateFocusedSynthesisCost(state,report.workspaceId,generationOptions);
    verifyEstimate(report.estimate,rerun?50000:40000);
    checkpoint();
    onPreflight(report.estimate);
    const llm=createLlm({read,mutate,env:paidEnv,now,fetchImpl:async(url,request)=>{
      if(url!=='https://api.openai.com/v1/chat/completions'||request.method!=='POST'||report.openaiAttempts>=3)throw Error('Request outside the authorized generation batch.');
      report.openaiAttempts++;
      checkpoint();
      return fetchImpl(url,request);
    }});
    const recording={generate:async req=>{
      try {
        const result=await llm.generate(req);
        if(result.cached)throw Object.assign(Error('Expected an uncached request.'),{code:'UNEXPECTED_CACHE'});
        report.calls.push({purpose:req.name,model:result.model,usage:result.usage,costUsd:result.costUsd});
        checkpoint();
        return result;
      } catch(error) {
        report.failedPurpose=req.name;
        throw error;
      }
    }};
    const generated=await generateSynthesis({state,workspaceId:report.workspaceId,llm:recording,...generationOptions});
    await mutate(current=>saveGeneratedProfile(current,report.workspaceId,{
      output:generated.output,organizationReview:generated.organizationReview,...generated.guard,
      model:generated.model,promptVersion:generated.promptVersion,now
    }));
    const workspace=read().workspaces[report.workspaceId];
    report.result=publicResult(workspace);
    report.playbook=workspace.sellerProfile.playbook;
    report.status='saved_needs_review';
  } catch(error) {
    report.status='stopped';
    report.failure=safeFailure(error);
  } finally {
    if(paidEnv)Object.assign(paidEnv,BASE_DISABLED);
    report.disabledAfter={...BASE_DISABLED};
    report.actualCostUsd=Number((report.calls.reduce((sum,call)=>sum+call.costUsd,0)+(report.failure?.costUsd||0)).toFixed(6));
    const after=read();
    report.preserved=after.activeWorkspaceId===before.activeWorkspaceId&&Object.entries(before.workspaces).every(([id,w])=>id===report.workspaceId||JSON.stringify(w)===JSON.stringify(after.workspaces[id]));
    report.envUnchanged=!envFile||envHash===digest(fs.readFileSync(envFile));
    report.finishedAt=now();
    checkpoint();
  }
  return report;
}

if(require.main===module) {
  const env={},envFile=path.resolve(__dirname,'../.env');
  loadEnv(envFile,env);
  if(!['--run','--rerun'].includes(process.argv[2]))throw Error('Use a run command only with owner authorization.');
  run({file:statePath(env),env,envFile,rerun:process.argv[2]==='--rerun',onPreflight:estimate=>console.log(JSON.stringify({preflight:estimate}))})
    .then(report=>{
      console.log(JSON.stringify({status:report.status,workspaceId:report.workspaceId,requests:report.requests,openaiAttempts:report.openaiAttempts,actualCostUsd:report.actualCostUsd,failure:report.failure,preserved:report.preserved,envUnchanged:report.envUnchanged}));
      if(report.status!=='saved_needs_review')process.exitCode=1;
    }).catch(error=>{console.error(JSON.stringify(safeFailure(error)));process.exitCode=1;});
}
module.exports={run,createResearchRuntime,collectPages,verifyEstimate,addResearch,LIMITS,RUN_ID,RERUN_ID,RERUN_TOTAL};
