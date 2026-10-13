const {randomUUID}=require('node:crypto');
const {getWorkspace,updateWorkspace}=require('../server/state.cjs');
const {stableId}=require('../utils.cjs');
const {serperSettings}=require('../serper.cjs');
const {settings:openAiSettings}=require('../llm.cjs');
const {REFRESH_INTERVAL_DAYS,proposeRefresh,recordRefreshFailure,validateRefreshGrounding}=require('./refresh.cjs');

const DAY_MS=24*60*60*1000;

class RefreshRunError extends Error {
  constructor(code,message){super(message);this.name='RefreshRunError';this.code=code;}
}

function refreshProvidersReady(env={}) {
  const serper=serperSettings(env),openai=openAiSettings(env);
  return Boolean(serper.enabled&&serper.keyPresent&&serper.perRunLimit&&serper.monthlyLimit&&serper.pageLimit&&
    openai.enabled&&openai.keyPresent&&openai.limitMicros&&openai.callLimit);
}

function dueAt(workspace) {
  const saved=workspace.refresh?.nextDueAt;
  if(typeof saved==='string'&&Number.isFinite(Date.parse(saved)))return saved;
  const approved=workspace.sellerProfile?.approvedAt;
  if(typeof approved!=='string'||!Number.isFinite(Date.parse(approved)))return null;
  return new Date(Date.parse(approved)+REFRESH_INTERVAL_DAYS*DAY_MS).toISOString();
}

function isRefreshDue(workspace,at=new Date().toISOString()) {
  const due=dueAt(workspace);
  return Boolean(workspace.status==='active'&&workspace.sellerProfile?.approvedAt&&!workspace.refresh?.pending&&!workspace.refresh?.running&&due&&Date.parse(due)<=Date.parse(at));
}

function refreshState(workspace) {
  return workspace.refresh?structuredClone(workspace.refresh):{
    schemaVersion:1,intervalDays:REFRESH_INTERVAL_DAYS,lastStartedAt:null,lastCompletedAt:null,nextDueAt:dueAt(workspace),pending:null,history:[]
  };
}

function selectedSeller(workspace) {
  const saved=workspace.onboarding?.selectedCandidate;
  const name=String(saved?.name||workspace.sellerProfile?.sellerName||workspace.name||'').trim();
  const domain=String(saved?.domain||workspace.sellerProfile?.domain||'').trim().toLowerCase().replace(/^www\./,'');
  if(!name||!domain)throw new RefreshRunError('SELLER_MISSING','The approved workspace has no confirmed seller identity.');
  let website;
  try {website=new URL(saved?.website||`https://${domain}`).href;} catch {throw new RefreshRunError('SELLER_MISSING','The approved workspace has no valid seller website.');}
  return {id:saved?.id||stableId(domain),name,domain,website,sourceUrl:saved?.sourceUrl||website,description:saved?.description||''};
}

function hiddenWorkspace(id,owner,runId,at) {
  const candidate=selectedSeller(owner);
  return {
    schemaVersion:1,id,name:`${candidate.name} monthly refresh`,createdAt:at,status:'draft',deliveryMode:'demo',systemRole:'seller_refresh',ownerWorkspaceId:owner.id,refreshRunId:runId,
    sellerProfile:{schemaVersion:1,deliveryAllowed:false},icpConfig:{schemaVersion:1},accounts:[],universeSeeds:[],runs:[],suppression:[],drafts:[],outcomes:[],budgets:{},
    onboarding:{schemaVersion:1,status:'selected',name:candidate.name,candidates:[candidate],selectedCandidate:candidate},
    research:{schemaVersion:1,companyName:candidate.name,status:'queued',revision:1,selectedCandidate:candidate,sources:[],visitedUrls:[],pageErrors:[],warnings:[],
      usage:{queriesReserved:0,pagesAttempted:0,pagesSaved:0,storedChars:0,storedBytes:0},
      steps:[
        {key:'identify',label:'Identify the company',status:'complete'},
        {key:'research',label:'Research public sources',status:'not_started'},
        {key:'draft',label:'Draft seller facts and ideal customers',status:'not_started'},
        {key:'review',label:'Your review and approval',status:'not_started'}
      ]}
  };
}

function safeFailureCode(error) {
  const code=String(error?.code||'REFRESH_FAILED').toUpperCase();
  return /^[A-Z0-9_]{1,64}$/.test(code)?code:'REFRESH_FAILED';
}

function createRefreshCoordinator({read,mutate,researchCoordinator,synthesisCoordinator,env=process.env,now=()=>new Date().toISOString(),randomId=randomUUID}={}) {
  if(typeof read!=='function'||typeof mutate!=='function'||!researchCoordinator||!synthesisCoordinator)throw new Error('Persistent state, research and synthesis coordinators are required');
  const pending=new Map();

  async function setRunningStage(workspaceId,runId,status) {
    await mutate(state=>updateWorkspace(state,workspaceId,workspace=>{
      if(workspace.refresh?.running?.id!==runId)throw new RefreshRunError('STALE_REFRESH','A newer monthly refresh replaced this run.');
      workspace.refresh.running={...workspace.refresh.running,status,updatedAt:now()};
    }));
  }

  async function finish(workspaceId,run) {
    await mutate(state=>{
      const workspace=getWorkspace(state,workspaceId),shadow=getWorkspace(state,run.shadowWorkspaceId);
      if(workspace.refresh?.running?.id!==run.id||shadow.refreshRunId!==run.id)throw new RefreshRunError('STALE_REFRESH','A newer monthly refresh replaced this run.');
      if(shadow.status!=='needs_review'||shadow.research?.status!=='review_required')throw new RefreshRunError('DRAFT_MISSING','The monthly refresh did not produce a reviewable draft.');
      const sourceIds=Array.isArray(shadow.sellerProfile?.sources)?shadow.sellerProfile.sources:[];
      if(!validateRefreshGrounding({state,workspaceId,sellerProfile:shadow.sellerProfile,icpConfig:shadow.icpConfig,sourceIds}))throw new RefreshRunError('GROUNDING_FAILED','The monthly refresh draft failed its final evidence check.');
      let next=proposeRefresh(state,workspaceId,{runId:run.id,sellerProfile:shadow.sellerProfile,icpConfig:shadow.icpConfig,sourceIds,now});
      next=updateWorkspace(next,workspaceId,target=>{target.refresh.running=null;});
      next=updateWorkspace(next,run.shadowWorkspaceId,target=>{
        target.archivedFromStatus=target.status;target.status='archived';target.archivedAt=now();target.completedAt=now();
      });
      return next;
    });
  }

  async function fail(workspaceId,run,error) {
    try {
      await mutate(state=>{
        let next=state;
        const workspace=Object.hasOwn(state.workspaces,workspaceId)?getWorkspace(state,workspaceId):null;
        if(workspace?.refresh?.running?.id===run.id&&workspace.status==='active'&&!workspace.refresh.pending) {
          next=recordRefreshFailure(next,workspaceId,{runId:run.id,code:safeFailureCode(error),now});
          next=updateWorkspace(next,workspaceId,target=>{target.refresh.running=null;});
        }
        if(Object.hasOwn(next.workspaces,run.shadowWorkspaceId))next=updateWorkspace(next,run.shadowWorkspaceId,target=>{
          target.archivedFromStatus=target.status;target.status='archived';target.archivedAt=now();target.refreshError={code:safeFailureCode(error),message:'Monthly refresh could not complete.'};
        });
        return next;
      });
    } catch {}
  }

  async function execute(workspaceId,run) {
    try {
      let shadow=getWorkspace(read(),run.shadowWorkspaceId);
      if(shadow.status==='draft'&&shadow.research?.status!=='evidence_ready')await researchCoordinator.start(run.shadowWorkspaceId);
      shadow=getWorkspace(read(),run.shadowWorkspaceId);
      if(shadow.status==='draft'&&shadow.research?.status==='evidence_ready'){
        await setRunningStage(workspaceId,run.id,'drafting');
        await synthesisCoordinator.start(run.shadowWorkspaceId);
      }
      await finish(workspaceId,run);
      return getWorkspace(read(),workspaceId).refresh;
    } catch(error) {
      await fail(workspaceId,run,error);
      throw error;
    }
  }

  function track(workspaceId,run) {
    if(pending.has(workspaceId))return pending.get(workspaceId);
    let operation;
    operation=execute(workspaceId,run).finally(()=>{if(pending.get(workspaceId)===operation)pending.delete(workspaceId);});
    pending.set(workspaceId,operation);return operation;
  }

  async function start(workspaceId,{force=false,wait=true}={}) {
    if(!refreshProvidersReady(env))throw new RefreshRunError('PROVIDERS_DISABLED','Monthly refresh is paused until Serper and OpenAI are explicitly enabled with approved limits.');
    if(pending.has(workspaceId))return wait?pending.get(workspaceId):getWorkspace(read(),workspaceId).refresh;
    const at=now(),runId=randomId(),shadowWorkspaceId=`refresh-${randomId()}`;
    let savedRun;
    await mutate(state=>{
      const workspace=getWorkspace(state,workspaceId);
      if(workspace.status!=='active'||!workspace.sellerProfile?.approvedAt)throw new RefreshRunError('NOT_ACTIVE','Approve the seller profile before monthly refreshes can run.');
      if(workspace.refresh?.pending)throw new RefreshRunError('REVIEW_REQUIRED','Review the pending refresh before starting another.');
      if(workspace.refresh?.running)throw new RefreshRunError('ALREADY_RUNNING','A monthly refresh is already running.');
      if(!force&&!isRefreshDue(workspace,at))throw new RefreshRunError('NOT_DUE','This workspace is not due for monthly refresh.');
      const next=structuredClone(state),shadow=hiddenWorkspace(shadowWorkspaceId,workspace,runId,at);
      next.workspaces[shadowWorkspaceId]=shadow;
      const record=refreshState(workspace);
      savedRun={schemaVersion:1,id:runId,workspaceId,shadowWorkspaceId,status:'researching',startedAt:at,updatedAt:at};
      record.lastStartedAt=at;record.running=savedRun;
      next.workspaces[workspaceId].refresh=record;
      next.auditLog.push({schemaVersion:1,id:stableId(`${workspaceId}:seller_refresh_started:${runId}`),workspaceId,type:'seller_refresh_started',occurredAt:at,actor:'system',runId});
      return next;
    });
    const operation=track(workspaceId,savedRun);
    if(!wait){void operation.catch(()=>{});return getWorkspace(read(),workspaceId).refresh;}
    return operation;
  }

  async function resumePending() {
    if(!refreshProvidersReady(env))return [];
    const state=read(),operations=[];
    for(const workspace of Object.values(state.workspaces)){
      const run=workspace.systemRole?null:workspace.refresh?.running;
      if(!run||!Object.hasOwn(state.workspaces,run.shadowWorkspaceId))continue;
      operations.push(track(workspace.id,run));
    }
    return Promise.allSettled(operations);
  }

  async function runDue() {
    if(!refreshProvidersReady(env))return [];
    const at=now(),ids=Object.values(read().workspaces).filter(workspace=>!workspace.systemRole&&isRefreshDue(workspace,at)).map(workspace=>workspace.id);
    const results=[];
    for(const id of ids)results.push(await start(id));
    return results;
  }

  return {start,resumePending,runDue,isRunning:id=>pending.has(id)};
}

module.exports={createRefreshCoordinator,RefreshRunError,refreshProvidersReady,dueAt,isRefreshDue};
