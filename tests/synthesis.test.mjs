import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {defaultState,createWorkspace,updateWorkspace}=require('../scripts/server/state.cjs');
const {recordSource}=require('../scripts/sources.cjs');
const {createLlm}=require('../scripts/llm.cjs');
const {WEIGHTS,SLAS}=require('../scripts/onboarding/manual-profile.cjs');
const {PROMPT_VERSION,SYNTHESIS_SCHEMA,buildEvidencePacket,buildSynthesisRequest,generateSynthesis}=require('../scripts/onboarding/synthesize.cjs');
const {SIGNAL_KEYS,MAX_EVIDENCE_PACKET_BYTES,assertSynthesisOutput,materializeGeneratedDraft,receiptIdFor,saveGeneratedProfile}=require('../scripts/onboarding/validate.cjs');

const NOW='2026-09-17T12:00:00.000Z';
const SELLER_TEXT='Fixture Seller is workflow automation software for enterprise teams. It automates workflows for software companies. Customer Alpha uses Fixture Seller. Rival Corp is listed as an alternative. Certified secure.';
function segment(label) {
  return {label,subIndustries:[`${label} software`],queryTemplates:[`${label} companies`,`${label} directory`,`${label} funding`,`${label} hiring`],revenueSensitivityBase:3,wedgeCustomers:['Customer Alpha'],exampleTargets:[]};
}
function output(sourceId) {
  const fact=(value,evidenceQuote)=>({value,receiptId:value?receiptIdFor(sourceId,evidenceQuote):''});
  return {sellerProfile:{
    category:fact('Workflow automation','Fixture Seller is workflow automation software for enterprise teams.'),
    productOneLiner:fact('Automates workflows for software companies','It automates workflows for software companies.'),
    pricingModel:fact('',''),
    targetCompanySize:fact('Enterprise teams','Fixture Seller is workflow automation software for enterprise teams.'),
    valueProps:[fact('Workflow automation','It automates workflows for software companies.')],
    proofPoints:[{claim:'Customer Alpha uses the product',receiptId:receiptIdFor(sourceId,'Customer Alpha uses Fixture Seller.')}],
    credentials:[fact('Certified secure','Certified secure.')],
    targetIndustries:[fact('Software companies','It automates workflows for software companies.')],
    customers:[{name:'Customer Alpha',domain:'customer-alpha.com',receiptId:receiptIdFor(sourceId,'Customer Alpha uses Fixture Seller.')}],
    competitors:[{name:'Rival Corp',domain:'rival.example.com',receiptId:receiptIdFor(sourceId,'Rival Corp is listed as an alternative.')}]
  },icpConfig:{
    segments:[segment('Platform teams'),segment('Operations teams'),segment('Software teams')],
    personas:{buyerTitles:['VP Operations'],championTitles:['Operations Manager'],wrongOrgTitles:['Intern']},
    signalDefinitions:Object.fromEntries(SIGNAL_KEYS.map(key=>[key,{label:`${key} fit`,description:`Review ${key} evidence.`,evidenceKeywords:[key],negativeKeywords:[],preferredSources:['company site'],rubric:{1:'No relevant evidence',3:'Some relevant evidence',5:'Strong relevant evidence'}}])),
    triggerMapping:{pain_event:['workflow delay'],buying_intent:['operations hiring'],function_roles:['operations'],tech_adoption:['automation'],competitor_names:['Rival Corp']},
    killPatterns:{solvingInHouse:['built internally'],buildCulture:['build everything'],sizeMetric:{label:'employees',floor:100}},
    painSources:{statuspage:false,hn:false,news:true,filings:false},
    pitch:{receiptOpenerStyle:'Start with a verified event.',oneSentenceProduct:'This model text must not override the grounded profile.',credentialLine:'Use a verified credential.',ctaStyle:'Ask permission.'},
    objectionTemplates:['Ask a clarifying question.','Use a verified proof point.','Offer a small next step.']
  }};
}
function fixture() {
  let state=createWorkspace(defaultState(),{name:'Fixture Seller'});const id=state.activeWorkspaceId;
  let saved=recordSource(state,{url:'https://example.org/product',title:'Product',text:SELLER_TEXT,fetchedAt:NOW});state=saved.state;const sellerSourceId=saved.source.id;
  saved=recordSource(state,{url:'https://news.example.net/article',title:'Article',text:'Customer Mirage says it uses Fixture Seller. Rival Mirage is an alternative.',fetchedAt:NOW});state=saved.state;const thirdPartySourceId=saved.source.id;
  saved=recordSource(state,{url:'https://unrelated.example.net/private',title:'Unrelated',text:'Hidden unrelated claim.',fetchedAt:NOW});state=saved.state;const unrelatedSourceId=saved.source.id;
  state=updateWorkspace(state,id,w=>{w.research={schemaVersion:1,companyName:'Fixture Seller',status:'evidence_ready',revision:4,runId:'research-run-1',selectedCandidate:{id:'fixture',name:'Fixture Seller',domain:'example.org',website:'https://example.org'},sources:[
    {schemaVersion:1,sourceId:thirdPartySourceId,url:'https://news.example.net/article',title:'Article',fetchedAt:NOW,kind:'third_party',ownerDomain:'news.example.net',chars:70},
    {schemaVersion:1,sourceId:sellerSourceId,url:'https://example.org/product',title:'Product',fetchedAt:NOW,kind:'seller_site',ownerDomain:'example.org',chars:SELLER_TEXT.length}
  ],steps:[{key:'identify',status:'complete'},{key:'research',status:'complete'},{key:'draft',status:'pending'},{key:'review',status:'pending'}]};});
  return {state,id,sellerSourceId,thirdPartySourceId,unrelatedSourceId};
}

it('builds a stable bounded packet from only this workspace research source set',()=>{
  const f=fixture(),workspace=f.state.workspaces[f.id],packet=buildEvidencePacket(f.state,workspace);
  expect(packet.sourceIds).toEqual([...packet.sourceIds].sort());
  expect(packet.serialized).toContain('Fixture Seller is workflow automation software for enterprise teams.');expect(packet.serialized).not.toContain('Hidden unrelated claim');
  expect(Buffer.byteLength(packet.serialized)).toBeLessThanOrEqual(MAX_EVIDENCE_PACKET_BYTES);
  const built=buildSynthesisRequest(f.state,f.id),user=JSON.parse(built.request.messages[1].content);
  expect(built.request).toMatchObject({workspaceId:f.id,promptVersion:PROMPT_VERSION,name:'whynow_seller_profile',maxOutputTokens:4096});
  expect(built.request.schema).not.toBe(SYNTHESIS_SCHEMA);
  expect(built.request.schema.$defs.receiptId.enum).toEqual(['',...packet.receiptIds]);
  expect(built.request.schema.$defs.requiredReceiptId.enum).toEqual(packet.receiptIds);
  expect(user.evidence.sources.every(source=>source.receipts.every(receipt=>receipt.text.length<=200))).toBe(true);
  expect(user.company).toEqual({name:'Fixture Seller',domain:'example.org'});
  expect(built.guard).toMatchObject({expectedResearchRevision:4,expectedRunId:'research-run-1',expectedProfileRevision:0,expectedSourceSetHash:packet.sourceSetHash});
  const reversed=structuredClone(f.state);reversed.workspaces[f.id].research.sources.reverse();
  expect(buildEvidencePacket(reversed,reversed.workspaces[f.id]).serialized).toBe(packet.serialized);
});

it('enforces the strict generated schema and semantic cardinality',()=>{
  const f=fixture(),valid=output(f.sellerSourceId);expect(assertSynthesisOutput(valid)).toBe(true);
  for(const mutate of [
    value=>{value.extra=true;},
    value=>{value.sellerProfile.category.receiptId='x'.repeat(41);},
    value=>{value.sellerProfile.category={value:'',receiptId:''};},
    value=>{value.sellerProfile.targetIndustries=[];},
    value=>{value.sellerProfile.targetIndustries[0].receiptId='';},
    value=>{value.icpConfig.segments=value.icpConfig.segments.slice(0,2);},
    value=>{value.icpConfig.segments[0].queryTemplates=['one','two','three'];},
    value=>{value.icpConfig.segments[0].queryTemplates=['same','same','same','same'];},
    value=>{value.icpConfig.segments[0].revenueSensitivityBase=6;}
  ]) {const bad=structuredClone(valid);mutate(bad);expect(()=>assertSynthesisOutput(bad)).toThrow();}
});

it('derives URLs and exact quotes from receipt IDs and marks out-of-run receipts inferred',()=>{
  const f=fixture(),raw=output(f.sellerSourceId);raw.sellerProfile.category={value:'Unsupported category',receiptId:receiptIdFor(f.unrelatedSourceId,'Hidden unrelated claim.')};
  raw.sellerProfile.valueProps.push({...raw.sellerProfile.valueProps[0]});
  raw.icpConfig.personas.buyerTitles.push('VP Operations');
  const {profile,config,report}=materializeGeneratedDraft(f.state,f.state.workspaces[f.id],raw,{now:()=>NOW});
  expect(profile.evidence.productOneLiner).toMatchObject({sourceUrl:'https://example.org/product',sourceId:f.sellerSourceId,inferred:false,verification:'matched_saved_quote'});
  expect(profile.evidence.category).toMatchObject({sourceUrl:null,sourceId:null,inferred:true,verification:'receipt_not_in_research'});
  expect(profile.valueProps).toEqual(['Workflow automation']);expect(config.personas.buyerTitles).toEqual(['VP Operations']);
  expect(config.pitch.oneSentenceProduct).toBe(profile.productOneLiner);
  expect(config.weights).toEqual(WEIGHTS);expect(config.slaDays).toEqual(SLAS);expect(config.defaultsReviewRequired).toBe(true);
  expect(report.warnings).toContainEqual(expect.objectContaining({value:'Unsupported category'}));
});

it('drops unsupported customers and competitors while keeping receipted seller-site claims',()=>{
  const f=fixture(),raw=output(f.sellerSourceId);
  raw.sellerProfile.customers.push({name:'Customer Mirage',domain:'customer-mirage.com',receiptId:receiptIdFor(f.thirdPartySourceId,'Customer Mirage says it uses Fixture Seller.')});
  raw.sellerProfile.customers.push({name:'Unknown Customer',domain:'unknown.example.com',receiptId:receiptIdFor(f.sellerSourceId,'a paraphrase that is not present')});
  raw.sellerProfile.competitors.push({name:'Rival Mirage',domain:'rival-mirage.com',receiptId:receiptIdFor(f.thirdPartySourceId,'paraphrase absent')});
  const {profile,report}=materializeGeneratedDraft(f.state,f.state.workspaces[f.id],raw,{now:()=>NOW});
  expect(profile.customers.map(item=>item.name)).toEqual(['Customer Alpha']);
  expect(profile.competitors.map(item=>item.name)).toEqual(['Rival Corp']);
  expect(report.droppedCustomers.map(item=>item.name)).toEqual(['Customer Mirage','Unknown Customer']);
  expect(report.droppedCompetitors.map(item=>item.name)).toEqual(['Rival Mirage']);
  expect(report.receiptCoverage).toBe(report.receiptedClaims/report.attemptedClaims);
  expect(report.receiptCoverage).toBeLessThan(1);
});

it('accepts an external customer claim only from trusted customer-owned first-party metadata',()=>{
  const f=fixture();let state=f.state;
  const saved=recordSource(state,{url:'https://customer-beta.com/press',title:'Customer release',text:'Customer Beta uses Fixture Seller.',fetchedAt:NOW});state=saved.state;
  state=updateWorkspace(state,f.id,w=>{w.research.sources.push({schemaVersion:1,sourceId:saved.source.id,kind:'customer_press_release',ownerDomain:'customer-beta.com'});});
  const raw=output(f.sellerSourceId);raw.sellerProfile.customers.push({name:'Customer Beta',domain:'customer-beta.com',receiptId:receiptIdFor(saved.source.id,'Customer Beta uses Fixture Seller.')});
  const {profile}=materializeGeneratedDraft(state,state.workspaces[f.id],raw,{now:()=>NOW});
  expect(profile.customers.map(item=>item.name)).toEqual(['Customer Alpha','Customer Beta']);
});

it('atomically hands a generated draft to manual review without approving or changing another workspace',()=>{
  const f=fixture();let state=createWorkspace(f.state,{name:'Other workspace'}),other=state.activeWorkspaceId;
  state={...state,activeWorkspaceId:f.id};const untouched=structuredClone(state.workspaces[other]);
  const built=buildSynthesisRequest(state,f.id);
  const next=saveGeneratedProfile(state,f.id,{output:output(f.sellerSourceId),...built.guard,model:'fixture-model',promptVersion:PROMPT_VERSION,now:()=>NOW});
  const workspace=next.workspaces[f.id];
  expect(workspace).toMatchObject({status:'needs_review',deliveryMode:'demo',profileRevision:1,sellerProfile:{approvedAt:null,deliveryAllowed:false},research:{status:'review_required',revision:5,synthesis:{model:'fixture-model',promptVersion:PROMPT_VERSION}}});
  expect(workspace.research.steps.map(step=>step.status)).toEqual(['complete','complete','complete','pending']);
  expect(next.workspaces[other]).toEqual(untouched);
  expect(next.auditLog).toContainEqual(expect.objectContaining({workspaceId:f.id,type:'seller_profile_generated',profileRevision:1}));
});

it('rejects stale, archived and approved workspaces before generated output can overwrite them',()=>{
  const f=fixture(),built=buildSynthesisRequest(f.state,f.id),args={output:output(f.sellerSourceId),...built.guard};
  const stale=structuredClone(f.state);stale.workspaces[f.id].research.revision++;
  expect(()=>saveGeneratedProfile(stale,f.id,args)).toThrow('Research changed');
  const archived=structuredClone(f.state);archived.workspaces[f.id].status='archived';
  expect(()=>saveGeneratedProfile(archived,f.id,args)).toThrow('Restore');
  const active=structuredClone(f.state);active.workspaces[f.id].status='active';
  expect(()=>saveGeneratedProfile(active,f.id,args)).toThrow('refresh diff');
  expect(f.state.workspaces[f.id].sellerProfile.category).toBeUndefined();
});

it('uses an injected LLM interface and performs no network access in synthesis tests',async()=>{
  const f=fixture(),raw=output(f.sellerSourceId);let calls=0,seen;
  const result=await generateSynthesis({state:f.state,workspaceId:f.id,llm:{generate:async request=>{calls++;seen=request;return {value:raw,cached:false,model:'fixture-model'};}}});
  expect(calls).toBe(1);expect(seen.validate(raw)).toBe(true);expect(seen.messages[0].content).toContain('only the EVIDENCE');
  expect(seen.messages[0].content).toContain('at least 90%');
  expect(seen.messages[0].content).toContain('Keep those arrays empty unless');
  expect(result).toMatchObject({output:raw,cached:false,model:'fixture-model',promptVersion:PROMPT_VERSION,guard:{expectedResearchRevision:4}});
});

it('keeps OpenAI disabled when a key exists but the explicit enable switch is off',async()=>{
  const f=fixture();let state=f.state,fetchCalls=0;
  const llm=createLlm({read:()=>structuredClone(state),mutate:async fn=>{state=fn(state);return structuredClone(state);},env:{OPENAI_API_KEY:'test-placeholder',OPENAI_ENABLED:'false',OPENAI_MONTHLY_LIMIT_USD:'1'},fetchImpl:async()=>{fetchCalls++;throw new Error('Network must not run');}});
  await expect(generateSynthesis({state,workspaceId:f.id,llm})).rejects.toMatchObject({code:'DISABLED'});
  expect(fetchCalls).toBe(0);expect(state.workspaces[f.id].sellerProfile.category).toBeUndefined();expect(state.workspaces[f.id].budgets.openai).toBeUndefined();
});
