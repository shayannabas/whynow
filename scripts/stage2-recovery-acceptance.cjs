const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');

const {loadEnv}=require('./env.cjs');
const {defaultState,loadState,saveState,getWorkspace,atomicWrite}=require('./server/state.cjs');
const {requestResearch}=require('./onboarding/research-request.cjs');
const {createResearchCoordinator}=require('./onboarding/research.cjs');
const {createSynthesisCoordinator}=require('./onboarding/synthesis-runner.cjs');
const {buildSynthesisRequest,PROMPT_VERSION}=require('./onboarding/synthesize.cjs');
const {createLlm}=require('./llm.cjs');
const {CollectorRuntime}=require('./collectors/runtime.cjs');

const ROOT=path.resolve(__dirname,'..');
const ACCEPTANCE_STATE_FILE=path.join(ROOT,'.whynow','acceptance-state.json');
const ACCEPTANCE_REPORT_FILE=path.join(ROOT,'.whynow','stage2-recovery-report.json');
const SNAPSHOT_DIR=path.join(ROOT,'tests','fixtures','onboarding');
const COMPANIES=Object.freeze([
  Object.freeze({name:'Resolve AI',domain:'resolve.ai',slug:'resolve-ai'}),
  Object.freeze({name:'Shopify',domain:'shopify.com',slug:'shopify'}),
  Object.freeze({name:'Vercel',domain:'vercel.com',slug:'vercel'})
]);

function argument(name) {
  const index=process.argv.indexOf(name);
  return index===-1?null:process.argv[index+1];
}

function matchingCandidate(candidates,domain) {
  const wanted=String(domain).replace(/^www\./,'');
  return candidates.find(item=>String(item.domain||'').replace(/^www\./,'')===wanted);
}

function createPersistentAdapter(stateFile) {
  let writes=Promise.resolve();
  const read=()=>loadState(stateFile);
  const mutate=fn=>{
    const operation=writes.then(()=>{
      const next=fn(loadState(stateFile));
      saveState(next,stateFile);
      return structuredClone(next);
    });
    writes=operation.catch(()=>{});
    return operation;
  };
  return {read,mutate,settled:()=>writes};
}

function replayClock(cacheDir) {
  const timestamps=fs.readdirSync(cacheDir)
    .filter(name=>name.endsWith('.json'))
    .map(name=>JSON.parse(fs.readFileSync(path.join(cacheDir,name),'utf8')).savedAt)
    .filter(Number.isFinite);
  if(!timestamps.length)throw new Error('The saved research cache is empty.');
  return Math.max(...timestamps)+1000;
}

function createCacheOnlyRuntimeFactory({cacheDir,env,cacheMisses,currentCompany}) {
  const now=replayClock(cacheDir);
  return options=>new CollectorRuntime({
    ...options,
    env,
    cacheDir,
    now:()=>now,
    lookup:async()=>[{address:'8.8.8.8',family:4}],
    sleep:async()=>{},
    fetch:async(url,request={})=>{
      const isSerper=url==='https://google.serper.dev/search';
      let query='';
      if(isSerper)try{query=JSON.parse(request.body||'{}').q||'';}catch{}
      cacheMisses.push({company:currentCompany(),kind:isSerper?'serper':'page',url,...(query?{query}:{})});
      throw new Error('CACHE_MISS_NETWORK_BLOCKED');
    }
  });
}

function commitHash() {
  return execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim();
}

function snapshotFor(workspace,{capturedOn,commit}) {
  return {
    schemaVersion:1,
    capturedOn,
    model:workspace.research?.synthesis?.model||'gpt-4o-mini',
    promptVersion:workspace.research?.synthesis?.promptVersion||PROMPT_VERSION,
    commitHash:commit,
    source:'Owner-authorized Stage 2 recovery run using saved public-page research responses.',
    seller:{name:workspace.sellerProfile.sellerName,domain:workspace.sellerProfile.domain},
    sellerProfile:structuredClone(workspace.sellerProfile),
    icpConfig:structuredClone(workspace.icpConfig),
    receiptReport:structuredClone(workspace.research?.synthesis?.report||{})
  };
}

function writeSnapshot(company,workspace,metadata) {
  const file=path.join(SNAPSHOT_DIR,`${company.slug}-live-icp.json`);
  atomicWrite(file,`${JSON.stringify(snapshotFor(workspace,metadata),null,2)}\n`);
  return file;
}

function loadedEnvironment() {
  const env={};
  loadEnv(path.join(ROOT,'.env'),env);
  return env;
}

async function preflight(cacheDir) {
  if(!cacheDir)throw new Error('Pass the saved collector cache with --cache-dir.');
  if(fs.existsSync(ACCEPTANCE_STATE_FILE)) {
    const saved=loadState(ACCEPTANCE_STATE_FILE);
    const containsPaidDraft=Object.values(saved.workspaces).some(workspace=>workspace.status!=='draft'||Object.keys(workspace.llmCache||{}).length);
    if(containsPaidDraft)throw new Error('Acceptance state contains generated or reviewed work; refusing to overwrite it.');
  }
  const env=loadedEnvironment();
  const cacheMisses=[];
  let activeCompany='preflight';
  saveState(defaultState(),ACCEPTANCE_STATE_FILE);
  const adapter=createPersistentAdapter(ACCEPTANCE_STATE_FILE);
  const runtimeFactory=createCacheOnlyRuntimeFactory({cacheDir,env,cacheMisses,currentCompany:()=>activeCompany});
  const research=createResearchCoordinator({...adapter,env,runtimeFactory});
  const results=[];

  for(const company of COMPANIES) {
    activeCompany=company.name;
    await adapter.mutate(state=>requestResearch(state,company.name));
    const id=adapter.read().activeWorkspaceId;
    const identified=await research.start(id);
    const candidate=matchingCandidate(identified.candidates||[],company.domain);
    if(!candidate)throw new Error(`${company.name}: the saved search response did not identify ${company.domain}.`);
    const researched=await research.confirm(id,candidate.id,identified.revision);
    results.push({company:company.name,domain:company.domain,workspaceId:id,status:researched.status,pagesSaved:researched.sources?.length||0,
      serperQueries:researched.usage?.queriesReserved||0,pageErrors:researched.pageErrors?.length||0});
  }
  await adapter.settled();
  const serperMisses=cacheMisses.filter(item=>item.kind==='serper');
  if(serperMisses.length) {
    const missingByCompany=Object.fromEntries(COMPANIES.map(company=>{
      const misses=cacheMisses.filter(item=>item.company===company.name);
      return [company.name,{serperQueriesNeeded:misses.filter(item=>item.kind==='serper').length,pageResponsesMissing:misses.filter(item=>item.kind==='page').length}];
    }));
    throw Object.assign(new Error(`Saved research cache is incomplete: ${JSON.stringify(missingByCompany)}`),{cacheMisses});
  }
  const invalid=results.filter(item=>item.status!=='evidence_ready'||item.pagesSaved<1);
  if(invalid.length)throw new Error(`Cache replay did not produce complete evidence: ${JSON.stringify(invalid)}`);
  return {stateFile:ACCEPTANCE_STATE_FILE,results,serperQueriesNeeded:0,
    unavailablePageResponses:Object.fromEntries(COMPANIES.map(company=>[company.name,cacheMisses.filter(item=>item.company===company.name&&item.kind==='page').length]))};
}

function actualCostUsd(usage) {
  return usage.reduce((sum,item)=>sum+(item.promptTokens*0.15+item.completionTokens*0.60)/1_000_000,0);
}

async function paidRecovery() {
  if(!fs.existsSync(ACCEPTANCE_STATE_FILE))throw new Error('Run the cache-only preflight first.');
  const loaded=loadedEnvironment();
  if(!loaded.OPENAI_API_KEY?.trim())throw new Error('OpenAI key is missing from the local environment file.');
  const env={...loaded,OPENAI_ENABLED:'true',OPENAI_MONTHLY_LIMIT_USD:'0.05',OPENAI_WORKSPACE_MONTHLY_CALL_LIMIT:'2',OPENAI_MODEL:'gpt-4o-mini'};
  const adapter=createPersistentAdapter(ACCEPTANCE_STATE_FILE);
  const state=adapter.read();
  const targets=COMPANIES.map(company=>{
    const workspace=Object.values(state.workspaces).find(item=>item.research?.selectedCandidate?.domain?.replace(/^www\./,'')===company.domain);
    if(!workspace)throw new Error(`${company.name}: preflight workspace is missing.`);
    if(workspace.research?.status!=='evidence_ready'||workspace.status!=='draft')throw new Error(`${company.name}: preflight workspace is not ready for one draft call.`);
    if(workspace.llmCache&&Object.keys(workspace.llmCache).length)throw new Error(`${company.name}: an LLM cache already exists; refusing an ambiguous recovery run.`);
    buildSynthesisRequest(state,workspace.id);
    return {company,workspaceId:workspace.id};
  });
  if(targets.length!==3)throw new Error('Recovery must contain exactly three seller workspaces.');

  const apiUsage=[];
  let providerAttempts=0,logicalCalls=0;
  const fetchImpl=async(...args)=>{
    providerAttempts++;
    const response=await fetch(...args);
    if(response.ok)try{
      const payload=await response.clone().json(),usage=payload.usage||{};
      apiUsage.push({model:payload.model||'gpt-4o-mini',promptTokens:usage.prompt_tokens||0,completionTokens:usage.completion_tokens||0,totalTokens:usage.total_tokens||0});
    }catch{}
    return response;
  };
  const llm=createLlm({...adapter,env,fetchImpl});
  const countedLlm={generate:request=>{logicalCalls++;if(logicalCalls>3)throw new Error('Exactly three logical GPT calls are allowed.');return llm.generate(request);}};
  const synthesis=createSynthesisCoordinator({...adapter,llm:countedLlm});
  const commit=commitHash(),results=[];

  for(const {company,workspaceId} of targets) {
    const started=Date.now();
    await synthesis.start(workspaceId);
    const workspace=getWorkspace(adapter.read(),workspaceId);
    if(workspace.status!=='needs_review'||workspace.research?.status!=='review_required')throw new Error(`${company.name}: no reviewable profile was persisted.`);
    const capturedOn=new Date().toISOString();
    const snapshotFile=writeSnapshot(company,workspace,{capturedOn,commit});
    const report=workspace.research.synthesis.report||{};
    results.push({company:company.name,domain:company.domain,workspaceId,status:workspace.status,researchStatus:workspace.research.status,
      elapsedSeconds:Number(((Date.now()-started)/1000).toFixed(1)),snapshotFile:path.relative(ROOT,snapshotFile),attemptedClaims:report.attemptedClaims||0,
      receiptedClaims:report.receiptedClaims||0,receiptCoverage:report.receiptCoverage||0,reservedUsd:Number(((workspace.budgets.openai?.reservedMicros||0)/1e6).toFixed(6))});
  }
  await adapter.settled();
  if(logicalCalls!==3||apiUsage.length!==3)throw new Error(`Expected three completed GPT calls; saw ${logicalCalls} logical calls and ${apiUsage.length} successful provider responses.`);
  const report={schemaVersion:1,completedAt:new Date().toISOString(),commitHash:commit,model:'gpt-4o-mini',promptVersion:PROMPT_VERSION,
    localProcessCapUsd:0.05,logicalCalls,providerAttempts,actualCostUsd:Number(actualCostUsd(apiUsage).toFixed(6)),apiUsage,results,autoApproved:false};
  atomicWrite(ACCEPTANCE_REPORT_FILE,`${JSON.stringify(report,null,2)}\n`);
  return {stateFile:ACCEPTANCE_STATE_FILE,reportFile:ACCEPTANCE_REPORT_FILE,report};
}

async function main() {
  const mode=process.argv[2];
  if(mode==='--preflight')console.log(JSON.stringify(await preflight(argument('--cache-dir')),null,2));
  else if(mode==='--run')console.log(JSON.stringify(await paidRecovery(),null,2));
  else throw new Error('Use --preflight --cache-dir <saved-cache> or --run.');
}

if(require.main===module)main().catch(error=>{console.error(`[failed] ${error.message}`);process.exitCode=1;});

module.exports={ROOT,ACCEPTANCE_STATE_FILE,ACCEPTANCE_REPORT_FILE,SNAPSHOT_DIR,COMPANIES,matchingCandidate,createPersistentAdapter,
  createCacheOnlyRuntimeFactory,snapshotFor,actualCostUsd,preflight,paidRecovery};
