import {it,expect} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {scoreOrganizationCandidates,scoreDraft}=require('../scripts/onboarding/research-quality-eval.cjs');
const fixtureDir=path.join(path.dirname(fileURLToPath(import.meta.url)),'fixtures','eval');
const files=['resolve-ai-expected.json','shopify-expected.json','vercel-expected.json'];
const fixtures=files.map(file=>JSON.parse(fs.readFileSync(path.join(fixtureDir,file),'utf8')));

it('keeps independently documented answer-key proposals unconfirmed and sourced',()=>{
  for(const fixture of fixtures){
    expect(fixture.methodology).toContain('manually reading');expect(fixture.methodology).toContain('not run or reused');
    for(const row of [...fixture.customers,...fixture.competitors,...fixture.buyerTitles,...fixture.championTitles,fixture.sizeMetric]){
      expect(row.labeledBy).toBe('unconfirmed');expect(row.sourceUrl).toMatch(/^https:\/\//);expect(row.evidenceQuote.trim()).not.toBe('');expect(row.foundBy.trim()).not.toBe('');
    }
    for(const customer of fixture.customers){expect(customer.domainStatus).toBe(customer.domain?'verified':'domain_missing');}
  }
});

it('scores only confirmed expectations by default and labels proposal comparisons provisional',()=>{
  const fixture=structuredClone(fixtures[2]),candidates={customers:[{name:'Rogo',domain:'rogo.ai'}],competitors:[{name:'Cloudflare',domain:''}]};
  const confirmed=scoreOrganizationCandidates(candidates,fixture);expect(confirmed.mode).toBe('confirmed_only');expect(confirmed.customerRecall.total).toBe(0);expect(confirmed.customerRecall.ratio).toBeNull();
  const provisional=scoreOrganizationCandidates(candidates,fixture,{includeUnconfirmed:true});expect(provisional.mode).toBe('provisional_unconfirmed');expect(provisional.customerRecall).toMatchObject({matched:1,total:3});expect(provisional.competitorRecall).toMatchObject({matched:1,total:3});
  fixture.customers[0].labeledBy='Shayan';expect(scoreOrganizationCandidates(candidates,fixture).customerRecall).toMatchObject({matched:1,total:1,ratio:1});
});

it('reports persona, size and blocking-warning metrics without silently repairing a draft',()=>{
  const fixture=structuredClone(fixtures[2]);for(const key of ['customers','competitors','buyerTitles','championTitles'])for(const row of fixture[key])row.labeledBy='Shayan';fixture.sizeMetric.labeledBy='Shayan';
  const draft={sellerProfile:{customers:[{name:'Rogo',domain:'rogo.ai'}],competitors:[],targetCompanySize:'50+ employees',evidence:{}},icpConfig:{segments:[],personas:{buyerTitles:['CTO'],championTitles:['Platform Engineer']},killPatterns:{solvingInHouse:[],buildCulture:[],sizeMetric:{label:'Employees',floor:50}},triggerMapping:{pain_event:[],buying_intent:[]}}};
  const score=scoreDraft(draft,fixture);expect(score.customerRecall).toMatchObject({matched:1,total:3});expect(score.buyerPersonaMatch.matched).toBe(1);expect(score.championPersonaMatch.matched).toBe(1);expect(score.sizeSanity).toMatchObject({measurable:true,nonNegativeInteger:true,expectedMatch:true});expect(score.blockingWarningCount).toBeGreaterThan(0);
});
