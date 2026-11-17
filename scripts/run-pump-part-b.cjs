'use strict';

const fs=require('node:fs');
const path=require('node:path');
const {createHash}=require('node:crypto');
const {loadEnv}=require('./env.cjs');
const {loadState,saveState,statePath,atomicWrite}=require('./server/state.cjs');
const {approvedPlaybook}=require('./playbook.cjs');
const {CollectorRuntime,CollectorHttpError}=require('./collectors/runtime.cjs');
const {createApolloClient,publicDomain,assertReady:assertApolloReady}=require('./collectors/apollo.cjs');
const {search,searchNews,serperSettings,assertSerperReady}=require('./serper.cjs');
const {executeTriggerFirst}=require('./trigger-first-runner.cjs');
const {parseSearchResults,emptyProfile,sourceField,mergeProfiles}=require('./firmographics.cjs');
const {stripHtml}=require('./collectors/common.cjs');
const {scoreAccount}=require('./score-account.cjs');
const {phaseAConfigForWorkspace}=require('./phase-a-config.cjs');
const {recordSource}=require('./sources.cjs');
const {createTemplateDraft}=require('./outreach-drafts.cjs');
const {todaySections,whyNow,latestTrigger}=require('./account-lifecycle.cjs');

const BATCH='pump-part-b-nov17-2026-one-use';
const CAPS=Object.freeze({serper:40,free:150,apollo:10,candidates:25});
const RULES=Object.freeze({'recent-funding':'news','ai-or-gpu-spend':'news','migration-or-multicloud':'news','devops-cloud-hiring':'ats_jobs'});
const FREE_SOURCES=new Set(['robots','engineering_web','greenhouse','lever','ashby']);
const OFF=Object.freeze({
  SERPER_ENABLED:'false',SERPER_MONTHLY_QUERY_LIMIT:'0',WORKSPACE_MAX_SERPER_QUERIES_PER_RUN:'0',
  APOLLO_ENABLED:'false',APOLLO_COMPANY_SEARCH_ENABLED:'false',APOLLO_MAX_CALLS_PER_RUN:'0',APOLLO_MONTHLY_CALL_LIMIT:'0',
  OPENAI_ENABLED:'false',OPENAI_MONTHLY_LIMIT_USD:'0',OPENAI_WORKSPACE_MONTHLY_CALL_LIMIT:'0',
  GDELT_ENABLED:'false',EDGAR_ENABLED:'false',SCHEDULER_ENABLED:'false',GITHUB_ENABLED:'false'
});
const safeError=error=>({code:error.code||'PUMP_PART_B_FAILED',httpStatus:error.status||error.httpStatus||null});
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

function assertSavedApprovals(state,workspaceId) {
  const w=workspaceId?state.workspaces[workspaceId]:Object.values(state.workspaces).find(row=>
    row.name==='Pump'&&row.sellerProfile.domain==='pump.co');
  const policy=w&&approvedPlaybook(w);
  const profileAudit=w&&state.auditLog.some(row=>row.workspaceId===w.id&&row.type==='seller_profile_approved'&&row.profileRevision===w.profileRevision);
  const playbookAudit=w&&state.auditLog.some(row=>row.workspaceId===w.id&&row.type==='playbook_approved'&&row.playbookVersion===6&&row.occurredAt===policy?.approvedAt);
  if(!w||w.name!=='Pump'||w.sellerProfile.domain!=='pump.co'||w.status!=='active'||!w.sellerProfile.approvedAt||!profileAudit||policy?.version!==6||!playbookAudit) {
    throw Object.assign(Error('Saved Pump profile and playbook v6 approvals are required.'),{code:'PUMP_APPROVAL_REQUIRED'});
  }
  const discoveryRules=policy.triggers.filter(rule=>['news','ats_jobs'].includes(rule.source));
  if(discoveryRules.length!==Object.keys(RULES).length||!Object.entries(RULES).every(([id,source])=>
    discoveryRules.some(rule=>rule.id===id&&rule.source===source&&rule.keywords.length))) {
    throw Object.assign(Error('Approved Pump discovery rules differ from the authorized rules.'),{code:'PUMP_POLICY_MISMATCH'});
  }
  return {workspace:w,policy};
}

function roundRobinCandidates(rows) {
  const groups=new Map();
  for(const row of rows) {
    const key=row.ruleId||'devops-cloud-hiring';
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(row);
  }
  const selected=[];
  while(selected.length<CAPS.candidates) {
    let added=0;
    for(const rows of groups.values()) {
      if(rows.length&&selected.length<CAPS.candidates) { selected.push(rows.shift());added++; }
    }
    if(!added)break;
  }
  return selected;
}

function guardedRuntime(runtime,{report,checkpoint,assertCurrent}) {
  const request=runtime.request.bind(runtime),transport=runtime.fetch;
  const stop=(code,status=null)=> {
    report.failure??={code,httpStatus:status};
    checkpoint();
    throw new CollectorHttpError(report.failure.code,'Pump Part B stopped.',report.failure.httpStatus);
  };
  const check=()=> {
    if(report.failure)throw new CollectorHttpError(report.failure.code,'Pump Part B stopped.',report.failure.httpStatus);
    assertCurrent();
  };
  runtime.request=(source,value,options={})=>{
    check();
    if(!FREE_SOURCES.has(source)&&!['serper','apollo'].includes(source))stop('UNAUTHORIZED_SOURCE');
    return request(source,value,options);
  };
  runtime.fetch=async(value,options)=>{
    check();
    const url=new URL(value),source=options.source;
    if(source==='apollo') {
      if(url.origin!=='https://api.apollo.io'||url.pathname!=='/api/v1/organizations/enrich'||options.method!=='GET')stop('UNAUTHORIZED_APOLLO_ENDPOINT');
      if(report.apolloAttempts>=CAPS.apollo)stop('APOLLO_ATTEMPT_CAP');
      report.apolloAttempts++;
    }else if(source==='serper') {
      if(url.origin!=='https://google.serper.dev'||!['/news','/search'].includes(url.pathname)||options.method!=='POST')stop('UNAUTHORIZED_SERPER_ENDPOINT');
      if(report.serperQueries>=CAPS.serper)stop('SERPER_CAP');
      report.serperQueries++;
    }else{
      if(!FREE_SOURCES.has(source)||options.method!=='GET'||['api.openai.com','google.serper.dev','api.apollo.io'].includes(url.hostname)&&!(source==='robots'&&url.hostname==='api.apollo.io'&&url.pathname==='/robots.txt'))stop('UNAUTHORIZED_FREE_REQUEST');
      if(report.freeRequests>=CAPS.free)stop('FREE_COLLECTOR_CAP');
      report.freeRequests++;
      report.freeBySource[source]=(report.freeBySource[source]||0)+1;
    }
    const trace={source,url:url.origin+url.pathname,httpStatus:null};
    report.requests.push(trace);
    checkpoint();
    const response=await transport(value,options);
    trace.httpStatus=response.status;
    checkpoint();
    // The owner requested a stop on any HTTP error, including robots responses.
    if(response.status>=400)stop('HTTP_ERROR',response.status);
    return response;
  };
  return check;
}

function sizeFromVerifiedSources(target,{sourcePage,verifiedEvent,now}) {
  const company={...target,...target.firmographicTarget};
  const rows=[
    ...(sourcePage?[{url:sourcePage.url,title:sourcePage.title,text:stripHtml(sourcePage.text).slice(0,12000)}]:[]),
    ...(verifiedEvent?[{url:verifiedEvent.evidenceUrl,title:verifiedEvent.title,text:verifiedEvent.evidenceText}]:[])
  ];
  const profile=parseSearchResults(company,rows,now.toISOString());
  return {targetPatch:{firmographics:profile,firmographicsConfidence:profile.confidenceLabel,firmographicEntity:{
    name:company.name,domain:company.domain,parentOf:target.firmographicTarget?.parentOf||'',receipt:profile.fields.employeeCount?.sourceUrl||''
  }}};
}

function ranked(workspace,now) {
  const sections=todaySections(workspace,now);
  const row=a=>{
    const trigger=latestTrigger(a,now),savedSourceId=trigger?.metadata?.savedSourceId;
    return {name:a.name,id:a.id,domain:a.domain,fit:a.fitScore,tier:a.tier,trigger:trigger?.title||null,
      triggerDate:trigger?.occurredAt||null,receipt:savedSourceId?'/sources/'+savedSourceId:trigger?.evidenceUrl||null,
      originalReceipt:trigger?.evidenceUrl||null,reviewReason:a.reviewReason||'',
      researchReceipt:a.researchSignal?.evidenceUrl||(!trigger?a.sourceUrl:null),sizeReceipt:a.firmographics?.fields?.employeeCount?.sourceUrl||null};
  };
  return {
    actNow:sections.actNow.map(row),worthResearching:sections.worthResearching.map(row),topProspects:sections.topProspects.map(row),
    needsReview:sections.needsReview.map(row),killed:workspace.accounts.filter(a=>a.kills?.length||a.killStatus==='killed').map(a=>({...row(a),kills:a.kills||[]}))
  };
}

async function run({file,artifactDir=path.join(path.dirname(file),BATCH),env,envFile,now=()=>new Date(),runtimeFactory=options=>new CollectorRuntime(options)}){
  const read=()=>loadState(file),before=read(),{workspace:w,policy}=assertSavedApprovals(before);
  if(w.runs.some(run=>run.id===BATCH||['queued','running'].includes(run.status))||before.auditLog.some(row=>row.batch===BATCH)) {
    throw Object.assign(Error('The batch was used or another Pump run is active.'),{code:'PUMP_BATCH_UNAVAILABLE'});
  }
  const mutate=async update=>{const state=update(read());saveState(state,file);return state;};
  const month=now().toISOString().slice(0,7);
  const priorApollo=w.budgets.apollo?.month===month?w.budgets.apollo.calls:0;
  const priorSerper=w.budgets.serperQueries?.month===month?w.budgets.serperQueries.queries:0;
  const live={
    ...env,...OFF,SERPER_ENABLED:'true',SERPER_MONTHLY_QUERY_LIMIT:env.SERPER_MONTHLY_QUERY_LIMIT,
    WORKSPACE_MAX_SERPER_QUERIES_PER_RUN:String(CAPS.serper),APOLLO_ENABLED:'true',
    APOLLO_MAX_CALLS_PER_RUN:String(CAPS.apollo),APOLLO_MONTHLY_CALL_LIMIT:String(priorApollo+CAPS.apollo),APOLLO_RETRY_LIMIT:'0'
  };
  const serperConfig=assertSerperReady(serperSettings(live));
  if(priorSerper>=serperConfig.monthlyLimit)throw Object.assign(Error(),{code:'SERPER_MONTHLY_LIMIT'});
  assertApolloReady(live);
  const runtime=runtimeFactory({env:live,cacheDir:path.join(path.dirname(file),'collector-cache')});
  runtime.identity();
  const date=now().toISOString().slice(0,10),priorUsage=[w.budgets.discoveryCollector,w.budgets.phaseBCollector].filter(x=>x?.day===date);
  for(const [source,usage] of Object.entries(runtime.usage)) {
    usage.requests=Math.max(0,...priorUsage.map(saved=>saved.usage?.[source]?.requests||0));
    usage.lastAt=Math.max(0,...priorUsage.map(saved=>saved.usage?.[source]?.lastAt||0))||null;
  }
  const envHash=envFile?hash(fs.readFileSync(envFile,'utf8')):null;
  const report={batch:BATCH,workspaceId:w.id,startedAt:now().toISOString(),status:'started',stage:'discovery',
    approvals:{profileRevision:w.profileRevision,profileApprovedAt:w.sellerProfile.approvedAt,playbookVersion:policy.version,playbookApprovedAt:policy.approvedAt},
    serperQueries:0,apolloAttempts:0,freeRequests:0,freeBySource:{},openaiCalls:0,requests:[],enrichments:[],templates:[],draftBlocks:[],candidateChecks:0};
  fs.mkdirSync(artifactDir);
  const checkpoint=()=>atomicWrite(path.join(artifactDir,'report.json'),JSON.stringify(report,null,2));
  const assertCurrent=()=>{
    const current=assertSavedApprovals(read(),w.id);
    if(current.workspace.profileRevision!==w.profileRevision||current.policy.approvedDigest!==policy.approvedDigest) {
      throw Object.assign(Error(),{code:'PUMP_APPROVAL_CHANGED'});
    }
  };
  const check=guardedRuntime(runtime,{report,checkpoint,assertCurrent});
  const runFor=state=>state.workspaces[w.id].runs.find(row=>row.id===BATCH);
  try {
    checkpoint();
    await mutate(state=>{
      assertCurrent();
      state.workspaces[w.id].runs.push({schemaVersion:1,id:BATCH,type:'company_discovery',strategy:'trigger_first',status:'running',profileRevision:w.profileRevision,
        playbookDigest:policy.approvedDigest,startedAt:report.startedAt,queryCap:CAPS.serper,serperQueries:0,apolloCalls:0,errors:[]});
      state.auditLog.push({schemaVersion:1,type:'pump_part_b_authorization_used',batch:BATCH,workspaceId:w.id,limits:CAPS,occurredAt:report.startedAt});
      return state;
    });
    const reserveQuery=()=>mutate(state=>{
      check();
      const run=runFor(state),workspace=state.workspaces[w.id],budget=workspace.budgets.serperQueries;
      const used=budget?.month===month?budget.queries:0;
      if(run.serperQueries>=CAPS.serper||used>=serperConfig.monthlyLimit)throw Object.assign(Error(),{code:'SERPER_LIMIT'});
      workspace.budgets.serperQueries={month,queries:used+1};
      run.serperQueries++;
      return state;
    });
    const discovery=await executeTriggerFirst({read,mutate,workspaceId:w.id,runId:BATCH,runtime,searchProvider:search,newsSearchProvider:searchNews,
      reserveQuery,settings:{maxQueries:CAPS.serper},env:live,now,checkRun:check,sizeCandidate:sizeFromVerifiedSources,
      selectCandidates:rows=>{const selected=roundRobinCandidates(rows);report.candidateChecks=selected.length;checkpoint();return selected;}});
    check();
    report.rejections=discovery.rejections;
    const ids=discovery.newAccountIds;
    report.stage='employee_counts';
    await mutate(state=>{runFor(state).status='running';return state;});
    const client=createApolloClient({read,mutate,env:live,runtime,now});
    const queried=new Set();
    for(const id of ids) {
      check();
      if(queried.size>=CAPS.apollo)break;
      const account=read().workspaces[w.id].accounts.find(row=>row.id===id);
      const domain=publicDomain(account?.firmographicEntity?.domain||account?.domain);
      if(!account||account.kills?.length||account.firmographics?.fields?.employeeCount?.value>0||!domain||queried.has(domain))continue;
      queried.add(domain);
      let organization;
      try { organization=await client.enrich(w.id,BATCH,domain); }
      catch(error) {
        check();
        if(!['APOLLO_NOT_FOUND','APOLLO_DOMAIN_MISMATCH'].includes(error.code))throw error;
        report.enrichments.push({name:account.name,domain,status:error.code});
        checkpoint();
        continue;
      }
      if(!Number.isFinite(organization.employeeCount)||organization.employeeCount<1) {
        report.enrichments.push({name:account.name,domain,status:'NO_EMPLOYEE_ESTIMATE'});
        checkpoint();
        continue;
      }
      const {sourceUrl,retrievedAt}=organization.receipt;
      await mutate(state=>{
        check();
        const evidenceText='Apollo estimates '+organization.employeeCount+' employees for '+organization.name+' ('+domain+').';
        const saved=recordSource(state,{url:sourceUrl,text:evidenceText,title:'Apollo employee estimate',fetchedAt:retrievedAt});
        const workspace=saved.state.workspaces[w.id],index=workspace.accounts.findIndex(row=>row.id===id),current=workspace.accounts[index];
        const estimate=emptyProfile({id,domain},retrievedAt);
        estimate.source='apollo';
        estimate.sources=[sourceUrl];
        estimate.fields.employeeCount={...sourceField(organization.employeeCount,.6,sourceUrl,retrievedAt,evidenceText,'apollo'),savedSourceId:saved.source.id,estimated:true,retrievedAt};
        const firmographics=mergeProfiles(current.firmographics,estimate);
        workspace.accounts[index]=scoreAccount({...current,firmographics,firmographicsConfidence:firmographics.confidenceLabel},phaseAConfigForWorkspace(workspace),now());
        return saved.state;
      });
      report.enrichments.push({name:account.name,domain,status:'ESTIMATE_SAVED',employeeCount:organization.employeeCount,receipt:sourceUrl});
      checkpoint();
    }
    check();
    report.stage='templates';
    const workspace=read().workspaces[w.id];
    for(const account of todaySections(workspace,now()).actNow.filter(row=>ids.includes(row.id))) {
      try {
        await mutate(state=>createTemplateDraft(state,w.id,account.id,{senderFirstName:'Shayan',demoMergeField:'true'},{now:()=>now().toISOString()}));
        report.templates.push({id:account.id,name:account.name});
      }catch(error){report.draftBlocks.push({id:account.id,name:account.name,...safeError(error)});}
    }
    report.status='complete';
  }catch(error) {
    report.status='stopped';
    report.failure??=safeError(error);
  }finally{
    Object.assign(live,OFF);
    const after=read(),current=after.workspaces[w.id],run=runFor(after);
    report.finishedAt=now().toISOString();
    report.sections=ranked(current,now());
    report.newAccountIds=run?.newAccountIds||[];
    report.apolloDiagnostics=run?.apolloDiagnostics||[];
    report.serperReserved=run?.serperQueries||0;
    report.apolloReserved=run?.apolloCalls||0;
    report.disabledAfter={...OFF};
    report.envUnchanged=!envFile||envHash===hash(fs.readFileSync(envFile,'utf8'));
    report.preserved=after.activeWorkspaceId===before.activeWorkspaceId&&hash(w.sellerProfile)===hash(current.sellerProfile)&&
      hash(w.icpConfig)===hash(current.icpConfig)&&hash(current.drafts.slice(0,w.drafts.length))===hash(w.drafts)&&
      Object.entries(before.workspaces).every(([id,other])=>id===w.id||hash(other)===hash(after.workspaces[id]));
    checkpoint();
    if(run)await mutate(state=>{
      const entry=runFor(state);
      Object.assign(entry,{status:report.status==='complete'?'complete':'failed',finishedAt:report.finishedAt});
      if(report.failure)entry.errors.push(report.failure);
      state.workspaces[w.id].budgets.discoveryCollector={day:date,...runtime.snapshot()};
      return state;
    });
  }
  return report;
}

if(require.main===module) {
  const env={},envFile=path.resolve(__dirname,'../.env');
  loadEnv(envFile,env);
  const file=statePath(env);
  if(process.argv[2]==='--verify') {
    try {
      const {workspace:w,policy}=assertSavedApprovals(loadState(file));
      console.log(JSON.stringify({profileRevision:w.profileRevision,profileApprovedAt:w.sellerProfile.approvedAt,playbookVersion:policy.version,playbookApprovedAt:policy.approvedAt}));
    }catch(error){console.error(JSON.stringify(safeError(error)));process.exitCode=1;}
  }else if(process.argv[2]==='--run') {
    run({file,env,envFile}).then(r=>console.log(JSON.stringify({
      status:r.status,stage:r.stage,failure:r.failure,serperQueries:r.serperQueries,apolloAttempts:r.apolloAttempts,freeRequests:r.freeRequests,freeBySource:r.freeBySource,preserved:r.preserved,envUnchanged:r.envUnchanged
    }))).catch(error=>{console.error(JSON.stringify(safeError(error)));process.exitCode=1;});
  }else throw Error('Use --verify or --run.');
}

module.exports={BATCH,CAPS,RULES,assertSavedApprovals,roundRobinCandidates,guardedRuntime,sizeFromVerifiedSources,ranked,run};
