const {assertStructuredOutputSchemaWithinLimits}=require('../openai-schema.cjs');

const PROMPT_VERSION='icp-targeting-resolve-example-v1';
function schemaFor(receiptIds) {
  const {SYNTHESIS_SCHEMA}=require('./synthesize.cjs');
  const schema={type:'object',additionalProperties:false,properties:{icpConfig:structuredClone(SYNTHESIS_SCHEMA.properties.icpConfig)},required:['icpConfig'],$defs:{receiptId:{type:'string',enum:[...receiptIds]}}};
  assertStructuredOutputSchemaWithinLimits(schema);return schema;
}
function workedExample(reference) {
  const config=reference.icpConfig;
  return {segments:config.segments.map(item=>({label:item.label,subIndustries:item.subIndustries,queryTemplates:item.queryTemplates})),personas:config.personas,killPatterns:config.killPatterns,triggerMapping:config.triggerMapping};
}
function request({workspaceId,company,evidence,receiptIds,referenceProfile,model,validateReceiptIds}) {
  const instructions=[
    'Draft only the ICP targeting configuration requested by the schema using saved EVIDENCE and the seller identity.',
    'The Resolve reference is a worked example of specificity and buyer orientation, not content to copy into unrelated sellers.',
    'Buyer titles approve the purchase; champion titles own, use or advocate for it.',
    'Use a measurable size metric such as employees, engineering headcount or annual revenue and a floor consistent with the target customer size.',
    'Every segment search phrase must find prospective buyer companies through observable pain, hiring, technology adoption or operational change.',
    'Explicitly forbidden: phrases that describe the seller product category, vendor lists, alternatives, best tools, platforms, providers, software or solutions. Those searches surface vendors and competitors instead of buyers.',
    'Kill patterns describe companies that will not buy and must not repeat pain or positive buying signals.',
    'Do not invent factual example targets. Leave exampleTargets empty unless a supplied receipt directly supports the company.'
  ].join('\n');
  return {workspaceId,promptVersion:PROMPT_VERSION,name:'whynow_icp_targeting',model,maxOutputTokens:3072,schema:schemaFor(receiptIds),
    messages:[{role:'system',content:instructions},{role:'user',content:JSON.stringify({company,resolveWorkedExample:workedExample(referenceProfile),evidence:JSON.parse(evidence)})}],
    validate:value=>{if(!value||typeof value!=='object'||Object.keys(value).join(',')!=='icpConfig')throw Error('Invalid ICP output.');return validateReceiptIds(value);}};
}
module.exports={PROMPT_VERSION,schemaFor,workedExample,request};
