const {getWorkspace,updateWorkspace}=require('../server/state.cjs');
const {json}=require('../utils.cjs');
const {resolveSeller,confirmCandidate}=require('./resolve-seller.cjs');
const {onboardingPage}=require('./pages.cjs');
const {profilePage}=require('./profile-page.cjs');
const {saveManualProfile,approveManualProfile}=require('./manual-profile.cjs');
const {restoreCompetitor}=require('./competitor-review.cjs');
const {requestResearch}=require('./research-request.cjs');
const {nameEntryPage,researchPage}=require('./research-page.cjs');
const {serperSettings}=require('../serper.cjs');
const {settings:openAiSettings}=require('../llm.cjs');
const {approveRefresh,rejectRefresh,validateRefreshGrounding}=require('./refresh.cjs');

function providerState(env) {
  const serper=serperSettings(env),openai=openAiSettings(env);
  return {
    serperReady:Boolean(serper.enabled&&serper.keyPresent&&serper.perRunLimit&&serper.monthlyLimit&&serper.pageLimit),
    openAiReady:Boolean(openai.enabled&&openai.keyPresent&&openai.limitMicros&&openai.callLimit),
    serper:{enabled:serper.enabled,keyPresent:serper.keyPresent,perRunLimit:serper.perRunLimit,monthlyLimit:serper.monthlyLimit,pageLimit:serper.pageLimit},
    openai:{enabled:openai.enabled,keyPresent:openai.keyPresent,model:openai.model}
  };
}

async function readForm(req,maxBytes=128*1024) {
  let body='';
  for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>maxBytes)throw Object.assign(new Error('Form too large'),{status:413});}
  return new URLSearchParams(body);
}

async function onboardingRoute({req,res,pathname,state,mutate,env,researchCoordinator,synthesisCoordinator}) {
  if(!pathname.startsWith('/onboarding'))return false;
  const remote=req.socket.remoteAddress;
  if(env.NODE_ENV==='production'||!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(remote)||!/^(127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/.test(req.headers.host||'')){
    json(res,403,{error:'Local administrator access only'});return true;
  }
  const providers=providerState(env);
  const html=(status,body)=>{res.writeHead(status,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(body);};
  const redirect=location=>{res.writeHead(303,{Location:location});res.end();};
  const manual=(status,error='')=>html(status,onboardingPage(state,{searchConfigured:false,error}));

  if(req.method==='GET'&&pathname==='/onboarding/profile'){html(200,profilePage(state));return true;}
  if(req.method==='GET'&&pathname==='/onboarding'){html(200,nameEntryPage(state,{providers}));return true;}
  if(req.method==='GET'&&pathname==='/onboarding/results'){html(200,researchPage(state,{providers}));return true;}
  if(req.method==='GET'&&pathname==='/onboarding/manual'){manual(200);return true;}
  if(req.method==='GET'&&pathname==='/onboarding/research/status'){
    if(!state.activeWorkspaceId)return json(res,404,{error:'No active workspace'}),true;
    const workspace=getWorkspace(state,state.activeWorkspaceId);
    if(!workspace.research)return json(res,404,{error:'No research request'}),true;
    json(res,200,{schemaVersion:1,workspaceId:workspace.id,workspaceStatus:workspace.status,research:workspace.research,providers});return true;
  }

  const allowed=new Set(['/onboarding/playbook/save','/onboarding/playbook/approve','/onboarding/start','/onboarding/resolve','/onboarding/confirm','/onboarding/profile/save','/onboarding/profile/approve','/onboarding/profile/restore-competitor','/onboarding/profile/confirm-domain','/onboarding/research/confirm','/onboarding/research/retry','/onboarding/research/generate','/onboarding/refresh/approve','/onboarding/refresh/reject']);
  if(req.method!=='POST'||!allowed.has(pathname)){json(res,404,{error:'Page not found'});return true;}
  if(req.headers.origin!==`http://${req.headers.host}`){json(res,403,{error:'Use the local page form'});return true;}
  let form;
  try{form=await readForm(req);}catch(error){json(res,error.status||400,{error:error.message});return true;}

  if(pathname==='/onboarding/start'){
    try{
      const next=await mutate(current=>requestResearch(current,form.get('name'))),id=next.activeWorkspaceId;
      if(researchCoordinator){
        if(providers.serperReady)void researchCoordinator.start(id).catch(()=>{});
        else try{await researchCoordinator.start(id);}catch{}
      }
      redirect('/onboarding/results');
    }catch(error){html(400,nameEntryPage(state,{error:error.message,name:form.get('name'),providers}));}
    return true;
  }

  const id=form.get('workspaceId');
  if(!state.activeWorkspaceId||id!==state.activeWorkspaceId){json(res,409,{error:'Workspace changed. Refresh and try again.'});return true;}
  const workspace=getWorkspace(state,id);

  if(pathname.startsWith('/onboarding/playbook/')){
    try{await mutate(current=>{if(current.activeWorkspaceId!==id)throw Error('Workspace changed. Refresh and try again.');return require('../playbook.cjs').reviewPlaybook(current,id,{action:pathname.endsWith('/save')?'save':'approve',revision:form.get('revision'),profileRevision:form.get('profileRevision'),raw:require('./playbook-page.cjs').parsePlaybookForm(form),acknowledged:form.has('acknowledged')});});redirect('/onboarding/profile');}
    catch(error){html(400,profilePage(state,{error:error.message}));}return true;
  }

  if(pathname.startsWith('/onboarding/refresh/')){
    try{
      if(pathname.endsWith('/approve')&&!form.has('acknowledged'))throw new Error('Confirm that you reviewed every refresh difference.');
      await mutate(current=>{
        if(current.activeWorkspaceId!==id)throw new Error('Workspace changed. Refresh and try again.');
        return pathname.endsWith('/approve')?
          approveRefresh(current,id,{proposalId:form.get('proposalId'),revision:form.get('revision'),groundingCheck:validateRefreshGrounding}):
          rejectRefresh(current,id,{proposalId:form.get('proposalId'),revision:form.get('revision')});
      });
      redirect('/onboarding/profile');
    }catch(error){html(400,profilePage(state,{error:error.message}));}
    return true;
  }

  if(pathname.startsWith('/onboarding/profile/')){
    try{
      await mutate(current=>{
        if(current.activeWorkspaceId!==id)throw new Error('Workspace changed. Refresh and try again.');
        const qualityReasons=Object.fromEntries([...form].filter(([key])=>key.startsWith('qualityReason.')).map(([key,value])=>[key.slice('qualityReason.'.length),value]));
        if(pathname.endsWith('/restore-competitor'))return restoreCompetitor(current,id,{candidateId:form.get('candidateId'),revision:form.get('revision')});
        if(pathname.endsWith('/confirm-domain'))return require('./domain-suggestions.cjs').confirmDomain(current,id,{suggestionId:form.get('suggestionId'),revision:form.get('revision')});
        return pathname.endsWith('/save')?saveManualProfile(current,id,form):approveManualProfile(current,id,{revision:form.get('revision'),acknowledged:form.has('acknowledged'),qualityReasons});
      });
      redirect('/onboarding/profile');
    }catch(error){html(400,profilePage(state,{error:error.message,submitted:pathname.endsWith('/save')?form:null}));}
    return true;
  }

  if(pathname.startsWith('/onboarding/research/')){
    if(!workspace.research){json(res,409,{error:'Start with a company name first.'});return true;}
    try{
      if(pathname.endsWith('/confirm')){
        if(!researchCoordinator)throw new Error('Research coordinator is unavailable.');
        await researchCoordinator.confirm(id,form.get('candidateId'),form.get('revision'),{wait:false,requireActive:true});
      }else if(pathname.endsWith('/retry')){
        if(!researchCoordinator)throw new Error('Research coordinator is unavailable.');
        await researchCoordinator.retry(id,{wait:false,requireActive:true});
      }else{
        if(!synthesisCoordinator)throw new Error('Drafting coordinator is unavailable.');
        await synthesisCoordinator.start(id,{wait:false,requireActive:true});
      }
      redirect('/onboarding/results');
    }catch(error){html(400,researchPage(state,{error:error.message,providers}));}
    return true;
  }

  if(workspace.status!=='draft'){json(res,409,{error:'Only draft workspaces can change company selection'});return true;}
  try{
    if(pathname==='/onboarding/confirm'){
      await mutate(current=>{
        if(current.activeWorkspaceId!==id||getWorkspace(current,id).status!=='draft')throw new Error('Workspace changed. Refresh and try again.');
        return updateWorkspace(current,id,w=>{w.onboarding=confirmCandidate(w.onboarding,form.get('candidateId'));});
      });
    }else{
      // Manual fallback stays provider-free even when keys are configured.
      const resolved=await resolveSeller({name:form.get('name'),website:form.get('website')},{env:{}});
      await mutate(current=>{
        if(current.activeWorkspaceId!==id||getWorkspace(current,id).status!=='draft')throw new Error('Workspace changed. Refresh and try again.');
        return updateWorkspace(current,id,w=>{w.onboarding={...resolved,name:form.get('name').trim()};});
      });
    }
    redirect('/onboarding/manual');
  }catch(error){manual(400,error.code?'Company lookup could not complete. Check the collector configuration and try again.':error.message);}
  return true;
}

module.exports={onboardingRoute,providerState};
