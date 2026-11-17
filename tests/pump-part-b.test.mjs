import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {expect,it,vi} from 'vitest';
import {fixture} from './fixtures/pipeline/fictional.mjs';

const require=createRequire(import.meta.url);
const {BATCH,CAPS,RULES,roundRobinCandidates,run}=require('../scripts/run-pump-part-b.cjs');
const {draftPlaybook,digest}=require('../scripts/playbook.cjs');
const {loadState,saveState}=require('../scripts/server/state.cjs');
const {CollectorRuntime}=require('../scripts/collectors/runtime.cjs');
const now=()=>new Date('2026-11-17T12:00:00Z');
const response=(status,body,type='application/json')=>({status,headers:new Headers({'content-type':type}),text:async()=>body});
const json=value=>response(200,JSON.stringify(value));
const date=now().toISOString(),newsTitle='Fir Market raises Series A funding',newsUrl='https://ledger-news.example/articles/fir-market';

function harness({approved=true,robotsStatus=200}={}) {
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
      const q=JSON.parse(options.body).q;
      if(url.pathname==='/news')return json({news:q.includes('raises')?[{title:newsTitle,link:newsUrl,date:'2 days ago'}]:[]});
      return json({organic:q.includes('Fir Market')?[{title:'Fir Market | Official',link:'https://firmarket.example/'}]:[]});
    }
    if(value===newsUrl)return response(200,`<meta property="article:published_time" content="2026-11-15T12:00:00Z"><article><h1>${newsTitle}</h1><p>Fir Market raises Series A capital for infrastructure and revenue operations.</p></article>`,'text/html');
    if(url.hostname==='firmarket.example')return response(200,'<p>Fir Market is a software company. Our product helps enterprise customers with revenue operations.</p>','text/html');
    if(url.hostname==='api.apollo.io'&&url.pathname==='/api/v1/organizations/enrich')return json({organization:{primary_domain:'firmarket.example',name:'Fir Market',estimated_num_employees:275}});
    throw Error('Unexpected fictional destination');
  });
  const env={CRAWLER_CONTACT_EMAIL:'crawler@example.invalid',SERPER_API_KEY:'fictional-serper',SERPER_MONTHLY_QUERY_LIMIT:'50',APOLLO_API_KEY:'fictional-apollo'};
  const runtimeFactory=options=>new CollectorRuntime({...options,lookup:async()=>[{address:'93.184.216.34',family:4}],sleep:async()=>{},fetch});
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

it('stops every transport on an HTTP error even when a collector catches it',async()=>{
  const h=harness({robotsStatus:404});
  try {
    const r=await h.run();
    expect(r).toMatchObject({status:'stopped',stage:'discovery',failure:{code:'HTTP_ERROR',httpStatus:404},freeRequests:1,apolloAttempts:0,openaiCalls:0});
    expect(h.fetch.mock.calls.at(-1)[0]).toBe('https://ledger-news.example/robots.txt');
    expect(r.templates).toEqual([]);
    expect(loadState(h.file).workspaces[h.id].runs[0].status).toBe('failed');
    await expect(h.run()).rejects.toMatchObject({code:'PUMP_BATCH_UNAVAILABLE'});
  }finally{h.cleanup();}
});

it('scores a receipt-backed candidate with a saved Apollo employee estimate and no search or people calls',async()=>{
  const h=harness();
  try {
    const r=await h.run();
    expect(r).toMatchObject({status:'complete',apolloAttempts:1,openaiCalls:0,preserved:true,envUnchanged:true,
      enrichments:[{name:'Fir Market',status:'ESTIMATE_SAVED',employeeCount:275}]});
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
