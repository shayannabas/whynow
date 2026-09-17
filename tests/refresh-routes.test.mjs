import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {defaultState,createWorkspace,saveState,loadState}=require('../scripts/server/state.cjs');
const {recordSource}=require('../scripts/sources.cjs');
const {proposeRefresh}=require('../scripts/onboarding/refresh.cjs');
const {createRouter}=require('../scripts/server/router.cjs');

it('renders a pending monthly diff and requires acknowledgement plus fresh grounded receipts to approve it',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'whynow-refresh-route-')),stateFile=path.join(dir,'state.json');
  let state=createWorkspace(defaultState(),{name:'Vercel'}),id=state.activeWorkspaceId,w=state.workspaces[id];
  w.status='active';w.profileRevision=2;w.deliveryMode='demo';w.onboarding={schemaVersion:1,status:'selected',selectedCandidate:{id:'vercel',name:'Vercel',domain:'vercel.com',website:'https://vercel.com'}};
  w.sellerProfile={schemaVersion:1,sellerName:'Vercel',domain:'vercel.com',category:'Hosting',productOneLiner:'Old summary',pricingModel:'',targetCompanySize:'Teams',valueProps:[],proofPoints:[],credentials:[],targetIndustries:['Software'],customers:[],competitors:[],approvedAt:'2026-08-01T00:00:00.000Z',deliveryAllowed:false,sources:[],evidence:{}};
  w.sellerProfile.evidence={
    category:{value:'Hosting',inferred:true},
    productOneLiner:{value:'Old summary',inferred:true},
    targetCompanySize:{value:'Teams',inferred:true},
    'targetIndustries.0':{value:'Software',inferred:true}
  };
  w.icpConfig={schemaVersion:1,segments:[{key:'one',label:'One',queryTemplates:['a','b','c','d'],subIndustries:[],enabled:true,revenueSensitivityBase:3,wedgeCustomers:[],exampleTargets:[]},{key:'two',label:'Two',queryTemplates:['a','b','c','d'],subIndustries:[],enabled:true,revenueSensitivityBase:3,wedgeCustomers:[],exampleTargets:[]},{key:'three',label:'Three',queryTemplates:['a','b','c','d'],subIndustries:[],enabled:true,revenueSensitivityBase:3,wedgeCustomers:[],exampleTargets:[]}],personas:{buyerTitles:['CTO'],championTitles:['Developer'],wrongOrgTitles:[]},defaultsReviewRequired:false};
  const saved=recordSource(state,{url:'https://vercel.com/docs',title:'Docs',text:'Vercel is a platform for developers.',fetchedAt:'2026-09-17T12:00:00.000Z'});state=saved.state;
  const proposedProfile=structuredClone(state.workspaces[id].sellerProfile);proposedProfile.category='Developer platform';proposedProfile.sources=[saved.source.id];proposedProfile.evidence.category={schemaVersion:1,value:'Developer platform',sourceId:saved.source.id,sourceUrl:saved.source.url,evidenceQuote:'Vercel is a platform for developers.',inferred:false};
  state=proposeRefresh(state,id,{runId:'monthly-1',sellerProfile:proposedProfile,icpConfig:state.workspaces[id].icpConfig,sourceIds:[saved.source.id],now:()=> '2026-09-17T12:01:00.000Z'});saveState(state,stateFile);
  const pending=state.workspaces[id].refresh.pending,server=http.createServer(createRouter({stateFile,env:{OPENAI_ENABLED:'false',SERPER_ENABLED:'false'}}));
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const base=`http://127.0.0.1:${server.address().port}`,post=(origin,acknowledged)=>fetch(base+'/onboarding/refresh/approve',{method:'POST',redirect:'manual',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({workspaceId:id,proposalId:pending.id,revision:'2',...(acknowledged?{acknowledged:'on'}:{})})});
  try{
    const page=await(await fetch(base+'/onboarding/profile')).text();expect(page).toContain('Monthly refresh needs your review');expect(page).toContain('Developer platform');expect(page).toContain('Hosting');
    expect((await post('https://other.example',true)).status).toBe(403);
    expect((await post(base,false)).status).toBe(400);expect(loadState(stateFile).workspaces[id].sellerProfile.category).toBe('Hosting');
    expect((await post(base,true)).status).toBe(303);
    const approved=loadState(stateFile).workspaces[id];expect(approved.sellerProfile.category).toBe('Developer platform');expect(approved.refresh.pending).toBeNull();expect(approved.profileRevision).toBe(3);
  }finally{await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true});}
});
