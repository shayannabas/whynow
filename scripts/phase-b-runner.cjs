'use strict';

const {randomUUID}=require('node:crypto');
const {CollectorRuntime}=require('./collectors/runtime.cjs');
const {collectHiring}=require('./collectors/hiring.cjs');
const {collectActivePain}=require('./collectors/active-pain.cjs');
const {collectSerperEvidence}=require('./collectors/search-evidence.cjs');
const {collectExecutiveChange}=require('./collectors/executive-change.cjs');
const {collectTechCulture}=require('./collectors/tech-culture.cjs');
const {collectAiCompatibility}=require('./collectors/ai-compatibility.cjs');
const {collectCompetitiveWedge}=require('./collectors/competitive-wedge.cjs');
const {collectRevenueSensitivity}=require('./collectors/revenue-sensitivity.cjs');
const {collectFirmographics}=require('./collectors/firmographics.cjs');
const {collectEdgarFormDUniverse}=require('./collectors/edgar-form-d.cjs');
const {search,searchNews,serperSettings,assertSerperReady}=require('./serper.cjs');
const {phaseBQueryPlan}=require('./collectors/search-evidence.cjs');
const {collectorConfigForWorkspace,collectorTargetForAccount}=require('./phase-b-config.cjs');
const {phaseAConfigForWorkspace}=require('./phase-a-config.cjs');
const {scoreAccount}=require('./score-account.cjs');
const {activeTriggers}=require('./decisioning.cjs');
const {decorateTrigger}=require('./collector-triggers.cjs');
const {operationalPainEvidence}=require('./collectors/active-pain.cjs');
const {evidenceBelongsToTarget}=require('./collectors/common.cjs');
const {hiringTriggerRelevance}=require('./collectors/hiring.cjs');

const defaultCollectors={collectHiring,collectActivePain,collectSerperEvidence,collectExecutiveChange,collectTechCulture,collectAiCompatibility,collectCompetitiveWedge,collectRevenueSensitivity,collectFirmographics,collectEdgarFormDUniverse};
function phaseBSerperLimit(env={}){const requested=Number(env.PHASE_B_MAX_SERPER_QUERIES_PER_ACCOUNT);return Number.isInteger(requested)&&requested>0?Math.min(5,requested):Math.min(5,Math.max(1,serperSettings(env).perRunLimit));}
function uniq(rows=[],key=row=>row.id||JSON.stringify(row)){return [...new Map(rows.filter(Boolean).map(row=>[key(row),row])).values()];}
function signalWins(current={},incoming={}){
  const currentReceipt=Boolean(current.evidenceUrl)&&!current.inferred,incomingReceipt=Boolean(incoming.evidenceUrl)&&!incoming.inferred;
  if(incomingReceipt!==currentReceipt)return incomingReceipt;
  if(Number(incoming.score||0)!==Number(current.score||0))return Number(incoming.score||0)>Number(current.score||0);
  return Date.parse(incoming.observedAt||0)>Date.parse(current.observedAt||0);
}
function dedupeTriggers(rows=[]){return [...new Map(rows.filter(Boolean).map(row=>[`${String(row.type||row.triggerType||'').toLowerCase()}:${String(row.evidenceUrl||'').replace(/[?#].*$/,'')}`,row])).values()];}
function sanitizeWhyNow(account={},config={},now=new Date()){
  const all=dedupeTriggers(account.triggers||[]).map(trigger=>trigger.decaysAt?trigger:decorateTrigger(trigger,config.slaDays||{})),history=uniq([...(account.triggerHistory||[]),...all],row=>row.id||`${row.type}:${row.evidenceUrl}:${row.occurredAt}`),targeting={buyerTitles:config.personas?.buyerTitles||[],championTitles:config.personas?.championTitles||[],triggerMapping:config.triggerMapping||{}},eligible=all.filter(trigger=>{
    if(!hiringTriggerRelevance(trigger,targeting).relevant)return false;
    return !/incident|outage|downtime|degraded/.test(String(trigger.type||trigger.triggerType||''))||operationalPainEvidence(account,{url:trigger.evidenceUrl,title:trigger.evidenceText||trigger.title,date:trigger.occurredAt});
  }),triggers=activeTriggers({...account,triggers:eligible},now);
  const signals={...(account.signals||{})};for(const [key,value] of Object.entries(signals))if(value?.evidenceUrl&&value.sourceId==='serper'&&!evidenceBelongsToTarget(account,value))delete signals[key];const pain=signals.activePain;
  if(pain){const external=['serper','public_search','google_news_rss'].includes(pain.sourceId),dated=pain.metadata?.eventDateReported!==false&&(!external||pain.metadata?.eventDateReported===true),fresh=Number.isFinite(Date.parse(pain.observedAt))&&now.getTime()<Date.parse(pain.observedAt)+(Number(config.slaDays?.outage)||30)*86400000;if(!dated||!fresh||!operationalPainEvidence(account,{url:pain.evidenceUrl,title:pain.evidenceText,date:pain.observedAt}))delete signals.activePain;}
  const killHints=(account.killHints||[]).filter(hint=>!hint.evidenceUrl||evidenceBelongsToTarget(account,hint));
  return {...account,signals,triggers,triggerHistory:history,killHints};
}
function mergeCollectorResult(account={},result={},runId=''){
  const next={...structuredClone(account),...(result.targetPatch||{})},signals={...(next.signals||{})};
  for(const incoming of result.signals||[]){if(incoming?.key&&(!signals[incoming.key]||signalWins(signals[incoming.key],incoming)))signals[incoming.key]=incoming;}
  next.signals=signals;
  next.signalHistory=uniq([...(next.signalHistory||[]),...(result.signals||[])],row=>row.id||`${row.key}:${row.evidenceUrl}:${row.observedAt}`);
  next.triggers=uniq([...(next.triggers||[]),...(result.events||[])],row=>row.id||`${row.type}:${row.evidenceUrl}:${row.occurredAt}`);
  next.killHints=uniq([...(next.killHints||[]),...(result.killHints||[])],row=>`${row.code}:${row.evidenceUrl}`);
  next.lastCollectorRunId=runId||next.lastCollectorRunId||'';
  next.updatedAt=new Date().toISOString();
  return next;
}
function safeError(error){const status=Number.isInteger(error?.status)?error.status:Number.isInteger(error?.httpStatus)?error.httpStatus:null;return {code:String(error?.code||'COLLECTOR_FAILED'),message:String(error?.message||error?.error||'Collector failed').slice(0,300),status};}
function sourceErrors(runtime){return Object.entries(runtime.snapshot().health||{}).filter(([,row])=>row.status==='error').map(([source,row])=>({collectorId:source,...safeError(row)}));}
function findRun(workspace,id){return workspace.runs.find(row=>row.id===id&&row.type==='account_collector_refresh');}

function createPhaseBRefreshCoordinator({read,mutate,env=process.env,runtimeFactory=options=>new CollectorRuntime(options),now=()=>new Date(),id=()=>randomUUID(),collectors=defaultCollectors,searchProvider=(query,options)=>options.kind==='active_pain_news'?searchNews(query,options):search(query,options)}={}){
  const pending=new Map();
  let ignoreSavedRuntimeOnce=env.PHASE_B_RESET_RUNTIME_BUDGETS==='true';
  const updateRun=async(workspaceId,runId,fn)=>mutate(state=>{const workspace=state.workspaces[workspaceId],run=findRun(workspace,runId);if(!run)throw new Error('Collector run disappeared.');fn(run,workspace);return state;});
  const persistRuntime=(workspace,runtime)=>{workspace.budgets.phaseBCollector={day:now().toISOString().slice(0,10),...runtime.snapshot()};};
  const reserveSerper=async(workspaceId,runId,limit)=>updateRun(workspaceId,runId,(run,workspace)=>{
    const month=now().toISOString().slice(0,7),current=workspace.budgets.serperQueries?.month===month?workspace.budgets.serperQueries.queries:0;
    if(current>=limit){const error=new Error('The workspace Serper monthly query cap is exhausted.');error.code='SERPER_MONTHLY_LIMIT';throw error;}
    workspace.budgets.serperQueries={month,queries:current+1};run.serperQueries+=1;
  });
  const apply=async(workspaceId,accountId,runId,collectorId,result,runtime)=>mutate(state=>{
    const workspace=state.workspaces[workspaceId],index=workspace.accounts.findIndex(row=>row.id===accountId);if(index<0)throw new Error('Account disappeared during refresh.');
    const merged=mergeCollectorResult(workspace.accounts[index],result,runId),config=phaseAConfigForWorkspace(workspace),sanitized=sanitizeWhyNow(merged,config,now());workspace.accounts[index]=scoreAccount(sanitized,config,now());
    const run=findRun(workspace,runId);run.collectors.push({collectorId,status:'complete',signals:(result.signals||[]).length,events:(result.events||[]).length,killHints:(result.killHints||[]).length,itemsFound:Number(result.itemsFound||0)});persistRuntime(workspace,runtime);return state;
  });
  const fail=async(workspaceId,runId,collectorId,error,runtime)=>updateRun(workspaceId,runId,(run,workspace)=>{run.collectors.push({collectorId,status:'error',signals:0,events:0,killHints:0,itemsFound:0});run.errors.push({collectorId,...safeError(error)});persistRuntime(workspace,runtime);});
  async function execute(workspaceId,accountId,runId){
    await updateRun(workspaceId,runId,run=>{run.status='running';});
    const state=read(),workspace=state.workspaces[workspaceId],account=workspace?.accounts.find(row=>row.id===accountId),collectorConfig=collectorConfigForWorkspace(workspace),target=collectorTargetForAccount(account,collectorConfig),runtime=runtimeFactory({env});
    runtime.identity();
    const day=now().toISOString().slice(0,10),saved=workspace.budgets.phaseBCollector;if(saved?.day===day&&!ignoreSavedRuntimeOnce){runtime.usage={...runtime.usage,...structuredClone(saved.usage||{})};runtime.health=structuredClone(saved.health||{});}ignoreSavedRuntimeOnce=false;
    let searchResults=[];
    const settings=serperSettings(env);
    if(settings.enabled){
      try{
        assertSerperReady(settings);
        searchResults=await collectors.collectSerperEvidence(target,{runtime,maxQueries:phaseBSerperLimit(env),queryPlan:phaseBQueryPlan,search:(query,descriptor)=>searchProvider(query,{runtime,env,num:10,kind:descriptor.kind}),beforeQuery:()=>reserveSerper(workspaceId,runId,settings.monthlyLimit)});
        await apply(workspaceId,accountId,runId,'search_evidence',{signals:[],events:[],killHints:[],itemsFound:searchResults.length},runtime);
      }catch(error){await fail(workspaceId,runId,'search_evidence',error,runtime);}
    }else await updateRun(workspaceId,runId,run=>run.collectors.push({collectorId:'search_evidence',status:'disabled',signals:0,events:0,killHints:0,itemsFound:0}));
    const steps=[
      ['firmographics',()=>collectors.collectFirmographics(target,{runtime,now:now(),searchResults})],
      ['hiring',()=>collectors.collectHiring(target,{runtime,now:now(),painThemeConfig:collectorConfig.painThemeConfig,slaConfig:collectorConfig.slaDays})],
      ['active_pain',()=>collectors.collectActivePain(target,{runtime,now:now(),searchResults,painThemeConfig:collectorConfig.painThemeConfig,strictFreshness:true,windowDays:Number(collectorConfig.slaDays?.outage)||30,slaConfig:collectorConfig.slaDays})],
      ['executive_change',()=>collectors.collectExecutiveChange(target,{now:now(),searchResults,slaConfig:collectorConfig.slaDays})],
      ['tech_culture',()=>collectors.collectTechCulture(target,{runtime,now:now(),searchResults,slaConfig:collectorConfig.slaDays})],
      ['ai_compatibility',()=>collectors.collectAiCompatibility(target,{searchResults})],
      ['competitive_wedge',()=>collectors.collectCompetitiveWedge(target,{runtime,now:now(),collectorConfig})],
      ['revenue_sensitivity',()=>collectors.collectRevenueSensitivity(target,{now:now(),collectorConfig})],
    ];
    if(env.EDGAR_ENABLED==='true')steps.push(['edgar_form_d',async()=>{const output=await collectors.collectEdgarFormDUniverse({targets:[target],runtime,now:now(),segments:collectorConfig.segments,segmentQueries:collectorConfig.edgarSegmentQueries,enabledSegments:[target.segment],enabled:true,slaConfig:collectorConfig.slaDays});return {signals:[],events:output.eventsByTargetId[target.id]||[],killHints:[],itemsFound:(output.eventsByTargetId[target.id]||[]).length,collectorErrors:output.errors};}]);
    else await updateRun(workspaceId,runId,run=>run.collectors.push({collectorId:'edgar_form_d',status:'disabled',signals:0,events:0,killHints:0,itemsFound:0}));
    for(const [collectorId,task] of steps){try{const result=await task();await apply(workspaceId,accountId,runId,collectorId,result,runtime);if(result.collectorErrors?.length)await updateRun(workspaceId,runId,run=>run.errors.push(...result.collectorErrors.map(error=>({collectorId,...safeError(error)}))));}catch(error){await fail(workspaceId,runId,collectorId,error,runtime);}}
    await updateRun(workspaceId,runId,(run,latestWorkspace)=>{for(const error of sourceErrors(runtime))if(!run.errors.some(row=>row.collectorId===error.collectorId&&row.code===error.code))run.errors.push(error);run.status=run.errors.length?'complete_with_errors':'complete';run.finishedAt=now().toISOString();persistRuntime(latestWorkspace,runtime);const latest=latestWorkspace.accounts.find(row=>row.id===accountId);if(latest)latest.lastCollectorRun={id:run.id,status:run.status,finishedAt:run.finishedAt,serperQueries:run.serperQueries,errorCount:run.errors.length};});
    return findRun(read().workspaces[workspaceId],runId);
  }
  async function start(workspaceId,accountId){
    const state=read(),workspace=state.workspaces[workspaceId],account=workspace?.accounts.find(row=>row.id===accountId);if(!workspace||!account)throw new Error('Account not found.');collectorConfigForWorkspace(workspace);
    const running=workspace.runs.find(row=>row.type==='account_collector_refresh'&&(row.status==='running'||row.status==='queued'));
    if(running&&pending.has(running.id))throw new Error('A collector refresh is already running in this workspace.');
    if(running)await mutate(current=>{const stale=findRun(current.workspaces[workspaceId],running.id);stale.status='interrupted';stale.finishedAt=now().toISOString();stale.errors.push({collectorId:'runner',code:'PROCESS_RESTARTED',message:'The background process ended before this run completed.',status:null});return current;});
    const run={schemaVersion:1,id:id(),type:'account_collector_refresh',accountId,status:'queued',startedAt:now().toISOString(),finishedAt:'',serperQueries:0,collectors:[],errors:[]};
    await mutate(current=>{current.workspaces[workspaceId].runs.push(run);return current;});
    const promise=Promise.resolve().then(()=>execute(workspaceId,accountId,run.id)).catch(async error=>{try{await updateRun(workspaceId,run.id,(saved,latestWorkspace)=>{saved.status='failed';saved.finishedAt=now().toISOString();saved.errors.push({collectorId:'runner',...safeError(error)});const latest=latestWorkspace.accounts.find(row=>row.id===accountId);if(latest)latest.lastCollectorRun={id:saved.id,status:saved.status,finishedAt:saved.finishedAt,serperQueries:saved.serperQueries,errorCount:saved.errors.length};});}catch{}return null;}).finally(()=>pending.delete(run.id));
    pending.set(run.id,promise);return run;
  }
  async function wait(runId){if(pending.has(runId))await pending.get(runId);for(const workspace of Object.values(read().workspaces)){const run=findRun(workspace,runId);if(run)return structuredClone(run);}return null;}
  return {start,wait};
}

module.exports={createPhaseBRefreshCoordinator,dedupeTriggers,defaultCollectors,mergeCollectorResult,phaseBSerperLimit,sanitizeWhyNow,signalWins};
