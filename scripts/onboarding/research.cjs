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
    `site:${domain} ${name} product platform solutions`,
    `site:${domain} ${name} customers case studies pricing`,
    `site:${domain} ${name} industries about security`
  ];
}

function rankUrl(url,candidate) {
  const parsed=new URL(url),path=parsed.pathname.toLowerCase();
  if(parsed.origin===new URL(candidate.website).origin&&path==='/')return 0;
  if(/customer|case-stud/.test(path))return 1;
  if(/product|platform|solution/.test(path))return 2;
  if(/pricing/.test(path))return 3;
  if(/industr|about|security/.test(path))return 4;
  return 5;
}

function selectResearchUrls(candidate,rows) {
  const values=[candidate.website,...rows.map(row=>row?.url||row?.link)];
  const unique=new Map();
  for(const value of values) {
    const normalized=normalizeResearchUrl(value,candidate.domain);
    if(normalized&&!unique.has(normalized))unique.set(normalized,normalized);
  }
  return [...unique.values()].sort((a,b)=>rankUrl(a,candidate)-rankUrl(b,candidate)||a.localeCompare(b)).slice(0,MAX_FETCHED_PAGES);
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
      research.startedAt=research.startedAt||now();research.completedAt=null;research.error=null;
      research.usage=newRun||!research.usage?{queriesReserved:0,pagesAttempted:0,pagesSaved:0,storedChars:0,storedBytes:0}:research.usage;
      research.status=phase==='identify'?'identifying':'researching';setStep(research,phase,'running');
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
        } else {
          research.status='confirmation_required';setStep(research,'identify','complete');
          workspace.onboarding={schemaVersion:1,status:'confirmation_required',name:research.companyName,candidates:structuredClone(candidates)};
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

  async function persistPlan(id,runId,urls,warnings) {
    await update(id,research=>{
      if(research.runId!==runId)throw new ResearchError('STALE_RUN','A newer research run replaced this one.');
      research.plan={schemaVersion:1,runId,urls,createdAt:now()};
      research.visitedUrls=[];research.pageErrors=[];research.warnings=warnings.slice(0,10);
    });
  }

  async function collect(id,config) {
    const saved=assertWritable(current(id));
    if(!saved.selectedCandidate)throw new ResearchError('CONFIRMATION_REQUIRED','Confirm the company before collecting public pages.');
    const runId=await begin(id,'research',{newRun:!saved.runId});
    try {
      const workspace=current(id),candidate=researchFor(workspace).selectedCandidate;
      const runtime=runtimeFactory({env});const day=restoreCollectorUsage(runtime,workspace);
      let research=result(id),urls=research.plan?.runId===runId?research.plan.urls:null;
      if(!Array.isArray(urls)) {
        const rows=[],warnings=[];
        for(const query of discoveryQueries(candidate)) {
          research=result(id);
          if((research.usage?.queriesReserved||0)>=Math.min(config.perRunLimit,MAX_SERPER_QUERIES))break;
          try {
            await reserveQuery(id,runId,config);
            rows.push(...await searchFn(query,{runtime,env,num:10,enforceEnabled:true}));
          } catch(error) {warnings.push(safeError(error));break;}
        }
        urls=selectResearchUrls(candidate,rows);
        await persistPlan(id,runId,urls,warnings);
      }
      for(const url of urls.slice(0,Math.min(config.pageLimit,MAX_FETCHED_PAGES))) {
        research=result(id);
        if(research.runId!==runId)throw new ResearchError('STALE_RUN','A newer research run replaced this one.');
        if((research.visitedUrls||[]).includes(url))continue;
        if((research.usage?.pagesAttempted||0)>=Math.min(config.pageLimit,MAX_FETCHED_PAGES))break;
        await update(id,r=>{
          if(r.runId!==runId)throw new ResearchError('STALE_RUN','A newer research run replaced this one.');
          r.usage={queriesReserved:0,pagesAttempted:0,pagesSaved:0,storedChars:0,storedBytes:0,...r.usage,pagesAttempted:(r.usage?.pagesAttempted||0)+1};
        });
        try {
          const page=await runtime.request('seller_site',url,{allowedRedirectDomain:candidate.domain});
          if(!normalizeResearchUrl(page.url,candidate.domain))throw new ResearchError('OFF_DOMAIN_REDIRECT','The page redirected away from the confirmed company domain.');
          const latest=result(id),remaining=Math.max(0,MAX_STORED_TEXT_PER_RUN-(latest.usage?.storedBytes??latest.usage?.storedChars??0));
          const text=truncateUtf8(stripHtml(page.text),Math.min(MAX_STORED_TEXT_PER_PAGE,remaining));
          if(!text)throw new ResearchError('EMPTY_PAGE','This public page had no readable text.');
          const storedBytes=Buffer.byteLength(text);
          await mutate(state=>{
            const base=getWorkspace(state,id),r=assertWritable(base);
            if(r.runId!==runId)throw new ResearchError('STALE_RUN','A newer research run replaced this one.');
            const recorded=recordSource(state,{url:page.url,fetchedAt:page.fetchedAt,title:titleFromHtml(page.text),text});
            return updateWorkspace(recorded.state,id,w=>{
              const currentResearch=assertWritable(w);
              if(currentResearch.runId!==runId)throw new ResearchError('STALE_RUN','A newer research run replaced this one.');
              const metadata={schemaVersion:1,sourceId:recorded.source.id,url:recorded.source.url,title:recorded.source.title,
                fetchedAt:recorded.source.fetchedAt,kind:'seller_site',ownerDomain:candidate.domain,chars:text.length,bytes:storedBytes};
              const sources=Array.isArray(currentResearch.sources)?currentResearch.sources:[];
              currentResearch.sources=[...sources.filter(item=>(typeof item==='string'?item:item.sourceId)!==metadata.sourceId),metadata];
              currentResearch.visitedUrls=[...new Set([...(currentResearch.visitedUrls||[]),url])].slice(0,MAX_FETCHED_PAGES);
              currentResearch.usage={queriesReserved:0,pagesAttempted:0,pagesSaved:0,storedChars:0,storedBytes:0,...currentResearch.usage,
                pagesSaved:(currentResearch.usage?.pagesSaved||0)+1,storedChars:(currentResearch.usage?.storedChars||0)+text.length,
                storedBytes:(currentResearch.usage?.storedBytes??currentResearch.usage?.storedChars??0)+storedBytes};
              const snapshot=collectorSnapshot(runtime,day);if(snapshot)w.budgets.collector=snapshot;
              touch(currentResearch,now());
            });
          });
        } catch(error) {
          const safe=safeError(error);
          if(['ARCHIVED','STALE_RUN'].includes(safe.code))throw error;
          await update(id,(r,w)=>{
            if(r.runId!==runId)throw new ResearchError('STALE_RUN','A newer research run replaced this one.');
            r.visitedUrls=[...new Set([...(r.visitedUrls||[]),url])].slice(0,MAX_FETCHED_PAGES);
            r.pageErrors=[...(r.pageErrors||[]),{url,code:safe.code,message:safe.message}].slice(-MAX_FETCHED_PAGES);
            const snapshot=collectorSnapshot(runtime,day);if(snapshot)w.budgets.collector=snapshot;
          });
        }
      }
      research=result(id);
      if(!(research.sources||[]).length)throw new ResearchError('NO_SOURCES','No readable public company pages could be saved.');
      await update(id,r=>{
        if(r.runId!==runId)throw new ResearchError('STALE_RUN','A newer research run replaced this one.');
        r.status='evidence_ready';r.completedAt=now();r.error=null;setStep(r,'research','complete');setStep(r,'draft','not_started');
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
        research.plan=null;research.visitedUrls=[];research.pageErrors=[];research.warnings=[];research.sources=[];research.facts=[];research.icp=null;
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
  createResearchCoordinator,ResearchError,safeError,normalizeResearchUrl,selectResearchUrls,discoveryQueries,
  MAX_CANDIDATES,MAX_SERPER_QUERIES,MAX_FETCHED_PAGES,MAX_STORED_TEXT_PER_PAGE,MAX_STORED_TEXT_PER_RUN
};
