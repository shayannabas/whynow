const {assertStructuredOutputSchemaWithinLimits}=require('../openai-schema.cjs');

const PROMPT_VERSION='organization-candidate-review-v1';
function schemaFor(candidateIds) {
  const candidate={type:'object',additionalProperties:false,properties:{candidateId:{$ref:'#/$defs/candidateId'}},required:['candidateId']};
  const schema={type:'object',additionalProperties:false,properties:{customers:{type:'array',items:candidate,minItems:0,maxItems:30},competitors:{type:'array',items:candidate,minItems:0,maxItems:30}},required:['customers','competitors'],$defs:{candidateId:{type:'string',enum:[...candidateIds]}}};
  assertStructuredOutputSchemaWithinLimits(schema);return schema;
}
function request({workspaceId,company,candidates,model}) {
  const candidateIds=[...candidates.customers,...candidates.competitors].map(item=>item.id),allowed=new Set(candidateIds);
  const publicCandidates={customers:candidates.customers.map(publicCandidate),competitors:candidates.competitors.map(publicCandidate)};
  const instructions=[
    'Review deterministic customer and competitor candidates for the named seller.',
    'You may keep or drop supplied candidates. You may not invent, rename or add an organization.',
    'Return only candidateId values from the supplied list. Keep a customer only when the source identifies it as a seller customer or case study.',
    'Keep a competitor only when a first-party comparison, versus or alternatives source compares it with the seller.',
    'A missing domain is allowed but must not be guessed. The server preserves the deterministic name, URL, quote and domain status.'
  ].join('\n');
  return {workspaceId,promptVersion:PROMPT_VERSION,name:'whynow_organization_review',model,maxOutputTokens:8000,reasoningEffort:'low',schema:schemaFor(candidateIds),messages:[{role:'system',content:instructions},{role:'user',content:JSON.stringify({company,candidates:publicCandidates})}],validate:value=>{
    if(!value||!Array.isArray(value.customers)||!Array.isArray(value.competitors)||Object.keys(value).sort().join(',')!=='competitors,customers')throw Error('Invalid organization-review output.');
    const ids=[...value.customers,...value.competitors].map(item=>item?.candidateId);if(ids.some(id=>!allowed.has(id))||new Set(ids).size!==ids.length)throw Error('Organization review referenced an unknown or duplicate candidate.');return true;
  }};
}
function publicCandidate(item){return {candidateId:item.id,name:item.name,domain:item.domain,domainStatus:item.domainStatus,status:item.status,sourceUrl:item.sourceUrl,evidenceQuote:item.evidenceQuote,foundBy:item.foundBy};}
function materializeReview(review,candidates) {
  const map=new Map([...candidates.customers,...candidates.competitors].map(item=>[item.id,item]));
  const convert=rows=>rows.map(row=>map.get(row.candidateId)).filter(item=>item?.receiptId).map(item=>({name:item.name,domain:item.domain,receiptId:item.receiptId}));
  return {customers:convert(review.customers),competitors:convert(review.competitors)};
}
module.exports={PROMPT_VERSION,schemaFor,request,publicCandidate,materializeReview};
