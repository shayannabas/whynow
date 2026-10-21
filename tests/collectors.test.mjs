import {it,expect,afterEach} from 'vitest';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {CollectorRuntime,DEFAULT_BUDGETS,assertPublicHttpsUrl,isPublicAddress,officialSecDataEndpoint}=require('../scripts/collectors/runtime.cjs');
const {recordSource,quoteIsGrounded,getSource}=require('../scripts/sources.cjs');
const {defaultState}=require('../scripts/server/state.cjs');
const {signal,stripHtml,evidenceBelongsToTarget}=require('../scripts/collectors/common.cjs');
const {search,searchNews}=require('../scripts/serper.cjs');
const {phaseBQueryPlan}=require('../scripts/collectors/search-evidence.cjs');
const dirs=[];
afterEach(()=>{for(const dir of dirs.splice(0))fs.rmSync(dir,{recursive:true,force:true});});
const lookup=async()=>[{address:'93.184.215.14',family:4}];
const response=(text,status=200,headers={})=>({status,headers:new Headers({'content-type':'text/html',...headers}),text:async()=>text});
function harness(options={}) {
  const cacheDir=fs.mkdtempSync(path.join(os.tmpdir(),'whynow-collector-'));dirs.push(cacheDir);
  let time=Date.parse('2026-09-16T00:00:00Z');const calls=[],sleeps=[];
  const runtime=new CollectorRuntime({cacheDir,lookup,env:{CRAWLER_CONTACT_EMAIL:'crawler@example.org'},now:()=>time,sleep:async ms=>{sleeps.push(ms);time+=ms;},fetch:async(url,opts)=>{calls.push({url,opts});return response(url.endsWith('/robots.txt')?'User-agent: *\nAllow: /':'<title>Example</title><p>Public evidence.</p>');},...options});
  return {runtime,calls,sleeps,advance:ms=>{time+=ms;}};
}
it('refuses missing contact identity before any request',async()=>{
  const h=harness({env:{}});await expect(h.runtime.request('seller_site','https://example.org')).rejects.toMatchObject({code:'CONTACT_REQUIRED'});expect(h.calls).toHaveLength(0);
});
it('rejects private, encoded, mixed DNS, credentials, non-HTTPS and reserved destinations',async()=>{
  for(const url of ['http://example.org','https://127.1','https://2130706433','https://0x7f000001','https://[::1]','https://[::ffff:127.0.0.1]','https://169.254.169.254','https://user:pass@example.org','https://example.org:8443','https://localhost'])await expect(assertPublicHttpsUrl(url,{lookup})).rejects.toThrow();
  await expect(assertPublicHttpsUrl('https://example.org',{lookup:async()=>[{address:'93.184.215.14',family:4},{address:'10.0.0.1',family:4}]})).rejects.toMatchObject({code:'UNSAFE_URL'});
  expect(isPublicAddress('100.64.0.1')).toBe(false);expect(isPublicAddress('2001:db8::1')).toBe(false);
  expect((await assertPublicHttpsUrl('https://example.org',{lookup})).addresses[0].address).toBe('93.184.215.14');
});
it('sends identity, pins approved addresses, caches hits and refreshes expired entries',async()=>{
  const h=harness();const a=await h.runtime.request('seller_site','https://example.org/page');
  expect(a.fromCache).toBe(false);expect(h.calls[1].opts.headers['User-Agent']).toBe('WhyNow/0.1 (+mailto:crawler@example.org)');
  expect(h.calls[1].opts.addresses[0].address).toBe('93.184.215.14');
  expect((await h.runtime.request('seller_site','https://example.org/page')).fromCache).toBe(true);expect(h.calls).toHaveLength(2);
  h.advance(DEFAULT_BUDGETS.seller_site.ttlMs+1);await h.runtime.request('seller_site','https://example.org/page');expect(h.calls).toHaveLength(4);
});
it('denies robots restrictions and fails closed on robots errors',async()=>{
  for(const robots of [response('User-agent: *\nDisallow: /private'),response('unavailable',503),response('denied',403)]){
    let pages=0;const h=harness({fetch:async url=>url.endsWith('/robots.txt')?robots:(pages++,response('page'))});
    await expect(h.runtime.request('seller_site','https://example.org/private')).rejects.toThrow();expect(pages).toBe(0);
  }
});
it('honors robots crawl delay and permits a missing robots file',async()=>{
  const h=harness({fetch:async url=>response(url.endsWith('/robots.txt')?'User-agent: *\nCrawl-delay: 2':'page')});
  await h.runtime.request('seller_site','https://example.org/page');expect(h.sleeps).toContain(2000);
  const missing=harness({fetch:async url=>url.endsWith('/robots.txt')?response('',404):response('page')});
  expect((await missing.runtime.request('seller_site','https://example.org')).status).toBe(200);
});
it('enforces budgets with concurrent calls and does not charge cached pages',async()=>{
  const h=harness({budgets:{...DEFAULT_BUDGETS,seller_site:{...DEFAULT_BUDGETS.seller_site,limit:1}}});
  const results=await Promise.allSettled([h.runtime.request('seller_site','https://example.org/a'),h.runtime.request('seller_site','https://example.org/b')]);
  expect(results.map(r=>r.status)).toEqual(['fulfilled','rejected']);expect(results[1].reason.code).toBe('BUDGET_EXHAUSTED');
  await h.runtime.request('seller_site','https://example.org/a');expect(h.runtime.usage.seller_site.requests).toBe(1);
});
it('revalidates redirects and rejects private destinations before fetching them',async()=>{
  const calls=[];const h=harness({fetch:async url=>{calls.push(url);return url.endsWith('/robots.txt')?response(''):response('',302,{location:'https://127.0.0.1/'});}});
  await expect(h.runtime.request('seller_site','https://example.org/a')).rejects.toMatchObject({code:'UNSAFE_URL'});expect(calls).toHaveLength(2);
});
it('blocks a seller-page redirect outside the confirmed company domain before fetching it',async()=>{
  const calls=[];const h=harness({fetch:async url=>{calls.push(url);return url.endsWith('/robots.txt')?response(''):response('',302,{location:'https://other.org/landing'});}});
  await expect(h.runtime.request('seller_site','https://example.org/a',{allowedRedirectDomain:'example.org'})).rejects.toMatchObject({code:'REDIRECT_BLOCKED'});
  expect(calls).toEqual(['https://example.org/robots.txt','https://example.org/a']);
});
it('rejects timeouts, oversized bodies, and unsupported content',async()=>{
  const timeout=harness({timeoutMs:10,fetch:async()=>new Promise(()=>{})});
  await expect(timeout.runtime.request('robots','https://example.org/robots.txt')).rejects.toMatchObject({code:'TIMEOUT'});
  const large=harness({fetch:async()=>response('a'.repeat(2*1024*1024+1))});await expect(large.runtime.request('robots','https://example.org/robots.txt')).rejects.toMatchObject({code:'TOO_LARGE'});
  const binary=harness({fetch:async()=>response('binary',200,{'content-type':'image/png'})});await expect(binary.runtime.request('robots','https://example.org/robots.txt')).rejects.toMatchObject({code:'CONTENT_TYPE'});
});
it('allows SEC plain-text indexes served as octet-stream and keeps safe HTTP status diagnostics',async()=>{
  const headers=[];const sec=harness({fetch:async(url,options)=>{headers.push(options.headers);return url.endsWith('/robots.txt')?response('User-agent: *\nAllow: /'):response('D  Example  1  20261020  edgar/data/1/file.txt',200,{'content-type':'application/octet-stream'});}});
  expect((await sec.runtime.requestText('https://www.sec.gov/Archives/edgar/daily-index/2026/QTR4/form.20261020.idx','edgar_index')).value).toContain('Example');
  expect(headers).toHaveLength(1);
  expect(headers[0]['User-Agent']).toBe('WhyNow crawler@example.org');
  expect(headers[0].Accept).toContain('application/octet-stream');
  const failed=harness({fetch:async url=>url.endsWith('/robots.txt')?response('',404):response('blocked',429)});
  await expect(failed.runtime.request('seller_site','https://example.org/page')).rejects.toMatchObject({status:429});
  expect(failed.runtime.snapshot().health.seller_site).toMatchObject({code:'HTTP_ERROR',httpStatus:429});
});
it('skips robots only for documented SEC data endpoints and keeps the public-address guard',async()=>{
  for(const url of [
    'https://www.sec.gov/files/company_tickers.json',
    'https://www.sec.gov/Archives/edgar/daily-index/2026/QTR4/form.20261020.idx',
    'https://www.sec.gov/Archives/edgar/data/1/filing.txt',
    'https://data.sec.gov/submissions/CIK0000320193.json',
    'https://efts.sec.gov/LATEST/search-index?q=Acme',
  ])expect(officialSecDataEndpoint(url)).toBe(true);
  expect(officialSecDataEndpoint('https://www.sec.gov/about')).toBe(false);
  expect(officialSecDataEndpoint('https://example.org/Archives/edgar/data/1/filing.txt')).toBe(false);
  const calls=[];const direct=harness({fetch:async(url,options)=>{calls.push({url,options});return response('{}',200,{'content-type':'application/json'});}});
  await direct.runtime.requestJson('https://efts.sec.gov/LATEST/search-index?q=CrowdStrike&forms=D','edgar_search');
  expect(calls.map(row=>row.url)).toEqual(['https://efts.sec.gov/LATEST/search-index?q=CrowdStrike&forms=D']);
  expect(calls[0].options.headers['User-Agent']).toBe('WhyNow crawler@example.org');
  const guarded=harness({lookup:async()=>[{address:'127.0.0.1',family:4}]});
  await expect(guarded.runtime.requestJson('https://efts.sec.gov/LATEST/search-index?q=CrowdStrike','edgar_search')).rejects.toMatchObject({code:'UNSAFE_URL'});
  const ordinary=harness({fetch:async url=>url.endsWith('/robots.txt')?response('User-agent: *\nDisallow: /'):response('{}',200,{'content-type':'application/json'})});
  await expect(ordinary.runtime.request('edgar_search','https://www.sec.gov/about')).rejects.toMatchObject({code:'ROBOTS_DISALLOWED'});
});
it('allows larger ATS JSON while preserving the two-megabyte general ceiling',async()=>{
  const body='a'.repeat(3*1024*1024),ats=harness({fetch:async url=>url.endsWith('/robots.txt')?response(''):response(body,200,{'content-type':'application/json'})});
  expect((await ats.runtime.request('greenhouse','https://boards-api.greenhouse.io/v1/boards/acme/jobs')).text).toHaveLength(body.length);
  const general=harness({fetch:async()=>response(body)});await expect(general.runtime.request('robots','https://example.org/robots.txt')).rejects.toMatchObject({code:'TOO_LARGE'});
});
it('retains source revisions and accepts exact whitespace-normalized quotes only',()=>{
  const a=recordSource(defaultState(),{url:'https://example.org',fetchedAt:'2026-09-16T00:00:00Z',title:'Source',text:'The public\n page has evidence.'});
  expect(quoteIsGrounded(a.state,a.source.id,'public page has evidence.')).toBe(true);
  expect(quoteIsGrounded(a.state,a.source.id,'The page contains proof')).toBe(false);
  expect(quoteIsGrounded(a.state,a.source.id,'')).toBe(false);
  const b=recordSource(a.state,{...a.source,text:'Changed page.'});expect(Object.keys(b.state.sources)).toHaveLength(2);
  const copy=getSource(b.state,a.source.id);copy.text='overwrite';expect(getSource(b.state,a.source.id).text).toBe(a.source.text);
});
it('normalizes evidence without inventing a receipt',()=>{
  expect(signal({score:8})).toMatchObject({score:5,inferred:true,evidenceUrl:''});
  expect(stripHtml('<script>secret()</script><p>A &amp; B</p>')).toBe('A & B');
  expect(evidenceBelongsToTarget({name:'Example',domain:'example.org'},'https://example.org/blog')).toBe(true);
  expect(evidenceBelongsToTarget({name:'Example',domain:'example.org'},'https://news.org','Examples are many')).toBe(false);
  expect(evidenceBelongsToTarget({name:'Replicate',domain:'replicate.com'},{url:'https://news.org/company',title:'Replicate launches a new API'})).toBe(true);
  expect(evidenceBelongsToTarget({name:'Replicate',domain:'replicate.com'},{url:'https://news.org/kubernetes',title:'How to replicate a Kubernetes workload'})).toBe(false);
});
it('exposes recorded-response helpers without bypassing the guarded runtime',async()=>{
  const h=harness();
  h.runtime.fetch=async(url,opts)=>{h.calls.push({url,opts});return response(url.endsWith('/robots.txt')?'User-agent: *\nAllow: /':'{"ok":true}',200,{'content-type':'application/json'});};
  expect((await h.runtime.requestJson('https://api.example.org/data','seller_site')).value).toEqual({ok:true});
  expect(h.calls[1].opts.headers['User-Agent']).toContain('WhyNow/0.1');
});
it('search uses the runtime and never puts API keys in cache or health',async()=>{
  const h=harness({fetch:async()=>response('{"organic":[]} ',200,{'content-type':'application/json'})});
  expect(await search('public company',{runtime:h.runtime,env:{SERPER_API_KEY:'test-secret'},enforceEnabled:false})).toEqual([]);
  const cached=fs.readdirSync(h.runtime.cacheDir).map(f=>fs.readFileSync(path.join(h.runtime.cacheDir,f),'utf8')).join('');
  expect(cached).not.toContain('test-secret');expect(JSON.stringify(h.runtime.snapshot())).not.toContain('test-secret');
});
it('uses a five-query collector plan and preserves dated Serper News receipts',async()=>{
  expect(phaseBQueryPlan({name:'Acme'}).map(row=>row.kind)).toEqual(['active_pain_news','tech_and_ai','exec_change','firmographics_size','firmographics_funding']);
  const h=harness({fetch:async(_url,_options)=>response('{"news":[{"title":"Acme incident","link":"https://news.example/acme","snippet":"Acme outage","date":"2 days ago","source":"Example News"}]}',200,{'content-type':'application/json'})});
  expect(await searchNews('Acme outage',{runtime:h.runtime,env:{SERPER_API_KEY:'test-secret'},enforceEnabled:false})).toEqual([{title:'Acme incident',url:'https://news.example/acme',snippet:'Acme outage',date:'2 days ago',source:'Example News'}]);
});
