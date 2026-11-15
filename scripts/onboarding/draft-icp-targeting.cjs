const {assertStructuredOutputSchemaWithinLimits}=require('../openai-schema.cjs');

const PROMPT_VERSION='icp-targeting-playbook-v3';
function schemaFor(receiptIds) {
  const {SYNTHESIS_SCHEMA}=require('./synthesize.cjs');
  const schema={type:'object',additionalProperties:false,properties:{icpConfig:structuredClone(SYNTHESIS_SCHEMA.properties.icpConfig)},required:['icpConfig'],$defs:{receiptId:{type:'string',enum:[...receiptIds]}}};
  const sentence={type:'string',minLength:10,maxLength:500},three={type:'array',items:sentence,minItems:3,maxItems:3};
  Object.assign(schema.properties.icpConfig.properties,{outreach:{type:'object',additionalProperties:false,properties:{framingLibrary:three,closingQuestions:three},required:['framingLibrary','closingQuestions']},targetCompanySizeDescription:sentence});
  schema.properties.icpConfig.properties.playbook=require('../playbook.cjs').draftSchema();
  schema.properties.icpConfig.required.push('outreach','targetCompanySizeDescription','playbook');
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
    'Always propose targetCompanySizeDescription: an editable targeting description with the numeric minimum and unit consistent with sizeMetric and segments; this is a targeting choice, not a researched fact.',
    'Always propose outreach.framingLibrary with exactly 3 complete general, non-factual framing sentences tailored to this seller. No names, statistics, guarantees, or invented prospect details. Propose exactly 3 different closingQuestions ending in ?; these are editable drafts, not approved claims.',
    'For sales/GTM sellers, segment primarily by company stage, sales-team scale and sales motion (enterprise sales, PLG expansion, complex B2B), not an industry-only taxonomy.',
    'Every segment search phrase must find prospective buyer companies through observable pain, hiring, technology adoption or operational change.',
    'Explicitly forbidden: phrases that describe the seller product category, vendor lists, alternatives, best tools, platforms, providers, software or solutions. Those searches surface vendors and competitors instead of buyers.',
    'Also propose a seller-specific playbook: economic buyers, champions and end-user titles; timing triggers with saved receiptIds, matching keywords, source, freshnessDays 7-180, strength and messageAngle; and antiTriggers. At least one trigger must be strong. These are unapproved editable policies, not prospect facts. Use only supplied seller receipts; never invent companies, named people, metrics or contacts. Message angles guide natural wording but are not permission to add unsupported facts.',
    'Kill patterns describe companies that will not buy and must not repeat pain or positive buying signals.',
    'Do not invent factual example targets. Leave exampleTargets empty unless a supplied receipt directly supports the company.'
  ].join('\n');
  return {workspaceId,promptVersion:PROMPT_VERSION,name:'whynow_icp_targeting',model,maxOutputTokens:8000,reasoningEffort:'low',schema:schemaFor(receiptIds),
    messages:[{role:'system',content:instructions},{role:'user',content:JSON.stringify({company,resolveWorkedExample:workedExample(referenceProfile),evidence:JSON.parse(evidence)})}],
    validate:value=>{if(!value||typeof value!=='object'||Object.keys(value).join(',')!=='icpConfig')throw Error('Invalid ICP output.');return validateReceiptIds(value);}};
}
module.exports={PROMPT_VERSION,schemaFor,workedExample,request};
