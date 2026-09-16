import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
const require=createRequire(import.meta.url);
const {createRouter}=require('../scripts/server/router.cjs');
const {defaultState,createWorkspace,saveState,loadState}=require('../scripts/server/state.cjs');
const {CollectorRuntime}=require('../scripts/collectors/runtime.cjs');

it('local admin fetch stores public evidence, persists budgets, scopes job access and denies production',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'whynow-routes-'));
  const file=path.join(dir,'state.json');
  let state=createWorkspace(defaultState(),{name:'Test workspace'});const first=state.activeWorkspaceId;saveState(state,file);
  let server;
  const start=async(env)=>{
    server=http.createServer(createRouter({stateFile:file,env,runtimeFactory:options=>new CollectorRuntime({...options,sleep:async()=>{},lookup:async()=>[{address:'93.184.215.14',family:4}],fetch:async url=>({status:200,headers:new Headers({'content-type':'text/html'}),text:async()=>url.endsWith('/robots.txt')?'User-agent: *\nAllow: /':'<title>Public source</title><p>Recorded public text.</p>'})})}));
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
    return `http://127.0.0.1:${server.address().port}`;
  };
  const stop=()=>new Promise(resolve=>server.close(resolve));
  try {
    let base=await start({CRAWLER_CONTACT_EMAIL:'crawler@example.org'});
    const post=origin=>fetch(`${base}/collectors/fetch`,{method:'POST',redirect:'manual',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({workspaceId:first,url:'https://example.org/page'})});
    expect((await post('https://other.example')).status).toBe(403);
    expect((await post(base)).status).toBe(303);
    let stored;
    for(let i=0;i<50;i++){stored=loadState(file);if(Object.keys(stored.sources).length)break;await new Promise(r=>setTimeout(r,10));}
    const source=Object.values(stored.sources)[0];expect(source.text).toContain('Recorded public text.');
    expect(stored.workspaces[first].budgets.collector.usage.seller_site.requests).toBe(1);
    expect(await(await fetch(`${base}/sources/${source.id}`)).text()).toContain('Original public page');
    expect(await(await fetch(`${base}/collectors`)).text()).toContain('Public evidence saved.');
    await stop();base=await start({CRAWLER_CONTACT_EMAIL:'crawler@example.org'});
    await post(base);
    for(let i=0;i<50;i++){stored=loadState(file);if(stored.workspaces[first].budgets.collector.usage.seller_site.cacheHits)break;await new Promise(r=>setTimeout(r,10));}
    expect(stored.workspaces[first].budgets.collector.usage.seller_site.cacheHits).toBe(1);
    expect(Object.keys(stored.sources)).toHaveLength(1);
    // Switching away cannot expose another workspace's job progress.
    state=createWorkspace(stored,{name:'Other workspace'});saveState(state,file);
    expect(await(await fetch(`${base}/collectors`)).text()).not.toContain('Public evidence saved.');
    expect((await post(base)).status).toBe(409);
    await stop();base=await start({NODE_ENV:'production'});
    expect((await fetch(`${base}/collectors`)).status).toBe(403);
    expect((await fetch(`${base}/sources/${source.id}`)).status).toBe(403);
  } finally {if(server?.listening)await stop();fs.rmSync(dir,{recursive:true,force:true});}
});
