import {createRequire} from 'node:module';
import {describe,expect,it} from 'vitest';
const require=createRequire(import.meta.url);
const {defaultState}=require('../scripts/server/state.cjs');
const {loadResolveReferenceDemo,REFERENCE_WORKSPACE_ID}=require('../scripts/reference-demo.cjs');
const discovery=require('../scripts/company-discovery.cjs');
const universe=require('../scripts/discovery-universe.cjs');

function workspace(){return loadResolveReferenceDemo(defaultState(),{now:()=> '2026-10-20T00:00:00.000Z'}).workspaces[REFERENCE_WORKSPACE_ID];}

describe('Chunk 2 discovery core',()=>{
  it('loads SignalScout seeds as load-only workspace configuration, not runtime constants',()=>{
    const reference=universe.loadResolveDiscoveryReference(),current=workspace();
    expect(reference).toMatchObject({kind:'load_only_discovery_reference',sourceCommit:'130789f1bac1d5e11f5f5154f269155dc17f2d21'});
    expect(current.universeSeeds).toHaveLength(52);
    expect(new Set(current.universeSeeds.map(row=>row.segment))).toHaveLength(10);
    expect(current.universeSeeds.every(row=>row.sourceUrl===`https://${row.domain}`)).toBe(true);
  });

  it('builds a workspace-driven matrix with a hard 60-query ceiling',()=>{
    const tasks=discovery.buildDiscoveryTasks(workspace(),{maxQueries:60});
    expect(tasks).toHaveLength(60);expect(new Set(tasks.map(row=>row.segment))).toHaveLength(10);
    expect(tasks[0]).toMatchObject({segment:'crypto_fintech',kind:'matrix_1'});expect(tasks[0].query).toContain('Crypto / fintech');
  });

  it('keeps only official-looking, segment-supported search results',()=>{
    const task=discovery.buildDiscoveryTasks(workspace(),{maxQueries:1})[0];
    expect(discovery.candidateFromResult(task,{title:'Acme Exchange | Digital assets',url:'https://acme.exchange/about',snippet:'A cryptocurrency exchange and broker'})).toMatchObject({name:'Acme Exchange',domain:'acme.exchange',segment:'crypto_fintech',sourceKind:'serper_discovery'});
    expect(discovery.candidateFromResult(task,{title:'Top 10 crypto companies',url:'https://techcrunch.com/list',snippet:'Cryptocurrency exchange list'})).toBeNull();
    expect(discovery.candidateFromResult(task,{title:'Unrelated Holdings',url:'https://acme.exchange/about',snippet:'Cryptocurrency exchange list'})).toBeNull();
  });

  it('excludes the seller, customers, competitors and existing accounts before promotion',()=>{
    const current=workspace();current.sellerProfile.competitors=[{name:'PagerDuty',domain:'pagerduty.com',sourceUrl:'https://pagerduty.com'}];current.accounts.push({name:'Kraken',domain:'kraken.com'});
    const incoming=[
      {name:'Resolve AI',domain:'resolve.ai',segment:'data_ai_infrastructure',sourceUrl:'https://resolve.ai'},
      {name:'Coinbase',domain:'coinbase.com',segment:'crypto_fintech',sourceUrl:'https://coinbase.com'},
      {name:'Fireworks AI',domain:'fireworks.ai',segment:'data_ai_infrastructure',sourceUrl:'https://fireworks.ai'},
      {name:'PagerDuty',domain:'pagerduty.com',segment:'enterprise_platforms',sourceUrl:'https://pagerduty.com'},
      {name:'Kraken',domain:'kraken.com',segment:'crypto_fintech',sourceUrl:'https://kraken.com'},
      {name:'Gemini',domain:'gemini.com',segment:'crypto_fintech',sourceUrl:'https://gemini.com'},
    ];
    const result=discovery.selectBalancedCandidates(current,incoming,{limit:25});
    expect(result.selected.map(row=>row.name)).toEqual(['Gemini']);
    expect(result.rejected.map(row=>row.rejectionReason)).toEqual(expect.arrayContaining(['seller','customer','competitor','existing_account']));
  });

  it('selects a balanced 20–30 prospect set and saves receipted new accounts',()=>{
    const current=workspace(),pool=discovery.seedCandidates(current),selection=discovery.selectBalancedCandidates(current,pool,{limit:25});
    expect(selection.selected).toHaveLength(25);expect(new Set(selection.selected.map(row=>row.segment)).size).toBe(10);
    expect(selection.selected.some(row=>['Coinbase','Salesforce','Zscaler','Fireworks AI'].includes(row.name))).toBe(false);
    const state=loadResolveReferenceDemo(defaultState(),{now:()=> '2026-10-20T00:00:00.000Z'}),promoted=discovery.promoteDiscoveryCandidates(state,REFERENCE_WORKSPACE_ID,selection.selected,{now:()=> '2026-10-20T01:00:00.000Z',id:(()=>{let value=0;return()=>`acct_${++value}`;})()});
    expect(promoted.added).toHaveLength(25);expect(promoted.added.every(row=>row.status==='new'&&row.sourceUrl.startsWith('https://')&&row.tier==='parked')).toBe(true);
  });
});
