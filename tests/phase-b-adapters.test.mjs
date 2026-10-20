import {describe,expect,it} from 'vitest';
import {createRequire} from 'node:module';
import fs from 'node:fs';
const require=createRequire(import.meta.url);
const {collectHiring}=require('../scripts/collectors/hiring.cjs');
const {collectActivePain}=require('../scripts/collectors/active-pain.cjs');
const {collectSerperEvidence}=require('../scripts/collectors/search-evidence.cjs');
const {collectEdgarFormDUniverse}=require('../scripts/collectors/edgar-form-d.cjs');
const parity=JSON.parse(fs.readFileSync(new URL('./fixtures/parity/signalscout-phase-b.json',import.meta.url),'utf8'));
const fixture=id=>structuredClone(parity.cases.find(row=>row.id===id).input);

describe('guarded live adapters over recorded responses',()=>{
  it('runs a configured Greenhouse response through hiring normalization and receipts',async()=>{
    const target={id:'a1',name:'Acme',domain:'acme.example',ats:{provider:'greenhouse',slug:'acme'}},calls=[];
    const runtime={requestJson:async(url,source)=>{calls.push({url,source});return {value:{jobs:[{id:'j1',title:'Director of Site Reliability',content:'<p>Kubernetes, Datadog and PagerDuty.</p>',absolute_url:'https://jobs.example/j1',updated_at:'2026-10-19T00:00:00Z'}]}};}};
    const output=await collectHiring(target,{runtime,now:new Date('2026-10-20T00:00:00Z')});
    expect(calls).toHaveLength(1);expect(calls[0].source).toBe('greenhouse');expect(output.signals.map(row=>row.key)).toEqual(['observabilityScale','techStack']);expect(output.events[0].evidenceUrl).toBe('https://jobs.example/j1');
  });

  it('combines Statuspage, HN and dated Serper News responses while keeping zeros honest',async()=>{
    const target={id:'a1',name:'Acme',domain:'acme.example',statusPageUrl:'https://status.acme.example'},incident=fixture('statuspage-incident').incidents[0];
    const runtime={requestJson:async(url,source)=>{
      if(source==='statuspage'&&url.endsWith('/status.json'))return {value:{page:{id:'acme'}}};
      if(source==='statuspage')return {value:{incidents:[incident]}};
      if(source==='hn')return {value:{hits:[]}};
      throw new Error(`unexpected ${source}`);
    },requestText:async()=>{throw new Error('Google News RSS must not run.');}};
    const output=await collectActivePain(target,{runtime,now:new Date('2026-07-12T12:00:00Z'),strictFreshness:true,windowDays:30,slaConfig:{outage:30},searchResults:[{kind:'active_pain_news',title:'Acme API outage affected customers',snippet:'The Acme production platform was unavailable during a service incident.',url:'https://news.example/acme-incident',date:'1 day ago',sourceId:'serper'}]});
    expect(output.events).toHaveLength(2);expect(output.signals).toHaveLength(2);expect(output.events.every(row=>row.evidenceUrl)).toBe(true);
  });

  it('uses an injected, capped search adapter and filters unrelated results',async()=>{
    const queries=[];const output=await collectSerperEvidence({name:'Acme',domain:'acme.example'},{maxQueries:2,beforeQuery:descriptor=>queries.push(descriptor),search:async()=>[
      {title:'Acme engineering update',url:'https://acme.example/blog',snippet:'Acme runs Kubernetes.'},
      {title:'Other company update',url:'https://other.example/blog',snippet:'Nothing about the target.'},
    ]});
    expect(queries).toHaveLength(2);expect(output).toHaveLength(2);expect(output.every(row=>row.url==='https://acme.example/blog'&&row.sourceId==='serper')).toBe(true);
  });

  it('matches a recorded Form D to one watched account without promoting discovery candidates',async()=>{
    const daily=fixture('edgar-daily-index').text,details=fixture('edgar-filing-details').text,calls=[];
    const runtime={requestText:async(url,source)=>{calls.push(source);return {value:source==='edgar_index'?daily:details};},requestJson:async(_url,source)=>{calls.push(source);return {value:{hits:{hits:[]}}};}};
    const output=await collectEdgarFormDUniverse({targets:[{id:'a1',name:'Acme Systems Inc.'}],runtime,now:new Date('2026-07-13T00:00:00Z'),segments:{enterprise_platforms:{key:'enterprise_platforms',enabled:true,subIndustries:['enterprise']}},segmentQueries:{enterprise_platforms:'enterprise'},enabledSegments:['enterprise_platforms'],enabled:true});
    expect(output.eventsByTargetId.a1).toHaveLength(1);expect(output.eventsByTargetId.a1[0]).toMatchObject({type:'form_d_filing',sourceId:'sec_edgar',evidenceUrl:'https://www.sec.gov/Archives/edgar/data/1234567/0001234567-26-000001.txt'});expect(output.discoveryCandidates).toEqual([]);expect(calls.filter(row=>row==='edgar_index')).toHaveLength(3);
  });
});
