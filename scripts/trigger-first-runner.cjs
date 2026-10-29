'use strict';
const {buildTriggerFirstTasks,candidateFromJobResult,dedupeJobCandidates,verifyCandidate}=require('./trigger-first-discovery.cjs');
const {recordSource}=require('./sources.cjs');
const {collectFirmographics}=require('./collectors/firmographics.cjs');
function triggerFirstPlan(workspace){const searches=buildTriggerFirstTasks(workspace);return {strategy:'trigger_first',searches,maxVerificationCandidates:10,identityQueries:10,firmographicQueries:10,maxDiscoveryQueries:Math.min(40,searches.length+20),refreshAccounts:10,maxRefreshQueries:50,hardTotalCap:100};}
async function executeTriggerFirst({read,mutate,workspaceId,runId,runtime,searchProvider,reserveQuery,settings,env,now=()=>new Date(),verify=verifyCandidate}){
 const workspace=read().workspaces[workspaceId],plan=triggerFirstPlan(workspace),candidates=[],tasks=[],rejected=[],errors=[],added=[],vendors=[];
 await mutate(state=>{const w=state.workspaces[workspaceId],changed=require('./company-identity.cjs').quarantineLegacyCandidates(w,require('./phase-a-config.cjs').phaseAConfigForWorkspace(w));if(changed.length)state.auditLog.push({schemaVersion:1,type:'legacy_discovery_quarantined',workspaceId,occurredAt:now().toISOString(),accounts:changed});return state;});
 const checkRevision=()=>{const w=read().workspaces[workspaceId],r=w.runs.find(r=>r.id===runId);if((w.profileRevision||0)!==(r.profileRevision||0)||w.status!=='active'&&!w.referenceDemo?.loadOnly)throw Object.assign(Error('Approved profile changed during discovery.'),{code:'PROFILE_CHANGED'});};
 const query=async(text,kind)=>{checkRevision();await reserveQuery(workspaceId,runId,settings);return searchProvider(text,{runtime,env,num:10,task:{kind,query:text}});};
 for(const task of plan.searches){if(read().workspaces[workspaceId].runs.find(r=>r.id===runId).serperQueries>=settings.maxQueries-2)break;try{const results=await query(task.query,task.kind),found=results.map(row=>candidateFromJobResult(row,workspace)).filter(Boolean);candidates.push(...found);tasks.push({...task,status:'complete',results:results.length,candidates:found.length});}catch(e){errors.push({code:e.code||'SEARCH_FAILED',status:e.status||null});if(/LIMIT/.test(e.code||''))break;}}
 for(const candidate of dedupeJobCandidates(candidates).slice(0,plan.maxVerificationCandidates)){try{
   const identityResults=await query('"'+candidate.name.replace(/"/g,'')+'" official website','official_identity');
   const result=await verify(candidate,{runtime,workspace:read().workspaces[workspaceId],identityResults,now:now(),firmographicsCollector:async(target,context)=>{const rows=await query('"'+target.name.replace(/"/g,'')+'" "'+target.domain+'" employees revenue','firmographics');return collectFirmographics(target,{...context,searchResults:rows.map(row=>({...row,kind:'firmographics'}))});}});
   if(!result.accepted&&!result.vendorAccount){rejected.push({name:candidate.name,url:candidate.sourceUrl,reason:result.reason,error:result.error});continue;}
   checkRevision();await mutate(state=>{
     const live=state.workspaces[workspaceId],account=result.account||result.vendorAccount;if(live.accounts.some(a=>a.domain===account.domain))return state;
     if(result.page){const saved=recordSource(state,{url:result.page.url,text:require('./collectors/common.cjs').stripHtml(result.page.text),title:account.name,fetchedAt:result.page.fetchedAt});state=saved.state;}
     if(result.atsReceipt){const saved=recordSource(state,result.atsReceipt);state=saved.state;for(const trigger of account.triggers)trigger.metadata={...trigger.metadata,savedSourceId:saved.source.id,receiptAvailability:'api_job_text_confirmed'};}
     state.workspaces[workspaceId].accounts.push(account);state.auditLog.push({schemaVersion:1,type:result.vendorAccount?'discovery_vendor_retained':'trigger_first_account_added',workspaceId,accountId:account.id,sourceUrl:account.sourceUrl,occurredAt:now().toISOString()});
     (result.vendorAccount?vendors:added).push(account.id);return state;
   });
 }catch(e){errors.push({name:candidate.name,code:e.code||'VERIFICATION_FAILED',status:e.status||null});if(/LIMIT/.test(e.code||''))break;}}
 await mutate(state=>{const w=state.workspaces[workspaceId],run=w.runs.find(r=>r.id===runId);Object.assign(run,{status:errors.length?'complete_with_errors':'complete',finishedAt:now().toISOString(),tasks,rawFound:candidates.length,passedNoiseGate:added.length,newAccounts:added.length,newAccountIds:added,vendorAccountIds:vendors,rejectedCount:rejected.length,rejections:rejected,errors});w.budgets.discoveryCollector={day:now().toISOString().slice(0,10),...runtime.snapshot()};return state;});
 return read().workspaces[workspaceId].runs.find(r=>r.id===runId);
}
module.exports={triggerFirstPlan,executeTriggerFirst};
