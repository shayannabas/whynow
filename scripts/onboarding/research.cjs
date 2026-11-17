const {randomUUID}=require('node:crypto');
const {CollectorRuntime,CollectorHttpError}=require('../collectors/runtime.cjs');
const {stripHtml}=require('../collectors/common.cjs');
const {recordSource}=require('../sources.cjs');
const {getWorkspace,updateWorkspace}=require('../server/state.cjs');
const {resolveSeller}=require('./resolve-seller.cjs');
const {search,serperSettings,assertSerperReady,SerperError}=require('../serper.cjs');

const MAX_CANDIDATES=5;
const MAX_SERPER_QUERIES=4;
const MAX_FETCHED_PAGES=20;
const MAX_STORED_TEXT_PER_PAGE=50000;
const MAX_STORED_TEXT_PER_RUN=500000;
const MAX_PROGRESS_EVENTS=50;
const COMMON_SELLER_PATHS=Object.freeze(['/customers','/case-studies','/enterprise','/pricing','/about','/how-it-works','/security','/compare','/alternatives']);
const MAX_CUSTOMER_STORIES=8;
const LOW_PRIORITY_PATH_PATTERN=/(?:^|\/)(?:partners?|marketplace|templates?|solution-partners?)(?:\/|$)/i;
const RESEARCH_PATH_PATTERN=/(?:^|[-_/])(?:products?|platform|solutions?|pricing|customers?|case-stud(?:y|ies)|stories|enterprise|about|company|careers?|jobs?|industr(?:y|ies)|security|how-it-works|docs?|resources?|alternatives?|compare|comparison|vs|partners?|marketplace|templates?)(?:[-_/]|$)/i;
const BLOCKED_PAGE_EXTENSION=/\.(?:avif|bmp|css|gif|ico|jpe?g|js|map|mp3|mp4|mov|pdf|png|svg|webm|webp|woff2?|zip)$/i;
const EXTERNAL_RESEARCH_HOSTS=new Map([
  ['boards.greenhouse.io',{source:'greenhouse',kind:'greenhouse_jobs'}],
  ['job-boards.greenhouse.io',{source:'greenhouse',kind:'greenhouse_jobs'}],
  ['jobs.lever.co',{source:'lever',kind:'lever_jobs'}],
  ['jobs.ashbyhq.com',{source:'ashby',kind:'ashby_jobs'}],
  ['sec.gov',{source:'engineering_web',kind:'sec_edgar'}],
  ['www.sec.gov',{source:'engineering_web',kind:'sec_edgar'}]
]);
const STEP_LABELS={
  identify:'Identify the company',research:'Research public sources',
  draft:'Draft seller facts and ideal customers',review:'Your review and approval'
};

class ResearchError extends Error {
  constructor(code,message) {super(message);this.name='ResearchError';this.code=code;}
}

function safeError(error) {
  if(error instanceof ResearchError||error instanceof SerperError||error instanceof CollectorHttpError) {
    return {code:String(error.code||'RESEARCH_FAILED').slice(0,80),message:String(error.message||'Research could not complete.').slice(0,300)};
  }
  return {code:'RESEARCH_FAILED',message:'Research could not complete. No unsupported facts were created.'};
}

function stepList(research) {
  const saved=new Map((Array.isArray(research?.steps)?research.steps:[]).map(item=>[item.key,item]));
  return Object.entries(STEP_LABELS).map(([key,label])=>({key,label,status:saved.get(key)?.status||'not_started',...(saved.get(key)?.message?{message:saved.get(key).message}:{})}));
}

function setStep(research,key,status,message='') {
  research.steps=stepList(research).map(step=>step.key===key?{key,label:step.label,status,...(message?{message}: {})}:step);
}

function touch(research,at) {
  research.revision=(Number.isSafeInteger(research.revision)?research.revision:0)+1;
  research.updatedAt=at;
}

function emitProgress(research,type,message,at) {
  const usage={queriesReserved:0,pagesAttempted:0,pagesSaved:0,...research.usage};
  const event={schemaVersion:1,sequence:(research.progressEvents?.at(-1)?.sequence||0)+1,type,
    message:String(message||'').slice(0,200),at,pagesPlanned:research.plan?.targets?.length||research.plan?.urls?.length||0,
    pagesAttempted:usage.pagesAttempted,pagesSaved:usage.pagesSaved};
  research.progressEvents=[...(research.progressEvents||[]),event].slice(-MAX_PROGRESS_EVENTS);
  research.progress=event;
}

function researchFor(workspace) {
  if(!workspace.research||workspace.research.schemaVersion!==1)throw new ResearchError('NO_RESEARCH','Start with a company name first.');
  return workspace.research;
}

function assertWritable(workspace) {
  if(workspace.status==='archived')throw new ResearchError('ARCHIVED','Restore this workspace before researching it.');
  if(workspace.status!=='draft')throw new ResearchError('PROFILE_EXISTS','Use a reviewable refresh proposal for an existing profile.');
  return researchFor(workspace);
}

function normalizeResearchUrl(value,ownerDomain) {
  let url;
  try {url=new URL(String(value||''));} catch {return null;}
  const host=url.hostname.toLowerCase().replace(/^www\./,'');
  const domain=String(ownerDomain||'').toLowerCase().replace(/^www\./,'');
  if(url.protocol!=='https:'||url.username||url.password||(url.port&&url.port!=='443')||!domain||!(host===domain||host.endsWith(`.${domain}`)))return null;
  url.hash='';
  for(const key of [...url.searchParams.keys()])if(/^utm_|^(?:gclid|fbclid|mc_cid|mc_eid)$/i.test(key))url.searchParams.delete(key);
  url.searchParams.sort();
  return url.href.length<=2000?url.href:null;
}

function discoveryQueries(candidate) {
  const name=String(candidate.name||'').replace(/["\r\n]/g,' ').slice(0,120);
  const domain=String(candidate.domain||'').slice(0,253);
  return [
    `site:${domain} "${name}" product platform solutions pricing`,
    `site:${domain} "${name}" customers "case studies" about careers`,
    `"${name}" "${domain}" alternatives vs raises hiring Greenhouse Lever Ashby SEC EDGAR`
  ];
}

function isCustomerStory(value) {
  const pathname=new URL(value).pathname;
  return /\/(?:customers?|case-stud(?:y|ies)|customer-stories|stories)\/(?!case-studies\/?$)[^/]+|\/blog\/case-study-/i.test(pathname);
}
function isComparisonPath(value) {
  return /(?:^|[-/])(?:compare|comparisons?|alternatives?|vs)(?:[-/]|$)/i.test(new URL(value).pathname);
}
function rankUrl(url,candidate) {
  const parsed=new URL(url),pathname=parsed.pathname.toLowerCase();
  if(pathname==='/'&&(!candidate||parsed.hostname.replace(/^www\./,'')===candidate.domain))return 0;
  if(/sitemap[^/]*\.xml$/.test(pathname))return 1;
  if(LOW_PRIORITY_PATH_PATTERN.test(pathname))return 50;
  if(isCustomerStory(url))return 8;
  if(isComparisonPath(url)&&(!/^\/blog\//.test(pathname)||!candidate||pathname.includes(candidate.domain.split('.')[0])))return 3;
  if(!/^\/(?:blog|resources|docs)\//.test(pathname)&&/(?:^|\/)(?:about(?:-us)?|company|pricing|how-it-works|security|trust)(?:\/|$)/.test(pathname))return 2;
  if(/(?:^|\/)(?:customers?|case-stud(?:y|ies)|customer-stories|stories|enterprise)(?:\/|$)/.test(pathname))return 4;
  if(/product|platform|solution/.test(pathname))return 7;
  if(/career|jobs?/.test(pathname))return 9;
  return 10;
}
function limitStoryTargets(completed,pending) {
  let stories=completed.filter(target=>isCustomerStory(target.url)).length;
  return pending.filter(target=>!isCustomerStory(target.url)||stories++<MAX_CUSTOMER_STORIES);
}

function compactIdentity(value) {return String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,'');}
function identityKeys(candidate) {
  const domainLabel=String(candidate.domain||'').toLowerCase().split('.')[0];
  const name=String(candidate.name||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const generic=new Set(['the','and','company','corporation','corp','inc','llc','ltd','limited','technologies','technology']);
  return [...new Set([compactIdentity(domainLabel),compactIdentity(name),...name.split(/\s+/).filter(token=>token.length>=4&&!generic.has(token)).map(compactIdentity)].filter(key=>key.length>=4))];
}
function rowTiesToCandidate(row,candidate) {
  const haystack=` ${String(row?.title||'')} ${String(row?.snippet||'')} `.toLowerCase().replace(/[^a-z0-9]+/g,' ');
  return identityKeys(candidate).some(key=>new RegExp(`(?:^|\\s)${key}(?:\\s|$)`).test(haystack));
}
function atsPathTiesToCandidate(parsed,candidate) {
  let segment;
  try {segment=compactIdentity(decodeURIComponent(parsed.pathname.split('/').filter(Boolean)[0]||''));} catch {return false;}
  return Boolean(segment&&identityKeys(candidate).some(key=>segment===key||segment===`${key}inc`||segment===`${key}jobs`||segment===`${key}careers`));
}
function normalizeExternalResearchUrl(value) {
  let parsed;
  try {parsed=new URL(String(value||''));} catch {return null;}
  const host=parsed.hostname.toLowerCase().replace(/^www\.(?!sec\.gov$)/,'');
  if(parsed.protocol!=='https:'||parsed.username||parsed.password||(parsed.port&&parsed.port!=='443')||!EXTERNAL_RESEARCH_HOSTS.has(host)||BLOCKED_PAGE_EXTENSION.test(parsed.pathname))return null;
  parsed.hash='';
  for(const key of [...parsed.searchParams.keys()])if(/^utm_|^(?:gclid|fbclid|mc_cid|mc_eid)$/i.test(key))parsed.searchParams.delete(key);
  parsed.searchParams.sort();
  return parsed.href.length<=2000?parsed:null;
}
function externalTargetForRow(candidate,row) {
  const parsed=normalizeExternalResearchUrl(row?.url||row?.link),settings=parsed&&EXTERNAL_RESEARCH_HOSTS.get(parsed.hostname.toLowerCase());
  if(!parsed||!settings||!rowTiesToCandidate(row,candidate))return null;
  if(settings.kind==='sec_edgar') {
    if(!/^\/(?:Archives\/edgar|edgar|ixviewer)\//i.test(parsed.pathname))return null;
  } else if(!atsPathTiesToCandidate(parsed,candidate))return null;
  return {schemaVersion:1,url:parsed.href,source:settings.source,kind:settings.kind,expectedHost:parsed.hostname.toLowerCase(),
    searchTitle:String(row?.title||'').slice(0,300),searchSnippet:String(row?.snippet||'').slice(0,500)};
}
function internalTarget(candidate,value) {
  const normalized=normalizeResearchUrl(value,candidate.domain);
  if(!normalized||BLOCKED_PAGE_EXTENSION.test(new URL(normalized).pathname))return null;
  const path=new URL(normalized).pathname;
  const kind=/sitemap[^/]*\.xml$/i.test(path)?'seller_sitemap':LOW_PRIORITY_PATH_PATTERN.test(path)?'seller_partner_page':
    /(?:^|\/)(?:customers?|case-stud(?:y|ies)|customer-stories|stories)(?:\/|$)/i.test(path)?'seller_customer_page':
      /(?:^|\/)(?:compare|comparisons|alternatives?)(?:\/|$)|(?:^|[-/])vs(?:[-/]|$)/i.test(path)?'seller_comparison_page':'seller_site';
  return {schemaVersion:1,url:normalized,source:'seller_site',kind,expectedHost:candidate.domain};
}
function targetRank(target,candidate) {
  if(target.source==='seller_site')return rankUrl(target.url,candidate);
  if(target.kind?.endsWith('_jobs'))return 8;
  if(target.kind==='sec_edgar')return 9;
  return 10;
}
function mergeTargets(candidate,current,added,visited=[]) {
  const unique=new Map();
  for(const raw of [...current,...added]) {
    const target=typeof raw==='string'?internalTarget(candidate,raw):raw;
    if(target?.url&&!unique.has(target.url))unique.set(target.url,target);
  }
  const visitedSet=new Set(visited),values=[...unique.values()];
  const completed=values.filter(target=>visitedSet.has(target.url));
  const pending=values.filter(target=>!visitedSet.has(target.url)).sort((a,b)=>targetRank(a,candidate)-targetRank(b,candidate)||a.url.localeCompare(b.url));
  return [...completed,...limitStoryTargets(completed,pending)].slice(0,MAX_FETCHED_PAGES);
}
function selectResearchTargets(candidate,rows) {
  const homepage=internalTarget(candidate,candidate.website);
  const sitemap=internalTarget(candidate,new URL('/sitemap.xml',candidate.website).href);
  const common=COMMON_SELLER_PATHS.map(value=>internalTarget(candidate,new URL(value,candidate.website).href));
  const discovered=[];
  for(const row of rows) {
    const target=internalTarget(candidate,row?.url||row?.link)||externalTargetForRow(candidate,row);
    if(target)discovered.push(target);
  }
  return mergeTargets(candidate,[],[homepage,sitemap,...common,...discovered].filter(Boolean));
}
function selectResearchUrls(candidate,rows) {
  return selectResearchTargets(candidate,rows).map(target=>target.url);
}
function decodeMarkupUrl(value) {
  return String(value||'').replace(/&amp;/gi,'&').replace(/&#38;/g,'&').replace(/&quot;/gi,'"').replace(/&#39;/g,"'").trim();
}
function relevantInternalTarget(candidate,value,baseUrl,{allowSitemap=false}={}) {
  let absolute;
  try {absolute=new URL(decodeMarkupUrl(value),baseUrl).href;} catch {return null;}
  const target=internalTarget(candidate,absolute);
  if(!target)return null;
  const path=new URL(target.url).pathname;
  return path==='/'||RESEARCH_PATH_PATTERN.test(path)||(allowSitemap&&/sitemap[^/]*\.xml$/i.test(path))?target:null;
}
function homepageTargets(candidate,html,baseUrl) {
  const markup=String(html||'').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'');
  const targets=[],pattern=/<(?:a|link)\b[^>]*?\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;let match;
  while((match=pattern.exec(markup))&&targets.length<5000) {
    const target=relevantInternalTarget(candidate,match[1]??match[2]??match[3],baseUrl,{allowSitemap:true});
    if(target)targets.push(target);
  }
  return targets;
}
function sitemapTargets(candidate,xml,baseUrl) {
  const targets=[],pattern=/<loc\b[^>]*>([\s\S]*?)<\/loc>/gi;let match;
  while((match=pattern.exec(String(xml||'')))&&targets.length<5000) {
    const target=relevantInternalTarget(candidate,match[1],baseUrl,{allowSitemap:true});
    if(target)targets.push(target);
  }
  return targets;
}
function targetsFromFetchedPage(candidate,target,page) {
  const parsed=new URL(target.url),isHomepage=target.source==='seller_site'&&parsed.origin===new URL(candidate.website).origin&&parsed.pathname==='/';
  if(isHomepage)return homepageTargets(candidate,page.text,page.url);
  if(target.kind==='seller_sitemap')return sitemapTargets(candidate,page.text,page.url);
  if(target.kind==='seller_customer_page'||target.kind==='seller_comparison_page')return homepageTargets(candidate,page.text,page.url);
  return [];
}
function restoredTargets(candidate,plan) {
  const raw=Array.isArray(plan?.targets)?plan.targets:Array.isArray(plan?.urls)?plan.urls:[];
  const targets=[];
  for(const item of raw) {
    if(typeof item==='string') {const target=internalTarget(candidate,item);if(target)targets.push(target);continue;}
    const internal=internalTarget(candidate,item?.url);
    if(internal) {targets.push(internal);continue;}
    const external=externalTargetForRow(candidate,{url:item?.url,title:item?.searchTitle,snippet:item?.searchSnippet});
    if(external)targets.push(external);
  }
  return mergeTargets(candidate,[],targets);
}
function finalFetchedUrl(candidate,target,value) {
  if(target.source==='seller_site')return normalizeResearchUrl(value,candidate.domain);
  const parsed=normalizeExternalResearchUrl(value),expected=String(target.expectedHost||'').toLowerCase();
  if(!parsed||parsed.hostname.toLowerCase()!==expected)return null;
  const settings=EXTERNAL_RESEARCH_HOSTS.get(expected);
  if(!settings||settings.source!==target.source||settings.kind!==target.kind)return null;
  if(settings.kind==='sec_edgar'&&!/^\/(?:Archives\/edgar|edgar|ixviewer)\//i.test(parsed.pathname))return null;
  if(settings.kind!=='sec_edgar'&&!atsPathTiesToCandidate(parsed,candidate))return null;
  return parsed.href;
}

function titleFromHtml(html) {
  return stripHtml(String(html||'').match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'').slice(0,300);
}

function truncateUtf8(value,maxBytes) {
  const bytes=Buffer.from(String(value||''));
  if(bytes.length<=maxBytes)return String(value||'');
  return bytes.subarray(0,maxBytes).toString('utf8').replace(/\uFFFD$/,'').trimEnd();
}

function createResearchCoordinator({
  read,mutate,env=process.env,
  runtimeFactory=options=>new CollectorRuntime(options),searchFn=search,
  now=()=>new Date().toISOString(),randomId=randomUUID
}={}) {
  if(typeof read!=='function'||typeof mutate!=='function')throw new Error('A serialized persistent state adapter is required');
  const pending=new Map();let serial=Promise.resolve();

  const current=id=>getWorkspace(read(),id);
  const result=id=>structuredClone(researchFor(current(id)));
  const update=async(id,fn)=>mutate(state=>updateWorkspace(state,id,workspace=>{
    const research=assertWritable(workspace);fn(research,workspace);touch(research,now());return workspace;
  }));

  async function markConfiguration(id,error) {
    try {await update(id,research=>{research.status='configuration_required';research.error=safeError(error);});} catch {}
  }

  async function reserveQuery(id,runId,config) {
    const month=now().slice(0,7);
    await mutate(state=>{
      const workspace=getWorkspace(state,id),research=assertWritable(workspace);
      if(research.runId!==runId)throw new ResearchError('STALE_RUN','A newer research run replaced this one.');
      const usage=research.usage||{};
      if(!Number.isSafeInteger(usage.queriesReserved)||usage.queriesReserved<0)usage.queriesReserved=0;
      if(usage.queriesReserved>=Math.min(config.perRunLimit,MAX_SERPER_QUERIES))throw new ResearchError('RUN_BUDGET_EXHAUSTED','This research run reached its Serper query limit.');
      let total=0;
      for(const item of Object.values(state.workspaces)) {
        const saved=item.budgets?.serper;
        if(saved?.month!==month)continue;
        if(!Number.isSafeInteger(saved.queries)||saved.queries<0)throw new ResearchError('INVALID_BUDGET','Saved Serper usage is invalid; research is blocked.');
        total+=saved.queries;
      }
      if(!Number.isSafeInteger(total)||total>=config.monthlyLimit)throw new ResearchError('MONTHLY_BUDGET_EXHAUSTED','The configured Serper monthly query limit has been reached.');
      return updateWorkspace(state,id,w=>{
        const r=assertWritable(w);
        if(r.runId!==runId)throw new ResearchError('STALE_RUN','A newer research run replaced this one.');
        const saved=w.budgets.serper?.month===month?w.budgets.serper:{schemaVersion:1,month,queries:0};
        w.budgets.serper={...saved,queries:saved.queries+1};
        r.usage={queriesReserved:0,pagesAttempted:0,pagesSaved:0,storedChars:0,storedBytes:0,...r.usage,queriesReserved:usage.queriesReserved+1};
        touch(r,now());
      });
    });
  }

  async function fail(id,runId,phase,error) {
    const safe=safeError(error);
    try {await update(id,research=>{
      if(research.runId!==runId)throw new ResearchError('STALE_RUN','A newer research run replaced this one.');
      research.status='failed';research.error=safe;setStep(research,phase,'failed',safe.message);
    });} catch(failure) {if(failure.code!=='ARCHIVED'&&failure.code!=='STALE_RUN')throw failure;}
    throw Object.assign(new ResearchError(safe.code,safe.message),{cause:error});
  }

  function queue(id,work) {
    if(pending.has(id))return pending.get(id);
    const operation=serial.then(work);
    serial=operation.catch(()=>{});
    const tracked=operation.finally(()=>{if(pending.get(id)===tracked)pending.delete(id);});
    pending.set(id,tracked);return tracked;
  }

  async function begin(id,phase,{newRun=false}={}) {
    let runId;
    await update(id,research=>{
      if(newRun||!research.runId)research.runId=randomId();
      runId=research.runId;
      if(newRun)research.progressEvents=[];
      research.startedAt=research.startedAt||now();research.completedAt=null;research.error=null;
      research.usage=newRun||!research.usage?{queriesReserved:0,pagesAttempted:0,pagesSaved:0,storedChars:0,storedBytes:0}:research.usage;
      research.status=phase==='identify'?'identifying':'researching';setStep(research,phase,'running');
      emitProgress(research,phase==='identify'?'identify_started':'research_started',phase==='identify'?'Finding possible official websites.':'Starting bounded public-page collection.',now());
    });
    return runId;
  }

  async function identify(id,config) {
    const before=current(id),saved=assertWritable(before);
    const runId=await begin(id,'identify',{newRun:!saved.runId||!['identifying','queued'].includes(saved.status)});
    try {
      const runtime=runtimeFactory({env});
      await reserveQuery(id,runId,config);
      const name=researchFor(current(id)).companyName;
      const resolved=await resolveSeller({name,website:''},{runtime,env,searchFn:(query,options)=>searchFn(query,{...options,num:10,enforceEnabled:true})});
      const candidates=(resolved.candidates||[]).slice(0,MAX_CANDIDATES);
      await update(id,(research,workspace)=>{
        if(research.runId!==runId)throw new ResearchError('STALE_RUN','A newer research run replaced this one.');
        research.candidates=candidates;research.error=null;
        if(!candidates.length) {
          research.status='failed';research.error={code:'NO_CANDIDATES',message:'No official-company candidates were found. Try again or use the manual fallback.'};
          setStep(research,'identify','failed',research.error.message);
          emitProgress(research,'identify_failed',research.error.message,now());
        } else {
          research.status='confirmation_required';setStep(research,'identify','complete');
          workspace.onboarding={schemaVersion:1,status:'confirmation_required',name:research.companyName,candidates:structuredClone(candidates)};
          emitProgress(research,'candidates_ready',`${candidates.length} possible official ${candidates.length===1?'website':'websites'} ready for confirmation.`,now());
        }
      });
      return result(id);
    } catch(error) {return fail(id,runId,'identify',error);}
  }

  function restoreCollectorUsage(runtime,workspace) {
    const day=now().slice(0,10),saved=workspace.budgets.collector;
    if(saved?.day===day) {
      if(saved.usage&&runtime.usage)runtime.usage={...runtime.usage,...structuredClone(saved.usage)};
      if(saved.health&&runtime.health)runtime.health=structuredClone(saved.health);
    }
    return day;
  }

  function collectorSnapshot(runtime,day) {
    if(typeof runtime.snapshot!=='function')return null;
    return {...runtime.snapshot(),day};
  }

  async function persistPlan(id,runId,targets,warnings) {
    await update(id,research=>{
      if(research.runId!==runId)throw new ResearchError('STALE_RUN','A newer research run replaced this one.');
      research.plan={schemaVersion:1,runId,urls:targets.map(target=>target.url),targets:structuredClone(targets),createdAt:now()};
      research.visitedUrls=[];research.pageErrors=[];research.warnings=warnings.slice(0,10);
      emitProgress(research,'plan_ready',`${targets.length} bounded public ${targets.length===1?'page':'pages'} planned.`,now());
    });
  }

  async function collect(id,config) {
    const saved=assertWritable(current(id));
    if(!saved.selectedCandidate)throw new ResearchError('CONFIRMATION_REQUIRED','Confirm the company before collecting public pages.');
    const runId=await begin(id,'research',{newRun:!saved.runId});
    try {
      const workspace=current(id),savedResearch=researchFor(workspace),candidate={...savedResearch.selectedCandidate,name:savedResearch.companyName||savedResearch.selectedCandidate.name};
      const runtime=runtimeFactory({env});const day=restoreCollectorUsage(runtime,workspace);
      let research=result(id),targets=research.plan?.runId===runId?restoredTargets(candidate,research.plan):null;
      if(!Array.isArray(targets)) {
        const rows=[],warnings=[];
        for(const query of discoveryQueries(candidate)) {
          research=result(id);
          if((research.usage?.queriesReserved||0)>=Math.min(config.perRunLimit,MAX_SERPER_QUERIES))break;
          try {
            await reserveQuery(id,runId,config);
            rows.push(...await searchFn(query,{runtime,env,num:10,enforceEnabled:true}));
          } catch(error) {warnings.push(safeError(error));break;}
        }
        targets=selectResearchTargets(candidate,rows);
        await persistPlan(id,runId,targets,warnings);
      }
      while(true) {
        research=result(id);
        if(research.runId!==runId)throw new ResearchError('STALE_RUN','A newer research run replaced this one.');
        if((research.usage?.pagesAttempted||0)>=Math.min(config.pageLimit,MAX_FETCHED_PAGES))break;
        targets=restoredTargets(candidate,research.plan);
        const target=targets.find(item=>!(research.visitedUrls||[]).includes(item.url));
        if(!target)break;
        await update(id,r=>{
          if(r.runId!==runId)throw new ResearchError('STALE_RUN','A newer research run replaced this one.');
          r.usage={queriesReserved:0,pagesAttempted:0,pagesSaved:0,storedChars:0,storedBytes:0,...r.usage,pagesAttempted:(r.usage?.pagesAttempted||0)+1};
          emitProgress(r,'page_started','Checking another planned public page.',now());
        });
        try {
          const page=await runtime.request(target.source,target.url,{allowedRedirectDomain:target.source==='seller_site'?candidate.domain:target.expectedHost});
          const finalUrl=finalFetchedUrl(candidate,target,page.url);
          if(!finalUrl)throw new ResearchError('OFF_DOMAIN_REDIRECT','The page redirected away from its approved research host.');
          const discoveredTargets=targetsFromFetchedPage(candidate,target,{...page,url:finalUrl});
          const latest=result(id),remaining=Math.max(0,MAX_STORED_TEXT_PER_RUN-(latest.usage?.storedBytes??latest.usage?.storedChars??0));
          const text=truncateUtf8(stripHtml(page.text),Math.min(MAX_STORED_TEXT_PER_PAGE,remaining));
          if(!text)throw new ResearchError('EMPTY_PAGE','This public page had no readable text.');
          const storedBytes=Buffer.byteLength(text);
          await mutate(state=>{
            const base=getWorkspace(state,id),r=assertWritable(base);
            if(r.runId!==runId)throw new ResearchError('STALE_RUN','A newer research run replaced this one.');
            const recorded=recordSource(state,{url:finalUrl,fetchedAt:page.fetchedAt,title:titleFromHtml(page.text),text});
            return updateWorkspace(recorded.state,id,w=>{
              const currentResearch=assertWritable(w);
              if(currentResearch.runId!==runId)throw new ResearchError('STALE_RUN','A newer research run replaced this one.');
              const metadata={schemaVersion:1,sourceId:recorded.source.id,url:recorded.source.url,title:recorded.source.title,
                fetchedAt:recorded.source.fetchedAt,kind:target.kind,ownerDomain:candidate.domain,chars:text.length,bytes:storedBytes};
              const sources=Array.isArray(currentResearch.sources)?currentResearch.sources:[];
              currentResearch.sources=[...sources.filter(item=>(typeof item==='string'?item:item.sourceId)!==metadata.sourceId),metadata];
              currentResearch.visitedUrls=[...new Set([...(currentResearch.visitedUrls||[]),target.url])].slice(0,MAX_FETCHED_PAGES);
              const merged=mergeTargets(candidate,restoredTargets(candidate,currentResearch.plan),discoveredTargets,currentResearch.visitedUrls);
              currentResearch.plan={...currentResearch.plan,urls:merged.map(item=>item.url),targets:structuredClone(merged)};
              currentResearch.usage={queriesReserved:0,pagesAttempted:0,pagesSaved:0,storedChars:0,storedBytes:0,...currentResearch.usage,
                pagesSaved:(currentResearch.usage?.pagesSaved||0)+1,storedChars:(currentResearch.usage?.storedChars||0)+text.length,
                storedBytes:(currentResearch.usage?.storedBytes??currentResearch.usage?.storedChars??0)+storedBytes};
              const snapshot=collectorSnapshot(runtime,day);if(snapshot)w.budgets.collector=snapshot;
              emitProgress(currentResearch,'page_saved','Saved a public page and checked it for additional relevant links.',now());
              touch(currentResearch,now());
            });
          });
        } catch(error) {
          const safe=safeError(error);
          if(['ARCHIVED','STALE_RUN'].includes(safe.code))throw error;
          await update(id,(r,w)=>{
            if(r.runId!==runId)throw new ResearchError('STALE_RUN','A newer research run replaced this one.');
            r.visitedUrls=[...new Set([...(r.visitedUrls||[]),target.url])].slice(0,MAX_FETCHED_PAGES);
            r.pageErrors=[...(r.pageErrors||[]),{url:target.url,code:safe.code,message:safe.message}].slice(-MAX_FETCHED_PAGES);
            const snapshot=collectorSnapshot(runtime,day);if(snapshot)w.budgets.collector=snapshot;
            emitProgress(r,'page_failed','A planned page could not be saved; collection continued.',now());
          });
        }
      }
      research=result(id);
      if(!(research.sources||[]).length)throw new ResearchError('NO_SOURCES','No readable public company pages could be saved.');
      await update(id,r=>{
        if(r.runId!==runId)throw new ResearchError('STALE_RUN','A newer research run replaced this one.');
        r.status='evidence_ready';r.completedAt=now();r.error=null;setStep(r,'research','complete');setStep(r,'draft','not_started');
        emitProgress(r,'evidence_ready',`${r.usage?.pagesSaved||0} public ${r.usage?.pagesSaved===1?'page':'pages'} saved for review.`,now());
      });
      return result(id);
    } catch(error) {return fail(id,runId,'research',error);}
  }

  async function start(id) {
    const workspace=current(id),research=assertWritable(workspace);
    if(research.status==='confirmation_required'||research.status==='evidence_ready')return structuredClone(research);
    if(research.status==='failed')throw new ResearchError('RETRY_REQUIRED','Use retry to start a new bounded research run.');
    const config=serperSettings(env);
    try {assertSerperReady(config);} catch(error) {await markConfiguration(id,error);throw error;}
    return queue(id,()=>research.selectedCandidate?collect(id,config):identify(id,config));
  }

  async function confirm(id,candidateId,revision,{wait=true,requireActive=false}={}) {
    const config=serperSettings(env);
    assertSerperReady(config);
    await mutate(state=>updateWorkspace(state,id,workspace=>{
      if(requireActive&&state.activeWorkspaceId!==id)throw new ResearchError('WORKSPACE_CHANGED','Workspace changed. Refresh and try again.');
      const research=assertWritable(workspace);
      if(research.status!=='confirmation_required')throw new ResearchError('CONFIRMATION_UNAVAILABLE','Company confirmation is not available for this run.');
      if(String(research.revision||0)!==String(revision))throw new ResearchError('STALE_REVISION','Research changed. Refresh before confirming the company.');
      const candidate=research.candidates?.find(item=>item.id===candidateId);
      if(!candidate)throw new ResearchError('INVALID_CANDIDATE','Choose one of the listed company candidates.');
      research.selectedCandidate=structuredClone(candidate);research.status='queued';research.error=null;
      workspace.onboarding={schemaVersion:1,status:'selected',name:research.companyName,candidates:structuredClone(research.candidates),selectedCandidate:structuredClone(candidate)};
      touch(research,now());return workspace;
    }));
    const operation=queue(id,()=>collect(id,config));
    if(wait)return operation;
    // The HTTP route returns as soon as the guarded selection is saved. The
    // bounded collection job keeps running locally and records its own errors.
    void operation.catch(()=>{});
    return result(id);
  }

  async function retry(id,{wait=true,requireActive=false}={}) {
    const config=serperSettings(env);
    try {assertSerperReady(config);} catch(error) {await markConfiguration(id,error);throw error;}
    await mutate(state=>{
      if(requireActive&&state.activeWorkspaceId!==id)throw new ResearchError('WORKSPACE_CHANGED','Workspace changed. Refresh and try again.');
      return updateWorkspace(state,id,workspace=>{
        const research=assertWritable(workspace);
        if(!['failed','configuration_required'].includes(research.status))throw new ResearchError('RETRY_UNAVAILABLE','This research run does not need a retry.');
        research.runId=randomId();research.status='queued';research.error=null;research.completedAt=null;
        research.usage={queriesReserved:0,pagesAttempted:0,pagesSaved:0,storedChars:0,storedBytes:0};
        research.plan=null;research.visitedUrls=[];research.pageErrors=[];research.warnings=[];research.sources=[];research.facts=[];research.icp=null;research.progress=null;research.progressEvents=[];
        setStep(research,'identify',research.selectedCandidate||research.candidates?.length?'complete':'not_started');
        setStep(research,'research','not_started');setStep(research,'draft','not_started');touch(research,now());
        return workspace;
      });
    });
    const operation=queue(id,()=>result(id).selectedCandidate?collect(id,config):identify(id,config));
    if(wait)return operation;
    void operation.catch(()=>{});
    return result(id);
  }

  async function resumePending() {
    const state=read(),tasks=[];
    for(const workspace of Object.values(state.workspaces)) {
      if(workspace.status==='archived'||!workspace.research)continue;
      if(['queued','identifying','researching'].includes(workspace.research.status))tasks.push(start(workspace.id));
    }
    return Promise.allSettled(tasks);
  }

  return {start,confirm,retry,resumePending,status:result,isRunning:id=>pending.has(id)};
}

module.exports={
  createResearchCoordinator,ResearchError,safeError,normalizeResearchUrl,selectResearchTargets,selectResearchUrls,discoveryQueries,
  homepageTargets,sitemapTargets,externalTargetForRow,rankUrl,titleFromHtml,truncateUtf8,internalTarget,isComparisonPath,isCustomerStory,MAX_CUSTOMER_STORIES,
  COMMON_SELLER_PATHS,LOW_PRIORITY_PATH_PATTERN,MAX_CANDIDATES,MAX_SERPER_QUERIES,MAX_FETCHED_PAGES,MAX_STORED_TEXT_PER_PAGE,MAX_STORED_TEXT_PER_RUN
};
