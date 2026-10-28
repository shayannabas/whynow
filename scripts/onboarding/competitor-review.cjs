const {getWorkspace,updateWorkspace}=require('../server/state.cjs');
const {stableId,esc}=require('../utils.cjs');
const {buildReceiptEvidence,receiptQuality}=require('./validate.cjs');
const {quoteIsGrounded}=require('../sources.cjs');

function droppedCandidates(workspace) {
  const names=new Set((workspace.sellerProfile?.competitors||[]).map(row=>row.name.toLowerCase()));
  return (workspace.research?.synthesis?.organizationReview?.competitors||[]).filter(row=>!names.has(row.name.toLowerCase()));
}
function restoreCompetitor(state,id,{candidateId,revision,now=()=>new Date().toISOString()}={}) {
  const workspace=getWorkspace(state,id);
  if(!['draft','needs_review','active'].includes(workspace.status))throw Error('This workspace cannot be edited.');
  if(String(workspace.profileRevision||0)!==String(revision))throw Error('The profile changed in another tab. Refresh before restoring.');
  const candidate=droppedCandidates(workspace).find(row=>row.id===candidateId);
  if(!candidate)throw Error('That dropped competitor is not available in this workspace.');
  const receipt=buildReceiptEvidence(state,workspace).receiptMap.get(candidate.receiptId);
  const confirmed=require('./review-organizations.cjs').confirmedComparison(candidate,{seller:{domain:workspace.sellerProfile.domain||workspace.onboarding?.selectedCandidate?.domain}});
  if(!candidate.domain&&!confirmed||!receipt||!receiptQuality(candidate.name,receipt.evidenceQuote,receipt.source.url).ok||!quoteIsGrounded(state,receipt.sourceId,receipt.evidenceQuote))throw Error('This candidate needs a saved supporting receipt and a verified domain or confirmed first-party comparison before restoration.');
  const evidence={schemaVersion:1,value:candidate.name,sourceUrl:receipt.source.url,sourceId:receipt.sourceId,evidenceQuote:receipt.evidenceQuote,inferred:false,verification:'matched_saved_quote',reason:'Owner restored a saved, grounded competitor candidate.'},time=now();
  const next=updateWorkspace(state,id,w=>{
    const index=w.sellerProfile.competitors.length;
    w.sellerProfile.competitors.push({name:candidate.name,domain:candidate.domain||null,domainStatus:candidate.domain?'verified':'domain_missing',domainEvidence:candidate.domainEvidence||null,...evidence});
    w.sellerProfile.evidence[`competitors.${index}`]=evidence;
    w.sellerProfile.sources=[...new Set([...(w.sellerProfile.sources||[]),receipt.sourceId])];
    w.sellerProfile.approvedAt=null;w.sellerProfile.deliveryAllowed=false;w.sellerProfile.updatedAt=time;
    w.icpConfig.triggerMapping.competitor_names=w.sellerProfile.competitors.map(row=>row.name);w.icpConfig.defaultsReviewRequired=true;
    w.status='needs_review';w.deliveryMode='demo';w.profileRevision=(w.profileRevision||0)+1;delete w.reviewAcknowledgments;
    w.research.status='review_required';w.research.revision=(w.research.revision||0)+1;
    w.research.steps=(w.research.steps||[]).map(row=>row.key==='review'?{...row,status:'pending'}:row);
    const decision=w.research.synthesis.organizationReview.competitors.find(row=>row.id===candidateId);
    decision.restoredAt=time;decision.restoredBy='local-admin';
  });
  next.auditLog.push({schemaVersion:1,id:stableId(`${id}:competitor_restored:${candidateId}:${time}`),workspaceId:id,type:'competitor_candidate_restored',occurredAt:time,actor:'local-admin',candidateId,name:candidate.name,sourceUrl:receipt.source.url,previousReason:candidate.reason,profileRevision:next.workspaces[id].profileRevision});
  return next;
}
function competitorReview(workspace) {
  const rows=droppedCandidates(workspace);if(!rows.length)return '';
  return `<section class="card" aria-label="Dropped competitor candidates"><h2>Dropped competitor candidates</h2><p>Confirmed first-party comparisons are kept unless the reviewer provides a specific evidence-based reason. Restoring edits the draft only; it does not approve it.</p>${rows.map(row=>`<article class="evidence"><h3>${esc(row.name)}</h3><p>Reason: ${esc(row.reason)}</p><blockquote>${esc(row.supportingQuote||row.evidenceQuote)}</blockquote><a href="${esc(row.sourceUrl)}" target="_blank" rel="noreferrer">Review comparison receipt</a><form method="post" action="/onboarding/profile/restore-competitor"><input type="hidden" name="workspaceId" value="${esc(workspace.id)}"><input type="hidden" name="revision" value="${workspace.profileRevision||0}"><input type="hidden" name="candidateId" value="${esc(row.id)}"><button>Restore ${esc(row.name)}</button></form></article>`).join('')}</section>`;
}
module.exports={droppedCandidates,restoreCompetitor,competitorReview};
