import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {createRouter}=require('../scripts/server/router.cjs');
const {loadState}=require('../scripts/server/state.cjs');

const waitFor=async(check)=>{for(let index=0;index<100;index++){const value=check();if(value)return value;await new Promise(resolve=>setTimeout(resolve,10));}throw new Error('Timed out waiting for local research');};

it('connects name entry, explicit confirmation and bounded evidence collection without OpenAI',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'whynow-research-route-')),stateFile=path.join(dir,'state.json');
  const key='fixture-serper-key-never-save',searchCalls=[],pageCalls=[];
  const env={SERPER_ENABLED:'true',SERPER_API_KEY:key,WORKSPACE_MAX_SERPER_QUERIES_PER_RUN:'4',SERPER_MONTHLY_QUERY_LIMIT:'50',CRAWLER_CONTACT_EMAIL:'crawler@example.org',OPENAI_ENABLED:'false',OPENAI_MONTHLY_LIMIT_USD:'0'};
  const runtimeFactory=()=>({
    usage:{serper:{requests:0,cacheHits:0,lastAt:null},seller_site:{requests:0,cacheHits:0,lastAt:null}},health:{},
    snapshot(){return {schemaVersion:1,usage:this.usage,health:this.health};},
    async request(source,url,options={}){
      if(source==='serper'){
        this.usage.serper.requests++;const query=JSON.parse(options.body).q;searchCalls.push(query);
        const organic=searchCalls.length===1?
          [{title:'Vercel',link:'https://vercel.com',snippet:'Possible official website'}]:
          [{title:'Vercel platform',link:'https://vercel.com/platform',snippet:'Public product page'},{title:'Vercel docs',link:'https://vercel.com/docs',snippet:'Public docs'}];
        return {url,text:JSON.stringify({organic}),fetchedAt:'2026-09-17T12:00:00.000Z'};
      }
      pageCalls.push(url);this.usage.seller_site.requests++;
      return {url,text:`<title>Vercel public page</title><main>Vercel is a platform for developers. Public fixture for ${url}</main>`,fetchedAt:'2026-09-17T12:00:00.000Z'};
    }
  });
  const server=http.createServer(createRouter({stateFile,env,runtimeFactory}));
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const base=`http://127.0.0.1:${server.address().port}`,post=(url,body)=>fetch(base+url,{method:'POST',redirect:'manual',headers:{Origin:base,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(body)});
  try{
    expect((await post('/onboarding/start',{name:'Vercel'})).status).toBe(303);
    const identified=await waitFor(()=>{const state=loadState(stateFile),w=state.workspaces[state.activeWorkspaceId];return w.research.status==='confirmation_required'?{state,w}:null;});
    expect(searchCalls).toHaveLength(1);expect(identified.w.research.candidates).toHaveLength(1);
    const candidate=identified.w.research.candidates[0],revision=identified.w.research.revision,id=identified.w.id;

    expect((await post('/onboarding/research/confirm',{workspaceId:id,candidateId:'forged',revision})).status).toBe(400);
    expect(loadState(stateFile).workspaces[id].research.selectedCandidate).toBeUndefined();
    expect((await post('/onboarding/research/confirm',{workspaceId:id,candidateId:candidate.id,revision})).status).toBe(303);
    const finished=await waitFor(()=>{const w=loadState(stateFile).workspaces[id];return w.research.status==='evidence_ready'?w:null;});
    expect(searchCalls.length).toBeLessThanOrEqual(4);expect(pageCalls.length).toBeGreaterThan(0);expect(pageCalls.length).toBeLessThanOrEqual(20);
    expect(finished.budgets.serper.queries).toBe(searchCalls.length);
    expect(finished.sellerProfile.category).toBeUndefined();

    const html=await(await fetch(base+'/onboarding/results')).text();
    expect(html).toContain('Evidence is ready');expect(html).toContain('Paid OpenAI drafting remains off');expect(html).toContain('Saved public evidence');
    const status=await(await fetch(base+'/onboarding/research/status')).text();
    expect(status).not.toContain(key);expect(status).toContain('evidence_ready');
  }finally{await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true});}
});
