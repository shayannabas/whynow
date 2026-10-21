'use strict';

const {outreachModel}=require('./outreach-drafts.cjs');
const OUTREACH_MODEL_PRICING={model:'gpt-5.5',checkedOn:'2026-10-21',inputUsdPerMillion:5,cachedInputUsdPerMillion:.5,outputUsdPerMillion:30,sourceUrl:'https://developers.openai.com/api/docs/models/gpt-5.5'};
const DEFAULT_OUTREACH_MAX_OUTPUT_TOKENS=4000;
const OUTPUT_SCHEMA={type:'object',properties:{subject:{type:'string'},body:{type:'string'}},required:['subject','body'],additionalProperties:false};
function maxOutputTokens(model=''){return /^gpt-5(?:\.|$)/i.test(String(model))?DEFAULT_OUTREACH_MAX_OUTPUT_TOKENS:600;}
function buildOutreachRequest(context={},env={}){
  if(context.blockers?.length)throw new Error('Blocked outreach context cannot be sent to a model.');
  const greeting=`Hi ${context.persona.firstName},`;
  const claims=context.seller.claims||{};
  const model=outreachModel(env);
  return {model,store:false,reasoning:{effort:'medium'},max_output_tokens:maxOutputTokens(model),instructions:`Create one first-touch email of 60–110 words. Use only the supplied public trigger and seller claims. Preserve every supplied seller claim word-for-word. Return exactly five blocks: greeting, receipt-led opener, product/credibility, CTA, sender. The first block must be exactly "${greeting}" and the last block exactly "${context.sender.firstName}". The subject must be eight words or fewer, must not contain the account name, and must not say "Quick question". Do not include links, unsupported numbers, generic greetings, invented people, internal enum names, or a send instruction. Return JSON matching the schema.`,input:JSON.stringify({account:context.account,persona:context.persona,sender:context.sender,trigger:context.trigger,seller:{name:context.seller.name,product:claims.product,credential:claims.credential,proof:context.seller.proof},messageFraming:context.messageFraming,ctaSeverity:context.ctaSeverity}),text:{format:{type:'json_schema',name:'whynow_outreach_draft',strict:true,schema:OUTPUT_SCHEMA}}};
}
function estimateOutreachRequest(request={}){const bytes=Buffer.byteLength(JSON.stringify(request)),estimatedInputTokens=Math.ceil(bytes/4),maxOutputTokens=Number(request.max_output_tokens||0),price=OUTREACH_MODEL_PRICING,inputCostUsd=estimatedInputTokens/1_000_000*price.inputUsdPerMillion,maxOutputCostUsd=maxOutputTokens/1_000_000*price.outputUsdPerMillion;return {model:request.model,requestBytes:bytes,estimatedInputTokens,maxOutputTokens,inputCostUsd:Number(inputCostUsd.toFixed(6)),maximumTotalCostUsd:Number((inputCostUsd+maxOutputCostUsd).toFixed(6)),pricing:price};}
function assertRecordedModel(fixture={},env={}){const expected=outreachModel(env);if(fixture.model!==expected)throw new Error(`Recorded outreach response model must be ${expected}.`);return true;}
module.exports={DEFAULT_OUTREACH_MAX_OUTPUT_TOKENS,OUTREACH_MODEL_PRICING,OUTPUT_SCHEMA,assertRecordedModel,buildOutreachRequest,estimateOutreachRequest,maxOutputTokens};
