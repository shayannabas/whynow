'use strict';
const {buildTriggerFirstTasks,candidateFromJobResult,dedupeJobCandidates,verifyCandidate}=require('./trigger-first-discovery.cjs');
const {NEWS_KIND,candidateFromNewsResult,verifyNewsCandidate}=require('./trigger-first-news.cjs');
const {recordSource}=require('./sources.cjs');
const {collectFirmographics}=require('./collectors/firmographics.cjs');
function icpMatch(candidate) {
 return candidate.matchedIcpId?{matchedIcpId:candidate.matchedIcpId,matchedIcpReason:candidate.matchedIcpReason||'Matched an approved discovery query.'}:{};
}
function triggerFirstPlan(workspace){const searches=buildTriggerFirstTasks(workspace);return {strategy:'trigger_first',searches,maxVerificationCandidates:10,identityQueries:10,firmographicQueries:10,maxDiscoveryQueries:Math.min(40,searches.length+20),refreshAccounts:10,maxRefreshQueries:50,hardTotalCap:100};}
async function executeTriggerFirst({read,mutate,workspaceId,runId,runtime,searchProvider,newsSearchProvider,reserveQuery,settings,env,now=()=>new Date(),verify=verifyCandidate,selectCandidates,checkRun=()=>{},sizeCandidate,allowNewsFallback=false,onCandidate=()=>{},onPaywall,searchPlan,resolveIdentity,keepUnresolved=false}){
 const workspace=read().workspaces[workspaceId],plan=triggerFirstPlan(workspace),candidates=[],tasks=[],rejected=[],errors=[],added=[],vendors=[];
 await mutate(state=>{const w=state.workspaces[workspaceId],changed=require('./company-identity.cjs').quarantineLegacyCandidates(w,require('./phase-a-config.cjs').phaseAConfigForWorkspace(w));if(changed.length)state.auditLog.push({schemaVersion:1,type:'legacy_discovery_quarantined',workspaceId,occurredAt:now().toISOString(),accounts:changed});return state;});
 const checkRevision=()=>{checkRun();const w=read().workspaces[workspaceId],r=w.runs.find(r=>r.id===runId);if((w.profileRevision||0)!==(r.profileRevision||0)||w.status!=='active'&&!w.referenceDemo?.loadOnly||(r.playbookDigest&&require('./playbook.cjs').approvedPlaybook(w)?.approvedDigest!==r.playbookDigest))throw Object.assign(Error('Approved profile changed during discovery.'),{code:'PROFILE_CHANGED'});};
 checkRevision();
 const query=async(text,kind,details={})=>{checkRevision();await reserveQuery(workspaceId,runId,settings);const provider=kind===NEWS_KIND?newsSearchProvider:searchProvider;return provider(text,{runtime,env,num:10,tbs:details.tbs,task:{...details,kind,query:text}});};
 for(const task of searchPlan||plan.searches){if(read().workspaces[workspaceId].runs.find(r=>r.id===runId).serperQueries>=settings.maxQueries-2)break;try{const results=await query(task.query,task.kind,task),found=results.map(row=>task.kind===NEWS_KIND?candidateFromNewsResult(row,task,workspace,now()):candidateFromJobResult(row,workspace)).filter(Boolean).map(row=>({...row,...(task.icpId?{matchedIcpId:task.icpId,matchedIcpReason:'Matched the approved '+task.icpLabel+' '+(task.kind===NEWS_KIND?'news':'hiring')+' query.'}:{})}));candidates.push(...found);tasks.push({...task,status:'complete',results:results.length,candidates:found.length});}catch(e){errors.push({code:e.code||'SEARCH_FAILED',status:e.status||null});checkRun();if(e.code==='PROFILE_CHANGED')throw e;if(/LIMIT/.test(e.code||''))break;}}
 const unique=dedupeJobCandidates(candidates);
 const selected=selectCandidates?selectCandidates(unique):unique.slice(0,plan.maxVerificationCandidates);
 const identityMemo=new Map();
 for(const candidate of selected){try{
   onCandidate(candidate);
   const identityKey=require('./entity-rules.cjs').normalizedEntityName(candidate.name);
   if(!identityMemo.has(identityKey))identityMemo.set(identityKey,await query('"'+candidate.name.replace(/"/g,'')+'" official site','official_identity'));
   const identityResults=identityMemo.get(identityKey);
   const verifier=candidate.kind===NEWS_KIND?verifyNewsCandidate:verify;
   const findAlternateNews=allowNewsFallback?async text=>{
     try{return await query(text,NEWS_KIND);}
     catch(error){checkRun();if(/LIMIT/.test(error.code||''))return [];throw error;}
   }:undefined;
   const result=await verifier(candidate,{runtime,workspace:read().workspaces[workspaceId],identityResults,resolveIdentity,now:now(),findAlternateNews,onPaywall,firmographicsCollector:sizeCandidate|| (async(target,context)=>{const rows=await query('"'+target.name.replace(/"/g,'')+'" "'+target.domain+'" employees revenue','firmographics');return collectFirmographics(target,{...context,searchResults:rows.map(row=>({...row,kind:'firmographics'}))});})});
   checkRun();
   if(!result.accepted&&!result.vendorAccount){
     const rejection={name:candidate.name,url:candidate.sourceUrl,reason:result.reason,error:result.error};
     if(result.newsListingReceipt)await mutate(state=>{
       const saved=recordSource(state,result.newsListingReceipt);
       rejection.newsListing={...result.newsListing,savedSourceId:saved.source.id};
       const workspace=saved.state.workspaces[workspaceId];
       workspace.rejectedDiscovery=[...(workspace.rejectedDiscovery||[]),{
         name:rejection.name,sourceUrl:'/sources/'+saved.source.id,newsListing:rejection.newsListing,rejectionReason:rejection.reason
       }];
       return saved.state;
     });
     if(keepUnresolved&&['identity_unresolved','official_page_unavailable','company_identity_unverified','company_name_unverified'].includes(result.reason))await mutate(state=>{
       const workspace=state.workspaces[workspaceId],name=candidate.name;
       const config=require('./phase-a-config.cjs').phaseAConfigForWorkspace(workspace);
       if(require('./company-discovery.cjs').exclusionReason({name},workspace,config))return state;
       const date=now().toISOString(),id=require('node:crypto').randomUUID();
       const account={schemaVersion:1,id,name,domain:'',status:'new',createdAt:date,updatedAt:date,
         sourceUrl:candidate.sourceUrl,tier:'parked',triggers:[],signals:{},killStatus:'clear',
         identityReviewReason:'Official company identity is unresolved ('+result.reason.replaceAll('_',' ')+').',
         reviewEvidence:{title:result.job?.title||candidate.title||candidate.roleTitle||'',date:result.job?.publishedAt||candidate.sourceDate||'',url:candidate.sourceUrl},
         ...(rejection.newsListing?{newsListing:rejection.newsListing}:{}),
         discoveryQuality:{sourceKind:candidate.kind||'trigger_first_hiring',quality:'unresolved_identity',isValidTargetAccount:false,sourceUrl:candidate.sourceUrl},
         discovery:{runId},...icpMatch(candidate)
       };
       workspace.accounts.push(account);
       const run=workspace.runs.find(row=>row.id===runId);
       run.reviewAccountIds=[...(run.reviewAccountIds||[]),id];
       return state;
     });
     rejected.push(rejection);
     continue;
   }
   checkRevision();await mutate(state=>{
     const live=state.workspaces[workspaceId],account={...(result.account||result.vendorAccount),...icpMatch(candidate)};if(live.accounts.some(a=>a.domain&&a.domain===account.domain))return state;
     account.discovery={...account.discovery,runId};
     if(result.page){const saved=recordSource(state,{url:result.page.url,text:require('./collectors/common.cjs').stripHtml(result.page.text),title:account.name,fetchedAt:result.page.fetchedAt});state=saved.state;}
     if(result.atsReceipt){const saved=recordSource(state,result.atsReceipt);state=saved.state;for(const trigger of account.triggers)trigger.metadata={...trigger.metadata,savedSourceId:saved.source.id,receiptAvailability:'api_job_text_confirmed'};}
     if(result.newsReceipt){const saved=recordSource(state,result.newsReceipt);state=saved.state;for(const trigger of [...account.triggers,...(account.triggerHistory||[])])if(trigger.evidenceUrl===result.newsReceipt.url)trigger.metadata={...trigger.metadata,savedSourceId:saved.source.id};}
     if(result.newsListingReceipt){
       const saved=recordSource(state,result.newsListingReceipt);state=saved.state;
       account.newsListing.savedSourceId=saved.source.id;
     }
     if(result.newsAlternates?.length)account.discovery={...account.discovery,newsAlternateAttempts:result.newsAlternates};
     state.workspaces[workspaceId].accounts.push(account);state.auditLog.push({schemaVersion:1,type:result.vendorAccount?'discovery_vendor_retained':'trigger_first_account_added',workspaceId,accountId:account.id,sourceUrl:account.sourceUrl,occurredAt:now().toISOString()});
     (result.vendorAccount?vendors:added).push(account.id);
     const run=state.workspaces[workspaceId].runs.find(r=>r.id===runId);
     Object.assign(run,{newAccountIds:[...added],newAccounts:added.length,vendorAccountIds:[...vendors]});
     return state;
   });
 }catch(e){errors.push({name:candidate.name,code:e.code||'VERIFICATION_FAILED',status:e.status||null});checkRun();if(e.code==='PROFILE_CHANGED')throw e;if(/LIMIT/.test(e.code||''))break;}}
 await mutate(state=>{const w=state.workspaces[workspaceId],run=w.runs.find(r=>r.id===runId);Object.assign(run,{status:errors.length?'complete_with_errors':'complete',finishedAt:now().toISOString(),tasks,rawFound:candidates.length,candidateChecks:selected.length,passedNoiseGate:added.length,newAccounts:added.length,newAccountIds:added,vendorAccountIds:vendors,rejectedCount:rejected.length,rejections:rejected,errors});w.budgets.discoveryCollector={day:now().toISOString().slice(0,10),...runtime.snapshot()};return state;});
 return read().workspaces[workspaceId].runs.find(r=>r.id===runId);
}
module.exports={triggerFirstPlan,executeTriggerFirst};
