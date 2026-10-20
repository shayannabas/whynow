import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {loadReferenceProfile,validateReferenceProfile,SIGNAL_KEYS}=require('../scripts/onboarding/reference-profile.cjs');

it('loads a frozen, load-only Resolve reference without seller facts or runtime state',()=>{
  const reference=loadReferenceProfile();
  expect(reference).toMatchObject({schemaVersion:1,referenceProfileVersion:'resolve-ai-v3-phase-b',id:'resolve-ai',kind:'load_only_reference',loadOnly:true,seller:{name:'Resolve AI',domain:'resolve.ai'}});
  expect(reference.sellerProfile).toBeUndefined();
  expect(reference.status).toBeUndefined();
  expect(reference.provenance.customerEvidenceStatus).toBe('requires_live_research');
  expect(Object.isFrozen(reference)).toBe(true);
  expect(Object.isFrozen(reference.icpConfig.segments)).toBe(true);
  expect(Reflect.set(reference.seller,'name','Changed')).toBe(false);
  expect(loadReferenceProfile().seller.name).toBe('Resolve AI');
});

it('matches the reference implementation constants and keeps unsupported fields empty',()=>{
  const reference=loadReferenceProfile(),config=reference.icpConfig;
  expect(config.segments).toHaveLength(10);
  expect(config.segments.every(segment=>segment.queryTemplates.length===4)).toBe(true);
  expect(config.personas.buyerTitles).toEqual(['CTO','SVP Engineering','VP Engineering']);
  expect(config.weights).toEqual({techStack:1.3,activePain:1.2,revenueSensitivity:1.1,observabilityScale:1,aiCompatibility:0.9,competitiveWedge:0.8});
  expect(config.killPatterns.sizeMetric).toEqual({label:'minEngineeringHeadcount',floor:200});
  expect(config.killPatterns.solvingInHousePatterns).toHaveLength(1);
  expect(config.killPatterns.buildCulturePatterns).toHaveLength(3);
  expect(reference.provenance.movedRuntimeConstants.every(row=>row.sourceFile&&row.sourceLines)).toBe(true);
  expect(config.tierRules.tier1).toEqual({revenue:500000000,employees:2000,valuation:5000000000});
  expect(config.pitch).toEqual({receiptOpenerStyle:'',oneSentenceProduct:'',credentialLine:'',ctaStyle:''});
  expect(config.objectionTemplates).toEqual([]);
  expect(Object.keys(config.collectorRules.edgarSegmentQueries)).toEqual(config.segments.map(row=>row.key));
  expect(config.collectorRules.transactionalUrgency.transactionGoneSegments).toContain('sports_betting');
  expect(SIGNAL_KEYS.every(key=>Object.hasOwn(config.signalDefinitions,key))).toBe(true);
});

it('allows only customer names present in the reference constants and rejects runtime use',()=>{
  const reference=structuredClone(loadReferenceProfile());
  const customers=new Set(reference.provenance.referenceCustomerNames);
  expect(reference.icpConfig.segments.flatMap(segment=>segment.wedgeCustomers).every(name=>customers.has(name))).toBe(true);
  const unknown=structuredClone(reference);unknown.icpConfig.segments[0].wedgeCustomers.push('Vercel');
  expect(()=>validateReferenceProfile(unknown)).toThrow('segment');
  const runtime=structuredClone(reference);runtime.status='active';
  expect(()=>validateReferenceProfile(runtime)).toThrow('runtime workspace state');
  const enabled=structuredClone(reference);enabled.loadOnly=false;
  expect(()=>validateReferenceProfile(enabled)).toThrow('header');
});
