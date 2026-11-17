'use strict';

const {randomUUID}=require('node:crypto');
const {todaySections}=require('./account-lifecycle.cjs');
const {accountForSearch,contactReady,findPersonas,peopleSettings,savedPersonas}=require('./collectors/apollo-people.cjs');

function automaticPersonaIds(workspace,now=new Date()){
  const {actNow,topProspects}=todaySections(workspace,now);
  return [...new Set([...actNow,...topProspects].filter(row=>!contactReady(row)).map(row=>row.id))];
}

function createPersonaCoordinator({read,mutate,env,runtimeFactory,now=()=>new Date(),id=randomUUID}){
  const pending=new Map();
  const ready=()=>{const {enabled,cap,runCap}=peopleSettings(env);return enabled&&cap>0&&runCap>0&&Boolean(env.APOLLO_API_KEY);};
  const locate=(w,id)=>w?.runs.find(row=>row.type==='persona_search'&&row.id===id);
  const update=(workspaceId,runId,fn)=>mutate(state=>{
    const run=locate(state.workspaces[workspaceId],runId);
    fn(run);
    return state;
  });
  async function start(workspaceId,{accountIds,discoveryRunId='',requireActive=false}={}){
    if(!ready())throw Error('Apollo persona search is disabled. Use a LinkedIn search path.');
    const state=read(),w=state.workspaces[workspaceId],{runCap,cap}=peopleSettings(env);
    if(!w||requireActive&&state.activeWorkspaceId!==workspaceId)throw Error('Workspace changed. Refresh and try again.');
    const automatic=!accountIds;
    const all=[...new Set(accountIds||automaticPersonaIds(w,now()))];
    const eligible=all.filter(accountId=>{try{accountForSearch(state,workspaceId,accountId);return true;}catch{return false;}});
    const month=now().toISOString().slice(0,7),used=w.budgets.apolloPeople?.month===month?w.budgets.apolloPeople.calls:0;
    const ids=eligible.slice(0,Math.min(runCap,Math.max(0,cap-used)));
    if(!ids.length){
      if(automatic)return null;
      throw Error(eligible.length?'The workspace persona-search cap is exhausted.':'Select a company with a verified domain and an approved matched ICP and playbook.');
    }
    const run={id:id(),schemaVersion:1,type:'persona_search',status:'queued',startedAt:now().toISOString(),discoveryRunId,accountIds:ids,
      apolloCap:runCap,apolloCalls:0,checked:0,skipped:all.length-ids.length,results:[],errors:[]};
    await mutate(s=>{
      const target=s.workspaces[workspaceId];
      if(requireActive&&s.activeWorkspaceId!==workspaceId)throw Error('Workspace changed. Refresh and try again.');
      if(target.runs.some(row=>row.type==='persona_search'&&['queued','running'].includes(row.status)))throw Error('A persona search is already running in this workspace.');
      target.runs.push(run);return s;
    });
    let runtime;
    const promise=Promise.resolve().then(async()=>{
      runtime=runtimeFactory({env});
      await update(workspaceId,run.id,r=>{r.status='running';});
      for(const accountId of ids){
        await findPersonas({read,mutate,runtime,env,workspaceId,accountId,now});
        const account=read().workspaces[workspaceId].accounts.find(row=>row.id===accountId);
        await update(workspaceId,run.id,r=>{r.checked+=1;r.apolloCalls=r.checked;r.results.push({accountId,count:savedPersonas(account).length});});
      }
      await update(workspaceId,run.id,r=>{r.status='complete';r.finishedAt=now().toISOString();});
    }).catch(async error=>{
      await update(workspaceId,run.id,r=>{
        r.apolloCalls=runtime?.snapshot?.().usage?.apollo_people?.requests??r.apolloCalls;
        r.status='failed';
        r.finishedAt=now().toISOString();
        r.errors.push({message:'Persona search stopped before the remaining companies.',status:Number.isInteger(error.status)?error.status:null});
      });
    }).finally(()=>pending.delete(run.id));
    pending.set(run.id,promise);
    return run;
  }
  async function afterDiscovery(workspaceId,run){
    if(ready()&&['complete','complete_with_errors'].includes(run?.status)){
      try{await start(workspaceId,{discoveryRunId:run.id});}catch{/* An existing workspace search owns the slot. */}
    }
  }
  async function wait(workspaceId,runId){
    await pending.get(runId);
    return locate(read().workspaces[workspaceId],runId);
  }
  return {start,wait,afterDiscovery};
}

module.exports={automaticPersonaIds,createPersonaCoordinator};
