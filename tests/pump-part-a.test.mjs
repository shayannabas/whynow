import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {expect,it,vi} from 'vitest';

const require=createRequire(import.meta.url);
const {run,createResearchRuntime,collectPages,verifyEstimate,addResearch,LIMITS,RUN_ID,RERUN_ID,RERUN_TOTAL}=require('../scripts/run-pump-part-a.cjs');
const {createWorkspace,defaultState,loadState,saveState}=require('../scripts/server/state.cjs');
const env={CRAWLER_CONTACT_EMAIL:'crawler@example.invalid',OPENAI_API_KEY:'fictional-test-only',OPENAI_ENABLED:'false',OPENAI_MONTHLY_LIMIT_USD:'0'};
const response=(status,body,headers={})=>({status,headers:new Headers(headers),text:async()=>body});
const runtimeOptions=fetch=>({fetch,lookup:async()=>[{address:'93.184.216.34',family:4}],sleep:async()=>{}});
const html=body=>'<html><head><title>Fictional cloud platform</title></head><body>'+body+'</body></html>';

it('counts redirects and robots, blocks robots exclusions and off-domain hops, and respects the content limit',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'whynow-pump-runtime-'));
  try{
    const fetch=vi.fn(async url=>{
      if(url.endsWith('/robots.txt'))return response(200,'User-agent: *\nDisallow: /customers/private');
      if(url==='https://pump.co/')return response(302,'',{location:'https://www.pump.co/'});
      if(url==='https://www.pump.co/')return response(200,html('<a href="/customers/private">Private</a><a href="/pricing">Pricing</a><a href="/about">About</a>'));
      if(url.endsWith('/sitemap.xml'))return response(200,'<urlset>'+Array.from({length:25},(_,i)=>'<url><loc>https://pump.co/case-studies/company-'+i+'</loc></url>').join('')+'</urlset>');
      if(url.endsWith('/case-studies/company-0'))return response(302,'',{location:'https://elsewhere.example/pricing'});
      return response(200,html('Fictional Pine Loom runs a cloud platform and manages cloud infrastructure spending.'));
    });
    const runtime=createResearchRuntime({env,cacheDir:dir,options:runtimeOptions(fetch)});
    const errors=[];
    const pages=await collectPages(runtime,{onError:error=>errors.push(error)});
    expect(errors.some(error=>error.code==='REDIRECT_BLOCKED')).toBe(true);
    expect(runtime.usage.seller_site.requests).toBeLessThanOrEqual(LIMITS.seller_site);
    const urls=fetch.mock.calls.map(([url])=>new URL(url).pathname);
    expect(urls.filter(url=>/^\/case-studies\//.test(url)).length).toBeLessThanOrEqual(8);
    for(const core of ['/about','/pricing','/how-it-works','/security'])expect(urls.indexOf(core)).toBeLessThan(urls.indexOf('/case-studies/company-0'));
    expect(runtime.usage.seller_sitemap.requests).toBe(1);
    expect(runtime.usage.robots.requests).toBe(2);
    expect(pages.some(page=>page.url.includes('case-studies'))).toBe(true);
    expect(fetch.mock.calls.some(([url])=>url.includes('elsewhere.example')||url.includes('/customers/private'))).toBe(false);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

it('stops on the first incomplete call, preserves prior state, and consumes the run marker',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'whynow-pump-run-'));
  try{
    const file=path.join(dir,'local-state.json');
    const prior=createWorkspace(defaultState(),{name:'Fictional Cedar Relay'});
    const saved=createWorkspace(prior,{name:'Pump'});
    const pumpId=saved.activeWorkspaceId;
    saved.activeWorkspaceId=prior.activeWorkspaceId;
    saved.workspaces[pumpId].research={schemaVersion:1,status:'configuration_required',sources:[]};
    saveState(saved,file);
    const pageFetch=vi.fn(async url=>url.endsWith('/robots.txt')||url.endsWith('/sitemap.xml')?response(404,''):response(200,html('<p>Fictional cloud optimization helps software companies reduce idle resource spending and improve infrastructure budgets.</p>')));
    const fetchImpl=vi.fn(async (url,request)=>{
      expect(url).toBe('https://api.openai.com/v1/chat/completions');
      expect(JSON.parse(request.body)).toMatchObject({model:'gpt-5.5',max_completion_tokens:8000,reasoning_effort:'low'});
      return new Response(JSON.stringify({choices:[{finish_reason:'length'}],usage:{prompt_tokens:1000,completion_tokens:8000,completion_tokens_details:{reasoning_tokens:8000}}}));
    });
    const opts={file,env,runtimeOptions:runtimeOptions(pageFetch),fetchImpl};
    const report=await run(opts);
    expect(report).toMatchObject({status:'stopped',openaiAttempts:1,apolloAttempts:0,serperQueries:0,actualCostUsd:.245,preserved:true,disabledAfter:{OPENAI_ENABLED:'false',OPENAI_MONTHLY_LIMIT_USD:'0'},failure:{code:'INCOMPLETE',incompleteReason:'length'}});
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(report.workspaceId).toBe(pumpId);
    const state=loadState(file);
    expect(state.activeWorkspaceId).toBe(prior.activeWorkspaceId);
    expect(state.workspaces[prior.activeWorkspaceId]).toEqual(prior.workspaces[prior.activeWorkspaceId]);
    expect(state.workspaces[report.workspaceId].sellerProfile.approvedAt).toBeUndefined();
    await expect(run(opts)).rejects.toMatchObject({code:'PUMP_ALREADY_EXISTS'});
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

it('blocks an oversized serialized request even when aggregate estimated cost fits',()=>{
  const good={model:'gpt-5.5',reasoningEffort:'low',maxOutputTokens:8000,estimatedInputTokens:40000};
  expect(()=>verifyEstimate({calls:[good,good,good],totalMaximumCostUsd:1.32})).not.toThrow();
  expect(()=>verifyEstimate({calls:[good,{...good,estimatedInputTokens:40001},good],totalMaximumCostUsd:1.321})).toThrow('approved request bounds');
});


it('reuses the original pages and counts new requests against the distinct rerun marker',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'whynow-pump-rerun-'));
  try{
    const file=path.join(dir,'local-state.json'),now='2026-11-17T12:00:00Z';
    const saved=[{url:'https://www.pump.co/',kind:'seller_site',title:'Fictional cloud platform',text:'Fictional cloud optimization helps software companies manage infrastructure budgets.',fetchedAt:now},
      ...Array.from({length:17},(_,i)=>({url:'https://www.pump.co/customers/elm-'+i,kind:'seller_customer_page',title:'Elm '+i+' uses fictional cloud tooling',text:'Elm '+i+' uses fictional cloud tooling for planning cloud resources and monitoring usage.',fetchedAt:now}))];
    saveState(addResearch(defaultState(),saved,{seller_site:20},[],now).state,file);
    const cache=path.join(dir,RUN_ID,'cache');
    fs.mkdirSync(cache,{recursive:true});
    fs.writeFileSync(path.join(cache,'sitemap.json'),JSON.stringify({url:'https://www.pump.co/sitemap.xml',text:'<urlset>'+Array.from({length:30},(_,i)=>'<url><loc>https://www.pump.co/vs/rival-'+i+'</loc></url>').join('')+'</urlset>'}));
    const pageFetch=vi.fn(async url=>url.endsWith('/robots.txt')?response(404,''):response(200,html('Fictional cloud infrastructure spend comparison with enough text to retain a source receipt.')));
    const fetchImpl=vi.fn(async()=>new Response('',{status:503}));
    const report=await run({file,env,rerun:true,runtimeOptions:runtimeOptions(pageFetch),fetchImpl});
    expect(report).toMatchObject({runId:RERUN_ID,reusedPages:18,openaiAttempts:1,serperQueries:0,status:'stopped',failure:{httpStatus:503}});
    expect(pageFetch).toHaveBeenCalledTimes(RERUN_TOTAL);
    expect(pageFetch.mock.calls.every(([url])=>!saved.some(page=>page.url===url))).toBe(true);
    expect(loadState(file).workspaces[report.workspaceId].research.sources.length).toBeGreaterThan(18);
    expect(fetchImpl).toHaveBeenCalledOnce();
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
