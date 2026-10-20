import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {defaultState,createWorkspace}=require('../scripts/server/state.cjs');
const {requestResearch}=require('../scripts/onboarding/research-request.cjs');
const {createResearchCoordinator,normalizeResearchUrl,selectResearchTargets,discoveryQueries,homepageTargets,sitemapTargets,externalTargetForRow,COMMON_SELLER_PATHS,MAX_FETCHED_PAGES,MAX_STORED_TEXT_PER_PAGE,MAX_STORED_TEXT_PER_RUN}=require('../scripts/onboarding/research.cjs');
const {search,serperSettings}=require('../scripts/serper.cjs');

const enabledEnv={
  SERPER_ENABLED:'true',SERPER_API_KEY:'test-only-secret',WORKSPACE_MAX_SERPER_QUERIES_PER_RUN:'4',
  SERPER_MONTHLY_QUERY_LIMIT:'20',CRAWLER_CONTACT_EMAIL:'crawler@example.org'
};

function store(initial) {
  let state=structuredClone(initial),writes=Promise.resolve();
  return {
    read:()=>structuredClone(state),
    mutate:fn=>{const operation=writes.then(()=>{state=fn(state);return structuredClone(state);});writes=operation.catch(()=>{});return operation;},
    replace:value=>{state=structuredClone(value);}
  };
}

function candidateRows(name='Example') {
  return [
    {title:`${name} official`,url:'https://example.com',snippet:'Official site'},
    {title:'Directory',url:'https://linkedin.com/company/example',snippet:'Directory'},
    {title:'Duplicate',url:'https://www.example.com/about',snippet:'Same domain'},
    {title:'Second',url:'https://second.example',snippet:'Second'},
    {title:'Third',url:'https://third.example',snippet:'Third'},
    {title:'Fourth',url:'https://fourth.example',snippet:'Fourth'},
    {title:'Fifth',url:'https://fifth.example',snippet:'Fifth'},
    {title:'Sixth',url:'https://sixth.example',snippet:'Must be capped'}
  ];
}

function harness({state=requestResearch(defaultState(),'Example'),env=enabledEnv,searchImpl,pageImpl,now}={}) {
  const saved=store(state),searchCalls=[],pageCalls=[];
  const searchFn=async(query,options)=>{
    searchCalls.push({query,options});
    return searchImpl?searchImpl(query,searchCalls.length):candidateRows();
  };
  const runtimeFactory=()=>({
    usage:{seller_site:{requests:0,cacheHits:0,lastAt:null}},health:{},
    snapshot(){return {schemaVersion:1,usage:this.usage,health:this.health};},
    async request(source,url,options={}){
      pageCalls.push({source,url,options});this.usage.seller_site.requests++;
      if(pageImpl)return pageImpl(source,url,pageCalls.length,options);
      return {url,fetchedAt:'2026-09-17T12:00:00Z',text:`<title>Example</title><p>Public evidence from ${url}</p>`};
    }
  });
  const coordinator=createResearchCoordinator({read:saved.read,mutate:saved.mutate,env,runtimeFactory,searchFn,
    now:now||(()=> '2026-09-17T12:00:00Z'),randomId:(()=>{let n=0;return()=>`run-${++n}`;})()});
  return {saved,coordinator,searchCalls,pageCalls,id:saved.read().activeWorkspaceId};
}

it('requires explicit enablement, a key, and positive run and monthly caps before any call',async()=>{
  let transportCalls=0;
  const runtime={request:async()=>{transportCalls++;throw Error('must not call');}};
  for(const env of [
    {SERPER_API_KEY:'key',SERPER_RESEARCH_QUERY_LIMIT:'4',SERPER_MONTHLY_QUERY_LIMIT:'20'},
    {SERPER_ENABLED:'true',SERPER_RESEARCH_QUERY_LIMIT:'4',SERPER_MONTHLY_QUERY_LIMIT:'20'},
    {SERPER_ENABLED:'true',SERPER_API_KEY:'key',SERPER_RESEARCH_QUERY_LIMIT:'0',SERPER_MONTHLY_QUERY_LIMIT:'20'},
    {SERPER_ENABLED:'true',SERPER_API_KEY:'key',SERPER_RESEARCH_QUERY_LIMIT:'4',SERPER_MONTHLY_QUERY_LIMIT:'0'}
  ]) await expect(search('company',{runtime,env,enforceEnabled:true})).rejects.toThrow();
  expect(transportCalls).toBe(0);
  expect(serperSettings({...enabledEnv,SERPER_RESEARCH_QUERY_LIMIT:'999'}).perRunLimit).toBe(4);
  expect(serperSettings({...enabledEnv,WORKSPACE_MAX_SERPER_QUERIES_PER_RUN:'2',SERPER_RESEARCH_QUERY_LIMIT:'3'}).perRunLimit).toBe(2);

  const h=harness({env:{SERPER_API_KEY:'key',SERPER_RESEARCH_QUERY_LIMIT:'4',SERPER_MONTHLY_QUERY_LIMIT:'20'}});
  await expect(h.coordinator.start(h.id)).rejects.toMatchObject({code:'DISABLED'});
  expect(h.searchCalls).toHaveLength(0);
  expect(h.saved.read().workspaces[h.id].research.status).toBe('configuration_required');
  expect(JSON.stringify(h.saved.read())).not.toContain('SERPER_API_KEY');
});

it('identifies at most five candidates without choosing a company',async()=>{
  const h=harness();const research=await h.coordinator.start(h.id);
  expect(h.searchCalls).toHaveLength(1);
  expect(research).toMatchObject({status:'confirmation_required',runId:'run-1'});
  expect(research.candidates).toHaveLength(5);
  expect(research.selectedCandidate).toBeUndefined();
  expect(research.steps.find(step=>step.key==='identify').status).toBe('complete');
  expect(h.saved.read().workspaces[h.id].budgets.serper).toMatchObject({month:'2026-09',queries:1});
  expect(research.revision).toBeGreaterThan(0);
});

it('rejects a stale-tab confirmation after the active workspace changes',async()=>{
  const h=harness(),identified=await h.coordinator.start(h.id);
  h.saved.replace(createWorkspace(h.saved.read(),{name:'Another workspace'}));
  await expect(h.coordinator.confirm(h.id,identified.candidates[0].id,identified.revision,{requireActive:true})).rejects.toMatchObject({code:'WORKSPACE_CHANGED'});
  expect(h.saved.read().workspaces[h.id].research.selectedCandidate).toBeUndefined();
  expect(h.searchCalls).toHaveLength(1);
});

it('requires an exact candidate and current revision before bounded same-domain collection',async()=>{
  const discoveryRows=Array.from({length:30},(_,index)=>({title:`Page ${index}`,url:`https://${index%2?'docs.':''}example.com/page-${index}`,snippet:'Public'}));
  discoveryRows.push({title:'Off domain',url:'https://attacker.example/steal',snippet:'No'});
  const h=harness({searchImpl:(query,count)=>count===1?candidateRows():discoveryRows});
  const identified=await h.coordinator.start(h.id),candidate=identified.candidates[0];
  await expect(h.coordinator.confirm(h.id,'forged',identified.revision)).rejects.toMatchObject({code:'INVALID_CANDIDATE'});
  await expect(h.coordinator.confirm(h.id,candidate.id,identified.revision-1)).rejects.toMatchObject({code:'STALE_REVISION'});
  const finished=await h.coordinator.confirm(h.id,candidate.id,identified.revision);
  expect(h.searchCalls.length).toBeLessThanOrEqual(4);
  expect(h.pageCalls.length).toBeLessThanOrEqual(MAX_FETCHED_PAGES);
  expect(h.pageCalls.every(call=>{const host=new URL(call.url).hostname;return host==='example.com'||host.endsWith('.example.com');})).toBe(true);
  expect(finished.status).toBe('evidence_ready');
  expect(finished.sources.length).toBeGreaterThan(0);
  expect(finished.sources[0]).toMatchObject({schemaVersion:1,kind:'seller_site',ownerDomain:'example.com'});
  expect(finished.facts).toEqual([]);expect(finished.icp).toBeNull();
  expect(h.saved.read().workspaces[h.id].onboarding.selectedCandidate.domain).toBe('example.com');
  expect(JSON.stringify(h.saved.read())).not.toContain(enabledEnv.SERPER_API_KEY);
});

it('caps stored text per page and per run while retaining safe partial progress',async()=>{
  const rows=Array.from({length:30},(_,index)=>({url:`https://example.com/public-${index}`}));
  const h=harness({searchImpl:(query,count)=>count===1?candidateRows():rows,
    pageImpl:async(source,url)=>({url,fetchedAt:'2026-09-17T12:00:00Z',text:`<title>Large</title><p>${'x'.repeat(70000)}</p>`})});
  const identified=await h.coordinator.start(h.id);
  const finished=await h.coordinator.confirm(h.id,identified.candidates[0].id,identified.revision);
  expect(finished.usage.pagesAttempted).toBe(MAX_FETCHED_PAGES);
  expect(finished.usage.storedBytes).toBeLessThanOrEqual(MAX_STORED_TEXT_PER_RUN);
  expect(Math.max(...finished.sources.map(source=>source.bytes))).toBeLessThanOrEqual(MAX_STORED_TEXT_PER_PAGE);
  expect(Object.values(h.saved.read().sources).every(source=>Buffer.byteLength(source.text)<=MAX_STORED_TEXT_PER_PAGE)).toBe(true);
  expect(finished.pageErrors.length).toBeGreaterThan(0);
});

it('persists the account-wide monthly reservation across coordinators and workspaces',async()=>{
  let state=requestResearch(defaultState(),'First'),first=state.activeWorkspaceId;
  state=requestResearch(state,'Second');const second=state.activeWorkspaceId;
  state=requestResearch(state,'Third');const third=state.activeWorkspaceId;
  const env={...enabledEnv,SERPER_MONTHLY_QUERY_LIMIT:'2'};
  const shared=store(state),calls=[];
  const make=()=>createResearchCoordinator({read:shared.read,mutate:shared.mutate,env,
    runtimeFactory:()=>({}),searchFn:async query=>{calls.push(query);return candidateRows();},
    now:()=> '2026-09-17T12:00:00Z',randomId:()=>`run-${calls.length}-${Math.random()}`});
  await make().start(first);await make().start(second);
  await expect(make().start(third)).rejects.toMatchObject({code:'MONTHLY_BUDGET_EXHAUSTED'});
  expect(calls).toHaveLength(2);
  expect(Object.values(shared.read().workspaces).reduce((sum,w)=>sum+(w.budgets.serper?.queries||0),0)).toBe(2);
  expect(shared.read().workspaces[third].research).toMatchObject({status:'failed',error:{code:'MONTHLY_BUDGET_EXHAUSTED'}});
});

it('deduplicates concurrent starts and safely retries a failed recorded run',async()=>{
  let release;const gate=new Promise(resolve=>{release=resolve;});let fail=true;
  const h=harness({searchImpl:async()=>{await gate;if(fail)throw Error(`provider echoed ${enabledEnv.SERPER_API_KEY}`);return candidateRows();}});
  const one=h.coordinator.start(h.id),two=h.coordinator.start(h.id);release();
  await expect(one).rejects.toMatchObject({code:'RESEARCH_FAILED'});await expect(two).rejects.toMatchObject({code:'RESEARCH_FAILED'});
  expect(h.searchCalls).toHaveLength(1);
  let saved=h.saved.read().workspaces[h.id].research;
  expect(saved.status).toBe('failed');expect(JSON.stringify(saved)).not.toContain(enabledEnv.SERPER_API_KEY);
  fail=false;
  const retried=await h.coordinator.retry(h.id);
  expect(retried.status).toBe('confirmation_required');
  expect(retried.runId).not.toBe(saved.runId);
  expect(h.saved.read().workspaces[h.id].budgets.serper.queries).toBe(2);
});

it('resumes an interrupted persisted run without crossing workspace or archive boundaries',async()=>{
  let state=requestResearch(defaultState(),'Interrupted'),id=state.activeWorkspaceId;
  state.workspaces[id].research={...state.workspaces[id].research,status:'identifying',runId:'persisted-run',revision:3,
    usage:{queriesReserved:1,pagesAttempted:0,pagesSaved:0,storedChars:0}};
  state.workspaces[id].budgets.serper={schemaVersion:1,month:'2026-09',queries:1};
  state=createWorkspace(state,{name:'Unrelated'});const unrelated=state.activeWorkspaceId;
  const h=harness({state});
  const resumed=await h.coordinator.start(id);
  expect(resumed.runId).toBe('persisted-run');expect(resumed.status).toBe('confirmation_required');
  expect(h.saved.read().workspaces[unrelated]).toEqual(state.workspaces[unrelated]);
  const archived=h.saved.read();archived.workspaces[id].status='archived';h.saved.replace(archived);
  await expect(h.coordinator.start(id)).rejects.toMatchObject({code:'ARCHIVED'});
  expect(h.searchCalls).toHaveLength(1);
});

it('normalizes only selected-domain HTTPS pages and strips tracking fragments',()=>{
  expect(normalizeResearchUrl('https://docs.example.com/a?utm_source=x&b=2#part','example.com')).toBe('https://docs.example.com/a?b=2');
  for(const value of ['http://example.com','https://evil.example/a','https://user:pass@example.com','https://example.com:8443'])expect(normalizeResearchUrl(value,'example.com')).toBeNull();
});

it('uses three bounded discovery queries covering the required seller, comparison, funding and hiring terms',()=>{
  const queries=discoveryQueries({name:'Example',domain:'example.com'}),text=queries.join(' ').toLowerCase();
  expect(queries).toHaveLength(3);
  for(const term of ['product','solutions','pricing','customers','case studies','about','careers','alternatives','vs','raises','hiring'])expect(text).toContain(term);
  expect(queries.slice(0,2).every(query=>query.includes('site:example.com'))).toBe(true);
});

it('prioritizes customer, case-study, enterprise, pricing, about and comparison coverage before low-value partner pages',()=>{
  const candidate={name:'Example',domain:'example.com',website:'https://example.com'};
  const rows=[
    {url:'https://example.com/partners/solution-partners/agency'},
    {url:'https://example.com/marketplace/template'},
    {url:'https://example.com/products/deployments'},
    {url:'https://example.com/vs/rival'},
    ...Array.from({length:25},(_,index)=>({url:`https://example.com/resources/item-${index}`}))
  ];
  const targets=selectResearchTargets(candidate,rows),urls=targets.map(item=>new URL(item.url).pathname);
  expect(urls.slice(0,2)).toEqual(['/','/sitemap.xml']);
  for(const required of COMMON_SELLER_PATHS)expect(urls).toContain(required);
  const lastRequired=Math.max(...COMMON_SELLER_PATHS.map(required=>urls.indexOf(required)));
  const partnerIndexes=targets.map((item,index)=>item.kind==='seller_partner_page'?index:-1).filter(index=>index>=0);
  expect(partnerIndexes.every(index=>index>lastRequired)).toBe(true);
  expect(targets.some(item=>item.kind==='seller_partner_page')).toBe(false);
  expect(targets.length).toBeLessThanOrEqual(MAX_FETCHED_PAGES);

  const roomy=selectResearchTargets(candidate,rows.slice(0,3));
  expect(roomy.find(item=>item.url.includes('/partners/'))).toMatchObject({kind:'seller_partner_page'});
  expect(roomy.findIndex(item=>item.kind==='seller_partner_page')).toBeGreaterThan(Math.max(...COMMON_SELLER_PATHS.map(required=>roomy.findIndex(item=>new URL(item.url).pathname===required))));
});

it('discovers only relevant same-domain homepage and sitemap links',()=>{
  const candidate={name:'Example',domain:'example.com',website:'https://example.com'};
  const homepage=homepageTargets(candidate,`<a href="/product">Product</a><a href="https://docs.example.com/solutions">Solutions</a><a href="/careers">Careers</a><a href="/logo.svg">Logo</a><a href="https://evil.example/about">Wrong host</a><link rel="sitemap" href="/sitemap-products.xml">`,'https://example.com/');
  expect(homepage.map(item=>item.url)).toEqual(['https://example.com/product','https://docs.example.com/solutions','https://example.com/careers','https://example.com/sitemap-products.xml']);
  const sitemap=sitemapTargets(candidate,'<urlset><loc>https://example.com/customers/acme?utm_source=x</loc><loc>https://example.com/about</loc><loc>https://evil.example/careers</loc><loc>https://example.com/image.png</loc></urlset>','https://example.com/sitemap.xml');
  expect(sitemap.map(item=>item.url)).toEqual(['https://example.com/customers/acme','https://example.com/about']);
});

it('admits only seller-tied allowlisted ATS and SEC search results',()=>{
  const candidate={name:'Example',domain:'example.com',website:'https://example.com'};
  expect(externalTargetForRow(candidate,{title:'Jobs at Example',url:'https://boards.greenhouse.io/example/jobs/123'})).toMatchObject({source:'greenhouse',kind:'greenhouse_jobs',expectedHost:'boards.greenhouse.io'});
  expect(externalTargetForRow(candidate,{title:'Example, Inc. filing',snippet:'Example annual filing',url:'https://www.sec.gov/Archives/edgar/data/123/filing.htm'})).toMatchObject({source:'engineering_web',kind:'sec_edgar',expectedHost:'www.sec.gov'});
  for(const row of [
    {title:'Jobs at Example',url:'https://boards.greenhouse.io/unrelated/jobs/123'},
    {title:'Unrelated filing',url:'https://www.sec.gov/Archives/edgar/data/123/filing.htm'},
    {title:'Jobs at Example',url:'https://evil.example/example/jobs/123'},
    {title:'Example home',url:'https://www.sec.gov/index.html'}
  ])expect(externalTargetForRow(candidate,row)).toBeNull();
});

it('collects homepage and sitemap discoveries plus tied ATS and SEC pages within one twenty-page plan',async()=>{
  const discoveryRows=[
    {title:'Example pricing',url:'https://example.com/pricing',snippet:'Pricing'},
    {title:'Jobs at Example',url:'https://boards.greenhouse.io/example/jobs/123',snippet:'Example engineering roles'},
    {title:'Example filing',url:'https://www.sec.gov/Archives/edgar/data/123/filing.htm',snippet:'Example annual filing'},
    {title:'Jobs at Example',url:'https://boards.greenhouse.io/unrelated/jobs/456',snippet:'Unrelated board'},
    {title:'Unrelated filing',url:'https://www.sec.gov/Archives/edgar/data/999/filing.htm',snippet:'Another issuer'}
  ];
  const h=harness({searchImpl:(query,count)=>count===1?candidateRows():discoveryRows,pageImpl:async(source,url)=>{
    if(url==='https://example.com/')return {url,fetchedAt:'2026-09-17T12:00:00Z',text:'<title>Example</title><a href="/product">Product</a><a href="/solutions">Solutions</a><a href="/customers/acme">Customer</a><a href="/about">About</a><a href="/careers">Careers</a><a href="https://evil.example/about">Wrong host</a>'};
    if(url==='https://example.com/sitemap.xml')return {url,fetchedAt:'2026-09-17T12:00:00Z',text:'<urlset><loc>https://example.com/case-studies/acme</loc><loc>https://example.com/pricing</loc><loc>https://evil.example/careers</loc></urlset>'};
    return {url,fetchedAt:'2026-09-17T12:00:00Z',text:`<title>Saved</title><p>Public evidence from ${url}</p>`};
  }});
  const identified=await h.coordinator.start(h.id),finished=await h.coordinator.confirm(h.id,identified.candidates[0].id,identified.revision);
  const fetched=new Set(h.pageCalls.map(call=>call.url));
  for(const url of ['https://example.com/','https://example.com/sitemap.xml','https://example.com/product','https://example.com/solutions','https://example.com/customers/acme','https://example.com/about','https://example.com/careers','https://example.com/case-studies/acme','https://boards.greenhouse.io/example/jobs/123','https://www.sec.gov/Archives/edgar/data/123/filing.htm'])expect(fetched.has(url)).toBe(true);
  expect(fetched.has('https://evil.example/about')).toBe(false);
  expect(fetched.has('https://boards.greenhouse.io/unrelated/jobs/456')).toBe(false);
  expect(fetched.has('https://www.sec.gov/Archives/edgar/data/999/filing.htm')).toBe(false);
  expect(h.pageCalls.length).toBeLessThanOrEqual(MAX_FETCHED_PAGES);
  expect(h.pageCalls.find(call=>call.source==='greenhouse').options.allowedRedirectDomain).toBe('boards.greenhouse.io');
  expect(h.pageCalls.find(call=>call.source==='engineering_web').options.allowedRedirectDomain).toBe('www.sec.gov');
  expect(finished.sources.map(source=>source.kind)).toEqual(expect.arrayContaining(['seller_sitemap','greenhouse_jobs','sec_edgar']));
  expect(finished.progress).toMatchObject({type:'evidence_ready',pagesAttempted:h.pageCalls.length,pagesSaved:finished.sources.length});
  expect(finished.progressEvents.some(event=>event.type==='page_saved')).toBe(true);
  expect(finished.plan.urls).toHaveLength(finished.plan.targets.length);
  expect(finished.plan.urls.length).toBeLessThanOrEqual(MAX_FETCHED_PAGES);
});

it('rejects an allowlisted external result that redirects to a different host',async()=>{
  const rows=[{title:'Jobs at Example',url:'https://boards.greenhouse.io/example/jobs/123',snippet:'Example jobs'}];
  const h=harness({searchImpl:(query,count)=>count===1?candidateRows():rows,pageImpl:async(source,url)=>({
    url:source==='greenhouse'?'https://jobs.lever.co/example/123':url,fetchedAt:'2026-09-17T12:00:00Z',text:'<title>Page</title><p>Evidence</p>'
  })});
  const identified=await h.coordinator.start(h.id),finished=await h.coordinator.confirm(h.id,identified.candidates[0].id,identified.revision);
  expect(finished.status).toBe('evidence_ready');
  expect(finished.pageErrors).toContainEqual(expect.objectContaining({url:'https://boards.greenhouse.io/example/jobs/123',code:'OFF_DOMAIN_REDIRECT'}));
  expect(finished.sources.some(source=>source.url.startsWith('https://jobs.lever.co/'))).toBe(false);
});

it('rejects a final redirect outside the confirmed company domain',async()=>{
  const h=harness({searchImpl:(query,count)=>count===1?candidateRows():[],pageImpl:async(source,url)=>({
    url:'https://different.example/redirected',fetchedAt:'2026-09-17T12:00:00Z',text:'<p>Off-domain text</p>'
  })});
  const identified=await h.coordinator.start(h.id);
  await expect(h.coordinator.confirm(h.id,identified.candidates[0].id,identified.revision)).rejects.toMatchObject({code:'NO_SOURCES'});
  const research=h.saved.read().workspaces[h.id].research;
  expect(research.pageErrors).toContainEqual(expect.objectContaining({code:'OFF_DOMAIN_REDIRECT'}));
  expect(Object.keys(h.saved.read().sources)).toHaveLength(0);
});
