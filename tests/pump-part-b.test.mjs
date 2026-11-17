import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {expect,it,vi} from 'vitest';
import {fixture} from './fixtures/pipeline/fictional.mjs';

const require=createRequire(import.meta.url);
const {BATCH,CAPS,RULES,roundRobinCandidates,guardedRuntime,newsFirstPlan,officialIdentity,run}=require('../scripts/run-pump-part-b.cjs');
const {draftPlaybook,digest}=require('../scripts/playbook.cjs');
const {loadState,saveState}=require('../scripts/server/state.cjs');
const {CollectorRuntime,CollectorHttpError}=require('../scripts/collectors/runtime.cjs');
const now=()=>new Date('2026-11-17T12:00:00Z');
const response=(status,body,type='application/json')=>({status,headers:new Headers({'content-type':type}),text:async()=>body});
const json=value=>response(200,JSON.stringify(value));
const date=now().toISOString(),newsTitle='Fir Market raises Series A funding',newsUrl='https://ledger-news.example/articles/fir-market';
const alternateUrl='https://cloud-news.example/fir-market-series-a',otherUrl='https://market-news.example/fir-market-series-a',unusedUrl='https://uncalled-news.example/fir-market-series-a';
const article=`<meta property="article:published_time" content="2026-11-15T12:00:00Z"><article><h1>${newsTitle}</h1><p>Fir Market raises Series A capital for infrastructure and revenue operations.</p></article>`;
const listing=url=>({title:newsTitle,link:url,snippet:'Fir Market said the new round will support its cloud infrastructure.',date:'2 days ago'});

function harness({approved=true,robotsStatus=200,articleStatus=200,providerStatus=200,providerRefusal=false,alternateMode,officialIdentity=true}={}) {
  const {state,id,workspace,raw,receipts}=fixture();
  Object.assign(workspace,{name:'Pump',status:approved?'active':'needs_review',universeSeeds:[{name:'Fir Market',domain:'firmarket.example',segment:'revenue_teams'}]});
  workspace.sellerProfile={...workspace.sellerProfile,sellerName:'Pump',domain:'pump.co',approvedAt:approved?date:null};
  const terms={'recent-funding':['raises','series a'],'ai-or-gpu-spend':['gpu infrastructure'],'migration-or-multicloud':['cloud migration'],'devops-cloud-hiring':['devops engineer']};
  const policy=draftPlaybook({...raw,triggers:Object.entries(RULES).map(([id,source])=>({
    ...raw.triggers[0],id,source,label:id.replaceAll('-',' '),keywords:terms[id]
  }))},receipts,date,6,workspace);
  workspace.sellerProfile.playbook=approved?{...policy,status:'approved',approvedAt:date,approvedDigest:digest(policy)}:policy;
  if(approved)state.auditLog.push({workspaceId:id,type:'seller_profile_approved',profileRevision:workspace.profileRevision,occurredAt:date},
    {workspaceId:id,type:'playbook_approved',playbookVersion:6,actor:'owner',occurredAt:date});
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'whynow-pump-b-')),file=path.join(dir,'local-state.json');
  saveState(state,file);
  const fetch=vi.fn(async (value,options)=>{
    const url=new URL(value);
    if(url.pathname==='/robots.txt')return response(url.hostname==='ledger-news.example'?robotsStatus:200,'User-agent: *\nAllow: /','text/plain');
    if(url.hostname==='google.serper.dev') {
      if(providerStatus!==200)return response(providerStatus,'{}');
      if(providerRefusal)return json({message:'Fictional quota refusal'});
      const q=JSON.parse(options.body).q;
      if(url.pathname==='/news'){
        if(q.startsWith('"Fir Market"'))return json({news:alternateMode?[listing(alternateUrl),listing(otherUrl),listing(unusedUrl)]:[]});
        return json({news:q.includes('raises')?[listing(newsUrl)]:[]});
      }
      return json({organic:q.includes('Fir Market')&&officialIdentity?[{title:'Fir Market | Official',link:'https://firmarket.example/'}]:[]});
    }
    if(value===newsUrl)return response(articleStatus,articleStatus===200?article:'Unavailable','text/html');
    if(value===alternateUrl)return alternateMode==='verify'?response(404,'Missing','text/html'):
      response(200,'<script type="application/ld+json">{"isAccessibleForFree":false}</script>','text/html');
    if(value===otherUrl){
      if(alternateMode==='verify')return response(200,article,'text/html');
      throw new CollectorHttpError('TIMEOUT','The article timed out.');
    }
    if(url.hostname==='firmarket.example')return response(200,'<p>Fir Market is a software company. Our product helps enterprise customers with revenue operations.</p>','text/html');
    if(url.hostname==='api.apollo.io'&&url.pathname==='/api/v1/organizations/enrich')return json({organization:{primary_domain:'firmarket.example',name:'Fir Market',estimated_num_employees:275}});
    throw Error('Unexpected fictional destination');
  });
  const env={CRAWLER_CONTACT_EMAIL:'crawler@example.invalid',SERPER_API_KEY:'fictional-serper',SERPER_MONTHLY_QUERY_LIMIT:'50',APOLLO_API_KEY:'fictional-apollo'};
  const runtimeFactory=options=>new CollectorRuntime({...options,now:()=>now().getTime(),lookup:async()=>[{address:'93.184.216.34',family:4}],sleep:async()=>{},fetch});
  return {file,id,dir,fetch,run:()=>run({file,env,now,runtimeFactory}),cleanup:()=>fs.rmSync(dir,{recursive:true,force:true})};
}

it('requires both saved owner actions before consuming the batch',async()=>{
  const h=harness({approved:false});
  try {
    await expect(h.run()).rejects.toMatchObject({code:'PUMP_APPROVAL_REQUIRED'});
    expect(h.fetch).not.toHaveBeenCalled();
    expect(fs.existsSync(path.join(h.dir,BATCH))).toBe(false);
  }finally{h.cleanup();}
});

it('stops on a provider rate limit before calling a free source or another query',async()=>{
  const h=harness({providerStatus:429});
  try {
    const r=await h.run();
    expect(r).toMatchObject({status:'stopped',stage:'discovery',failure:{code:'PROVIDER_HTTP_ERROR',httpStatus:429},serperQueries:1,freeRequests:0,apolloAttempts:0,openaiCalls:0});
    expect(h.fetch).toHaveBeenCalledOnce();
    expect(r.templates).toEqual([]);
    expect(loadState(h.file).workspaces[h.id].runs[0].status).toBe('failed');
    await expect(h.run()).rejects.toMatchObject({code:'PUMP_BATCH_UNAVAILABLE'});
  }finally{h.cleanup();}
});

it('stops on an API refusal carried in an HTTP 200 response',async()=>{
  const h=harness({providerRefusal:true});
  try {
    const r=await h.run();
    expect(r.failure).toEqual({code:'PROVIDER_REFUSED',httpStatus:200});
    expect(h.fetch).toHaveBeenCalledOnce();
    expect(r.skippedPages).toEqual([]);
  }finally{h.cleanup();}
});

it('logs robots 403 without using it as a disallow, then tries two other outlets after an article denial',async()=>{
  const h=harness({robotsStatus:403,articleStatus:403,alternateMode:'verify'});
  try {
    const r=await h.run();
    expect(r.status).toBe('complete');
    expect(r.skippedPages).toMatchObject([
      {candidate:'Fir Market',url:newsUrl,reason:'HTTP_ERROR',httpStatus:403},
      {candidate:'Fir Market',url:alternateUrl,reason:'HTTP_ERROR',httpStatus:404}
    ]);
    expect(r.sections.actNow[0]).toMatchObject({name:'Fir Market',originalReceipt:otherUrl});
    expect(r.robotsNotes).toContainEqual({url:'https://ledger-news.example/robots.txt',status:403,interpretation:'no robots rules'});
    expect(h.fetch.mock.calls.some(([url])=>url===unusedUrl)).toBe(false);
  }finally{h.cleanup();}
});

it('keeps a dated listing in research sections after the primary, a paywall and a timeout, with no trigger or draft',async()=>{
  const h=harness({articleStatus:403,alternateMode:'blocked'});
  try {
    const r=await h.run();
    expect(r.status).toBe('complete');
    expect(r.skippedPages.map(row=>[row.candidate,row.reason,row.httpStatus])).toEqual([
      ['Fir Market','HTTP_ERROR',403],['Fir Market','PAYWALL',null],['Fir Market','TIMEOUT',null]
    ]);
    expect(r.sections.actNow).toEqual([]);
    expect(r.templates).toEqual([]);
    expect(r.sections.needsReview[0]).toMatchObject({name:'Fir Market',receiptStatus:'news listing (unverified article)',triggerDate:'2026-11-15T12:00:00.000Z'});
    expect(r.sections.topProspects[0]).toMatchObject({name:'Fir Market',receiptStatus:'news listing (unverified article)'});
    const state=loadState(h.file),account=state.workspaces[h.id].accounts[0];
    expect(account.triggers).toEqual([]);
    expect(state.sources[account.newsListing.savedSourceId]).toMatchObject({url:newsUrl,title:'news listing (unverified article)'});
    expect(h.fetch.mock.calls.some(([url])=>url===unusedUrl)).toBe(false);
  }finally{h.cleanup();}
});

it('retains the listing on a rejected lead even when the company domain is unresolved',async()=>{
  const h=harness({articleStatus:403,officialIdentity:false});
  try{
    const r=await h.run();
    expect(r.rejections[0]).toMatchObject({name:'Fir Market',reason:'identity_unresolved',newsListing:{label:'news listing (unverified article)'}});
    expect(r.sections.topProspects).toEqual([]);
    const state=loadState(h.file);
    const [lead]=state.workspaces[h.id].rejectedDiscovery;
    expect(state.sources[lead.newsListing.savedSourceId].text).toContain(newsTitle);
    expect(state.workspaces[h.id].accounts[0]).toMatchObject({name:'Fir Market',domain:'',tier:'parked'});
    expect(r.sections.needsReview[0].reviewReason).toContain('unresolved');
  }finally{h.cleanup();}
});

it('stops page fetching at the fifteenth skip',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'whynow-pump-skip-cap-'));
  try {
    const fetch=vi.fn(async url=>url.endsWith('/robots.txt')?response(404,'','text/plain'):response(403,'Blocked','text/plain'));
    const runtime=new CollectorRuntime({env:{CRAWLER_CONTACT_EMAIL:'crawler@example.invalid'},cacheDir:dir,
      lookup:async()=>[{address:'93.184.216.34',family:4}],sleep:async()=>{},fetch});
    const report={freeRequests:0,freeBySource:{},requests:[],skippedPages:[]};
    guardedRuntime(runtime,{report,checkpoint:()=>{},assertCurrent:()=>{},getCandidate:()=>({name:'Fictional Fir'})});
    for(let i=0;i<14;i++)await expect(runtime.requestText('https://ledger-news.example/article-'+i,'engineering_web')).rejects.toMatchObject({status:403});
    await expect(runtime.requestText('https://ledger-news.example/article-14','engineering_web')).rejects.toMatchObject({code:'SKIPPED_PAGE_CAP'});
    await expect(runtime.requestText('https://ledger-news.example/article-15','engineering_web')).rejects.toMatchObject({code:'SKIPPED_PAGE_CAP'});
    expect(report.skippedPages).toHaveLength(15);
    expect(fetch).toHaveBeenCalledTimes(16);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

it('scores a receipt-backed candidate with a saved Apollo employee estimate and no search or people calls',async()=>{
  const h=harness();
  try {
    const r=await h.run();
    expect(r).toMatchObject({status:'complete',apolloAttempts:1,openaiCalls:0,preserved:true,envUnchanged:true,
      enrichments:[{name:'Fir Market',status:'DOMAIN_CONFIRMED',employeeCount:275}]});
    expect(r.sections.actNow[0]).toMatchObject({name:'Fir Market',tier:2,trigger:newsTitle,originalReceipt:newsUrl});
    expect(r.sections.actNow[0].receipt).toMatch(/^\/sources\//);
    expect(h.fetch.mock.calls.every(([url])=>!/mixed_companies|people|api\.openai/.test(url))).toBe(true);
    expect(r.disabledAfter).toMatchObject({APOLLO_ENABLED:'false',SERPER_ENABLED:'false',OPENAI_ENABLED:'false',OPENAI_MONTHLY_LIMIT_USD:'0'});
  }finally{h.cleanup();}
});

it('gives all matching trigger groups a turn within the 25-candidate limit',()=>{
  const news=Array.from({length:30},()=>({ruleId:'ai-or-gpu-spend'}));
  const selected=roundRobinCandidates([...news,{ruleId:'recent-funding'},{ruleId:'migration-or-multicloud'},{provider:'lever'}]);
  expect(selected).toHaveLength(CAPS.candidates);
  expect(selected.slice(0,4)).toMatchObject([{ruleId:'ai-or-gpu-spend'},{ruleId:'recent-funding'},{ruleId:'migration-or-multicloud'},{provider:'lever'}]);
});


it('prioritizes 48 dated news searches over recency-filtered ATS lookups when the policy has enough segment terms',()=>{
  const h=harness();
  try{
    const s=loadState(h.file),w=s.workspaces[h.id];
    w.sellerProfile.playbook.triggers.filter(row=>row.source==='news').forEach((row,index)=>{row.keywords=index===0?['raises','raised','funding','seed round','series a','series b','series c']:Array.from({length:7},(_,i)=>'keyword '+String.fromCharCode(97+index)+String.fromCharCode(97+i));});
    w.sellerProfile.playbook.approvedDigest=digest(w.sellerProfile.playbook);
    w.icpConfig.segments=Array.from({length:5},(_,i)=>({key:'sector-'+i,label:'Sector '+i,subIndustries:['sector '+i,'cloud market '+i]}));
    const tasks=newsFirstPlan(w,now()),news=tasks.filter(row=>row.kind==='trigger_first_news');
    expect(news).toHaveLength(48);
    expect(tasks.slice(0,48)).toEqual(news);
    expect(news).toEqual(expect.arrayContaining([expect.objectContaining({query:'"sector 0" ("raises" OR "raised")',tbs:'cdr:1,cd_min:10/18/2026,cd_max:11/17/2026',icpId:'sector-0'})]));
    expect(tasks.slice(48).every(row=>row.tbs==='qdr:m')).toBe(true);
  }finally{h.cleanup();}
});

it('prefers a matching official homepage and rejects equally plausible domains',()=>{
  const lead={name:'Fir Market'};
  const profile={title:'Fir Market | Official site',url:'https://firmarket.example/'};
  expect(officialIdentity(lead,[{title:'Fir Market on a directory',url:'https://directory.example/companies/fir-market'},profile]).domain).toBe('firmarket.example');
  expect(officialIdentity(lead,[profile,{...profile,url:'https://firmarket.io/'}])).toBeNull();
});
