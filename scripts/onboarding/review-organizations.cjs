const {assertStructuredOutputSchemaWithinLimits}=require('../openai-schema.cjs');

const PROMPT_VERSION='organization-candidate-review-v2';
function schemaFor(candidateIds) {
  const candidate={type:'object',additionalProperties:false,properties:{candidateId:{$ref:'#/$defs/candidateId'}},required:['candidateId']};
  const rejection={type:'object',additionalProperties:false,properties:{candidateId:{$ref:'#/$defs/candidateId'},reason:{type:'string'},supportingQuote:{type:'string'}},required:['candidateId','reason','supportingQuote']};
  const schema={type:'object',additionalProperties:false,properties:{customers:{type:'array',items:candidate,minItems:0,maxItems:30},competitors:{type:'array',items:candidate,minItems:0,maxItems:30},rejectedCompetitors:{type:'array',items:rejection,maxItems:30}},required:['customers','competitors','rejectedCompetitors'],$defs:{candidateId:{type:'string',enum:[...candidateIds]}}};
  assertStructuredOutputSchemaWithinLimits(schema);return schema;
}
function request({workspaceId,company,candidates,model}) {
  const candidateIds=[...candidates.customers,...candidates.competitors].map(item=>item.id),allowed=new Set(candidateIds);
  const publicCandidates={customers:candidates.customers.map(publicCandidate),competitors:candidates.competitors.map(publicCandidate)};
  const instructions=[
    'Review deterministic customer and competitor candidates for the named seller.',
    'You may not invent, rename or add an organization. Confirmed first-party comparison competitors are retained by default, even if omitted from your selected list.',
    'To reject a competitor, include rejectedCompetitors with a specific evidence-based reason naming that candidate, and a verbatim supportingQuote from its supplied evidenceQuote. Omission or generic uncertainty is not a reason. Keep uncertain candidates out unless their evidence supports them.',
    'Return only candidateId values from the supplied list. Keep a customer only when the source identifies it as a seller customer or case study.',
    'Keep a competitor only when a first-party comparison, versus or alternatives source compares it with the seller.',
    'A missing domain is allowed but must not be guessed. The server preserves the deterministic name, URL, quote and domain status.'
  ].join('\n');
  return {workspaceId,promptVersion:PROMPT_VERSION,name:'whynow_organization_review',model,maxOutputTokens:8000,reasoningEffort:'low',schema:schemaFor(candidateIds),messages:[{role:'system',content:instructions},{role:'user',content:JSON.stringify({company,candidates:publicCandidates})}],validate:value=>{
    if(!value||!Array.isArray(value.customers)||!Array.isArray(value.competitors)||!Array.isArray(value.rejectedCompetitors)||Object.keys(value).sort().join(',')!=='competitors,customers,rejectedCompetitors')throw Error('Invalid organization-review output.');
    const ids=[...value.customers,...value.competitors,...value.rejectedCompetitors].map(item=>item?.candidateId);if(ids.some(id=>!allowed.has(id))||new Set(ids).size!==ids.length)throw Error('Organization review referenced an unknown or duplicate candidate.');
    for(const kind of ['customers','competitors'])if(value[kind].some(row=>!candidates[kind].some(item=>item.id===row.candidateId)))throw Error('Organization review used a candidate of the wrong kind.');
    for(const rejection of value.rejectedCompetitors)if(!validRejection(rejection,candidates.competitors.find(item=>item.id===rejection.candidateId)))throw Error('A competitor rejection needs a specific reason naming the candidate and a verbatim supporting quote.');return true;
  }};
}
function publicCandidate(item){return {candidateId:item.id,name:item.name,domain:item.domain,domainStatus:item.domainStatus,status:item.status,sourceUrl:item.sourceUrl,evidenceQuote:item.evidenceQuote,foundBy:item.foundBy};}
function validRejection(rejection,candidate) {
  if(!candidate)return false;
  const reason=String(rejection.reason||'').trim(),quote=String(rejection.supportingQuote||'').trim();
  return reason.length>=30&&reason.length<=1000&&reason.toLowerCase().includes(candidate.name.toLowerCase())&&quote.length>=20&&candidate.evidenceQuote.includes(quote)&&!/^(?:not sure|uncertain|no evidence|insufficient evidence|not relevant|not a competitor)[.!\s]*$/i.test(reason);
}
function confirmedComparison(item,candidates) {
  let host;try{host=new URL(item.sourceUrl).hostname.replace(/^www\./,'');}catch{return false;}
  const domain=candidates.seller?.domain;
  return item.status==='confirmed_candidate'&&Boolean(item.receiptId)&&Boolean(domain&&(host===domain||host.endsWith(`.${domain}`)))&&(item.foundBy||[]).some(value=>value.startsWith('comparison_'));
}
function materializeReview(review,candidates) {
  const map=new Map([...candidates.customers,...candidates.competitors].map(item=>[item.id,item]));
  const convert=rows=>rows.map(row=>map.get(row.candidateId)).filter(item=>item?.receiptId).map(item=>({name:item.name,domain:item.domain,receiptId:item.receiptId}));
  const selected=new Set(review.competitors.map(row=>row.candidateId)),rejections=new Map((review.rejectedCompetitors||[]).filter(row=>validRejection(row,map.get(row.candidateId))).map(row=>[row.candidateId,row]));
  const decisions=candidates.competitors.map(item=>{
    const rejection=rejections.get(item.id),kept=!rejection&&(selected.has(item.id)||confirmedComparison(item,candidates));
    return {...structuredClone(item),kept,reason:rejection?.reason||(kept?'Retained: selected or confirmed first-party comparison candidate.':'Not selected by the reviewer; no confirmed first-party comparison receipt.'),supportingQuote:rejection?.supportingQuote||'',decision:rejection?'rejected_with_evidence':kept?'retained':'not_selected'};
  });
  return {customers:convert(review.customers),competitors:convert(decisions.filter(row=>row.kept).map(row=>({candidateId:row.id}))),organizationReview:{schemaVersion:1,policyVersion:PROMPT_VERSION,competitors:decisions}};
}
module.exports={PROMPT_VERSION,schemaFor,request,publicCandidate,validRejection,confirmedComparison,materializeReview};
