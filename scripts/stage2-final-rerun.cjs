const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');

const {loadEnv}=require('./env.cjs');
const {loadState,saveState,getWorkspace,updateWorkspace,atomicWrite}=require('./server/state.cjs');
const {CollectorRuntime}=require('./collectors/runtime.cjs');
const {stripHtml}=require('./collectors/common.cjs');
const {recordSource}=require('./sources.cjs');
const {createLlm}=require('./llm.cjs');
const {createSynthesisCoordinator}=require('./onboarding/synthesis-runner.cjs');
const {buildSynthesisRequest,PROMPT_VERSION}=require('./onboarding/synthesize.cjs');
const {workspaceQualityFindings}=require('./onboarding/validate.cjs');
const {createPersistentAdapter,snapshotFor,actualCostUsd}=require('./stage2-recovery-acceptance.cjs');

const ROOT=path.resolve(__dirname,'..');
const ACCEPTANCE_STATE_FILE=path.join(ROOT,'.whynow','acceptance-state.json');
const WORKING_STATE_FILE=path.join(ROOT,'.whynow','stage2-final-state.json');
const REPORT_FILE=path.join(ROOT,'.whynow','stage2-final-rerun-report.json');
const RUN_MARKER_FILE=path.join(ROOT,'.whynow','stage2-final-rerun-started.json');
const LIVE_CACHE_DIR=path.join(ROOT,'.whynow','stage2-final-live-cache');
const SNAPSHOT_DIR=path.join(ROOT,'tests','fixtures','onboarding');
const MAX_SOURCES=20;

const COMPANIES=Object.freeze([
  Object.freeze({
    name:'Resolve AI',domain:'resolve.ai',slug:'resolve-ai',
    customerPages:Object.freeze([
      'https://resolve.ai/customers',
      'https://resolve.ai/customers/blueground',
      'https://resolve.ai/customers/coinbase',
      'https://resolve.ai/customers/doordash',
      'https://resolve.ai/customers/gametime',
      'https://resolve.ai/customers/global-nosql',
      'https://resolve.ai/customers/salesforce',
      'https://resolve.ai/customers/zscaler'
    ]),
    livePages:Object.freeze([
      'https://resolve.ai/customers',
      'https://resolve.ai/customers/blueground',
      'https://resolve.ai/customers/coinbase',
      'https://resolve.ai/customers/doordash',
      'https://resolve.ai/customers/gametime',
      'https://resolve.ai/customers/global-nosql',
      'https://resolve.ai/customers/salesforce',
      'https://resolve.ai/customers/zscaler',
      'https://resolve.ai/about-us',
      'https://resolve.ai/pricing',
      'https://resolve.ai/glossary/pagerduty-sre-agent-vs-resolve-ai',
      'https://resolve.ai/glossary/incident-io-vs-resolve-ai'
    ]),
    retainedPages:Object.freeze([
      'https://resolve.ai/',
      'https://resolve.ai/blog/product-deep-dive',
      'https://resolve.ai/product/ai-sre'
    ])
  }),
  Object.freeze({
    name:'Shopify',domain:'shopify.com',slug:'shopify',
    customerPages:Object.freeze([
      'https://www.shopify.com/case-studies',
      'https://www.shopify.com/case-studies/diane-von-furstenberg',
      'https://www.shopify.com/case-studies/maggy-london',
      'https://www.shopify.com/blog/case-study-anian'
    ]),
    livePages:Object.freeze([
      'https://www.shopify.com/case-studies',
      'https://www.shopify.com/case-studies/diane-von-furstenberg',
      'https://www.shopify.com/case-studies/maggy-london',
      'https://www.shopify.com/blog/case-study-anian',
      'https://www.shopify.com/about',
      'https://www.shopify.com/enterprise',
      'https://www.shopify.com/pricing',
      'https://www.shopify.com/compare/shopify-vs-bigcommerce',
      'https://www.shopify.com/compare/shopify-vs-woocommerce'
    ]),
    retainedPages:Object.freeze([
      'https://www.shopify.com/',
      'https://www.shopify.com/customer-accounts',
      'https://www.shopify.com/pos/retail-customer-experience',
      'https://www.shopify.com/blog/how-to-price-your-product',
      'https://www.shopify.com/compare/shopify-vs-custom-platform'
    ])
  }),
  Object.freeze({
    name:'Vercel',domain:'vercel.com',slug:'vercel',
    customerPages:Object.freeze([
      'https://vercel.com/customers',
      'https://vercel.com/customers/how-rogo-ships-agent-written-code-to-production-in-5-minutes-on-vercel',
      'https://vercel.com/customers/how-the-weather-company-serves-real-time-forecasts-to-350-million-daily-active-users-on-vercel',
      'https://vercel.com/customers/how-sensay-went-from-zero-to-product-in-six-weeks'
    ]),
    livePages:Object.freeze([
      'https://vercel.com/customers',
      'https://vercel.com/customers/how-rogo-ships-agent-written-code-to-production-in-5-minutes-on-vercel',
      'https://vercel.com/customers/how-the-weather-company-serves-real-time-forecasts-to-350-million-daily-active-users-on-vercel',
      'https://vercel.com/customers/how-sensay-went-from-zero-to-product-in-six-weeks',
      'https://vercel.com/about',
      'https://vercel.com/enterprise',
      'https://vercel.com/pricing',
      'https://domains.vercel.com/kb/comparisons'
    ]),
    retainedPages:Object.freeze([
      'https://vercel.com/',
      'https://vercel.com/solutions/composable-commerce',
      'https://vercel.com/solutions/design-engineering',
      'https://vercel.com/solutions/multi-tenant-saas',
      'https://vercel.com/solutions/platform-engineering',
      'https://vercel.com/blog/new-pro-pricing-plan',
      'https://vercel.com/docs/pricing'
    ])
  })
]);

function normalizedHost(value) {return new URL(value).hostname.toLowerCase().replace(/^www\./,'');}
function normalizedUrl(value) {const url=new URL(value);url.hash='';return url.href;}
function urlKey(value) {const url=new URL(value);url.hostname=url.hostname.toLowerCase().replace(/^www\./,'');url.hash='';return url.href;}
function sameSellerHost(value,domain) {const host=normalizedHost(value),owner=String(domain).toLowerCase().replace(/^www\./,'');return host===owner||host.endsWith(`.${owner}`);}
function workspaceForCompany(state,company) {
  const workspace=Object.values(state.workspaces).find(item=>String(item.sellerProfile?.domain||item.research?.selectedCandidate?.domain||'').replace(/^www\./,'')===company.domain);
  if(!workspace)throw new Error(`${company.name}: acceptance workspace is missing.`);
  return workspace;
}
function sourceRefMap(state,workspace) {
  const map=new Map();
  for(const ref of workspace.research?.sources||[]) {
    const source=state.sources?.[ref.sourceId];
    if(source)map.set(urlKey(source.url),structuredClone(ref));
  }
  return map;
}
function validateFinalPlan(state) {
  const report=[];
  for(const company of COMPANIES) {
    const workspace=workspaceForCompany(state,company),savedPlan=new Set((workspace.research?.plan?.urls||workspace.research?.plan?.targets?.map(item=>item.url)||[]).map(normalizedUrl));
    const duplicates=new Set(),seen=new Set();
    for(const value of company.livePages) {
      const url=normalizedUrl(value);
      if(seen.has(url))duplicates.add(url);seen.add(url);
      if(!sameSellerHost(url,company.domain))throw new Error(`${company.name}: final live page is not first-party: ${url}`);
      if(/\/(?:partners?|marketplace|templates?|solution-partners?)(?:\/|$)/i.test(new URL(url).pathname))throw new Error(`${company.name}: low-priority partner/template page is not allowed in the final plan: ${url}`);
    }
    if(duplicates.size)throw new Error(`${company.name}: duplicate final live pages: ${[...duplicates].join(', ')}`);
    if(company.livePages.length>MAX_SOURCES)throw new Error(`${company.name}: live plan exceeds the 20-page ceiling.`);
    if(company.customerPages.length<4)throw new Error(`${company.name}: final plan does not include a customer index plus at least three stories.`);
    if(['Resolve AI','Shopify'].includes(company.name))for(const url of company.customerPages)if(!savedPlan.has(normalizedUrl(url)))throw new Error(`${company.name}: customer page was not found in the saved homepage/sitemap-derived plan: ${url}`);
    const selectedMaximum=new Set([...company.livePages,...company.retainedPages].map(normalizedUrl)).size;
    if(selectedMaximum>MAX_SOURCES)throw new Error(`${company.name}: final synthesis selection could exceed ${MAX_SOURCES} sources.`);
    report.push({company:company.name,livePageCount:company.livePages.length,customerPageCount:company.customerPages.length,maximumSynthesisSources:selectedMaximum,serperQueries:0,pages:[...company.livePages]});
  }
  return report;
}
function titleFromHtml(html) {return stripHtml(String(html||'').match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'').slice(0,300);}
function truncateUtf8(value,maxBytes=50000) {
  const bytes=Buffer.from(String(value||''));
  if(bytes.length<=maxBytes)return String(value||'');
  return bytes.subarray(0,maxBytes).toString('utf8').replace(/\uFFFD$/,'').trimEnd();
}
function sourceKind(url) {return /customer|case-stud|stories/i.test(new URL(url).pathname)?'seller_customer_page':'seller_site';}
function chooseSourceRefs(state,workspace,company,freshRefs=[]) {
  const old=sourceRefMap(state,workspace),chosen=[],seenUrls=new Set();
  const add=ref=>{
    const source=ref&&state.sources?.[ref.sourceId];if(!source)return;
    const url=urlKey(source.url);if(seenUrls.has(url))return;
    chosen.push(structuredClone(ref));seenUrls.add(url);
  };
  freshRefs.forEach(add);
  for(const value of company.livePages)if(old.has(urlKey(value)))add(old.get(urlKey(value)));
  for(const value of company.retainedPages)if(old.has(urlKey(value)))add(old.get(urlKey(value)));
  return chosen.slice(0,MAX_SOURCES);
}
function resetWorkspaceForFinalDraft(state,id,company,refs,{pageErrors=[],usage=null}={}) {
  return updateWorkspace(state,id,workspace=>{
    const at=new Date().toISOString();
    workspace.status='draft';workspace.deliveryMode='demo';workspace.llmCache={};workspace.budgets.openai={};
    workspace.sellerProfile={schemaVersion:1,deliveryAllowed:false};workspace.icpConfig={schemaVersion:1};
    workspace.research={...workspace.research,status:'evidence_ready',revision:(workspace.research?.revision||0)+1,completedAt:at,error:null,
      sources:structuredClone(refs),visitedUrls:company.livePages.slice(),pageErrors:structuredClone(pageErrors),warnings:[],
      plan:{schemaVersion:1,runId:`final-${company.slug}`,createdAt:at,urls:refs.map(ref=>ref.url),targets:refs.map(ref=>({schemaVersion:1,url:ref.url,source:'seller_site',kind:ref.kind,expectedHost:company.domain}))},
      usage:usage||{queriesReserved:0,pagesAttempted:company.livePages.length,pagesSaved:refs.length,storedChars:refs.reduce((sum,ref)=>sum+(ref.chars||0),0),storedBytes:refs.reduce((sum,ref)=>sum+(ref.bytes||0),0)},
      synthesis:null,synthesisJob:null,steps:(workspace.research?.steps||[]).map(step=>({...step,status:step.key==='identify'||step.key==='research'?'complete':'not_started'}))};
    return workspace;
  });
}
function envState(env) {return {openaiDisabled:env.OPENAI_ENABLED==='false',openaiLocalLimitZero:Number(env.OPENAI_MONTHLY_LIMIT_USD)===0,keyPresent:Boolean(env.OPENAI_API_KEY?.trim())};}
function loadedEnvironment() {const env={};loadEnv(path.join(ROOT,'.env'),env);return env;}
function commitHash() {return execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim();}

async function fetchCompanyPages(state,company,env) {
  const workspace=workspaceForCompany(state,company),id=workspace.id,runtime=new CollectorRuntime({env,cacheDir:LIVE_CACHE_DIR,timeoutMs:20000});
  let next=state;const freshRefs=[],pageErrors=[];
  for(const requestedUrl of company.livePages) {
    try {
      const page=await runtime.request('seller_site',requestedUrl,{allowedRedirectDomain:company.domain});
      if(!sameSellerHost(page.url,company.domain))throw new Error('The final response left the approved seller domain.');
      const text=truncateUtf8(stripHtml(page.text));
      if(!text)throw new Error('The page contained no readable public text.');
      const recorded=recordSource(next,{url:page.url,fetchedAt:page.fetchedAt,title:titleFromHtml(page.text),text});next=recorded.state;
      const bytes=Buffer.byteLength(text),ref={schemaVersion:1,sourceId:recorded.source.id,url:recorded.source.url,title:recorded.source.title,fetchedAt:recorded.source.fetchedAt,kind:sourceKind(requestedUrl),ownerDomain:company.domain,chars:text.length,bytes,requestedUrl};
      freshRefs.push(ref);
    } catch(error) {pageErrors.push({url:requestedUrl,code:String(error?.code||'FETCH_FAILED').slice(0,80),message:String(error?.message||'Page fetch failed.').slice(0,300)});}
    const refs=chooseSourceRefs(next,workspace,company,freshRefs);
    next=resetWorkspaceForFinalDraft(next,id,company,refs,{pageErrors,usage:{queriesReserved:0,pagesAttempted:freshRefs.length+pageErrors.length,pagesSaved:freshRefs.length,storedChars:freshRefs.reduce((sum,ref)=>sum+ref.chars,0),storedBytes:freshRefs.reduce((sum,ref)=>sum+ref.bytes,0)}});
    saveState(next,WORKING_STATE_FILE);
  }
  const refs=chooseSourceRefs(next,workspace,company,freshRefs);
  next=resetWorkspaceForFinalDraft(next,id,company,refs,{pageErrors,usage:{queriesReserved:0,pagesAttempted:company.livePages.length,pagesSaved:freshRefs.length,storedChars:freshRefs.reduce((sum,ref)=>sum+ref.chars,0),storedBytes:freshRefs.reduce((sum,ref)=>sum+ref.bytes,0)}});
  saveState(next,WORKING_STATE_FILE);
  return {state:next,workspaceId:id,freshRefs,pageErrors,cacheUsage:runtime.snapshot(),fallbackSources:refs.filter(ref=>!freshRefs.some(item=>item.sourceId===ref.sourceId)).length};
}

function auditWorkspace(workspace) {
  const findings=workspaceQualityFindings(workspace),blocking=findings.filter(item=>item.severity==='blocking'),advisory=findings.filter(item=>item.severity==='advisory');
  return {company:workspace.sellerProfile.sellerName,domain:workspace.sellerProfile.domain,status:workspace.status,
    customers:(workspace.sellerProfile.customers||[]).map(item=>({name:item.name,domain:item.domain,sourceUrl:item.sourceUrl})),
    competitors:(workspace.sellerProfile.competitors||[]).map(item=>({name:item.name,domain:item.domain,sourceUrl:item.sourceUrl})),
    targetCompanySize:workspace.sellerProfile.targetCompanySize||'',sizeMetric:structuredClone(workspace.icpConfig.killPatterns?.sizeMetric||{}),
    buyerTitles:[...(workspace.icpConfig.personas?.buyerTitles||[])],championTitles:[...(workspace.icpConfig.personas?.championTitles||[])],
    blockingWarnings:blocking.length,advisoryWarnings:advisory.length,blockingFindings:blocking,advisoryFindings:advisory,
    receiptReport:structuredClone(workspace.research?.synthesis?.report||{})};
}

async function preflight() {
  if(fs.existsSync(RUN_MARKER_FILE)||fs.existsSync(REPORT_FILE))throw new Error('The one final automated Stage 2 rerun has already started or completed.');
  const state=loadState(ACCEPTANCE_STATE_FILE),env=loadedEnvironment(),provider=envState(env);
  if(!provider.openaiDisabled||!provider.openaiLocalLimitZero)throw new Error('Normal local OpenAI settings must be disabled with a zero local limit before the bounded run.');
  if(!provider.keyPresent)throw new Error('The local OpenAI key is missing.');
  return {stateFile:ACCEPTANCE_STATE_FILE,workingStateFile:WORKING_STATE_FILE,providerDefaultsBeforeRun:{openaiDisabled:provider.openaiDisabled,openaiLocalLimitZero:provider.openaiLocalLimitZero},plans:validateFinalPlan(state),totalSerperQueries:0,totalLivePages:COMPANIES.reduce((sum,item)=>sum+item.livePages.length,0),logicalGptCalls:3,processCapUsd:0.05};
}

async function run() {
  const check=await preflight(),startedAt=new Date().toISOString();
  atomicWrite(RUN_MARKER_FILE,`${JSON.stringify({schemaVersion:1,startedAt,authorizedOn:'2026-10-19',logicalGptCalls:3,processCapUsd:0.05},null,2)}\n`);
  let state=loadState(ACCEPTANCE_STATE_FILE);saveState(state,WORKING_STATE_FILE);
  const loaded=loadedEnvironment(),fetchResults=[];
  for(const company of COMPANIES) {
    const fetched=await fetchCompanyPages(state,company,loaded);state=fetched.state;
    fetchResults.push({company:company.name,requestedPages:company.livePages.length,fetchedPages:fetched.freshRefs.length,pageErrors:fetched.pageErrors,fallbackSources:fetched.fallbackSources,
      selectedSources:getWorkspace(state,fetched.workspaceId).research.sources.length});
  }

  const adapter=createPersistentAdapter(WORKING_STATE_FILE),paidEnv={...loaded,OPENAI_ENABLED:'true',OPENAI_MONTHLY_LIMIT_USD:'0.05',OPENAI_WORKSPACE_MONTHLY_CALL_LIMIT:'2',OPENAI_MODEL:'gpt-4o-mini'};
  let currentCompany='unknown',logicalCalls=0,providerAttempts=0;const apiUsage=[];
  const fetchImpl=async(...args)=>{
    providerAttempts++;
    const response=await fetch(...args);
    if(response.ok)try {
      const payload=await response.clone().json(),usage=payload.usage||{};
      apiUsage.push({company:currentCompany,model:payload.model||'gpt-4o-mini',promptTokens:usage.prompt_tokens||0,completionTokens:usage.completion_tokens||0,totalTokens:usage.total_tokens||0});
    } catch {}
    return response;
  };
  const llm=createLlm({...adapter,env:paidEnv,fetchImpl}),countedLlm={generate:request=>{logicalCalls++;if(logicalCalls>3)throw new Error('The final rerun allows exactly three logical GPT calls.');return llm.generate(request);}};
  const synthesis=createSynthesisCoordinator({...adapter,llm:countedLlm}),commit=commitHash(),snapshots=[];
  for(const company of COMPANIES) {
    currentCompany=company.name;const workspace=workspaceForCompany(adapter.read(),company);
    buildSynthesisRequest(adapter.read(),workspace.id);
    await synthesis.start(workspace.id);
    const generated=getWorkspace(adapter.read(),workspace.id);
    if(generated.status!=='needs_review'||generated.research?.status!=='review_required')throw new Error(`${company.name}: final draft was not persisted in needs_review.`);
    const snapshot={...snapshotFor(generated,{capturedOn:new Date().toISOString(),commit}),source:'Owner-authorized final Stage 2 rerun using only the documented first-party live-page allowlist and zero Serper queries.'};
    const snapshotFile=path.join(SNAPSHOT_DIR,`${company.slug}-live-icp.json`);atomicWrite(snapshotFile,`${JSON.stringify(snapshot,null,2)}\n`);snapshots.push(path.relative(ROOT,snapshotFile));
  }
  await adapter.settled();
  if(logicalCalls!==3)throw new Error(`Expected exactly three logical GPT calls; saw ${logicalCalls}.`);
  const finalState=adapter.read(),audits=COMPANIES.map(company=>auditWorkspace(workspaceForCompany(finalState,company)));
  if(audits.some(item=>item.status!=='needs_review'))throw new Error('Every final seller profile must remain in needs_review.');
  saveState(finalState,ACCEPTANCE_STATE_FILE);
  const after=envState(loadedEnvironment());
  if(!after.openaiDisabled||!after.openaiLocalLimitZero)throw new Error('Normal local OpenAI settings were not restored to disabled and zero.');
  const report={schemaVersion:1,startedAt,completedAt:new Date().toISOString(),authorizedOn:'2026-10-19',commitHash:commit,model:'gpt-4o-mini',promptVersion:PROMPT_VERSION,
    totalSerperQueries:0,totalLivePages:check.totalLivePages,logicalGptCalls:logicalCalls,providerAttempts,processCapUsd:0.05,
    actualCostUsd:Number(actualCostUsd(apiUsage).toFixed(6)),actualCostComplete:apiUsage.length===3,apiUsage,fetchResults,snapshots,audits,autoApproved:false,
    providerDefaultsAfterRun:{openaiDisabled:after.openaiDisabled,openaiLocalLimitZero:after.openaiLocalLimitZero}};
  atomicWrite(REPORT_FILE,`${JSON.stringify(report,null,2)}\n`);
  return {stateFile:ACCEPTANCE_STATE_FILE,reportFile:REPORT_FILE,report};
}

async function main() {
  const mode=process.argv[2];
  if(mode==='--preflight')console.log(JSON.stringify(await preflight(),null,2));
  else if(mode==='--run')console.log(JSON.stringify(await run(),null,2));
  else throw new Error('Use --preflight or --run.');
}
if(require.main===module)main().catch(error=>{console.error(`[failed] ${error.message}`);process.exitCode=1;});

module.exports={ROOT,ACCEPTANCE_STATE_FILE,WORKING_STATE_FILE,REPORT_FILE,RUN_MARKER_FILE,LIVE_CACHE_DIR,COMPANIES,MAX_SOURCES,
  validateFinalPlan,chooseSourceRefs,resetWorkspaceForFinalDraft,auditWorkspace,envState,preflight,run};
