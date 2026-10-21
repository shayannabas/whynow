'use strict';

const {outreachModel}=require('./outreach-drafts.cjs');
const OUTREACH_MODEL_PRICING={model:'gpt-5.5',checkedOn:'2026-10-21',inputUsdPerMillion:5,outputUsdPerMillion:30,sourceUrl:'https://developers.openai.com/api/docs/models/gpt-5.5'};
const OUTPUT_SCHEMA={type:'object',properties:{subject:{type:'string'},body:{type:'string'}},required:['subject','body'],additionalProperties:false};
function buildOutreachRequest(context={},env={}){
  if(context.blockers?.length)throw new Error('Blocked outreach context cannot be sent to a model.');
  return {model:outreachModel(env),store:false,reasoning:{effort:'medium'},max_output_tokens:600,instructions:'Create one first-touch email. Use only the supplied public trigger and seller claims. Preserve seller claim wording exactly. Return five blocks: greeting, receipt-led opener, product/credibility, CTA, sender. Do not include links, unsupported numbers, internal enum names, or a send instruction.',input:JSON.stringify({account:context.account,persona:context.persona,sender:context.sender,trigger:context.trigger,seller:context.seller,messageFraming:context.messageFraming,ctaSeverity:context.ctaSeverity}),text:{format:{type:'json_schema',name:'whynow_outreach_draft',strict:true,schema:OUTPUT_SCHEMA}}};
}
function estimateOutreachRequest(request={}){const bytes=Buffer.byteLength(JSON.stringify(request)),estimatedInputTokens=Math.ceil(bytes/4),maxOutputTokens=Number(request.max_output_tokens||0),price=OUTREACH_MODEL_PRICING,inputCostUsd=estimatedInputTokens/1_000_000*price.inputUsdPerMillion,maxOutputCostUsd=maxOutputTokens/1_000_000*price.outputUsdPerMillion;return {model:request.model,requestBytes:bytes,estimatedInputTokens,maxOutputTokens,inputCostUsd:Number(inputCostUsd.toFixed(6)),maximumTotalCostUsd:Number((inputCostUsd+maxOutputCostUsd).toFixed(6)),pricing:price};}
function assertRecordedModel(fixture={},env={}){const expected=outreachModel(env);if(fixture.model!==expected)throw new Error(`Recorded outreach response model must be ${expected}.`);return true;}
module.exports={OUTREACH_MODEL_PRICING,OUTPUT_SCHEMA,assertRecordedModel,buildOutreachRequest,estimateOutreachRequest};
