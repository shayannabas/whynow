const fs = require('node:fs');
const path = require('node:path');
const { json } = require('../utils.cjs');
const { loadState, saveState, statePath } = require('./state.cjs');
const { overview, shell } = require('./pages.cjs');
const { workspaceAction } = require('./actions.cjs');
const {CollectorRuntime} = require('../collectors/runtime.cjs');
const {collectorsPage} = require('./collectors-page.cjs');
const {recordSource,getSource} = require('../sources.cjs');
const {stripHtml} = require('../collectors/common.cjs');
const {getWorkspace,updateWorkspace} = require('./state.cjs');
const {esc} = require('../utils.cjs');
const {randomUUID} = require('node:crypto');
const {onboardingRoute} = require('../onboarding/routes.cjs');
const {createResearchCoordinator}=require('../onboarding/research.cjs');
const {createSynthesisCoordinator}=require('../onboarding/synthesis-runner.cjs');
const {createRefreshCoordinator,refreshProvidersReady}=require('../onboarding/refresh-runner.cjs');
const {createLlm}=require('../llm.cjs');
const {changeArchive,workspacesPage}=require('./workspaces.cjs');
const {accountPage,accountsPage,discoveryPage,killLogPage,scorecardPage,todayPage,resultsPage}=require('./phase-a-pages.cjs');
const {loadResolveReferenceDemo}=require('../reference-demo.cjs');
const {addManualAccountToState}=require('../accounts.cjs');
const {createPhaseBRefreshCoordinator}=require('../phase-b-runner.cjs');
const {createRefreshAllCoordinator}=require('../refresh-all-runner.cjs');
const {createDiscoveryCoordinator}=require('../discovery-runner.cjs');
const {createPrepareDemoCoordinator}=require('../prepare-demo.cjs');
const {updateAccountStatus}=require('../account-lifecycle.cjs');
const {createTemplateDraft}=require('../outreach-drafts.cjs');
const {historyPage,runsPage,funnelPage,metricsPage}=require('./activity-pages.cjs');
async function actionWorkspaceMatches(req,state,res){let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>8192){json(res,413,{error:'Form too large'});return false;}}const workspaceId=new URLSearchParams(body).get('workspaceId');if(workspaceId&&workspaceId!==state.activeWorkspaceId){json(res,409,{error:'Workspace changed. Refresh and try again.'});return false;}return true;}
function checkActionWorkspace(state,fields){if(fields.workspaceId&&fields.workspaceId!==state.activeWorkspaceId)throw Error('Workspace changed. Refresh and try again.');return state;}
function createRouter({stateFile,env=process.env,runtimeFactory=options=>new CollectorRuntime(options),researchCoordinator:providedResearch,synthesisCoordinator:providedSynthesis,refreshCoordinator:providedRefresh,phaseBRefreshCoordinator:providedPhaseBRefresh,phaseBRefreshAllCoordinator:providedPhaseBRefreshAll,discoveryCoordinator:providedDiscovery,prepareDemoCoordinator:providedPrepareDemo,llm:providedLlm} = {}) {
  stateFile=stateFile||statePath(env);
  loadState(stateFile);
  let writes = Promise.resolve();
  const jobs=new Map();
  const mutate=fn=>{
    const work=writes.then(()=>{const next=fn(loadState(stateFile));saveState(next,stateFile);return next;});
    writes=work.catch(()=>{});return work;
  };
  const read=()=>loadState(stateFile);
  const cacheDir=stateFile?path.join(path.dirname(stateFile),'collector-cache'):undefined;
  const guardedRuntimeFactory=options=>runtimeFactory({...options,cacheDir});
  const researchCoordinator=providedResearch||createResearchCoordinator({read,mutate,env,runtimeFactory:guardedRuntimeFactory});
  const llm=providedLlm||createLlm({read,mutate,env});
  const synthesisCoordinator=providedSynthesis||createSynthesisCoordinator({read,mutate,llm});
  const refreshCoordinator=providedRefresh||createRefreshCoordinator({read,mutate,researchCoordinator,synthesisCoordinator,env});
  const phaseBRefreshCoordinator=providedPhaseBRefresh||createPhaseBRefreshCoordinator({read,mutate,env,runtimeFactory:guardedRuntimeFactory});
  const phaseBRefreshAllCoordinator=providedPhaseBRefreshAll||createRefreshAllCoordinator({read,mutate,env,accountCoordinator:phaseBRefreshCoordinator});
  const discoveryCoordinator=providedDiscovery||createDiscoveryCoordinator({read,mutate,env,runtimeFactory:guardedRuntimeFactory});
  const prepareDemoCoordinator=providedPrepareDemo||(typeof discoveryCoordinator.wait==='function'&&typeof phaseBRefreshAllCoordinator.wait==='function'?createPrepareDemoCoordinator({read,mutate,env,discoveryCoordinator,refreshAllCoordinator:phaseBRefreshAllCoordinator}):{start:async()=>{throw new Error('Prepare demo coordinator is unavailable.');}});
  // Persisted interrupted research can resume after a local restart. Errors are
  // saved in the workspace and never crash the HTTP server.
  if(typeof researchCoordinator.resumePending==='function')void researchCoordinator.resumePending().catch(()=>{});
  if(refreshProvidersReady(env)){
    void refreshCoordinator.resumePending().then(()=>refreshCoordinator.runDue()).catch(()=>{});
    const refreshTimer=setInterval(()=>{void refreshCoordinator.runDue().catch(()=>{});},6*60*60*1000);
    refreshTimer.unref();
  }
  return async (req,res) => {
    const html = (status, body) => {res.writeHead(status,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(body);};
    try {
      const requestUrl = new URL(req.url,'http://localhost'),pathname=requestUrl.pathname;
      const localAdmin=env.NODE_ENV!=='production'&&['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)&&/^(127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/.test(req.headers.host||'');
      const activityPages={'/history':historyPage,'/runs':runsPage,'/funnel':funnelPage,'/metrics':metricsPage};
      if(req.method==='GET'&&activityPages[pathname])return html(200,activityPages[pathname](loadState(stateFile)));
      if(req.method==='GET'&&pathname==='/today')return html(200,todayPage(loadState(stateFile),'',requestUrl.searchParams));
      if(req.method==='GET'&&pathname==='/results')return html(200,resultsPage(loadState(stateFile),requestUrl.searchParams));
      if(req.method==='GET'&&pathname==='/discovery')return html(200,discoveryPage(loadState(stateFile),'',requestUrl.searchParams));
      if(req.method==='POST'&&pathname==='/prepare-demo'){
        if(!localAdmin)return json(res,403,{error:'Local administrator access only'});
        if(req.headers.origin!==`http://${req.headers.host}`)return json(res,403,{error:'Use the local page form'});
        const current=loadState(stateFile);if(!await actionWorkspaceMatches(req,current,res))return;try{await prepareDemoCoordinator.start(current.activeWorkspaceId);}catch(error){return html(409,todayPage(loadState(stateFile),error.message));}
        res.writeHead(303,{Location:'/today'});return res.end();
      }
      if(req.method==='POST'&&pathname==='/discovery/run'){
        if(!localAdmin)return json(res,403,{error:'Local administrator access only'});
        if(req.headers.origin!==`http://${req.headers.host}`)return json(res,403,{error:'Use the local page form'});
        const current=loadState(stateFile);if(!await actionWorkspaceMatches(req,current,res))return;try{await discoveryCoordinator.start(current.activeWorkspaceId);}catch(error){return html(409,discoveryPage(loadState(stateFile),error.message));}
        res.writeHead(303,{Location:'/discovery'});return res.end();
      }
      if(req.method==='GET'&&pathname==='/accounts')return html(200,accountsPage(loadState(stateFile),'',requestUrl.searchParams));
      if(req.method==='POST'&&pathname==='/accounts/refresh-all'){
        if(!localAdmin)return json(res,403,{error:'Local administrator access only'});
        if(req.headers.origin!==`http://${req.headers.host}`)return json(res,403,{error:'Use the local page form'});
        const current=loadState(stateFile);if(!await actionWorkspaceMatches(req,current,res))return;try{await phaseBRefreshAllCoordinator.start(current.activeWorkspaceId);}catch(error){return html(409,todayPage(loadState(stateFile),error.message));}
        res.writeHead(303,{Location:'/today'});return res.end();
      }
      const accountMatch=pathname.match(/^\/accounts\/([^/]+)$/),refreshMatch=pathname.match(/^\/accounts\/([^/]+)\/refresh$/),statusMatch=pathname.match(/^\/accounts\/([^/]+)\/status$/),templateDraftMatch=pathname.match(/^\/accounts\/([^/]+)\/drafts\/template$/);
      if(req.method==='GET'&&accountMatch)return html(200,accountPage(loadState(stateFile),decodeURIComponent(accountMatch[1]),'',requestUrl.searchParams));
      if(req.method==='POST'&&refreshMatch){
        if(!localAdmin)return json(res,403,{error:'Local administrator access only'});
        if(req.headers.origin!==`http://${req.headers.host}`)return json(res,403,{error:'Use the local page form'});
        const current=loadState(stateFile),accountId=decodeURIComponent(refreshMatch[1]);if(!await actionWorkspaceMatches(req,current,res))return;
        try{await phaseBRefreshCoordinator.start(current.activeWorkspaceId,accountId);}
        catch(error){return html(409,accountPage(loadState(stateFile),accountId,error.message));}
        res.writeHead(303,{Location:`/accounts/${encodeURIComponent(accountId)}`});return res.end();
      }
      if(req.method==='POST'&&statusMatch){
        if(!localAdmin)return json(res,403,{error:'Local administrator access only'});
        if(req.headers.origin!==`http://${req.headers.host}`)return json(res,403,{error:'Use the local page form'});
        let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>4096)return json(res,413,{error:'Form too large'});}const fields=Object.fromEntries(new URLSearchParams(body)),accountId=decodeURIComponent(statusMatch[1]);
        try{await mutate(state=>updateAccountStatus(checkActionWorkspace(state,fields),state.activeWorkspaceId,accountId,fields));}catch(error){return html(400,accountPage(loadState(stateFile),accountId,error.message));}
        res.writeHead(303,{Location:`/accounts/${encodeURIComponent(accountId)}`});return res.end();
      }
      if(req.method==='POST'&&templateDraftMatch){
        if(!localAdmin)return json(res,403,{error:'Local administrator access only'});
        if(req.headers.origin!==`http://${req.headers.host}`)return json(res,403,{error:'Use the local page form'});
        let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>8192)return json(res,413,{error:'Form too large'});}const fields=Object.fromEntries(new URLSearchParams(body)),accountId=decodeURIComponent(templateDraftMatch[1]);
        try{await mutate(state=>createTemplateDraft(checkActionWorkspace(state,fields),state.activeWorkspaceId,accountId,fields));}catch(error){return html(400,accountPage(loadState(stateFile),accountId,error.message,new URLSearchParams({tab:'outreach'})));}
        res.writeHead(303,{Location:`/accounts/${encodeURIComponent(accountId)}?tab=outreach`});return res.end();
      }
      if(req.method==='GET'&&pathname==='/scorecard')return html(200,scorecardPage(loadState(stateFile)));
      if(req.method==='GET'&&pathname==='/kill-log')return html(200,killLogPage(loadState(stateFile)));
      if(req.method==='POST'&&pathname==='/reference-demo/load'){
        if(!localAdmin)return json(res,403,{error:'Local administrator access only'});
        if(req.headers.origin!==`http://${req.headers.host}`)return json(res,403,{error:'Use the local page form'});
        await mutate(state=>loadResolveReferenceDemo(state));
        res.writeHead(303,{Location:'/accounts'});return res.end();
      }
      if(req.method==='POST'&&pathname==='/accounts'){
        if(!localAdmin)return json(res,403,{error:'Local administrator access only'});
        if(req.headers.origin!==`http://${req.headers.host}`)return json(res,403,{error:'Use the local page form'});
        let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>8192)return json(res,413,{error:'Form too large'});}
        const fields=Object.fromEntries(new URLSearchParams(body));
        try{await mutate(state=>addManualAccountToState(checkActionWorkspace(state,fields),state.activeWorkspaceId,fields));}
        catch(error){return html(400,accountsPage(loadState(stateFile),error.message));}
        res.writeHead(303,{Location:'/scorecard'});return res.end();
      }
      if(['/workspaces','/workspaces/archive','/workspaces/restore'].includes(pathname) && !(req.method==='POST' && pathname==='/workspaces')) {
        if(env.NODE_ENV==='production' || !['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress) || !/^(127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/.test(req.headers.host||''))return json(res,403,{error:'Local administrator access only'});
        if(req.method==='GET' && pathname==='/workspaces')return html(200,workspacesPage(loadState(stateFile)));
        if(req.method!=='POST' || pathname==='/workspaces')return json(res,404,{error:'Page not found'});
        if(req.headers.origin!==`http://${req.headers.host}`)return json(res,403,{error:'Use the local page form'});
        let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>4096)return json(res,413,{error:'Form too large'});}
        const form=new URLSearchParams(body);
        if(!form.has('acknowledged'))return json(res,400,{error:'Confirm this workspace action first.'});
        try {
          await mutate(current=>changeArchive(current,form.get('id'),{restore:pathname.endsWith('/restore'),revision:form.get('revision'),profileRevision:form.get('profileRevision')}));
        } catch {return json(res,409,{error:'Workspace changed or unavailable. Refresh and try again.'});}
        res.writeHead(303,{Location:'/workspaces'});return res.end();
      }
      if (pathname.startsWith('/onboarding') && await onboardingRoute({req,res,pathname,state:loadState(stateFile),mutate,env,researchCoordinator,synthesisCoordinator})) return;
      if (pathname.startsWith('/collectors') || pathname.startsWith('/sources/')) {
        // Authentication arrives in Stage 10. Debug actions are local-admin only;
        // there is no production or remotely reachable administrator fallback.
        const remote=req.socket.remoteAddress;
        if(env.NODE_ENV==='production' || !['127.0.0.1','::1','::ffff:127.0.0.1'].includes(remote) || !/^(127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/.test(req.headers.host||''))return json(res,403,{error:'Local administrator access only'});
        const current=loadState(stateFile);
        const active=current.activeWorkspaceId;
        if(req.method==='GET' && pathname==='/collectors') {
          const job=[...jobs.values()].reverse().find(job=>job.workspaceId===active);
          return html(200,collectorsPage(current,{configured:Boolean(env.CRAWLER_CONTACT_EMAIL),job}));
        }
        if(req.method==='GET' && pathname.startsWith('/collectors/jobs/')) {
          const job=jobs.get(pathname.slice('/collectors/jobs/'.length));
          return job && job.workspaceId===active?json(res,200,job):json(res,404,{error:'Job not found'});
        }
        if(req.method==='GET' && pathname.startsWith('/sources/')) {
          const source=getSource(current,pathname.slice('/sources/'.length));
          if(!source)return json(res,404,{error:'Source not found'});
          return html(200,shell(current,`<h1>${esc(source.title||'Saved evidence')}</h1><p><a href="${esc(source.url)}" rel="noreferrer">Original public page</a></p><p>Fetched ${esc(source.fetchedAt)}</p><p>${esc(source.text)}</p>`,'Saved evidence'));
        }
        if(req.method==='POST' && pathname==='/collectors/fetch') {
          if(req.headers.origin!==`http://${req.headers.host}`)return json(res,403,{error:'Use the local page form'});
          let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>4096)return json(res,413,{error:'Form too large'});}
          const form=new URLSearchParams(body), workspaceId=form.get('workspaceId');
          if(!active || workspaceId!==active)return json(res,409,{error:'Workspace changed. Refresh and try again.'});
          if([...jobs.values()].some(job=>job.status==='running'))return json(res,409,{error:'A page check is already running'});
          const workspace=getWorkspace(current,workspaceId);
          const runtime=runtimeFactory({env,cacheDir:stateFile?path.join(path.dirname(stateFile),'collector-cache'):undefined});
          try{runtime.identity();}catch(error){return json(res,400,{error:error.message});}
          const previous=workspace.budgets.collector,day=new Date().toISOString().slice(0,10);
          if(previous?.day===day){runtime.usage=structuredClone(previous.usage);runtime.health=structuredClone(previous.health);}
          const job={schemaVersion:1,id:randomUUID(),workspaceId,status:'running',message:'Checking the public page…'};
          jobs.set(job.id,job);
          // Keep only a bounded local job history; saved evidence lives in state.
          if(jobs.size>50)jobs.delete(jobs.keys().next().value);
          void (async()=>{
            try {
              const page=await runtime.request('seller_site',form.get('url'));
              const text=stripHtml(page.text);
              const title=stripHtml(page.text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'');
              await mutate(state=>{
                const recorded=recordSource(state,{url:page.url,fetchedAt:page.fetchedAt,title,text});job.sourceId=recorded.source.id;
                return updateWorkspace(recorded.state,workspaceId,w=>{w.budgets.collector={...runtime.snapshot(),day};});
              });
              job.status='complete';job.message=text?'Public evidence saved.':'Page saved, but no readable text was found.';
            } catch(error) {
              job.status='failed';job.message=error.code?error.message:'Page check failed. No source was saved.';
              try{await mutate(state=>updateWorkspace(state,workspaceId,w=>{w.budgets.collector={...runtime.snapshot(),day};}));}catch{job.message='Page check failed and its status could not be saved.';}
            }
          })();
          res.writeHead(303,{Location:'/collectors'});return res.end();
        }
      }
      if (req.method==='GET' && pathname==='/health') {loadState(stateFile);return json(res,200,{status:'ok'});}
      if (req.method==='GET' && pathname==='/fonts/manrope-latin-wght-normal.woff2') {
        const font=fs.readFileSync(path.resolve(__dirname,'../../node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2'));
        res.writeHead(200,{'Content-Type':'font/woff2'});return res.end(font);
      }
      if (req.method==='GET' && (pathname==='/'||pathname==='/overview')) return html(200,overview(loadState(stateFile),requestUrl.searchParams));
      if (req.method==='POST' && ['/workspaces','/workspaces/switch'].includes(pathname)) {
        // Queue complete read-modify-write operations to avoid lost updates.
        const work = writes.then(async()=>{const next=await workspaceAction(req,loadState(stateFile),pathname);saveState(next,stateFile);});
        writes=work.catch(()=>{});
        try {await work;} catch {return html(400,shell(loadState(stateFile),'<h1>Could not save workspace</h1><p>Check the name or workspace selection and try again.</p><a href="/">Return to Overview</a>'));}
        res.writeHead(303,{Location:'/'});return res.end();
      }
      html(404,shell(loadState(stateFile),'<h1>Page not found</h1><a href="/">Return to Overview</a>','Not found'));
    } catch(error) {
      console.error('Request failed:',error.message);
      html(500,'<!doctype html><html lang="en"><title>WhyNow · Error</title><h1>Something went wrong</h1><p>Your request could not be completed. Check the server and try again.</p></html>');
    }
  };
}
module.exports = {createRouter};
