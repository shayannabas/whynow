'use strict';
const NOISE_REASONS=new Set(['non_company_page','headline_not_company','framework_or_project','adjacent_vendor_candidate','job_board','seller_property']);
function archiveRejectedDiscovery(state,now=new Date()){
  const next=structuredClone(state),changes=[];
  for(const workspace of Object.values(next.workspaces)){
    const archived=workspace.rejectedDiscovery||[],ids=new Set(archived.map(row=>row.id));
    workspace.accounts=workspace.accounts.filter(account=>{
      const quality=account.discoveryQuality||{};
      if(quality.sourceKind!=='serper_discovery'||quality.isValidTargetAccount!==false||!NOISE_REASONS.has(quality.reason)||account.kills?.length)return true;
      if(!ids.has(account.id)){archived.push({...account,rejectedAt:now.toISOString(),rejectionReason:quality.reason});ids.add(account.id);changes.push({workspaceId:workspace.id,id:account.id,name:account.name,reason:quality.reason});}
      return false;
    });
    if(archived.length)workspace.rejectedDiscovery=archived;
  }
  if(changes.length)next.auditLog.push({schemaVersion:1,type:'discovery_noise_archived',occurredAt:now.toISOString(),changes,reason:'Keep rejected discovery noise and all receipts outside prospect queues.'});
  return {state:next,changes};
}
module.exports={archiveRejectedDiscovery};
