const fs = require('node:fs');
const path = require('node:path');
const { json } = require('../utils.cjs');
const { loadState, saveState } = require('./state.cjs');
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
function createRouter({stateFile,env=process.env,runtimeFactory=options=>new CollectorRuntime(options)} = {}) {
  loadState(stateFile);
  let writes = Promise.resolve();
  const jobs=new Map();
  const mutate=fn=>{
    const work=writes.then(()=>{const next=fn(loadState(stateFile));saveState(next,stateFile);return next;});
    writes=work.catch(()=>{});return work;
  };
  return async (req,res) => {
    const html = (status, body) => {res.writeHead(status,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(body);};
    try {
      const pathname = new URL(req.url,'http://localhost').pathname;
      if (pathname.startsWith('/onboarding') && await onboardingRoute({req,res,pathname,state:loadState(stateFile),mutate,env,runtimeFactory,stateFile})) return;
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
      if (req.method==='GET' && pathname==='/') return html(200,overview(loadState(stateFile)));
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
