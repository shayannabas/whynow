#!/usr/bin/env node
const path=require('node:path');
const {loadEnv}=require('./env.cjs');
const {PROPOSED_STRONG_MODEL}=require('./llm.cjs');

const MODELS_ENDPOINT='https://api.openai.com/v1/models';
async function checkModelAvailability({apiKey,model=PROPOSED_STRONG_MODEL,fetchImpl=fetch}={}) {
  if(!apiKey?.trim())return {checked:false,available:false,httpStatus:null,reason:'OPENAI_API_KEY is not configured.'};
  let response;
  try{response=await fetchImpl(MODELS_ENDPOINT,{method:'GET',redirect:'error',headers:{Authorization:`Bearer ${apiKey}`},signal:AbortSignal.timeout(15000)});}catch{return {checked:false,available:false,httpStatus:null,reason:'The read-only model-list request failed.'};}
  if(!response.ok){await response.body?.cancel();return {checked:true,available:false,httpStatus:response.status,reason:`The model-list request returned HTTP ${response.status}.`};}
  let payload;try{payload=await response.json();}catch{return {checked:true,available:false,httpStatus:response.status,reason:'The model-list response was invalid.'};}
  const ids=Array.isArray(payload.data)?payload.data.map(item=>item?.id).filter(Boolean):[],available=ids.includes(model),snapshots=ids.filter(id=>id.startsWith(`${model}-`)).sort().reverse(),fallbackOrder=['gpt-5.6-terra','gpt-5.6-luna','gpt-5.4','gpt-5.4-mini','gpt-4o-mini'],closestAvailable=available?model:snapshots[0]||fallbackOrder.find(id=>ids.includes(id))||null;
  return {checked:true,available,httpStatus:response.status,model,closestAvailable,reason:available?'The model ID is listed for this API key.':closestAvailable?`The requested model is not listed; the closest configured fallback is ${closestAvailable}.`:'The model ID is not listed for this API key and no configured fallback was found.'};
}
async function main(){loadEnv(path.resolve(__dirname,'../.env'));const result=await checkModelAvailability({apiKey:process.env.OPENAI_API_KEY,model:process.env.OPENAI_OUTREACH_MODEL||PROPOSED_STRONG_MODEL});process.stdout.write(`${JSON.stringify(result)}\n`);if(!result.checked)process.exitCode=2;else if(!result.available)process.exitCode=1;}
if(require.main===module)main().catch(()=>{process.stdout.write(`${JSON.stringify({checked:false,available:false,httpStatus:null,reason:'The read-only model check failed.'})}\n`);process.exitCode=2;});
module.exports={MODELS_ENDPOINT,checkModelAvailability};
