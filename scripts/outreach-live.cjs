'use strict';

const {buildOutreachRequest,estimateOutreachRequest,OUTREACH_MODEL_PRICING}=require('./outreach-model.cjs');
const {outreachModel,validateOutreachDraft}=require('./outreach-drafts.cjs');

const RESPONSES_ENDPOINT='https://api.openai.com/v1/responses';
const DEFAULT_TIMEOUT_MS=90000;

class OutreachLiveError extends Error {
  constructor(code,message,{httpStatus=null,incompleteReason=null,usage=null,costUsd=null,responseId='',responseModel=''}={}){super(message);this.name='OutreachLiveError';this.code=code;if(Number.isInteger(httpStatus))this.httpStatus=httpStatus;if(incompleteReason)this.incompleteReason=String(incompleteReason).slice(0,80);if(usage)this.usage=usage;if(Number.isFinite(costUsd))this.costUsd=costUsd;if(responseId)this.responseId=String(responseId).slice(0,120);if(responseModel)this.responseModel=String(responseModel).slice(0,120);}
}
function settings(env={}){
  const limitUsd=Number(env.OPENAI_MONTHLY_LIMIT_USD),callLimit=Number(env.OPENAI_OUTREACH_CALL_LIMIT),timeoutMs=Number(env.OPENAI_TIMEOUT_MS||DEFAULT_TIMEOUT_MS);
  return {enabled:env.OPENAI_ENABLED==='true',keyPresent:Boolean(env.OPENAI_API_KEY?.trim()),model:outreachModel(env),limitUsd:Number.isFinite(limitUsd)?limitUsd:0,callLimit:Number.isInteger(callLimit)?callLimit:0,timeoutMs:Number.isInteger(timeoutMs)&&timeoutMs>=1000&&timeoutMs<=180000?timeoutMs:DEFAULT_TIMEOUT_MS};
}
function assertReady(config){
  if(!config.enabled)throw new OutreachLiveError('DISABLED','OpenAI outreach is disabled.');
  if(!config.keyPresent)throw new OutreachLiveError('KEY_MISSING','The private OpenAI API key is not configured.');
  if(config.model!=='gpt-5.5')throw new OutreachLiveError('MODEL_MISMATCH','This bounded run permits only gpt-5.5.');
  if(!(config.limitUsd>0&&config.limitUsd<=.50)||config.callLimit!==3)throw new OutreachLiveError('BUDGET_MISMATCH','This bounded run requires a $0.50-or-lower process cap and exactly three logical calls.');
}
function outputText(payload={}){
  if(typeof payload.output_text==='string'&&payload.output_text.trim())return payload.output_text;
  for(const item of payload.output||[])for(const content of item.content||[]){if(content.type==='refusal')throw new OutreachLiveError('REFUSED','OpenAI declined this draft.');if(content.type==='output_text'&&typeof content.text==='string')return content.text;}
  throw new OutreachLiveError('INVALID_OUTPUT','OpenAI returned no structured draft text.');
}
function actualCost(usage={},pricing=OUTREACH_MODEL_PRICING){
  const input=Math.max(0,Number(usage.input_tokens)||0),cached=Math.min(input,Math.max(0,Number(usage.input_tokens_details?.cached_tokens)||0)),output=Math.max(0,Number(usage.output_tokens)||0),uncached=input-cached;
  return Number(((uncached*pricing.inputUsdPerMillion+cached*Number(pricing.cachedInputUsdPerMillion||pricing.inputUsdPerMillion)+output*pricing.outputUsdPerMillion)/1_000_000).toFixed(6));
}
function usageSummary(usage={}){return {inputTokens:Math.max(0,Number(usage.input_tokens)||0),cachedInputTokens:Math.max(0,Number(usage.input_tokens_details?.cached_tokens)||0),outputTokens:Math.max(0,Number(usage.output_tokens)||0),reasoningTokens:Math.max(0,Number(usage.output_tokens_details?.reasoning_tokens)||0)};}
function claimsUsed(context={}){const claims=context.seller?.claims||{};return [claims.product,claims.credential,context.seller?.proof&&{value:context.seller.proof.claim,quote:context.seller.proof.quote,sourceUrl:context.seller.proof.sourceUrl}].filter(Boolean);}
function validatedDraft(value={},context={}){
  const usedClaims=claimsUsed(context),draft={subject:String(value.subject||''),body:String(value.body||''),usedClaims,evidenceRefs:Array.from(new Set([context.trigger?.sourceUrl,...(context.trigger?.corroboration?.sourceUrls||[]),...usedClaims.map(row=>row.sourceUrl)].filter(Boolean)))};
  const validation=validateOutreachDraft(draft,context);if(!validation.ok)throw new OutreachLiveError('DRAFT_BLOCKED',`The generated draft failed local validation: ${validation.reasons.map(row=>row.code).join(', ')}`);
  return {...draft,validation,wordCount:validation.wordCount,generatedBy:'openai',model:'gpt-5.5'};
}
function createOutreachGenerator({env=process.env,fetchImpl=fetch,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}){
  const config=settings(env);assertReady(config);let logicalCalls=0,attempts=0,reservedUsd=0,actualUsd=0;
  async function generate(context={}){
    if(logicalCalls>=config.callLimit)throw new OutreachLiveError('CALL_LIMIT','The three-call outreach limit is exhausted.');
    const request=buildOutreachRequest(context,env),estimate=estimateOutreachRequest(request);logicalCalls++;
    for(let attempt=0;attempt<2;attempt++){
      if(reservedUsd+estimate.maximumTotalCostUsd>config.limitUsd)throw new OutreachLiveError('BUDGET_EXHAUSTED','The process-only outreach cap would be exceeded.');
      reservedUsd=Number((reservedUsd+estimate.maximumTotalCostUsd).toFixed(6));attempts++;
      let response;
      try{response=await fetchImpl(RESPONSES_ENDPOINT,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json',Authorization:`Bearer ${env.OPENAI_API_KEY}`},body:JSON.stringify(request),signal:AbortSignal.timeout(config.timeoutMs)});}catch{throw new OutreachLiveError('REQUEST_FAILED','OpenAI outreach request failed or timed out.');}
      if(!response.ok){await response.body?.cancel();if((response.status===429||response.status>=500)&&attempt===0){await sleep(500);continue;}throw new OutreachLiveError('REQUEST_FAILED',`OpenAI outreach request failed (HTTP ${response.status}).`,{httpStatus:response.status});}
      let payload;try{payload=await response.json();}catch{throw new OutreachLiveError('INVALID_OUTPUT','OpenAI returned unreadable JSON.');}
      const usage=usageSummary(payload.usage),costUsd=actualCost(payload.usage),responseId=String(payload.id||''),responseModel=String(payload.model||config.model);actualUsd=Number((actualUsd+costUsd).toFixed(6));
      if(payload.status&&payload.status!=='completed'){
        const incompleteReason=String(payload.incomplete_details?.reason||payload.status||'unknown').slice(0,80);
        throw new OutreachLiveError('INCOMPLETE',`OpenAI returned an incomplete draft (${incompleteReason}).`,{incompleteReason,usage,costUsd,responseId,responseModel});
      }
      let value;try{value=JSON.parse(outputText(payload));}catch(error){if(error instanceof OutreachLiveError)throw error;throw new OutreachLiveError('INVALID_OUTPUT','OpenAI returned invalid structured draft JSON.');}
      const draft=validatedDraft(value,context);return {draft,costUsd,usage,responseId,responseModel,estimate};
    }
    throw new OutreachLiveError('REQUEST_FAILED','OpenAI outreach request failed.');
  }
  return {generate,snapshot:()=>({model:config.model,logicalCalls,attempts,reservedUsd,actualUsd,processCapUsd:config.limitUsd})};
}

module.exports={DEFAULT_TIMEOUT_MS,OutreachLiveError,RESPONSES_ENDPOINT,actualCost,claimsUsed,createOutreachGenerator,outputText,settings,usageSummary,validatedDraft};
