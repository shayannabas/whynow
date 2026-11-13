'use strict';
const {normalizeJobs,hiringTriggerType}=require('./collectors/hiring.cjs');
const {decorateTrigger}=require('./collector-triggers.cjs');
const {sanitizeWhyNow}=require('./phase-b-runner.cjs');
const {phaseAConfigForWorkspace,scoringAllowed}=require('./phase-a-config.cjs');
const {scoreAccount}=require('./score-account.cjs');

// Offline migration only: callers supply recorded public ATS payloads, never a fetcher.
function recordedJobs(records=[]){
  const jobs=new Map();
  for(const record of records){
    const url=String(record.url||'');
    const provider=url.includes('greenhouse.io')?'greenhouse':url.includes('lever.co')?'lever':url.includes('ashbyhq.com')?'ashby':null;
    if(!provider)continue;
    try{const payload=record.value||JSON.parse(record.text);const rows=provider==='greenhouse'&&payload.id?{jobs:[payload]}:payload;
      for(const job of normalizeJobs(provider,rows))jobs.set(`${provider}:${job.id}`,job);
    }catch{/* Non-JSON/error cache entries cannot establish a publication date. */}
  }
  return jobs;
}
function repairHiringEvidence(state,records=[],now=new Date()){
  const next=structuredClone(state),jobs=recordedJobs(records),changes=[];
  for(const workspace of Object.values(next.workspaces)){
    let config;try{scoringAllowed(workspace);config=phaseAConfigForWorkspace(workspace);}catch{continue;}
    for(let i=0;i<workspace.accounts.length;i++){
      const account=workspace.accounts[i];let touched=false;
      function repair(row,field){
        if(!hiringTriggerType(row.type||row.triggerType)&&!['greenhouse','lever','ashby'].includes(row.sourceId))return row;
        const provider=row.metadata?.provider||row.sourceId,job=jobs.get(`${provider}:${row.metadata?.jobId}`);
        const metadata={...row.metadata,originalOccurredAt:row.metadata?.originalOccurredAt||row.occurredAt||row.observedAt,publicationDateSource:job?.publicationDateSource||'missing',department:job?.department||''};
        const fixed=job?.publishedAt?{...row,metadata,...(row.type||row.triggerType?{occurredAt:job.publishedAt}:{observedAt:job.publishedAt})}:{...row,citable:false,metadata:{...metadata,citable:false,notCitableReason:'Original ATS publication date is absent from the saved source; an update or collection date cannot establish freshness.'}};
        const result=row.type||row.triggerType?decorateTrigger(fixed,config.slaDays||{}):fixed;
        if(JSON.stringify(row)!==JSON.stringify(result)){touched=true;changes.push({workspaceId:workspace.id,account:account.name,field,id:row.id,oldDate:row.occurredAt||row.observedAt,newDate:job?.publishedAt||null});}
        return result;
      }
      for(const field of ['triggers','triggerHistory'])account[field]=(account[field]||[]).map(row=>repair(row,field));
      for(const [key,row] of Object.entries(account.signals||{})){if(!['greenhouse','lever','ashby'].includes(row.sourceId))continue;const fixed=repair(row,`signals.${key}`);if(JSON.stringify(row)!==JSON.stringify(fixed))account.signalHistory=[...(account.signalHistory||[]),row];if(fixed.citable===false)delete account.signals[key];else account.signals[key]=fixed;}
      // Re-evaluate title/department matching even if the date was already corrected.
      const cleaned=sanitizeWhyNow(account,config,now);
      if(touched||JSON.stringify(account.triggers)!==JSON.stringify(cleaned.triggers))workspace.accounts[i]=scoreAccount(cleaned,config,now);
    }
  }
  if(changes.length)next.auditLog.push({schemaVersion:1,type:'hiring_publication_repaired',occurredAt:now.toISOString(),changes,reason:'Offline correction from saved ATS original publication dates; title and department matching only. Drafts, evidence and profile approvals retained.'});
  return {state:next,changes};
}
module.exports={recordedJobs,repairHiringEvidence};
