'use strict';

const {activeTriggers}=require('./decisioning.cjs');

const ACCOUNT_STATUSES=['new','working','skipped'];
function latestTrigger(account={},now=new Date()){return activeTriggers(account,now).sort((a,b)=>(Date.parse(b.occurredAt||b.detectedAt||'')||0)-(Date.parse(a.occurredAt||a.detectedAt||'')||0))[0]||null;}
function whyNow(account={},now=new Date()){
  const trigger=latestTrigger(account,now);if(trigger)return {line:String(trigger.title||trigger.evidenceText||trigger.type||'Fresh public signal.'),receipt:String(trigger.evidenceUrl||''),kind:String(trigger.type||trigger.triggerType||'signal')};
  return {line:'No active why-now signal yet — refresh this account.',receipt:String(account.sourceUrl||account.discoveryQuality?.sourceUrl||''),kind:'none'};
}
function todayQueue(workspace={},now=new Date()){
  return (workspace.accounts||[]).filter(account=>!account.kills?.length&&account.killStatus!=='killed'&&account.status!=='skipped').map(account=>({...account,whyNow:whyNow(account,now)})).sort((left,right)=>{
    const working=Number(right.status==='working')-Number(left.status==='working');if(working)return working;
    const priority=Number(right.priority||0)-Number(left.priority||0);if(priority)return priority;
    const triggers=Number(Boolean(right.whyNow?.receipt&&right.whyNow.kind!=='none'))-Number(Boolean(left.whyNow?.receipt&&left.whyNow.kind!=='none'));if(triggers)return triggers;
    return Number(right.fitScore||0)-Number(left.fitScore||0)||String(left.name).localeCompare(String(right.name));
  });
}
function updateAccountStatus(state,workspaceId,accountId,fields={},options={}){
  const next=structuredClone(state),workspace=next.workspaces[workspaceId],account=workspace?.accounts.find(row=>row.id===accountId);if(!account)throw new Error('Account not found.');
  const status=String(fields.status||'').trim(),reason=String(fields.reason||'').trim();if(!ACCOUNT_STATUSES.includes(status))throw new Error('Choose new, working or skipped.');if(status==='skipped'&&!reason)throw new Error('Enter a reason before skipping this account.');if(reason.length>300)throw new Error('Keep the status reason under 300 characters.');
  if(fields.expectedUpdatedAt&&fields.expectedUpdatedAt!==account.updatedAt)throw new Error('This account changed. Refresh and try again.');
  const occurredAt=(options.now||(()=>new Date().toISOString()))();account.status=status;account.statusReason=status==='skipped'?reason:'';account.updatedAt=occurredAt;next.auditLog.push({schemaVersion:1,type:'account_status_changed',workspaceId,accountId,status,reason:account.statusReason,occurredAt});return next;
}

module.exports={ACCOUNT_STATUSES,latestTrigger,todayQueue,updateAccountStatus,whyNow};
