import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {defaultState,createWorkspace,updateWorkspace}=require('../scripts/server/state.cjs');
const {recordSource}=require('../scripts/sources.cjs');
const {buildEvidencePacket,buildFocusedSynthesisRequests,estimateFocusedSynthesisCost}=require('../scripts/onboarding/synthesize.cjs');
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
  expect(built.requests.organizationReview.messages[2].content).toContain('may not invent');
  expect(built.requests.icpTargeting.messages[2].content).toContain('Explicitly forbidden');
  expect(JSON.parse(built.requests.icpTargeting.messages[2].content.split('\n').at(-1)).resolveWorkedExample.segments.length).toBeGreaterThanOrEqual(3);
  const envelope={sellerProfile:null,icpConfig:null,customers:[],competitors:[],rejectedCompetitors:[]};
  expect(built.requests.organizationReview.decode(envelope)).toEqual({customers:[],competitors:[],rejectedCompetitors:[]});
  expect(()=>built.requests.organizationReview.decode({...envelope,icpConfig:{}})).toThrow('Invalid focused result envelope');
  const candidate=built.candidates.customers[0];expect(candidate).toMatchObject({name:'Acme',domain:'acme.com'});
  expect(built.requests.organizationReview.validate({customers:[{candidateId:candidate.id}],competitors:[],rejectedCompetitors:[]})).toBe(true);
  expect(()=>built.requests.organizationReview.validate({customers:[{candidateId:'invented'}],competitors:[]})).toThrow();
  for(const request of Object.values(built.requests)) {
    expect(request.messages.slice(0,2)).toEqual(built.requests.sellerFacts.messages.slice(0,2));
    expect(request.schema).toEqual(built.requests.sellerFacts.schema);
    expect(request.schemaName).toBe(built.requests.sellerFacts.schemaName);
    expect(request.maxOutputTokens).toBe(8000);
    expect(request.reasoningEffort).toBe('low');
    const metrics=measureStructuredOutputSchema(request.schema);
    expect(()=>assertStructuredOutputSchemaWithinLimits(request.schema),request.name).not.toThrow();
    expect(metrics.enumValues,request.name).toBeLessThanOrEqual(STRUCTURED_OUTPUT_LIMITS.enumValues);
    expect(metrics.objectProperties,request.name).toBeLessThanOrEqual(STRUCTURED_OUTPUT_LIMITS.objectProperties);
    expect(metrics.nestingLevels,request.name).toBeLessThanOrEqual(STRUCTURED_OUTPUT_LIMITS.nestingLevels);
    expect(metrics.schemaStringLength,request.name).toBeLessThanOrEqual(STRUCTURED_OUTPUT_LIMITS.schemaStringLength);
    for(const item of metrics.enums)if(item.values>STRUCTURED_OUTPUT_LIMITS.largeEnumThreshold)expect(item.stringLength,request.name).toBeLessThanOrEqual(STRUCTURED_OUTPUT_LIMITS.largeEnumStringLength);
  }
  const estimate=estimateFocusedSynthesisCost(state,id,{rawPages:raw,env:{OPENAI_MODEL:'gpt-5.5'}});expect(estimate.calls).toHaveLength(3);expect(estimate.calls.every(row=>row.model==='gpt-5.5'&&row.maxOutputTokens===8000&&row.reasoningEffort==='low')).toBe(true);expect(estimate.totalMaximumCostUsd).toBeGreaterThan(0);
});


it('trims supplemental story text before core pages and preserves exact candidate receipts and source coverage',()=>{
  let state=createWorkspace(defaultState(),{name:'Cedar Ledger'}),id=state.activeWorkspaceId;
  const paths=['/','/pricing','/about','/security','/vs/flint-labs',...Array.from({length:8},(_,i)=>'/customers/kelp-'+i)];
  const sources=[];
  for(const [i,path] of paths.entries()){
    const name='Kelp '+i,title=path.startsWith('/customers')?name+' uses Cedar Ledger':path.includes('/vs/')?'Cedar Ledger vs Flint Labs':'Cedar Ledger overview';
    const short=title+'. Cedar Ledger provides cloud planning for software operations teams.';
    const text=short+' '+Array.from({length:160},(_,j)=>`Customer ${name} uses Cedar Ledger with cloud engineering teams. The ${i}-${j} workflow helps customers plan recurring capacity and verify the resources used by their deployment.`).join(' ');
    const recorded=recordSource(state,{url:'https://cedarledger.example'+path,title,text,fetchedAt:'2026-11-17T00:00:00Z'});
    state=recorded.state;sources.push({sourceId:recorded.source.id,ownerDomain:'cedarledger.example'});
  }
  state=updateWorkspace(state,id,w=>{w.research={status:'evidence_ready',selectedCandidate:{name:'Cedar Ledger',domain:'cedarledger.example'},sources};});
  const built=buildFocusedSynthesisRequests(state,id,{rawPages:new Map(),env:{}}),full=buildEvidencePacket(state,state.workspaces[id]);
  const packet=JSON.parse(built.requests.sellerFacts.messages[1].content);
  const ids=new Set(packet.sources.flatMap(row=>row.receipts.map(r=>built.receiptIdMap.get(r.receiptId))));
  expect(built.evidence.trimmedReceiptCount).toBeGreaterThan(0);
  expect(packet.sources.every(source=>source.receipts.length>0)).toBe(true);
  expect(packet.sources.filter(source=>!source.url.includes('/customers/')).map(source=>source.receipts.length)).toEqual(
    full.sources.filter(source=>!source.url.includes('/customers/')).map(source=>source.receipts.length)
  );
  for(const candidate of [...built.candidates.customers,...built.candidates.competitors].filter(c=>c.receiptId))expect(ids.has(candidate.receiptId)).toBe(true);
  expect(estimateFocusedSynthesisCost(state,id,{rawPages:new Map(),env:{}}).calls.every(row=>row.estimatedInputTokens<=40000)).toBe(true);
});
