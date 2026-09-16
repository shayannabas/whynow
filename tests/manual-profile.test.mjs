import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
const require=createRequire(import.meta.url);
const {defaultState,createWorkspace,updateWorkspace,saveState,loadState}=require('../scripts/server/state.cjs');
const {saveManualProfile,approveManualProfile,profileWarnings}=require('../scripts/onboarding/manual-profile.cjs');
const {recordSource}=require('../scripts/sources.cjs');
const {profilePage}=require('../scripts/onboarding/profile-page.cjs');
const {createRouter}=require('../scripts/server/router.cjs');
function initial(){let state=createWorkspace(defaultState(),{name:'Test only'});return updateWorkspace(state,state.activeWorkspaceId,w=>{w.onboarding={schemaVersion:1,status:'selected',selectedCandidate:{name:'Fixture seller',domain:'example.org',website:'https://example.org'}};});}
function form(revision=0){return new URLSearchParams({revision:String(revision),category:'Fixture category',productOneLiner:'Fixture product description',targetCompanySize:'Mid-sized teams','targetIndustries.0.value':'Fixture industry','segments.0.label':'Segment A','segments.1.label':'Segment B','segments.2.label':'Segment C',buyerTitles:'Director\nDirector',championTitles:'Team lead'});}
it('saves a complete manual draft without calling providers and fills strategy defaults',()=>{
  const state=initial(),id=state.activeWorkspaceId,next=saveManualProfile(state,id,form());
  expect(next.workspaces[id].status).toBe('needs_review');expect(next.workspaces[id].profileRevision).toBe(1);
  expect(next.workspaces[id].icpConfig.personas.buyerTitles).toEqual(['Director']);
  expect(next.workspaces[id].icpConfig.segments[0].queryTemplates).toHaveLength(4);
  expect(next.workspaces[id].icpConfig.weights.techStack).toBe(1.3);
  expect(state.workspaces[id].sellerProfile.category).toBeUndefined();
});
it('retains unverified claims through explicit approval and keeps delivery off',()=>{
  let state=initial();const id=state.activeWorkspaceId;state=saveManualProfile(state,id,form());
  expect(()=>approveManualProfile(state,id,{revision:1})).toThrow('Confirm');
  const approved=approveManualProfile(state,id,{revision:1,acknowledged:true});
  expect(approved.workspaces[id].status).toBe('active');expect(profileWarnings(approved.workspaces[id].sellerProfile)).toHaveLength(4);
  expect(approved.workspaces[id].sellerProfile.deliveryAllowed).toBe(false);expect(approved.workspaces[id].deliveryMode).toBe('demo');
  expect(approved.auditLog[0]).toMatchObject({workspaceId:id,type:'seller_profile_approved',unverifiedClaims:4});
});
it('blocks incomplete approvals and requires fresh approval after edits',()=>{
  let state=initial();const id=state.activeWorkspaceId;state=saveManualProfile(state,id,new URLSearchParams({revision:'0'}));
  expect(()=>approveManualProfile(state,id,{revision:1,acknowledged:true})).toThrow('3–10');
  state=saveManualProfile(state,id,form(1));state=approveManualProfile(state,id,{revision:2,acknowledged:true});
  state=saveManualProfile(state,id,form(3));expect(state.workspaces[id].status).toBe('needs_review');expect(state.workspaces[id].sellerProfile.approvedAt).toBeNull();
});
it('rejects stale edits and approvals without changing another workspace',()=>{
  let state=initial();const id=state.activeWorkspaceId;state=createWorkspace(state,{name:'Other'});const other=state.activeWorkspaceId;
  const saved=saveManualProfile(state,id,form());expect(saved.workspaces[other]).toEqual(state.workspaces[other]);
  expect(()=>saveManualProfile(saved,id,form())).toThrow('another tab');
  expect(()=>approveManualProfile(saved,id,{revision:0,acknowledged:true})).toThrow('another tab');
});
it('requires URLs for customer/competitor entries and first-party saved quotes for customer evidence',()=>{
  let state=initial();const id=state.activeWorkspaceId,f=form();f.set('customers.0.value','Fixture customer');
  expect(()=>saveManualProfile(state,id,f)).toThrow('source link');
  f.set('customers.0.url','https://news.example.org/page');f.set('customers.0.quote','Fixture customer');
  state=recordSource(state,{url:'https://news.example.org/page',text:'Fixture customer',fetchedAt:'2026-09-16T00:00:00Z'}).state;
  // A subdomain of the selected seller qualifies as first-party.
  expect(saveManualProfile(state,id,f).workspaces[id].sellerProfile.customers[0].inferred).toBe(false);
  state=recordSource(state,{url:'https://other.org/page',text:'Fixture customer',fetchedAt:'2026-09-16T00:00:00Z'}).state;
  f.set('customers.0.url','https://other.org/page');expect(saveManualProfile(state,id,f).workspaces[id].sellerProfile.customers[0].inferred).toBe(true);
});
it('links without a saved exact quote remain unverified; paraphrases fail',()=>{
  let state=initial();const id=state.activeWorkspaceId,f=form();
  state=recordSource(state,{url:'https://example.org/product',text:'Fixture product description',fetchedAt:'2026-09-16T00:00:00Z'}).state;
  f.set('productOneLiner.url','https://example.org/product');f.set('productOneLiner.quote','Fixture product description');
  expect(saveManualProfile(state,id,f).workspaces[id].sellerProfile.evidence.productOneLiner.inferred).toBe(false);
  f.set('productOneLiner.quote','Description of a fixture product');
  expect(saveManualProfile(state,id,f).workspaces[id].sellerProfile.evidence.productOneLiner.inferred).toBe(true);
});
it('validates segment sizes, query counts, duplicate segments and unsafe source URLs',()=>{
  const state=initial(),id=state.activeWorkspaceId;
  for(const [key,value] of [['segments.1.label','Segment A'],['segments.0.queryTemplates','just one'],['category.url','javascript:alert(1)'],['sizeFloor','-1']]){const f=form();f.set(key,value);expect(()=>saveManualProfile(state,id,f)).toThrow();}
});
it('escapes saved claims and preserves posted edits when rendering errors',()=>{
  const state=initial(),f=form();f.set('category','<img src=x onerror=alert(1)>');
  const saved=saveManualProfile(state,state.activeWorkspaceId,f);
  expect(profilePage(saved)).toContain('&lt;img');expect(profilePage(saved)).not.toContain('<img src=x');
  f.set('category','Unsaved edit');expect(profilePage(saved,{submitted:f,error:'Invalid source'})).toContain('Unsaved edit');
});
it('saves, reviews and approves through local HTTP; rejects forged workspace and cross-origin changes',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'whynow-manual-')),file=path.join(dir,'state.json');let server;
  try{
    const state=initial(),id=state.activeWorkspaceId;saveState(state,file);
    server=http.createServer(createRouter({stateFile:file,env:{},runtimeFactory:()=>{throw Error('No API call allowed');}}));
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
    const base=`http://127.0.0.1:${server.address().port}`;
    const post=(route,body,origin=base)=>fetch(base+route,{method:'POST',redirect:'manual',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body});
    const f=form();f.set('workspaceId',id);
    expect((await post('/onboarding/profile/save',f,'https://other.org')).status).toBe(403);
    expect((await post('/onboarding/profile/save',f)).status).toBe(303);
    expect(await(await fetch(base+'/onboarding/profile')).text()).toContain('Approve saved profile');
    const approval=new URLSearchParams({workspaceId:id,revision:'1',acknowledged:'on'});
    expect((await post('/onboarding/profile/approve',approval)).status).toBe(303);
    expect(loadState(file).workspaces[id].status).toBe('active');
    expect(await(await fetch(base)).text()).toContain('Seller profile approved');
    f.set('workspaceId','other');expect((await post('/onboarding/profile/save',f)).status).toBe(409);
    expect(loadState(file).auditLog).toHaveLength(1);
  }finally{if(server?.listening)await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true});}
});
