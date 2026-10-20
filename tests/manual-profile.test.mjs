import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
const require=createRequire(import.meta.url);
const {defaultState,createWorkspace,updateWorkspace,saveState,loadState}=require('../scripts/server/state.cjs');
const {WEIGHTS,SLAS,saveManualProfile,approveManualProfile,profileWarnings,qualityFindings,blockingQualityFindings}=require('../scripts/onboarding/manual-profile.cjs');
const {recordSource}=require('../scripts/sources.cjs');
const {profilePage}=require('../scripts/onboarding/profile-page.cjs');
const {createRouter}=require('../scripts/server/router.cjs');
function initial(){let state=createWorkspace(defaultState(),{name:'Test only'});return updateWorkspace(state,state.activeWorkspaceId,w=>{w.onboarding={schemaVersion:1,status:'selected',selectedCandidate:{name:'Fixture seller',domain:'example.org',website:'https://example.org'}};});}
function form(revision=0){return new URLSearchParams({revision:String(revision),category:'Fixture category',productOneLiner:'Fixture product description',targetCompanySize:'Mid-sized teams','targetIndustries.0.value':'Fixture industry','segments.0.label':'Segment A','segments.1.label':'Segment B','segments.2.label':'Segment C',buyerTitles:'Director\nDirector',championTitles:'Team lead'});}
function reasons(state,id,message='Reviewed fixture warning for this revision.') {return Object.fromEntries(blockingQualityFindings(state.workspaces[id]).map(item=>[item.id,message]));}
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
  expect(()=>approveManualProfile(state,id,{revision:1,acknowledged:true})).toThrow('Explain why');
  const approved=approveManualProfile(state,id,{revision:1,acknowledged:true,qualityReasons:reasons(state,id)});
  expect(approved.workspaces[id].status).toBe('active');expect(profileWarnings(approved.workspaces[id].sellerProfile)).toHaveLength(4);
  expect(approved.workspaces[id].sellerProfile.deliveryAllowed).toBe(false);expect(approved.workspaces[id].deliveryMode).toBe('demo');
  expect(approved.auditLog[0]).toMatchObject({workspaceId:id,type:'seller_profile_approved',unverifiedClaims:4,qualityAcknowledgments:[
    expect.objectContaining({code:'EMPTY_COMPETITORS',reason:'Reviewed fixture warning for this revision.'}),
    expect.objectContaining({code:'EMPTY_CUSTOMERS',reason:'Reviewed fixture warning for this revision.'})
  ]});
});
it('shows advisory warnings beside fields without requiring typed approval reasons',()=>{
  let state=initial();const id=state.activeWorkspaceId,f=form();f.set('productOneLiner','Build the platform of your dreams.');state=saveManualProfile(state,id,f);
  const findings=qualityFindings(state.workspaces[id]);
  expect(findings.find(item=>item.code==='SLOGAN_LIKE_FACT')).toMatchObject({severity:'advisory',field:'productOneLiner'});
  const html=profilePage(state);
  expect(html).toContain('<strong>Advisory:</strong> This reads like a headline or marketing slogan');
  expect(html).not.toContain(`name="qualityReason.${findings.find(item=>item.code==='SLOGAN_LIKE_FACT').id}"`);
  const approved=approveManualProfile(state,id,{revision:1,acknowledged:true,qualityReasons:reasons(state,id)});
  expect(approved.workspaces[id].status).toBe('active');
  expect(approved.auditLog[0].qualityAcknowledgments.every(item=>item.code!=='SLOGAN_LIKE_FACT')).toBe(true);
});
it('blocks incomplete approvals and requires fresh approval after edits',()=>{
  let state=initial();const id=state.activeWorkspaceId;state=saveManualProfile(state,id,new URLSearchParams({revision:'0'}));
  expect(()=>approveManualProfile(state,id,{revision:1,acknowledged:true})).toThrow('3–10');
  state=saveManualProfile(state,id,form(1));state=approveManualProfile(state,id,{revision:2,acknowledged:true,qualityReasons:reasons(state,id)});
  state=saveManualProfile(state,id,form(3));expect(state.workspaces[id].status).toBe('needs_review');expect(state.workspaces[id].sellerProfile.approvedAt).toBeNull();
  expect(()=>approveManualProfile(state,id,{revision:4,acknowledged:true})).toThrow('Explain why');
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
  f.set('customers.0.url','https://news.example.org/page');f.set('customers.0.quote','Fixture customer uses this seller for production workflows.');
  state=recordSource(state,{url:'https://news.example.org/page',text:'Fixture customer uses this seller for production workflows.',fetchedAt:'2026-09-16T00:00:00Z'}).state;
  // A subdomain of the selected seller qualifies as first-party.
  expect(saveManualProfile(state,id,f).workspaces[id].sellerProfile.customers[0].inferred).toBe(false);
  state=recordSource(state,{url:'https://other.org/page',text:'Fixture customer uses this seller for production workflows.',fetchedAt:'2026-09-16T00:00:00Z'}).state;
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
  for(const [key,value] of [
    ['segments.1.label','Segment A'],['segments.0.queryTemplates','just one'],['segments.0.enabled','maybe'],['category.url','javascript:alert(1)'],['sizeFloor','-1'],
    ['weights.techStack','0'],['weights.activePain','101'],['slaDays.funding','0'],['slaDays.exec_change','1.5'],
    ['tierRules.tier1.public','maybe'],['tierRules.tier1.revenue','-1'],['tierRules.tier2.employees','1.5'],
    ['tierRules.tier2.fundingStages',''],['tierRules.tier3.maxEmployees','10000001'],['tierRules.unclassified','']
  ]){const f=form();f.set(key,value);expect(()=>saveManualProfile(state,id,f)).toThrow();}
});
it('escapes saved claims and preserves posted edits when rendering errors',()=>{
  const state=initial(),f=form();f.set('category','<img src=x onerror=alert(1)>');
  const saved=saveManualProfile(state,state.activeWorkspaceId,f);
  expect(profilePage(saved)).toContain('&lt;img');expect(profilePage(saved)).not.toContain('<img src=x');
  f.set('category','Unsaved edit');expect(profilePage(saved,{submitted:f,error:'Invalid source'})).toContain('Unsaved edit');
});
it('shows and saves the deeper targeting and messaging rules before approval',()=>{
  let state=initial();const id=state.activeWorkspaceId;state=saveManualProfile(state,id,form());
  state=recordSource(state,{url:'https://example.org/example-target',text:'Example Target uses Fixture Seller for production workflows.',fetchedAt:'2026-09-17T00:00:00Z'}).state;
  const f=form(1);
  f.set('segments.0.enabled','false');f.set('segments.0.revenueSensitivityBase','5');f.set('segments.0.wedgeCustomers','Customer One\nCustomer Two');
  f.set('segments.0.exampleTargets.0.name','Example Target');f.set('segments.0.exampleTargets.0.domain','target.example');
  f.set('segments.0.exampleTargets.0.url','https://example.org/example-target');f.set('segments.0.exampleTargets.0.quote','Example Target uses Fixture Seller for production workflows.');
  f.set('signals.techStack.label','Technical environment fit');f.set('signals.techStack.description','Review the public technical environment.');
  f.set('signals.techStack.evidenceKeywords','Node.js\nTypeScript');f.set('signals.techStack.negativeKeywords','Legacy only');
  f.set('signals.techStack.preferredSources','Engineering blog');f.set('signals.techStack.rubric.1','No matching environment');
  f.set('signals.techStack.rubric.3','Some matching environment');f.set('signals.techStack.rubric.5','Strong matching environment');
  Object.keys(WEIGHTS).forEach((key,index)=>f.set(`weights.${key}`,String(1.5+index/10)));
  Object.keys(SLAS).forEach((key,index)=>f.set(`slaDays.${key}`,String(20+index)));
  f.set('tierRules.tier1.public','false');f.set('tierRules.tier1.revenue','750000000');f.set('tierRules.tier1.employees','3000');f.set('tierRules.tier1.valuation','7000000000');
  f.set('tierRules.tier2.revenue','50000000');f.set('tierRules.tier2.employees','250');f.set('tierRules.tier2.fundingStages','Series B\nSeries C');
  f.set('tierRules.tier3.maxEmployees','249');f.set('tierRules.tier3.minRaised','5000000');f.set('tierRules.unclassified','manual review');
  f.set('pitch.receiptOpenerStyle','Open with one verified change.');f.set('pitch.oneSentenceProduct','A concise reviewed product sentence.');f.set('pitch.credentialLine','Use only a verified credential.');f.set('pitch.ctaStyle','Ask for a short conversation.');
  f.set('objectionTemplates.0','Ask what concern matters most.');
  const saved=saveManualProfile(state,id,f),config=saved.workspaces[id].icpConfig,html=profilePage(saved);
  expect(config.segments[0]).toMatchObject({enabled:false,revenueSensitivityBase:5,wedgeCustomers:['Customer One','Customer Two'],exampleTargets:[{name:'Example Target',domain:'target.example',inferred:false}]});
  expect(config.signalDefinitions.techStack).toMatchObject({label:'Technical environment fit',description:'Review the public technical environment.',negativeKeywords:['Legacy only'],preferredSources:['Engineering blog'],rubric:{1:'No matching environment',3:'Some matching environment',5:'Strong matching environment'}});
  expect(config.weights).toEqual(Object.fromEntries(Object.keys(WEIGHTS).map((key,index)=>[key,1.5+index/10])));
  expect(config.slaDays).toEqual(Object.fromEntries(Object.keys(SLAS).map((key,index)=>[key,20+index])));
  expect(config.tierRules).toEqual({tier1:{public:false,revenue:750000000,employees:3000,valuation:7000000000},tier2:{revenue:50000000,employees:250,fundingStages:['Series B','Series C']},tier3:{maxEmployees:249,minRaised:5000000},unclassified:'manual review'});
  expect(config.pitch).toMatchObject({receiptOpenerStyle:'Open with one verified change.',oneSentenceProduct:'A concise reviewed product sentence.',credentialLine:'Use only a verified credential.',ctaStyle:'Ask for a short conversation.'});
  expect(config.objectionTemplates[0]).toBe('Ask what concern matters most.');
  for(const visible of ['Technical environment fit','Review the public technical environment.','Engineering blog','Timing windows','Company tier rules','manual review','A concise reviewed product sentence.','Open with one verified change.','Ask what concern matters most.','Example Target'])expect(html).toContain(visible);
  for(const key of Object.keys(WEIGHTS))expect(html).toContain(`name="weights.${key}"`);
  for(const key of Object.keys(SLAS))expect(html).toContain(`name="slaDays.${key}"`);
  for(const key of ['tier1.public','tier1.revenue','tier1.employees','tier1.valuation','tier2.revenue','tier2.employees','tier2.fundingStages','tier3.maxEmployees','tier3.minRaised','unclassified'])expect(html).toContain(`name="tierRules.${key}"`);
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
    const reviewHtml=await(await fetch(base+'/onboarding/profile')).text();
    expect(reviewHtml).toContain('Approve saved profile');expect(reviewHtml).toContain('Reason for accepting this warning');
    expect(reviewHtml).not.toMatch(/name="qualityReason\.[^"]+"[^>]*>[^<]+<\/textarea>/);
    expect((await post('/onboarding/profile/approve',new URLSearchParams({workspaceId:id,revision:'1',acknowledged:'on'}))).status).toBe(400);
    expect(loadState(file).workspaces[id].status).toBe('needs_review');
    const stored=loadState(file),approval=new URLSearchParams({workspaceId:id,revision:'1',acknowledged:'on'});
    for(const item of blockingQualityFindings(stored.workspaces[id]))approval.set(`qualityReason.${item.id}`,'Reviewed and accepted for this HTTP persistence test.');
    expect((await post('/onboarding/profile/approve',approval)).status).toBe(303);
    expect(loadState(file).workspaces[id].status).toBe('active');
    expect(await(await fetch(base)).text()).toContain('Seller profile approved');
    f.set('workspaceId','other');expect((await post('/onboarding/profile/save',f)).status).toBe(409);
    expect(loadState(file).auditLog).toHaveLength(1);
  }finally{if(server?.listening)await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true});}
});
