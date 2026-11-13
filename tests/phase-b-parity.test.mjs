import {afterEach,describe,expect,it,vi} from 'vitest';
import {createRequire} from 'node:module';
import fs from 'node:fs';
const require=createRequire(import.meta.url);
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/parity/reference-phase-b.json',import.meta.url),'utf8'));
const hiring=require('../scripts/collectors/hiring.cjs');
const pain=require('../scripts/collectors/active-pain.cjs');
const search=require('../scripts/collectors/search-evidence.cjs');
const executive=require('../scripts/collectors/executive-change.cjs');
const edgar=require('../scripts/collectors/edgar-form-d.cjs');
const culture=require('../scripts/collectors/tech-culture.cjs');
const ai=require('../scripts/collectors/ai-compatibility.cjs');
const wedge=require('../scripts/collectors/competitive-wedge.cjs');
const revenue=require('../scripts/collectors/revenue-sensitivity.cjs');
const {DEFAULT_BUDGETS}=require('../scripts/collectors/runtime.cjs');
const {loadReferenceProfile}=require('../scripts/onboarding/reference-profile.cjs');

const reference=loadReferenceProfile(),icp=reference.icpConfig;
const collectorConfig={
  sellerLabel:icp.exclusions.sellerLabel,
  customerNames:icp.exclusions.existingCustomers,
  customerSourceUrl:icp.collectorRules.customerSourceUrl,
  customerSourceId:icp.collectorRules.customerSourceId,
  segments:Object.fromEntries(icp.segments.map(row=>[row.key,row])),
  transactionalUrgency:icp.collectorRules.transactionalUrgency,
};
const byId=id=>fixture.cases.find(row=>row.id===id);

function run(row){
  const input=structuredClone(row.input),now=input.now?new Date(input.now):undefined;
  if(row.id.endsWith('-normalization'))return hiring.normalizeJobs(input.provider,input.payload);
  if(row.id==='hiring-signals')return hiring.jobSignals(input.target,input.provider,input.jobs,now);
  if(row.id==='hiring-velocity')return hiring.atsVelocityEvents(input.target,input.provider,input.jobs,now);
  if(row.id==='statuspage-incident')return pain.statuspageItems(input.target,input.incidents,input.apiUrl,now);
  if(row.id==='google-news-rss')return pain.googleNewsRssItems(input.target,input.xml,now);
  if(row.id==='serper-query-plan')return search.serperQueries(input.target);
  if(row.id==='executive-appointment')return executive.executiveNewsEvents(input.target,input.results,now);
  if(row.id==='executive-departure')return executive.executiveDepartureEvents(input.target,input.results,now);
  if(row.id==='edgar-daily-index')return edgar.parseDailyIndex(input.text);
  if(row.id==='edgar-filing-details')return edgar.parseFilingDetails(input.text);
  if(row.id==='edgar-form-d-event')return edgar.formDEvent(input.filing,input.details);
  if(row.id==='tech-culture')return culture.analyzeDocuments(input.documents,now);
  if(row.id==='ai-compatibility')return ai.analyzeAiEvidence(input.documents);
  if(row.id==='competitive-wedge'){
    const verified=wedge.extractVerifiedCustomers(input.html,collectorConfig.customerNames);
    return {verified,diff:wedge.customerDiff(['Coinbase','Toast'],verified),signal:wedge.mapWedge(input.target,verified,input.observedAt,collectorConfig)};
  }
  if(row.id.startsWith('revenue-sensitivity-'))return revenue.classifyRevenueSensitivity(input.target,{...input.context,now:new Date(input.context.now),collectorConfig});
  throw new Error(`Unhandled parity case: ${row.id}`);
}

afterEach(()=>vi.useRealTimers());

describe('Reference Phase B frozen pure-output parity',()=>{
  for(const row of fixture.cases){
    it(`matches ${row.id}`,()=>{
      if(row.id==='tech-culture'||row.id==='ai-compatibility'){
        vi.useFakeTimers();
        vi.setSystemTime((row.output.signals||row.output)[0].observedAt);
      }
      if(row.id.endsWith('-normalization')){
        const actual=run(row);expect(actual.map(({publishedAt,publicationDateSource,department,...rest})=>rest)).toEqual(row.output);
        expect(actual.every(job=>Object.hasOwn(job,'publishedAt')&&Object.hasOwn(job,'department'))).toBe(true);
      }else if(['hiring-signals','hiring-velocity'].includes(row.id)){
        // Legacy captures have update dates only. They no longer establish current hiring.
        const actual=run(row);expect(row.id==='hiring-signals'?actual.events:actual).toEqual([]);
      }else if(row.id==='executive-departure'){
        // Owner-directed bug fix: retain the source capture, but correct only its SLA metadata.
        const actual=run(row),strip=items=>items.map(({slaDays,slaKey,decaysAt,...rest})=>rest);
        expect(strip(actual)).toEqual(strip(row.output));expect(actual.every(t=>t.slaDays===30&&t.slaKey==='exec_change')).toBe(true);
        for(const t of actual)expect(t.decaysAt).toBe(new Date(Date.parse(t.occurredAt)+30*86400000).toISOString());
      }else expect(run(row)).toEqual(row.output);
    });
  }

  it('matches the in-scope Reference source budgets behind WhyNow guards',()=>{
    for(const [source,budget] of Object.entries(fixture.sourceBudgets)){
      const local=DEFAULT_BUDGETS[source==='resolve_customers'?'seller_customers':source];
      expect(local,source).toMatchObject({limit:budget.maxRequestsPerRun,minIntervalMs:budget.minIntervalMs,ttlMs:budget.cacheTtlMs,timeoutMs:budget.timeoutMs});
    }
    expect(DEFAULT_BUDGETS).not.toHaveProperty('github');
    expect(DEFAULT_BUDGETS).not.toHaveProperty('edgar_risk_filing');
  });

  it('records immutable parity provenance',()=>{
    expect(fixture.source).toEqual({product:'Reference',repository:'local-reference',commit:'130789f1bac1d5e11f5f5154f269155dc17f2d21'});
    expect(new Set(fixture.cases.map(row=>row.id)).size).toBe(fixture.cases.length);
    expect(byId('competitive-wedge').output.signal.sourceId).toBe('resolve_customers');
  });
});
