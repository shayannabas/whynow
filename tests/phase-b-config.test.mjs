import {describe,expect,it} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {loadResolveReferenceDemo}=require('../scripts/reference-demo.cjs');
const {defaultState}=require('../scripts/server/state.cjs');
const {collectorConfigForWorkspace,collectorTargetForAccount}=require('../scripts/phase-b-config.cjs');
const {phaseBQueryPlan}=require('../scripts/collectors/search-evidence.cjs');
const {collectFirmographics}=require('../scripts/collectors/firmographics.cjs');

describe('workspace-owned Phase B configuration',()=>{
  it('loads Resolve collector rules from the frozen workspace instead of collector constants',()=>{
    const state=loadResolveReferenceDemo(defaultState()),workspace=state.workspaces[state.activeWorkspaceId];
    const config=collectorConfigForWorkspace(workspace);
    expect(config.configSource).toBe('frozen_reference');
    expect(config.customerNames).toContain('Coinbase');
    expect(config.customerSourceUrl).toBe('https://resolve.ai/customers');
    expect(config.transactionalUrgency.transactionGoneSegments).toContain('crypto_fintech');
    expect(config.edgarSegmentQueries.crypto_fintech).toContain('crypto OR fintech');
    expect(config.personas.buyerTitles).toContain('CTO');
  });

  it('attaches the active workspace segment and personas to a collector target',()=>{
    const state=loadResolveReferenceDemo(defaultState()),workspace=state.workspaces[state.activeWorkspaceId],config=collectorConfigForWorkspace(workspace);
    const target=collectorTargetForAccount({id:'a1',name:'Acme',domain:'acme.example',icpSegment:'cybersecurity'},config);
    expect(target.segmentConfig.label).toBe('Cybersecurity platforms');
    expect(target.buyerTitles).toEqual(config.personas.buyerTitles);
    expect(target.competitors).toEqual(config.competitors);
  });

  it('uses the parent company for division sizing while keeping the division visible',async()=>{
    const state=loadResolveReferenceDemo(defaultState()),workspace=state.workspaces[state.activeWorkspaceId],config=collectorConfigForWorkspace(workspace);
    const target=collectorTargetForAccount({id:'uber-eats',name:'Uber Eats',domain:'ubereats.com',icpSegment:'delivery_marketplaces'},config),plan=phaseBQueryPlan(target);
    expect(target).toMatchObject({name:'Uber Eats',domain:'ubereats.com',firmographicTarget:{name:'Uber',domain:'uber.com',parentOf:'Uber Eats'}});
    expect(plan.find(row=>row.kind==='active_pain_news').query).toContain('"Uber Eats"');
    expect(plan.find(row=>row.kind==='firmographics_size').query).toContain('"Uber"');
    const runtime={requestJson:async()=>({value:{search:[]}})},result=await collectFirmographics(target,{runtime,now:new Date('2026-10-20T00:00:00Z'),searchResults:[{kind:'firmographics_size',title:'Uber company profile',url:'https://example.org/uber',snippet:'Uber has 30,000 employees.'}]});
    expect(result.targetPatch).toMatchObject({firmographics:{employeeCount:30000},firmographicEntity:{name:'Uber',domain:'uber.com',parentOf:'Uber Eats'}});
    expect(target).toMatchObject({name:'Uber Eats',domain:'ubereats.com'});
  });

  it('keeps two approved workspace configurations isolated',()=>{
    const state=loadResolveReferenceDemo(defaultState()),base=state.workspaces[state.activeWorkspaceId];
    const other=structuredClone(base);other.id='other';other.name='Other';other.referenceDemo=undefined;other.status='active';other.sellerProfile={...other.sellerProfile,approvedAt:'2026-10-20T00:00:00Z',sellerName:'Other Seller',customers:[{name:'Different Customer'}],competitors:[{name:'Rival'}]};other.icpConfig.exclusions.existingCustomers=['Different Customer'];other.icpConfig.exclusions.competitors=[{name:'Rival'}];other.icpConfig.collectorRules.customerSourceUrl='https://other.example/customers';
    const config=collectorConfigForWorkspace(other);
    expect(config.customerNames).toEqual(['Different Customer']);
    expect(config.competitors.map(row=>row.name)).toEqual(['Rival']);
    expect(config.customerSourceUrl).toBe('https://other.example/customers');
  });
});
