import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const require=createRequire(import.meta.url);
const {defaultState,createWorkspace,updateWorkspace}=require('../scripts/server/state.cjs');
const {recordSource}=require('../scripts/sources.cjs');
const {buildSynthesisRequest}=require('../scripts/onboarding/synthesize.cjs');
const {SIGNAL_KEYS,saveGeneratedProfile}=require('../scripts/onboarding/validate.cjs');
const {approveManualProfile,LABELS}=require('../scripts/onboarding/manual-profile.cjs');
const {loadReferenceProfile}=require('../scripts/onboarding/reference-profile.cjs');

const directory=path.join(path.dirname(fileURLToPath(import.meta.url)),'fixtures','onboarding');
const fixtures=fs.readdirSync(directory).filter(file=>file.endsWith('.json')).sort().map(file=>JSON.parse(fs.readFileSync(path.join(directory,file),'utf8')));
const START='2026-09-17T12:00:00.000Z';

function recordedFact(value,sourceIds,valueKey='value') {
  if(!value)return {[valueKey]:'',sourceId:'',evidenceQuote:''};
  return {[valueKey]:value[valueKey]??value.value,sourceId:sourceIds.get(value.sourceUrl),evidenceQuote:value.evidenceQuote};
}

function recordedOutput(fixture,sourceIds) {
  const facts=fixture.sellerFacts;
  const segments=fixture.strategy.segments.map(label=>({
    label,
    subIndustries:[],
    queryTemplates:[`${label} companies`,`${label} customer stories`,`${label} funding`,`${label} hiring`],
    revenueSensitivityBase:3,
    wedgeCustomers:fixture.seller.name==='Resolve AI'?['DoorDash']:[],
    exampleTargets:[]
  }));
  const signalDefinitions=Object.fromEntries(SIGNAL_KEYS.map(key=>[key,{
    label:LABELS[key],
    description:`Review verified ${LABELS[key].toLowerCase()} evidence.`,
    evidenceKeywords:[],
    negativeKeywords:[],
    preferredSources:['Official company pages'],
    rubric:{1:'No verified relevant evidence',3:'Some verified relevant evidence',5:'Strong verified relevant evidence'}
  }]));
  return {
    sellerProfile:{
      category:recordedFact(facts.category,sourceIds),
      productOneLiner:recordedFact(facts.productOneLiner,sourceIds),
      pricingModel:recordedFact(facts.pricingModel,sourceIds),
      targetCompanySize:recordedFact(facts.targetCompanySize,sourceIds),
      valueProps:facts.valueProps.map(item=>recordedFact(item,sourceIds)),
      proofPoints:facts.proofPoints.map(item=>recordedFact(item,sourceIds,'claim')),
      credentials:facts.credentials.map(item=>recordedFact(item,sourceIds)),
      targetIndustries:facts.targetIndustries.map(item=>recordedFact(item,sourceIds)),
      customers:facts.customers.map(item=>({name:item.name,domain:item.domain,sourceId:sourceIds.get(item.sourceUrl),evidenceQuote:item.evidenceQuote})),
      competitors:facts.competitors.map(item=>({name:item.name,domain:item.domain,sourceId:sourceIds.get(item.sourceUrl),evidenceQuote:item.evidenceQuote}))
    },
    icpConfig:{
      segments,
      personas:{buyerTitles:fixture.strategy.buyerTitles,championTitles:fixture.strategy.championTitles,wrongOrgTitles:fixture.strategy.wrongOrgTitles},
      signalDefinitions,
      triggerMapping:{pain_event:[],buying_intent:[],function_roles:fixture.strategy.championTitles,tech_adoption:[],competitor_names:[]},
      killPatterns:{solvingInHouse:[],buildCulture:[],sizeMetric:{label:'employees',floor:0}},
      painSources:{statuspage:false,hn:false,news:true,filings:false},
      pitch:{receiptOpenerStyle:'Open with a verified event.',oneSentenceProduct:facts.productOneLiner.value,credentialLine:'Use only a verified credential.',ctaStyle:'Ask permission for a brief conversation.'},
      objectionTemplates:['Ask a clarifying question.','Use a relevant verified receipt.','Offer a small next step.']
    }
  };
}

function prepare(fixture) {
  let state=createWorkspace(defaultState(),{name:fixture.seller.name}),id=state.activeWorkspaceId;
  const sourceIds=new Map(),sourceRows=[];
  for(const source of fixture.sources) {
    const saved=recordSource(state,{...source,fetchedAt:START});
    state=saved.state;sourceIds.set(source.url,saved.source.id);
    sourceRows.push({schemaVersion:1,sourceId:saved.source.id,url:saved.source.url,title:saved.source.title,fetchedAt:START,kind:'seller_site',ownerDomain:fixture.seller.domain,chars:saved.source.text.length,bytes:Buffer.byteLength(saved.source.text)});
  }
  const completedAt=START;
  state=updateWorkspace(state,id,workspace=>{
    const candidate={id:`fixture-${fixture.seller.domain}`,name:fixture.seller.name,domain:fixture.seller.domain,website:fixture.seller.website,sourceUrl:fixture.seller.website};
    workspace.onboarding={schemaVersion:1,status:'selected',name:fixture.seller.name,candidates:[candidate],selectedCandidate:candidate};
    workspace.research={schemaVersion:1,companyName:fixture.seller.name,status:'evidence_ready',revision:4,runId:`fixture-${fixture.seller.domain}`,selectedCandidate:candidate,
      startedAt:START,completedAt,sources:sourceRows,usage:{queriesReserved:0,pagesAttempted:sourceRows.length,pagesSaved:sourceRows.length,storedChars:sourceRows.reduce((sum,row)=>sum+row.chars,0),storedBytes:sourceRows.reduce((sum,row)=>sum+row.bytes,0)},
      steps:[{key:'identify',status:'complete'},{key:'research',status:'complete'},{key:'draft',status:'not_started'},{key:'review',status:'not_started'}]};
  });
  return {state,id,sourceIds};
}

it('runs three unrelated recorded sellers through research, grounded drafting, review and approval without provider calls',()=>{
  expect(fixtures.map(item=>item.seller.name)).toEqual(['Resolve AI','Shopify','Vercel']);
  const completed=new Map();
  for(const fixture of fixtures) {
    const prepared=prepare(fixture),built=buildSynthesisRequest(prepared.state,prepared.id);
    let next=saveGeneratedProfile(prepared.state,prepared.id,{output:recordedOutput(fixture,prepared.sourceIds),...built.guard,model:'recorded-fixture',promptVersion:'recorded-fixture-v1',now:()=>new Date(Date.parse(START)+1000).toISOString()});
    let workspace=next.workspaces[prepared.id];
    expect(workspace.status).toBe('needs_review');
    expect(workspace.research.synthesis.report.receiptCoverage).toBeGreaterThanOrEqual(0.9);
    expect(workspace.research.synthesis.report.warnings).toEqual([]);
    expect(workspace.sellerProfile.sources.length).toBeGreaterThan(0);
    next=approveManualProfile(next,prepared.id,{revision:workspace.profileRevision,acknowledged:true,now:()=>new Date(Date.parse(START)+2000).toISOString()});
    workspace=next.workspaces[prepared.id];
    expect(workspace).toMatchObject({status:'active',deliveryMode:'demo',sellerProfile:{deliveryAllowed:false},research:{status:'approved'}});
    expect(next.auditLog.map(item=>item.type)).toEqual(['seller_profile_generated','seller_profile_approved']);
    completed.set(fixture.seller.name,workspace);
  }

  const reference=loadReferenceProfile(),resolve=completed.get('Resolve AI');
  const referenceLabels=new Set(reference.icpConfig.segments.map(segment=>segment.label));
  expect(resolve.icpConfig.segments.filter(segment=>referenceLabels.has(segment.label))).toHaveLength(3);
  expect(resolve.icpConfig.personas.buyerTitles.filter(title=>reference.icpConfig.personas.buyerTitles.includes(title))).toHaveLength(2);
  expect(resolve.icpConfig.personas.championTitles.filter(title=>reference.icpConfig.personas.championTitles.includes(title))).toHaveLength(2);
});
