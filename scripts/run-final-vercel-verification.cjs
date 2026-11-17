'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {loadEnv}=require('./env.cjs');
const {loadState,saveState,statePath,atomicWrite}=require('./server/state.cjs');
const {prepareFinalVerification,assertFinalReady}=require('./prepare-vercel-final-verification.cjs');
const proposal=require('../config/vercel-final-verification-proposal.json');
const {approvedPlaybook,digest}=require('./playbook.cjs');
const {CollectorRuntime}=require('./collectors/runtime.cjs');
const {createApolloClient}=require('./collectors/apollo.cjs');
const {runLookalike}=require('./lookalike-discovery.cjs');
const {phaseAConfigForWorkspace}=require('./phase-a-config.cjs');
const {collectorConfigForWorkspace,collectorTargetForAccount}=require('./phase-b-config.cjs');
const {mergeCollectorResult,sanitizeWhyNow}=require('./phase-b-runner.cjs');
const {scoreAccount}=require('./score-account.cjs');
const {todaySections,whyNow}=require('./account-lifecycle.cjs');
const {createTemplateDraft}=require('./outreach-drafts.cjs');
const {searchNews}=require('./serper.cjs');
const {collectPlaybookNews}=require('./collectors/playbook-news.cjs');
const {collectHiring}=require('./collectors/hiring.cjs');
const {atsDescriptor}=require('./trigger-first-discovery.cjs');
const {sameEntity}=require('./entity-rules.cjs');
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
function failure(e){return {code:typeof e.code==='string'?e.code:'FINAL_BATCH_FAILED',httpStatus:e.status||e.httpStatus||null};}
function combinedQuery(name,playbook,offset=0){const clean=s=>String(s).replace(/["\r\n]/g,' ').trim(),prefix='"'+clean(name).slice(0,120)+'" (',terms=[...new Set(playbook.triggers.filter(t=>t.source==='news').flatMap(t=>t.keywords.slice(offset,offset+6)))];let q=prefix;for(const term of terms){const next=(q===prefix?'':' OR ')+'"'+clean(term)+'"';if(q.length+next.length+1<=500)q+=next;}return q===prefix?'':q+')';}
function preserve(state,id){return {seller:hash(state.workspaces[id].sellerProfile),icp:hash(state.workspaces[id].icpConfig),resolve:hash(Object.entries(state.workspaces).filter(([,w])=>w.referenceDemo?.loadOnly)),drafts:Object.fromEntries(Object.entries(state.workspaces).map(([key,w])=>[key,Object.fromEntries(w.drafts.map(d=>[d.id,hash(d)]))]))};}
function preserved(before,state,id){const after=preserve(state,id);return before.seller===after.seller&&before.icp===after.icp&&before.resolve===after.resolve&&Object.entries(before.drafts).every(([key,ds])=>Object.entries(ds).every(([did,h])=>after.drafts[key]?.[did]===h));}
function reportSections(w,now){const sections=todaySections(w,now),row=a=>({id:a.id,name:a.name,domain:a.domain,fit:a.fitScore,tier:a.tier,whyNow:whyNow(a,now),reviewReason:a.reviewReason||''});return {...Object.fromEntries(['actNow','worthResearching','needsReview'].map(k=>[k,{count:sections[k].length,accounts:sections[k].map(row)}])),killed:{count:w.accounts.filter(a=>a.kills?.length).length,accounts:w.accounts.filter(a=>a.kills?.length).map(a=>({...row(a),kills:a.kills}))}};}
function capRuntime(runtime,{report,checkpoint,assertCurrent,beforeSerper=async()=>{}}){
 const request=runtime.request.bind(runtime),fetchImpl=runtime.fetch;
 const stop=(code,status=null)=>{report.fatal=report.fatal||{code,httpStatus:status};checkpoint();throw Object.assign(Error('The bounded batch stopped.'),{code:report.fatal.code,status:report.fatal.httpStatus});};
 runtime.request=async(source,url,opts={})=>{assertCurrent();if(report.fatal)stop(report.fatal.code,report.fatal.httpStatus);if(!['apollo','serper',...Object.keys(proposal.freeSourceCaps)].includes(source))stop('SOURCE_NOT_AUTHORIZED');return request(source,url,opts);};
 runtime.fetch=async(url,opts)=>{
  assertCurrent();if(report.fatal)stop(report.fatal.code,report.fatal.httpStatus);const u=new URL(url),isRobot=u.pathname==='/robots.txt';let source;
  if(u.hostname==='api.openai.com')stop('OPENAI_NOT_AUTHORIZED');
  if(u.hostname==='api.apollo.io'){
   if(isRobot){source='apollo_robots';if(report.apolloRobots>=1)stop('APOLLO_ROBOTS_CAP');report.apolloRobots++;}
   else{source='apollo';const enrich=u.pathname==='/api/v1/organizations/enrich',search=u.pathname==='/api/v1/mixed_companies/search';if(!enrich&&!search)stop('APOLLO_ENDPOINT_NOT_AUTHORIZED');if(report.apolloAttempts>=5||enrich&&report.enrichAttempts>=4||search&&report.searchAttempts>=1)stop('APOLLO_ATTEMPT_CAP');if(search){const body=JSON.parse(opts.body||'{}');if(body.page!==1||body.per_page!==25)stop('APOLLO_SEARCH_SHAPE');report.searchAttempts++;}else report.enrichAttempts++;report.apolloAttempts++;}
  }else if(u.hostname==='google.serper.dev'){
   source='serper';if(u.pathname!=='/news'||report.serperQueries>=30)stop('SERPER_CAP');await beforeSerper();report.serperQueries++;
  }else{
   source=isRobot?'robots':u.hostname==='boards-api.greenhouse.io'?'greenhouse':u.hostname==='api.lever.co'?'lever':u.hostname==='api.ashbyhq.com'?'ashby':u.hostname==='hn.algolia.com'?'hn':'engineering_web';
   if(report.freeRequests>=150||(report.freeBySource[source]||0)>=proposal.freeSourceCaps[source])stop('FREE_SOURCE_CAP');report.freeRequests++;report.freeBySource[source]=(report.freeBySource[source]||0)+1;
  }
  checkpoint();let response;try{response=await fetchImpl(url,opts);}catch{stop('NETWORK_FAILED');}
  report.requests.push({source,url:u.origin+u.pathname,httpStatus:response.status});checkpoint();
  if(response.status>=400&&!(isRobot&&response.status===404))stop('HTTP_ERROR',response.status);
  if(source!=='apollo'&&!isRobot&&/json/i.test(response.headers.get('content-type')||''))return {...response,text:async()=>{const text=await response.text();let value;try{value=JSON.parse(text);}catch{stop('INVALID_RESPONSE',response.status);}const hasRows=Array.isArray(value)||['news','hits','jobs'].some(k=>Array.isArray(value?.[k]));if(value?.error||value?.error_message||Array.isArray(value?.errors)&&value.errors.length||value?.message&&!hasRows)stop('SOURCE_REFUSED',response.status);return text;}};
  return response;
 };
 return runtime;
}
async function findBoard(account,runtime){
 if(account.ats?.provider&&account.ats?.slug)return account.ats;
 const home='https://'+account.domain,first=await runtime.requestText(home,'engineering_web',{allowedRedirectDomain:account.domain});
 const links=[...first.value.matchAll(/href\s*=\s*["']([^"']+)["']/gi)].map(m=>{try{return new URL(m[1],home).href;}catch{return '';}}),board=links.map(atsDescriptor).find(Boolean);if(board)return board;
 const careers=links.find(url=>{try{return new URL(url).hostname.replace(/^www\./,'')===account.domain&&/\/careers\/?$/.test(new URL(url).pathname);}catch{return false;}});if(!careers)return null;
 const page=await runtime.requestText(careers,'engineering_web',{allowedRedirectDomain:account.domain});return [...page.value.matchAll(/href\s*=\s*["']([^"']+)["']/gi)].map(m=>{try{return atsDescriptor(new URL(m[1],careers).href);}catch{return null;}}).find(Boolean)||null;
}
async function runFinal({file,artifactDir,env,runtimeFactory=opts=>new CollectorRuntime(opts),now=()=>new Date(),domain='vercel.com',settings=proposal,envFile}={}){
 const initial=loadState(file),plan=prepareFinalVerification(initial,{proposal:{...settings,sellerDomain:domain}});assertFinalReady(plan,{ownerAuthorized:true});
 if(initial.auditLog.some(e=>e.batch===settings.batchId)||Object.values(initial.workspaces).some(w=>w.runs.some(r=>r.id===settings.batchId)))throw Error('The final one-use batch was already consumed.');
 if(env.OPENAI_ENABLED!=='false'||Number(env.OPENAI_MONTHLY_LIMIT_USD)!==0)throw Error('Persistent OpenAI defaults must remain disabled/zero.');
 for(const key of ['APOLLO_API_KEY','SERPER_API_KEY','CRAWLER_CONTACT_EMAIL'])if(!env[key])throw Error('Required private provider configuration is missing.');
 const w=initial.workspaces[plan.workspaceId],policy=approvedPlaybook(w),guard={revision:w.profileRevision,approval:w.sellerProfile.approvedAt,policyDigest:digest(policy)},before=preserve(initial,w.id),envHash=envFile?hash(fs.readFileSync(envFile,'utf8')):null,month=now().toISOString().slice(0,7),priorApollo=w.budgets.apollo?.month===month?w.budgets.apollo.calls:0,priorSerper=w.budgets.serperQueries?.month===month?w.budgets.serperQueries.queries:0;
 const liveEnv={...env,APOLLO_ENABLED:'true',APOLLO_COMPANY_SEARCH_ENABLED:'true',APOLLO_MAX_CALLS_PER_RUN:'5',APOLLO_MONTHLY_CALL_LIMIT:String(priorApollo+5),APOLLO_MAX_CUSTOMERS_PER_RUN:'4',APOLLO_MAX_COMPANIES_PER_RUN:'25',APOLLO_RETRY_LIMIT:'0',APOLLO_CONTINUE_NOT_FOUND:'true',SERPER_ENABLED:'true',WORKSPACE_MAX_SERPER_QUERIES_PER_RUN:'1',SERPER_MONTHLY_QUERY_LIMIT:String(priorSerper+30),OPENAI_ENABLED:'false',OPENAI_MONTHLY_LIMIT_USD:'0',GDELT_ENABLED:'false',EDGAR_ENABLED:'false',GITHUB_ENABLED:'false',SCHEDULER_ENABLED:'false'};
 fs.mkdirSync(artifactDir);const reportFile=path.join(artifactDir,'report.json'),report={batch:settings.batchId,used:true,status:'started',startedAt:now().toISOString(),workspaceId:w.id,profileRevision:w.profileRevision,playbookVersion:policy.version,apolloAttempts:0,enrichAttempts:0,searchAttempts:0,apolloRobots:0,serperQueries:0,freeRequests:0,freeBySource:{},requests:[],checkedAccounts:[],templateDrafts:[],draftBlocks:[],openaiCalls:0};
 const checkpoint=()=>atomicWrite(reportFile,JSON.stringify(report,null,2));checkpoint();let writes=Promise.resolve();const read=()=>loadState(file),mutate=fn=>{const op=writes.then(()=>{const s=fn(read());saveState(s,file);return s;});writes=op.catch(()=>{});return op;};
 let runtimeRef;
 const assertCurrent=()=>{const latest=read().workspaces[w.id];if(latest.profileRevision!==guard.revision||latest.sellerProfile.approvedAt!==guard.approval||!approvedPlaybook(latest)||digest(latest.sellerProfile.playbook)!==guard.policyDigest)throw Object.assign(Error('Approval changed.'),{code:'STALE_APPROVAL'});};
 try{
  await mutate(s=>{s.workspaces[w.id].runs.push({schemaVersion:1,id:settings.batchId,type:'company_discovery',strategy:'lookalike',status:'running',profileRevision:w.profileRevision,startedAt:now().toISOString(),apolloCalls:0,serperQueries:0,errors:[]});s.auditLog.push({schemaVersion:1,type:'final_verification_authorization_used',batch:settings.batchId,workspaceId:w.id,occurredAt:now().toISOString(),limits:settings.caps});return s;});
  const runtime=capRuntime(runtimeFactory({env:liveEnv,cacheDir:path.join(path.dirname(file),'collector-cache')}),{report,checkpoint,assertCurrent,beforeSerper:()=>mutate(s=>{const target=s.workspaces[w.id],used=target.budgets.serperQueries?.month===month?target.budgets.serperQueries.queries:0;if(used>=priorSerper+30)throw Object.assign(Error(),{code:'SERPER_CAP'});target.budgets.serperQueries={month,queries:used+1};return s;})});runtimeRef=runtime;const day=now().toISOString().slice(0,10),saved=w.budgets.phaseBCollector;if(saved?.day===day){runtime.usage={...runtime.usage,...structuredClone(saved.usage||{})};runtime.health=structuredClone(saved.health||{});}const client=createApolloClient({read,mutate,env:liveEnv,runtime,now});
  const seeds=plan.seeds.filter(s=>s.confirmedDomain).map(s=>s.domain);
  await runLookalike({read,mutate,workspaceId:w.id,runId:settings.batchId,client,env:liveEnv,now,customerDomains:seeds,maxEnrichedCustomers:3});
  const ids=read().workspaces[w.id].runs.find(r=>r.id===settings.batchId).newAccountIds.slice(0,25);report.newAccountIds=ids;report.stage='timing';checkpoint();
  const apply=async(id,result)=>mutate(s=>{assertCurrent();const current=s.workspaces[w.id],i=current.accounts.findIndex(a=>a.id===id),config=phaseAConfigForWorkspace(current),merged=mergeCollectorResult(current.accounts[i],result,settings.batchId);for(const event of result.events||[]){const saved=require('./sources.cjs').recordSource(s,{url:event.evidenceUrl,text:event.evidenceText,title:event.title,fetchedAt:now().toISOString()});s=saved.state;}s.workspaces[w.id].accounts[i]=scoreAccount(sanitizeWhyNow(merged,config,now()),config,now());return s;});
  let followups=0;
  for(const id of ids){
   assertCurrent();if(report.fatal)throw Object.assign(Error(),{code:report.fatal.code,status:report.fatal.httpStatus});let account=read().workspaces[w.id].accounts.find(a=>a.id===id);if(account.kills?.length)continue;
   const config=collectorConfigForWorkspace(read().workspaces[w.id]),target=collectorTargetForAccount(account,config),query=combinedQuery(account.name,policy);
   let rows=[];if(query){const result=await searchNews(query,{runtime,env:liveEnv,num:10});rows=Array.isArray(result)?result:[];}
   if(!rows.length&&followups<5){const q=combinedQuery(account.name,policy,6);if(q){followups++;const result=await searchNews(q,{runtime,env:liveEnv,num:10});rows=Array.isArray(result)?result:[];}}
   await apply(id,collectPlaybookNews(target,{searchResults:rows,now:now()}));
   if(policy.triggers.some(t=>t.source==='ats_jobs')){const board=await findBoard(account,runtime);if(board){const hiring=await collectHiring({...target,ats:board},{runtime,now:now(),slaConfig:config.slaDays,painThemeConfig:config.painThemeConfig});if(report.fatal)throw Object.assign(Error(),{code:report.fatal.code,status:report.fatal.httpStatus});await apply(id,hiring);}}
   if(report.freeRequests<150){const queryTerm=policy.triggers.find(t=>t.source==='news')?.keywords[0];if(queryTerm){const url='https://hn.algolia.com/api/v1/search_by_date?query='+encodeURIComponent(account.name+' '+queryTerm)+'&tags=story&hitsPerPage=8',response=await runtime.requestJson(url,'hn'),news=(response.value.hits||[]).map(hit=>({title:hit.title,snippet:hit.story_text||'',url:hit.url||'https://news.ycombinator.com/item?id='+hit.objectID,date:hit.created_at,sourceId:'hn'}));await apply(id,collectPlaybookNews(target,{searchResults:news,now:now()}));}}
   report.checkedAccounts.push(id);checkpoint();
  }
  report.stage='templates';const sections=todaySections({...read().workspaces[w.id],accounts:read().workspaces[w.id].accounts.filter(a=>ids.includes(a.id))},now());
  for(const account of sections.actNow.slice(0,25)){try{await mutate(s=>createTemplateDraft(s,w.id,account.id,{senderFirstName:'Shayan',demoMergeField:'true'},{now:()=>now().toISOString()}));report.templateDrafts.push({accountId:account.id,name:account.name});}catch(e){report.draftBlocks.push({accountId:account.id,name:account.name,...failure(e)});}}
  report.status='complete';
 }catch(e){report.status='stopped';report.failure=report.fatal||failure(e);}
 finally{
  Object.assign(liveEnv,{APOLLO_ENABLED:'false',APOLLO_COMPANY_SEARCH_ENABLED:'false',APOLLO_MAX_CALLS_PER_RUN:'0',APOLLO_MONTHLY_CALL_LIMIT:'0',SERPER_ENABLED:'false',SERPER_MONTHLY_QUERY_LIMIT:'0',WORKSPACE_MAX_SERPER_QUERIES_PER_RUN:'0',OPENAI_ENABLED:'false',OPENAI_MONTHLY_LIMIT_USD:'0'});
  const current=read().workspaces[w.id],run=current.runs.find(r=>r.id===settings.batchId);report.lookups=run?.customerLookups||[];report.apolloDiagnostics=run?.apolloDiagnostics||[];report.pattern=run?.pattern||null;report.rejections=current.rejectedDiscovery||[];
  const newIds=run?.newAccountIds||[];report.workspaceSections=reportSections(current,now());report.batchSections=reportSections({...current,accounts:current.accounts.filter(a=>newIds.includes(a.id))},now());report.newAccountIds=newIds;
  report.preserved=preserved(before,read(),w.id);report.envUnchanged=!envFile||hash(fs.readFileSync(envFile,'utf8'))===envHash;report.disabledAfter={APOLLO_ENABLED:liveEnv.APOLLO_ENABLED,APOLLO_MAX_CALLS_PER_RUN:liveEnv.APOLLO_MAX_CALLS_PER_RUN,APOLLO_MONTHLY_CALL_LIMIT:liveEnv.APOLLO_MONTHLY_CALL_LIMIT,SERPER_ENABLED:liveEnv.SERPER_ENABLED,SERPER_MONTHLY_QUERY_LIMIT:liveEnv.SERPER_MONTHLY_QUERY_LIMIT,OPENAI_ENABLED:liveEnv.OPENAI_ENABLED,OPENAI_MONTHLY_LIMIT_USD:liveEnv.OPENAI_MONTHLY_LIMIT_USD};report.finishedAt=now().toISOString();checkpoint();
  await mutate(s=>{const target=s.workspaces[w.id];if(runtimeRef)target.budgets.phaseBCollector={day:now().toISOString().slice(0,10),...runtimeRef.snapshot()};const run=target.runs.find(r=>r.id===settings.batchId);if(run){run.status=report.status==='complete'?'complete':'failed';run.finishedAt=report.finishedAt;run.serperQueries=report.serperQueries;if(report.failure)run.errors.push(report.failure);}return s;});
 }
 return report;
}
async function main(){const env={},envFile=path.resolve(__dirname,'../.env');loadEnv(envFile,env);const file=statePath(env);if(process.argv[2]==='--prepare'){console.log(JSON.stringify(prepareFinalVerification(loadState(file)),null,2));return;}if(process.argv[2]!=='--run')throw Error('Use --prepare or --run.');const r=await runFinal({file,artifactDir:path.join(path.dirname(file),proposal.batchId),env,envFile});console.log(JSON.stringify({status:r.status,failure:r.failure,apolloAttempts:r.apolloAttempts,serperQueries:r.serperQueries,freeRequests:r.freeRequests,preserved:r.preserved,envUnchanged:r.envUnchanged,disabledAfter:r.disabledAfter}));}
if(require.main===module)main().catch(e=>{console.error(JSON.stringify(failure(e)));process.exitCode=1;});
module.exports={runFinal,combinedQuery,capRuntime,reportSections};
