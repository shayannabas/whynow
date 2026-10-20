import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {defaultState,createWorkspace,updateWorkspace}=require('../scripts/server/state.cjs');
const {recordSource}=require('../scripts/sources.cjs');
const {buildFocusedSynthesisRequests}=require('../scripts/onboarding/synthesize.cjs');
const {PROPOSED_STRONG_MODEL}=require('../scripts/llm.cjs');
const {STRUCTURED_OUTPUT_LIMITS,measureStructuredOutputSchema,assertStructuredOutputSchemaWithinLimits}=require('../scripts/openai-schema.cjs');

it('builds three bounded focused requests and keeps organization output limited to deterministic candidate IDs',()=>{
  let state=createWorkspace(defaultState(),{name:'Example Seller'}),id=state.activeWorkspaceId;
  const source=recordSource(state,{url:'https://example.com/customers/acme',title:'How Acme uses Example Seller',text:'How Acme uses Example Seller. Acme uses Example Seller for production work. Example Seller is workflow software for enterprises.',fetchedAt:'2026-10-20T00:00:00.000Z'});state=source.state;
  state=updateWorkspace(state,id,w=>{w.research={schemaVersion:1,status:'evidence_ready',revision:1,runId:'run',selectedCandidate:{name:'Example Seller',domain:'example.com'},sources:[{sourceId:source.source.id,kind:'seller_customer_page',ownerDomain:'example.com'}]};});
  const raw=new Map([['https://example.com/customers/acme',{url:'https://example.com/customers/acme',text:'<html><title>How Acme uses Example Seller</title><h1>How Acme uses Example Seller</h1><a href="https://acme.com/">Acme</a></html>'}]]);
  const built=buildFocusedSynthesisRequests(state,id,{rawPages:raw,env:{OPENAI_MODEL:'gpt-4o-mini',OPENAI_ORGANIZATION_REVIEW_MODEL:PROPOSED_STRONG_MODEL,OPENAI_ICP_TARGETING_MODEL:PROPOSED_STRONG_MODEL}});
  expect(Object.keys(built.requests)).toEqual(['sellerFacts','organizationReview','icpTargeting']);
  expect(built.requests.sellerFacts.model).toBe('gpt-4o-mini');expect(built.requests.organizationReview.model).toBe(PROPOSED_STRONG_MODEL);expect(built.requests.icpTargeting.model).toBe(PROPOSED_STRONG_MODEL);
  expect(built.requests.organizationReview.messages[0].content).toContain('may not invent');
  expect(built.requests.icpTargeting.messages[0].content).toContain('Explicitly forbidden');
  expect(JSON.parse(built.requests.icpTargeting.messages[1].content).resolveWorkedExample.segments.length).toBeGreaterThanOrEqual(3);
  const candidate=built.candidates.customers[0];expect(candidate).toMatchObject({name:'Acme',domain:'acme.com'});
  expect(built.requests.organizationReview.validate({customers:[{candidateId:candidate.id}],competitors:[]})).toBe(true);
  expect(()=>built.requests.organizationReview.validate({customers:[{candidateId:'invented'}],competitors:[]})).toThrow();
  for(const request of Object.values(built.requests)) {
    const metrics=measureStructuredOutputSchema(request.schema);
    expect(()=>assertStructuredOutputSchemaWithinLimits(request.schema),request.name).not.toThrow();
    expect(metrics.enumValues,request.name).toBeLessThanOrEqual(STRUCTURED_OUTPUT_LIMITS.enumValues);
    expect(metrics.objectProperties,request.name).toBeLessThanOrEqual(STRUCTURED_OUTPUT_LIMITS.objectProperties);
    expect(metrics.nestingLevels,request.name).toBeLessThanOrEqual(STRUCTURED_OUTPUT_LIMITS.nestingLevels);
    expect(metrics.schemaStringLength,request.name).toBeLessThanOrEqual(STRUCTURED_OUTPUT_LIMITS.schemaStringLength);
    for(const item of metrics.enums)if(item.values>STRUCTURED_OUTPUT_LIMITS.largeEnumThreshold)expect(item.stringLength,request.name).toBeLessThanOrEqual(STRUCTURED_OUTPUT_LIMITS.largeEnumStringLength);
  }
});
