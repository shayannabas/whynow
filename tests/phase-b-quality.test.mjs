import {describe,expect,it} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),pain=require('../scripts/collectors/active-pain.cjs'),executive=require('../scripts/collectors/executive-change.cjs'),hiring=require('../scripts/collectors/hiring.cjs'),{evidenceBelongsToTarget}=require('../scripts/collectors/common.cjs'),{sanitizeWhyNow}=require('../scripts/phase-b-runner.cjs'),{collectorConfigForWorkspace,collectorTargetForAccount}=require('../scripts/phase-b-config.cjs'),{defaultState}=require('../scripts/server/state.cjs'),{loadResolveReferenceDemo}=require('../scripts/reference-demo.cjs');
const NOW=new Date('2026-10-20T12:00:00.000Z'),target={name:'Acme',domain:'acme.example'};

describe('Phase B demo-quality gates',()=>{
  it('rejects healthy status aggregators but accepts a dated in-window incident',()=>{
    const rows=[
      {title:'Acme down? Current outages and problems',snippet:'User reports show no current problems with Acme. Service is currently healthy.',url:'https://downdetector.com/status/acme/',date:'1 day ago',sourceId:'serper'},
      {title:'Acme outage affected checkout',snippet:'Customers could not use the Acme platform during a production service disruption.',url:'https://downdetector.com/status/acme/incident-1',date:'2 days ago',sourceId:'serper'},
    ];
    const output=pain.searchPainItems(target,rows,NOW,{}, {strictFreshness:true,windowDays:30,slaConfig:{outage:30}});
    expect(output.events).toHaveLength(1);expect(output.events[0]).toMatchObject({evidenceUrl:'https://downdetector.com/status/acme/incident-1',metadata:{eventDateReported:true},slaDays:30});
  });

  it('requires a reported date and configured-window freshness for search pain',()=>{
    const rows=[
      {title:'Acme outage',snippet:'Acme production platform service was unavailable to customers.',url:'https://acme.example/incidents/undated',sourceId:'serper'},
      {title:'Acme outage',snippet:'Acme production platform service was unavailable to customers.',url:'https://acme.example/incidents/old',date:'2026-08-01',sourceId:'serper'},
      {title:'Acme outage',snippet:'Acme production platform service was unavailable to customers.',url:'https://acme.example/incidents/current',date:'2026-10-19',sourceId:'serper'},
    ];
    const output=pain.searchPainItems(target,rows,NOW,{}, {strictFreshness:true,windowDays:30,slaConfig:{outage:30}});
    expect(output.events.map(row=>row.evidenceUrl)).toEqual(['https://acme.example/incidents/current']);
  });

  it('does not attribute a third-party incident to a seller-hosted content page',()=>{
    expect(pain.operationalPainEvidence({name:'Binance',domain:'binance.com'},{title:'MetaMask security incident affected its infrastructure',snippet:'MetaMask users saw a service disruption.',url:'https://www.binance.com/en/square/post/123'})).toBe(false);
    expect(pain.operationalPainEvidence({name:'Binance',domain:'binance.com'},{title:'Binance API outage affected customers',snippet:'The Binance production platform was unavailable.',url:'https://www.binance.com/en/support/incident/123'})).toBe(true);
    expect(pain.operationalPainEvidence({name:'Binance',domain:'binance.com'},{title:'Binance founder supports Bitget',snippet:'Binance co-founder offered help after the Bitget platform incident.',url:'https://news.example/bitget'})).toBe(false);
  });

  it('does not turn an undated executive article into a fresh trigger',()=>{
    const base={title:'Acme appoints Jane Doe as CTO',snippet:'Acme appoints Jane Doe as chief technology officer.',url:'https://news.example/acme-cto',sourceId:'serper'};
    expect(executive.executiveNewsEvents(target,[base],NOW,{exec_change:30})).toEqual([]);
    expect(executive.executiveNewsEvents(target,[{...base,date:'2 days ago'}],NOW,{exec_change:30})).toHaveLength(1);
  });

  it('dedupes evidence and moves stale or date-less triggers out of the active list',()=>{
    const account={...target,signals:{activePain:{key:'activePain',score:4,evidenceUrl:'https://downdetector.com/status/acme',evidenceText:'Acme has no current problems and is currently healthy.',observedAt:NOW.toISOString(),sourceId:'serper',metadata:{eventDateReported:false}}},triggers:[
      {id:'old-exec',type:'exec_change',evidenceUrl:'https://news.example/old',occurredAt:NOW.toISOString(),sourceId:'serper',metadata:{eventDateReported:false}},
      {id:'hire-1',type:'reliability_hiring',evidenceUrl:'https://jobs.example/acme/1',occurredAt:'2026-10-19T00:00:00Z',sourceId:'greenhouse'},
      {id:'hire-duplicate',type:'reliability_hiring',evidenceUrl:'https://jobs.example/acme/1?ref=copy',occurredAt:'2026-10-19T00:00:00Z',sourceId:'greenhouse'},
      {id:'old-outage',type:'outage_news',evidenceUrl:'https://news.example/august',occurredAt:'2026-08-01T00:00:00Z',sourceId:'serper',metadata:{eventDateReported:true}},
    ]};
    const clean=sanitizeWhyNow(account,{slaDays:{default:90,outage:30,reliability_hiring:90,exec_change:30}},NOW);
    expect(clean.signals).not.toHaveProperty('activePain');expect(clean.triggers.map(row=>row.id)).toEqual(['hire-duplicate']);expect(clean.triggerHistory).toHaveLength(3);
  });

  it('derives ATS slugs from configured entity aliases as well as name and domain',()=>{
    const state=loadResolveReferenceDemo(defaultState()),workspace=state.workspaces[state.activeWorkspaceId],config=collectorConfigForWorkspace(workspace),resolved=collectorTargetForAccount({name:'Uber Eats',domain:'ubereats.com',icpSegment:'delivery_marketplaces'},config);
    expect(hiring.slugCandidates(resolved)).toEqual(expect.arrayContaining(['ubereats','uber']));
  });

  it('accepts parent-company evidence for a configured division without renaming the account',()=>{
    const state=loadResolveReferenceDemo(defaultState()),workspace=state.workspaces[state.activeWorkspaceId],config=collectorConfigForWorkspace(workspace),target=collectorTargetForAccount({name:'Uber Eats',domain:'ubereats.com',icpSegment:'delivery_marketplaces'},config);
    expect(evidenceBelongsToTarget(target,{title:'Uber company profile',snippet:'Uber has more than 30,000 employees.',url:'https://companies.example/uber'})).toBe(true);
    expect(target).toMatchObject({name:'Uber Eats',domain:'ubereats.com'});
  });
});
