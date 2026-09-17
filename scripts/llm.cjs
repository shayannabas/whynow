const {createHash}=require('node:crypto');
const {getWorkspace,updateWorkspace}=require('./server/state.cjs');

const ENDPOINT='https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL='gpt-4o-mini';
class LlmError extends Error {constructor(code,message){super(message);this.code=code;}}
function settings(env={}) {
  const model=env.OPENAI_MODEL||DEFAULT_MODEL;
  const dollars=Number(env.OPENAI_MONTHLY_LIMIT_USD||0);
  const callLimit=Number(env.OPENAI_WORKSPACE_MONTHLY_CALL_LIMIT||100);
  return {model,enabled:env.OPENAI_ENABLED==='true',keyPresent:Boolean(env.OPENAI_API_KEY?.trim()),
    limitMicros:Number.isFinite(dollars)&&dollars>0&&dollars<=1000?Math.floor(dollars*1e6):0,
    callLimit:Number.isInteger(callLimit)&&callLimit>0&&callLimit<=1000?callLimit:0};
}
function assertReady(config) {
  if(!config.enabled)throw new LlmError('DISABLED','OpenAI calls are disabled.');
  if(!config.keyPresent)throw new LlmError('KEY_MISSING','Add your own OpenAI API key privately.');
  if(![DEFAULT_MODEL,'gpt-4o-mini-2024-07-18'].includes(config.model))throw new LlmError('MODEL_UNSUPPORTED','This integration is configured for GPT-4o mini only; review pricing before changing models.');
  if(!config.limitMicros||!config.callLimit)throw new LlmError('BUDGET_MISSING','Set an approved positive spending limit and request limit before enabling calls.');
}
function createLlm({read,mutate,env=process.env,fetchImpl=fetch,now=()=>new Date().toISOString(),sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))}) {
  if(typeof read!=='function'||typeof mutate!=='function')throw new Error('A serialized persistent state adapter is required');
  const pending=new Map();
  async function generate({workspaceId,promptVersion,messages,schema,name='whynow_result',validate,maxOutputTokens=4096}) {
    const config=settings(env);assertReady(config);
    if(!promptVersion || typeof promptVersion!=='string' || promptVersion.length>100 || typeof validate!=='function' || !schema || !/^[a-zA-Z0-9_-]{1,64}$/.test(name))throw new LlmError('INVALID_INPUT','A versioned prompt, schema and local validator are required.');
    if(!Array.isArray(messages)||!messages.length||messages.length>20||messages.some(m=>!['system','user','assistant'].includes(m.role)||typeof m.content!=='string'))throw new LlmError('INVALID_INPUT','Use bounded text-only messages.');
    if(!Number.isInteger(maxOutputTokens)||maxOutputTokens<1||maxOutputTokens>4096)throw new LlmError('INVALID_INPUT','Output must be limited to 1–4096 tokens.');
    const body=JSON.stringify({model:config.model,messages,store:false,max_completion_tokens:maxOutputTokens,
      response_format:{type:'json_schema',json_schema:{name,strict:true,schema}}});
    const bytes=Buffer.byteLength(body);
    if(bytes>48000)throw new LlmError('INPUT_TOO_LARGE','Source excerpts exceed the AI request limit.');
    // Standard mini pricing: $0.15 / 1M input, $0.60 / 1M output tokens.
    // UTF-8 request bytes + overhead overestimate text tokens. Reserve this full
    // upper bound before EVERY attempt; never refund uncertain/failed requests.
    // It intentionally overcounts usage, rather than risk spending after a crash.
    const reserveMicros=Math.ceil((bytes+2048)*0.15+maxOutputTokens*0.60);
    const key=createHash('sha256').update(JSON.stringify({promptVersion,body})).digest('hex');
    const pendingKey=`${workspaceId}:${key}`;
    const check=value=>{try {if(validate(structuredClone(value))!==true)throw Error();}catch {throw new LlmError('INVALID_OUTPUT','OpenAI output did not pass local validation.');}return value;};
    const workspace=getWorkspace(read(),workspaceId);
    if(workspace.status==='archived')throw new LlmError('ARCHIVED','Restore this workspace before using AI.');
    if(workspace.llmCache?.[key])return {value:check(structuredClone(workspace.llmCache[key].value)),cached:true,model:config.model};
    if(pending.has(pendingKey))return structuredClone(await pending.get(pendingKey));
    const operation=(async()=>{
      for(let attempt=0;attempt<2;attempt++) {
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
          response=await fetchImpl(ENDPOINT,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json',Authorization:`Bearer ${env.OPENAI_API_KEY}`},body,signal:AbortSignal.timeout(20000)});
          // Never expose provider errors, response bodies or echoed credentials.
          if(!response.ok) {
            await response.body?.cancel();
            if((response.status===429||response.status>=500)&&attempt===0){await sleep(500);continue;}
            throw new LlmError('REQUEST_FAILED',`OpenAI request failed (HTTP ${response.status}). Check account access, billing and limits.`);
          }
          const raw=await response.text();
          if(Buffer.byteLength(raw)>128000)throw new LlmError('INVALID_OUTPUT','OpenAI response exceeded the size limit.');
          payload=JSON.parse(raw);
        } catch(error) {
          if(error instanceof LlmError)throw error;
          throw new LlmError('REQUEST_FAILED','OpenAI request failed or timed out. No profile was approved.');
        }
        const choice=payload.choices?.[0];
        if(choice?.message?.refusal)throw new LlmError('REFUSED','OpenAI declined this request. No profile was generated.');
        if(choice?.finish_reason!=='stop')throw new LlmError('INCOMPLETE','OpenAI returned incomplete output. No profile was generated.');
        let value;try {value=JSON.parse(choice.message.content);}catch {throw new LlmError('INVALID_OUTPUT','OpenAI returned invalid JSON.');}
        check(value);
        await mutate(state=>updateWorkspace(state,workspaceId,w=>{
          if(w.status==='archived')throw new LlmError('ARCHIVED','The workspace was archived during the request.');
          w.llmCache={...(w.llmCache||{}),[key]:{schemaVersion:1,promptVersion,model:config.model,createdAt:now(),value}};
          while(Object.keys(w.llmCache).length>20)delete w.llmCache[Object.keys(w.llmCache)[0]];
        }));
        return {value:structuredClone(value),cached:false,model:config.model};
      }
    })();
    pending.set(pendingKey,operation);
    try{return structuredClone(await operation);}finally{pending.delete(pendingKey);}
  }
  return {generate};
}
module.exports={createLlm,settings,LlmError,DEFAULT_MODEL,ENDPOINT};
