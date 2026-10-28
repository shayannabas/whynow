import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {evaluateKills}=require('../scripts/kills.cjs');
const {applyDecisioning}=require('../scripts/decisioning.cjs');
const {internalToolEvidence}=require('../scripts/kill-evidence.cjs');
const config={seller:{name:'Seller'},adjacentVendorCategories:['observability platform','incident management'],killPrecedence:['KILL_SELLER_OR_COMPETITOR','KILL_BUILD_CULTURE','KILL_SOLVING_IN_HOUSE'],killPatterns:{buildCulture:['built.*internal observability'],solvingInHouse:['developed.*internal.*debugging']}};
it('requires the same prospect-owned engineering receipt to establish internal tooling',()=>{
  const a={name:'Example',domain:'example.com'},receipt={evidenceUrl:'https://example.com/engineering/internal-tools',evidenceText:'We built our internal observability system for our on-call engineers.'};
  expect(internalToolEvidence(a,receipt)).toBe(true);
  const kills=evaluateKills({...a,killHints:[{...receipt,code:'KILL_BUILD_CULTURE'}]},config);expect(kills).toHaveLength(1);expect(kills[0].reason).toContain('Example');expect(kills[0].evidenceText).toBe(receipt.evidenceText);
  const solving={evidenceUrl:receipt.evidenceUrl,evidenceText:'Example developed an internal AI debugging tool for its own production incidents.'};expect(evaluateKills({...a,killHints:[{...solving,code:'KILL_SOLVING_IN_HOUSE'}]},config)[0].code).toBe('KILL_SOLVING_IN_HOUSE');
  for(const url of ['https://docs.example.com/observability','https://example.com/products/observability','https://example.com/events/2023/talk','https://www.youtube.com/watch?v=abc','https://thirdparty.com/engineering'])expect(internalToolEvidence(a,{...receipt,evidenceUrl:url})).toBe(false);
  expect(internalToolEvidence(a,{...receipt,evidenceText:'We built our observability platform for our customers.'})).toBe(false);
});
it('rejects the three real weak kill receipts and never joins an ungrounded hypothesis to an unrelated URL',()=>{
  const rows=[['Databricks','databricks.com','https://docs.databricks.com/aws/en/lakehouse-architecture/deployment-guide/observability','Databricks provides built-in observability capabilities to monitor platform operations.'],['Atlassian','atlassian.com','https://www.youtube.com/watch?v=okSBofcpY58','How Atlassian built a smarter observability system with Grafana.'],['Grafana Labs','grafana.com','https://grafana.com/events/observabilitycon/2023/integration-ai-and-ml-in-oss-observability/','Learn about Grafana Labs approach to leveraging AI/ML across its products.']];
  for(const [name,domain,url,text] of rows)expect(evaluateKills({name,domain,killHints:[{code:'KILL_BUILD_CULTURE',evidenceUrl:url,evidenceText:text}],hypothesis:{whyNow:`${name} built its own internal observability platform`,citations:[{url,text:'Engineering evidence.'}]}},config)).toEqual([]);
});
it('classifies a receipted category vendor separately, without killing an ordinary buyer that uses the product',()=>{
  const row={sourceId:'greenhouse',evidenceUrl:'https://job-boards.greenhouse.io/grafanalabs/jobs/6101637004',evidenceText:'Grafana Labs is the company behind Grafana Cloud, the fully managed observability platform trusted by more than 10,000 organizations.'};
  const account={name:'Grafana Labs',domain:'grafana.com',triggers:[row]},kills=evaluateKills(account,config);expect(kills[0]).toMatchObject({code:'KILL_SELLER_OR_COMPETITOR',evidenceText:row.evidenceText});expect(kills[0].reason).toContain('Grafana Labs is an adjacent observability platform vendor');
  expect(evaluateKills({name:'Buyer',domain:'buyer.com',triggers:[{...row,evidenceText:'Buyer uses the Grafana observability platform.'}]},config)).toEqual([]);
});
it('retains retired kill decisions as history while removing them from active kills and priority suppression',()=>{
  const previous={code:'KILL_BUILD_CULTURE',reason:'Old weak decision',evidenceUrl:'https://example.com/products',evidenceText:'Product marketing.'},next=applyDecisioning({name:'Example',domain:'example.com',tier:1,fitScore:50,kills:[previous],killStatus:'killed'},config,new Date('2026-10-27T00:00:00Z'));
  expect(next.kills).toEqual([]);expect(next.killStatus).toBeNull();expect(next.killHistory[0]).toMatchObject({...previous,status:'retired'});expect(next.priority).toBeGreaterThan(0);
});
