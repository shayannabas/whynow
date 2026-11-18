'use strict';

const {workspaceIcps}=require('./icps.cjs');
const {approvedPlaybook}=require('./playbook.cjs');
const {todaySections,whyNow}=require('./account-lifecycle.cjs');

const STAGES=['Enter company','Research seller','Review seller','Review ICPs','Review playbook','Discovery','Scoring and tiers','Results'];
const ACTIVE=['queued','running','identifying','researching'];
const FINISHED=['complete','complete_with_errors'];
const stamp=value=>Date.parse(value||'')||0;
const count=value=>Number.isInteger(value)&&value>=0?value:null;
const terminal=run=>FINISHED.includes(run?.status);
const work=state=>state.workspaces[state.activeWorkspaceId];
function discoveryRuns(workspace){
  return (workspace?.runs||[]).filter(run=>run.type==='company_discovery').toSorted((a,b)=>stamp(b.startedAt)-stamp(a.startedAt));
}
function pipelineModel(workspace,requested=0){
  const research=workspace?.research,playbook=workspace&&approvedPlaybook(workspace),icps=workspace?workspaceIcps(workspace):[];
  const sellerApproved=Boolean(workspace?.status==='active'&&workspace.sellerProfile?.approvedAt);
  const run=discoveryRuns(workspace)[0];
  const stages=[Boolean(workspace),Boolean(workspace?.profileRevision&&(sellerApproved||workspace.status==='needs_review')),sellerApproved,
    Boolean(icps.length&&icps.every(row=>row.status==='approved')),Boolean(playbook),Boolean(terminal(run)),Boolean(terminal(run)&&run.finishedAt),false];
  const current=stages.findIndex(done=>!done)+1;
  const step=Number.isSafeInteger(Number(requested))&&Number(requested)>0?Math.min(Number(requested),current):current;
  return {workspace,research,icps,playbook,run,current,step,stages};
}

function queueSnapshot(workspace,run,now=new Date()){
  const when=run?.finishedAt?new Date(run.finishedAt):now;
  const links=new Set([...(run?.newAccountIds||[]),...(run?.reviewAccountIds||[]),...(run?.vendorAccountIds||[])]);
  const accounts=run?(workspace.accounts||[]).filter(a=>links.has(a.id)||a.discovery?.runId===run.id):workspace.accounts||[];
  const sections=todaySections({...workspace,accounts},when);
  const killed=accounts.filter(a=>a.kills?.length||a.killStatus==='killed');
  const ordered=[...new Map([...sections.actNow,...sections.topProspects,...sections.worthResearching,...sections.needsReview].map(row=>[row.id,row])).values()];
  return {counts:{actNow:sections.actNow.length,topProspects:sections.topProspects.length,needsReview:sections.needsReview.length,killed:killed.length},
    scored:accounts.filter(a=>Number.isFinite(a.fitScore??a.score?.fitScore)).length,
    tiers:[1,2,3].map(tier=>accounts.filter(a=>Number(a.tier)===tier).length),
    top:ordered.slice(0,3).map(a=>({id:a.id,name:a.name,fit:a.fitScore,tier:a.tier,evidence:whyNow(a,when)}))};
}
function runProgress(run){
  if(!run)return {};
  return {serper:count(run.serperQueries),serperCap:count(run.queryCap),apollo:count(run.apolloCalls),apolloCap:count(run.apolloCap),
    candidates:count(run.rawFound),checked:count(run.progress?.checked??run.checked),selected:count(run.progress?.total??run.candidateChecks??run.accountIds?.length),
    verified:count(run.passedNoiseGate??run.progress?.verified),rejected:count(run.rejectedCount??run.progress?.rejected),
    openaiUsd:Number.isFinite(run.openaiUsd)?run.openaiUsd:null};
}
function publicFailures(rows=[]){
  return rows.slice(-15).map(row=>({reason:String(row.code||row.reason||row.message||'Request failed').slice(0,120),status:count(row.httpStatus??row.status),company:String(row.candidate||row.name||'').slice(0,100)}));
}
function stageStates(cursor,done,failed){
  return STAGES.map((name,index)=>({name,status:index+1<cursor||done?'Done':index+1===cursor?failed?'Needs attention':'Current':'Locked'}));
}
function pipelineProgress(state,{mode='',step=0,runId='',now=new Date(),env={}}={}){
  const w=work(state),model=pipelineModel(w),research=model.research,synthesis=research?.synthesisJob;
  const runs=discoveryRuns(w);
  const replay=mode==='replay'?runs.find(run=>terminal(run)&&(!runId||run.id===runId)):null;
  const persona=(w?.runs||[]).findLast(run=>run.type==='persona_search'&&ACTIVE.includes(run.status));
  const live=runs.find(run=>ACTIVE.includes(run.status))||persona;
  const researching=Boolean(ACTIVE.includes(research?.status)||ACTIVE.includes(synthesis?.status));
  const replayStep=Math.max(1,Math.min(STAGES.length,Number(step)||1));
  const run=replay||live||runs[0];
  const cursor=replay?replayStep:researching?2:live?6:model.current;
  const researchingActive=researching&&!replay&&!live;
  const complete=Boolean(replay&&replayStep===STAGES.length);
  const details=researchingActive?{
    serper:count(research?.usage?.queriesReserved),serperCap:count(research?.caps?.queries),
    pages:count(research?.usage?.pagesSaved),
    openaiReservedUsd:Number.isInteger(w?.budgets?.openai?.reservedMicros)?w.budgets.openai.reservedMicros/1e6:null,
    openaiCapUsd:Number(env.OPENAI_MONTHLY_LIMIT_USD)>0?Number(env.OPENAI_MONTHLY_LIMIT_USD):null,
    openaiUsd:(synthesis?.calls||[]).length?synthesis.calls.reduce((sum,call)=>sum+(Number(call.costUsd)||0),0):null
  }:runProgress(run);
  const fraction=researchingActive?(research?.steps||[]).filter(item=>item.status==='complete').length/Math.max(1,research?.steps?.length||0):
    details.selected?Math.min(1,(details.checked||0)/details.selected):0;
  const percent=replay?Math.round(100*replayStep/STAGES.length):live||researching?Math.round(100*(cursor-1+Math.min(.98,fraction))/STAGES.length):0;
  const start=researchingActive?synthesis?.startedAt||research?.startedAt:run?.startedAt;
  const finish=researchingActive?null:run?.finishedAt;
  const elapsed=stamp(start)?Math.max(0,Math.round(((stamp(finish)||now.getTime())-stamp(start))/1000)):null;
  const skipped=publicFailures(replay?run.skippedPages||[]:researchingActive?research.pageErrors||[]:run?.skippedPages||[]);
  const errors=publicFailures(researchingActive?[synthesis?.error||research?.error].filter(Boolean):run?.errors||[]);
  return {stage:replay?'Replay · '+STAGES[replayStep-1]:live?.type==='persona_search'?'Finding personas':live?'Discovery':researching?'Research seller':'Pipeline idle',
    percent,elapsed,details,skipped,errors,stages:stageStates(cursor,complete,run?.status==='failed'&&!live),running:Boolean(live||researching)&&!replay,
    done:!live&&!researching,workspaceId:w?.id||'',cursor};
}

module.exports={STAGES,ACTIVE,terminal,work,discoveryRuns,pipelineModel,queueSnapshot,pipelineProgress,stageStates};
