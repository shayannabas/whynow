const {createHash}=require('node:crypto');
const {getWorkspace,updateWorkspace}=require('./server/state.cjs');

const ENDPOINT='https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL='gpt-5.5';
const PROPOSED_STRONG_MODEL='gpt-5.4-mini-2026-03-17';
const SUPPORTED_MODELS=new Set([DEFAULT_MODEL,'gpt-5.5-2026-04-23','gpt-4o-mini','gpt-4o-mini-2024-07-18','gpt-5.4-mini',PROPOSED_STRONG_MODEL]);
const MODEL_PRICING_USD_PER_MILLION=Object.freeze({
  'gpt-5.5':{input:5,cachedInput:.5,output:30},'gpt-5.5-2026-04-23':{input:5,cachedInput:.5,output:30},
  'gpt-4o-mini':{input:0.15,cachedInput:0.075,output:0.60},'gpt-4o-mini-2024-07-18':{input:0.15,cachedInput:0.075,output:0.60},
  'gpt-5.4-mini':{input:0.75,cachedInput:0.075,output:4.50},[PROPOSED_STRONG_MODEL]:{input:0.75,cachedInput:0.075,output:4.50}
});
const DEFAULT_TIMEOUT_MS=90000;
const MAX_REQUEST_BYTES=360000;
const ESTIMATED_BYTES_PER_INPUT_TOKEN=3;
class LlmError extends Error {constructor(code,message,{httpStatus,usage,costUsd,finishReason,incompleteReason}={}){super(message);this.code=code;if(Number.isInteger(httpStatus))this.httpStatus=httpStatus;if(usage)this.usage=usage;if(Number.isFinite(costUsd))this.costUsd=costUsd;if(finishReason)this.finishReason=String(finishReason).slice(0,80);if(incompleteReason)this.incompleteReason=String(incompleteReason).slice(0,120);}}
function settings(env={}) {
  const model=env.OPENAI_MODEL||DEFAULT_MODEL;
  const dollars=Number(env.OPENAI_MONTHLY_LIMIT_USD||0);
  const callLimit=Number(env.OPENAI_WORKSPACE_MONTHLY_CALL_LIMIT||100);
  const requestedTimeout=Number(env.OPENAI_TIMEOUT_MS||DEFAULT_TIMEOUT_MS);
  const requestedRetryLimit=Number(env.OPENAI_RETRY_LIMIT??1);
  return {model,enabled:env.OPENAI_ENABLED==='true',keyPresent:Boolean(env.OPENAI_API_KEY?.trim()),
    limitMicros:Number.isFinite(dollars)&&dollars>0&&dollars<=1000?Math.floor(dollars*1e6):0,
    callLimit:Number.isInteger(callLimit)&&callLimit>0&&callLimit<=1000?callLimit:0,
    timeoutMs:Number.isInteger(requestedTimeout)&&requestedTimeout>=1000&&requestedTimeout<=180000?requestedTimeout:DEFAULT_TIMEOUT_MS,
    retryLimit:Number.isInteger(requestedRetryLimit)&&requestedRetryLimit>=0&&requestedRetryLimit<=1?requestedRetryLimit:1};
}
function assertReady(config) {
  if(!config.enabled)throw new LlmError('DISABLED','OpenAI calls are disabled.');
  if(!config.keyPresent)throw new LlmError('KEY_MISSING','Add your own OpenAI API key privately.');
  if(!SUPPORTED_MODELS.has(config.model))throw new LlmError('MODEL_UNSUPPORTED','This OpenAI model is not approved for the bounded drafting workflow.');
  if(!config.limitMicros||!config.callLimit)throw new LlmError('BUDGET_MISSING','Set an approved positive spending limit and request limit before enabling calls.');
}
function modelForPurpose(env={},purpose='seller_facts') {
  const key={seller_facts:'OPENAI_SELLER_FACTS_MODEL',organization_review:'OPENAI_ORGANIZATION_REVIEW_MODEL',icp_targeting:'OPENAI_ICP_TARGETING_MODEL'}[purpose];
  return String(key&&env[key]||env.OPENAI_MODEL||DEFAULT_MODEL).trim();
}
function estimatedUsage({bodyBytes,maxOutputTokens,model=DEFAULT_MODEL}) {
  const inputTokens=Math.ceil((bodyBytes+2048)/ESTIMATED_BYTES_PER_INPUT_TOKEN);
  const pricing=MODEL_PRICING_USD_PER_MILLION[model];
  if(!pricing)throw new LlmError('MODEL_UNSUPPORTED','No reviewed pricing is configured for this model.');
  const inputMicros=inputTokens*pricing.input,outputMicros=maxOutputTokens*pricing.output;
  return {inputTokens,maxOutputTokens,inputMicros,outputMicros,reserveMicros:Math.ceil(inputMicros+outputMicros)};
}
function actualUsage(payload={}) {
  const raw=payload.usage||{},inputTokens=Number(raw.prompt_tokens||0),outputTokens=Number(raw.completion_tokens||0);
  const cachedInputTokens=Math.min(inputTokens,Math.max(0,Number(raw.prompt_tokens_details?.cached_tokens||0)));
  const reasoningTokens=Math.min(outputTokens,Math.max(0,Number(raw.completion_tokens_details?.reasoning_tokens||0)));
  return {inputTokens,cachedInputTokens,outputTokens,reasoningTokens};
}
function actualCostUsd(usage,model=DEFAULT_MODEL) {
  const pricing=MODEL_PRICING_USD_PER_MILLION[model];
  if(!pricing)throw new LlmError('MODEL_UNSUPPORTED','No reviewed pricing is configured for this model.');
  const uncached=Math.max(0,usage.inputTokens-usage.cachedInputTokens);
  return Number(((uncached*pricing.input+usage.cachedInputTokens*pricing.cachedInput+usage.outputTokens*pricing.output)/1e6).toFixed(6));
}
function serializeRequestBody({model,messages,schema,name,maxOutputTokens,reasoningEffort}) {
  const request={model,messages,store:false,max_completion_tokens:maxOutputTokens,response_format:{type:'json_schema',json_schema:{name,strict:true,schema}}};
  if(/^gpt-5(?:\.|$)/i.test(model)){if(reasoningEffort)request.reasoning_effort=reasoningEffort;}else request.temperature=0;
  return JSON.stringify(request);
}
function createLlm({read,mutate,env=process.env,fetchImpl=fetch,now=()=>new Date().toISOString(),sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))}) {
  if(typeof read!=='function'||typeof mutate!=='function')throw new Error('A serialized persistent state adapter is required');
  const pending=new Map();
  async function generate({workspaceId,promptVersion,messages,schema,name='whynow_result',validate,maxOutputTokens=4096,model,reasoningEffort}) {
    const config={...settings(env),model:model||settings(env).model};assertReady(config);
    if(!promptVersion || typeof promptVersion!=='string' || promptVersion.length>100 || typeof validate!=='function' || !schema || !/^[a-zA-Z0-9_-]{1,64}$/.test(name))throw new LlmError('INVALID_INPUT','A versioned prompt, schema and local validator are required.');
    if(!Array.isArray(messages)||!messages.length||messages.length>20||messages.some(m=>!['system','user','assistant'].includes(m.role)||typeof m.content!=='string'))throw new LlmError('INVALID_INPUT','Use bounded text-only messages.');
    if(!Number.isInteger(maxOutputTokens)||maxOutputTokens<1||maxOutputTokens>8000)throw new LlmError('INVALID_INPUT','Output must be limited to 1–8000 tokens.');
    if(reasoningEffort!==undefined&&!['none','low','medium','high','xhigh'].includes(reasoningEffort))throw new LlmError('INVALID_INPUT','Use a supported bounded reasoning effort.');
    const body=serializeRequestBody({model:config.model,messages,schema,name,maxOutputTokens,reasoningEffort});
    const bytes=Buffer.byteLength(body);
    if(bytes>MAX_REQUEST_BYTES)throw new LlmError('INPUT_TOO_LARGE','Source excerpts exceed the AI request limit.');
    // Pricing is selected from the reviewed per-model table above. JSON and
    // receipt IDs tokenize more densely than prose, so use a conservative
    // three UTF-8 bytes per input token plus fixed overhead. Reserve that estimate
    // before EVERY attempt and never refund uncertain or failed requests.
    const {reserveMicros}=estimatedUsage({bodyBytes:bytes,maxOutputTokens,model:config.model});
    const key=createHash('sha256').update(JSON.stringify({promptVersion,body})).digest('hex');
    const pendingKey=`${workspaceId}:${key}`;
    const check=value=>{try {if(validate(structuredClone(value))!==true)throw Error();}catch {throw new LlmError('INVALID_OUTPUT','OpenAI output did not pass local validation.');}return value;};
    const workspace=getWorkspace(read(),workspaceId);
    if(workspace.status==='archived')throw new LlmError('ARCHIVED','Restore this workspace before using AI.');
    if(workspace.llmCache?.[key])return {value:check(structuredClone(workspace.llmCache[key].value)),cached:true,model:config.model,usage:null,costUsd:0};
    if(pending.has(pendingKey))return structuredClone(await pending.get(pendingKey));
    const operation=(async()=>{
      for(let attempt=0;attempt<=config.retryLimit;attempt++) {
        const month=now().slice(0,7);
        await mutate(state=>{
          const w=getWorkspace(state,workspaceId);
          if(w.status==='archived')throw new LlmError('ARCHIVED','Restore this workspace before using AI.');
          const usage=w.budgets.openai?.month===month?w.budgets.openai:{schemaVersion:1,month,calls:0,reservedMicros:0};
          const total=Object.values(state.workspaces).reduce((sum,item)=>{
            const saved=item.budgets.openai;
            if(saved?.month!==month)return sum;
            if(!Number.isSafeInteger(saved.reservedMicros)||saved.reservedMicros<0)throw new LlmError('INVALID_BUDGET','Saved AI usage is invalid; requests are blocked.');
            return sum+saved.reservedMicros;
          },0);
          if(!Number.isSafeInteger(total)||total<0||!Number.isSafeInteger(usage.calls)||usage.calls<0)throw new LlmError('INVALID_BUDGET','Saved AI usage is invalid; requests are blocked.');
          if(total+reserveMicros>config.limitMicros||usage.calls>=config.callLimit)throw new LlmError('BUDGET_EXHAUSTED','The AI spending or request limit has been reached.');
          return updateWorkspace(state,workspaceId,target=>{target.budgets.openai={...usage,calls:usage.calls+1,reservedMicros:usage.reservedMicros+reserveMicros};});
        });
        let response,payload;
        try {
          response=await fetchImpl(ENDPOINT,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json',Authorization:`Bearer ${env.OPENAI_API_KEY}`},body,signal:AbortSignal.timeout(config.timeoutMs)});
          // Never expose provider errors, response bodies or echoed credentials.
          if(!response.ok) {
            await response.body?.cancel();
            if((response.status===429||response.status>=500)&&attempt<config.retryLimit){await sleep(500);continue;}
            throw new LlmError('REQUEST_FAILED',`OpenAI request failed (HTTP ${response.status}). Check account access, billing and limits.`,{httpStatus:response.status});
          }
          const raw=await response.text();
          if(Buffer.byteLength(raw)>128000)throw new LlmError('INVALID_OUTPUT','OpenAI response exceeded the size limit.');
          payload=JSON.parse(raw);
        } catch(error) {
          if(error instanceof LlmError)throw error;
          throw new LlmError('REQUEST_FAILED','OpenAI request failed or timed out. No profile was approved.');
        }
        const choice=payload.choices?.[0];
        const usage=actualUsage(payload),costUsd=actualCostUsd(usage,config.model);
        if(choice?.message?.refusal)throw new LlmError('REFUSED','OpenAI declined this request. No profile was generated.',{usage,costUsd,finishReason:choice?.finish_reason});
        if(choice?.finish_reason!=='stop')throw new LlmError('INCOMPLETE','OpenAI returned incomplete output. No profile was generated.',{usage,costUsd,finishReason:choice?.finish_reason,incompleteReason:payload?.incomplete_details?.reason||choice?.incomplete_details?.reason||choice?.finish_reason});
        let value;try {value=JSON.parse(choice.message.content);}catch {throw new LlmError('INVALID_OUTPUT','OpenAI returned invalid JSON.',{usage,costUsd});}
        try{check(value);}catch(error){error.usage=usage;error.costUsd=costUsd;throw error;}
        await mutate(state=>updateWorkspace(state,workspaceId,w=>{
          if(w.status==='archived')throw new LlmError('ARCHIVED','The workspace was archived during the request.');
          w.llmCache={...(w.llmCache||{}),[key]:{schemaVersion:1,promptVersion,model:config.model,createdAt:now(),value}};
          while(Object.keys(w.llmCache).length>20)delete w.llmCache[Object.keys(w.llmCache)[0]];
        }));
        return {value:structuredClone(value),cached:false,model:config.model,usage,costUsd};
      }
    })();
    pending.set(pendingKey,operation);
    try{return structuredClone(await operation);}finally{pending.delete(pendingKey);}
  }
  return {generate};
}
module.exports={createLlm,settings,modelForPurpose,estimatedUsage,actualUsage,actualCostUsd,serializeRequestBody,LlmError,DEFAULT_MODEL,PROPOSED_STRONG_MODEL,SUPPORTED_MODELS,MODEL_PRICING_USD_PER_MILLION,DEFAULT_TIMEOUT_MS,MAX_REQUEST_BYTES,ESTIMATED_BYTES_PER_INPUT_TOKEN,ENDPOINT};
