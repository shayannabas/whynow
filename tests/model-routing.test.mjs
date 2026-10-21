import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {modelForPurpose,estimatedUsage,PROPOSED_STRONG_MODEL}=require('../scripts/llm.cjs');
const {checkModelAvailability,MODELS_ENDPOINT}=require('../scripts/openai-model-check.cjs');

it('keeps focused calls on the default model until explicit configuration changes them',()=>{
  expect(modelForPurpose({},'seller_facts')).toBe('gpt-4o-mini');
  expect(modelForPurpose({OPENAI_MODEL:'gpt-4o-mini',OPENAI_ORGANIZATION_REVIEW_MODEL:PROPOSED_STRONG_MODEL},'organization_review')).toBe(PROPOSED_STRONG_MODEL);
  expect(modelForPurpose({OPENAI_ICP_TARGETING_MODEL:PROPOSED_STRONG_MODEL},'icp_targeting')).toBe(PROPOSED_STRONG_MODEL);
  expect(estimatedUsage({bodyBytes:100000,maxOutputTokens:2000,model:PROPOSED_STRONG_MODEL}).reserveMicros).toBeGreaterThan(estimatedUsage({bodyBytes:100000,maxOutputTokens:2000,model:'gpt-4o-mini'}).reserveMicros);
});

it('checks account model listing without making a generation request or exposing the key',async()=>{
  let seen;const result=await checkModelAvailability({apiKey:'private-test-key',fetchImpl:async(url,options)=>{seen={url,options};return new Response(JSON.stringify({data:[{id:PROPOSED_STRONG_MODEL}]}),{status:200});}});
  expect(result).toMatchObject({checked:true,available:true,httpStatus:200,model:PROPOSED_STRONG_MODEL});expect(seen.url).toBe(MODELS_ENDPOINT);expect(seen.options.method).toBe('GET');expect(JSON.stringify(result)).not.toContain('private-test-key');
});

it('reports a closest listed fallback without returning the model inventory',async()=>{
  const result=await checkModelAvailability({apiKey:'private-test-key',model:'gpt-5.5',fetchImpl:async()=>new Response(JSON.stringify({data:[{id:'gpt-5.4-mini'},{id:'unrelated-private-model'}]}),{status:200})});
  expect(result).toMatchObject({checked:true,available:false,model:'gpt-5.5',closestAvailable:'gpt-5.4-mini'});expect(JSON.stringify(result)).not.toContain('unrelated-private-model');
});
