'use strict';

const {activeTriggers}=require('./decisioning.cjs');

const ACCOUNT_STATUSES=['new','working','skipped'];
const GOOD_FIT_THRESHOLD=40;
function latestTrigger(account={},now=new Date()){return activeTriggers(account,now).sort((a,b)=>(Date.parse(b.occurredAt||b.detectedAt||'')||0)-(Date.parse(a.occurredAt||a.detectedAt||'')||0))[0]||null;}
function whyNow(account={},now=new Date()){
  const trigger=latestTrigger(account,now);if(trigger){const receipt=require('./collectors/ats-receipts.cjs').primaryTriggerReceipt(trigger);return {line:String(trigger.title||trigger.evidenceText||trigger.type||'Fresh public signal.'),receipt:receipt.url,receiptLabel:receipt.label,originalReceipt:receipt.originalUrl,kind:String(trigger.type||trigger.triggerType||'signal')};}
  return {line:'No active why-now signal yet — refresh this account.',receipt:String(account.sourceUrl||account.discoveryQuality?.sourceUrl||''),kind:'none'};
}
function queueSort(left,right){
    const working=Number(right.status==='working')-Number(left.status==='working');if(working)return working;
    const priority=Number(right.priority||0)-Number(left.priority||0);if(priority)return priority;
    const triggers=Number(Boolean(right.whyNow?.receipt&&right.whyNow.kind!=='none'))-Number(Boolean(left.whyNow?.receipt&&left.whyNow.kind!=='none'));if(triggers)return triggers;
    return Number(right.fitScore||0)-Number(left.fitScore||0)||String(left.name).localeCompare(String(right.name));
}
function timestampInsideWindow(row={},now=new Date()){
  const end=Date.parse(row.decaysAt||''),start=Date.parse(row.occurredAt||row.detectedAt||row.observedAt||'');
  if(Number.isFinite(end))return now.getTime()<end;
  return Number.isFinite(start)&&now.getTime()>=start&&now.getTime()-start<90*86400000;
}
function needsReviewReason(account={},now=new Date()){
  if(account.identityReviewReason)return account.identityReviewReason;
  const sizeReceipt=account.firmographics?.fields?.employeeCount?.sourceUrl||account.tierEvidenceReceipt||'',reportYear=Number(sizeReceipt.match(/(?:corporate|annual)[-_]report[-_/](20\d{2})/i)?.[1]);
  if(reportYear&&reportYear<now.getUTCFullYear()-2)return 'Size receipt is an outdated corporate report; verify the employer identity and current size before queueing.';
  if(account.discoveryQuality?.isValidTargetAccount===false)return account.discoveryQuality.reason||'Company identity failed discovery review.';
  if(account.segmentClassification?.requiresReview)return 'Segment is not supported by unambiguous company evidence; review before ranking.';
  const rejected=[...(account.triggers||[]),...(account.triggerHistory||[])].filter(row=>row?.evidenceUrl&&timestampInsideWindow(row,now)&&(row.citable===false||row.metadata?.citable===false));
  if(!rejected.length||activeTriggers(account,now).length)return '';
  const reason=rejected[0].metadata?.notCitableReason||'The current evidence does not clearly belong to this account.';
  return `Only current evidence needs attribution review. ${reason}`;
}
function todaySections(workspace={},now=new Date(),options={}){
  const threshold=Number.isFinite(Number(options.goodFitThreshold))?Number(options.goodFitThreshold):GOOD_FIT_THRESHOLD;
  const base=(workspace.accounts||[]).filter(account=>!account.kills?.length&&account.killStatus!=='killed'&&account.status!=='skipped').map(account=>({...account,whyNow:whyNow(account,now)}));
  const actNow=[],worthResearching=[],needsReview=[];
  for(const account of base){
    const reviewReason=needsReviewReason(account,now),hasTrigger=Boolean(latestTrigger(account,now));
    if(reviewReason){needsReview.push({...account,reviewReason});continue;}
    if(![1,2,3].includes(Number(account.tier))){needsReview.push({...account,reviewReason:'Tier unknown — verify firmographics before placing this account in the seller queue.'});continue;}
    if(hasTrigger){actNow.push(account);continue;}
    if(Number(account.fitScore||0)>=threshold&&account.tier!=='parked')worthResearching.push(account);
  }
  actNow.sort(queueSort);worthResearching.sort((left,right)=>Number(right.fitScore||0)-Number(left.fitScore||0)||queueSort(left,right));needsReview.sort((left,right)=>Number(right.fitScore||0)-Number(left.fitScore||0)||String(left.name).localeCompare(String(right.name)));
  return {actNow,worthResearching,needsReview,goodFitThreshold:threshold};
}
function todayQueue(workspace={},now=new Date(),options={}){const sections=todaySections(workspace,now,options);return [...sections.actNow,...sections.worthResearching];}
function updateAccountStatus(state,workspaceId,accountId,fields={},options={}){
  const next=structuredClone(state),workspace=next.workspaces[workspaceId],account=workspace?.accounts.find(row=>row.id===accountId);if(!account)throw new Error('Account not found.');
  const status=String(fields.status||'').trim(),reason=String(fields.reason||'').trim();if(!ACCOUNT_STATUSES.includes(status))throw new Error('Choose new, working or skipped.');if(status==='skipped'&&!reason)throw new Error('Enter a reason before skipping this account.');if(reason.length>300)throw new Error('Keep the status reason under 300 characters.');
  if(fields.expectedUpdatedAt&&fields.expectedUpdatedAt!==account.updatedAt)throw new Error('This account changed. Refresh and try again.');
  const occurredAt=(options.now||(()=>new Date().toISOString()))();account.status=status;account.statusReason=status==='skipped'?reason:'';account.updatedAt=occurredAt;next.auditLog.push({schemaVersion:1,type:'account_status_changed',workspaceId,accountId,status,reason:account.statusReason,occurredAt});return next;
}

module.exports={ACCOUNT_STATUSES,GOOD_FIT_THRESHOLD,latestTrigger,needsReviewReason,todayQueue,todaySections,updateAccountStatus,whyNow};
