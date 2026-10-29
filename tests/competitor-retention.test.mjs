import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
const require=createRequire(import.meta.url);
const {defaultState,createWorkspace,updateWorkspace,saveState,loadState}=require('../scripts/server/state.cjs');
const {recordSource}=require('../scripts/sources.cjs');
const {extractOrganizationCandidates}=require('../scripts/onboarding/extract-organizations.cjs');
const {materializeReview,request}=require('../scripts/onboarding/review-organizations.cjs');
const {restoreCompetitor}=require('../scripts/onboarding/competitor-review.cjs');
const {workspaceQualityFindings}=require('../scripts/onboarding/validate.cjs');
const {approvalProblems}=require('../scripts/onboarding/manual-profile.cjs');
const {profilePage}=require('../scripts/onboarding/profile-page.cjs');
const {createRouter}=require('../scripts/server/router.cjs');

function fixture(page={url:'https://seller.example/compare/rival',title:'Seller vs Rival',text:'Seller vs Rival. Rival provides a different solution with a self-hosted deployment model. Compare Seller and Rival for enterprise workflows.'},seller={name:'Seller',domain:'seller.example'}) {
  let state=createWorkspace(defaultState(),{name:seller.name}),id=state.activeWorkspaceId;
  const saved=recordSource(state,{...page,fetchedAt:'2026-10-27T00:00:00.000Z'});state=saved.state;
  state=updateWorkspace(state,id,w=>{w.onboarding={status:'selected',selectedCandidate:seller};w.research={status:'evidence_ready',revision:1,runId:'offline',selectedCandidate:seller,sources:[{sourceId:saved.source.id,kind:'seller_site',ownerDomain:seller.domain}]};});
  const raw=new Map([[page.url,{url:page.url,text:page.html||'<html><title>Seller vs Rival</title><h1>Seller vs Rival</h1><a href="https://rival.example">Rival</a></html>'}]]);
  return {state,id,candidates:extractOrganizationCandidates({state,workspace:state.workspaces[id],rawPages:raw})};
}
it('retains all three real saved Vercel comparison candidates even when the old model output omitted them',()=>{
  const page=JSON.parse(fs.readFileSync(new URL('./fixtures/extraction/vercel-comparisons-saved.json',import.meta.url),'utf8'));
  const {candidates}=fixture(page,{name:'Vercel',domain:'vercel.com'});
  const result=materializeReview({customers:[],competitors:[]},candidates);
  expect(result.competitors.map(row=>row.name).sort()).toEqual(['Cloudflare','Netlify','Webflow']);
  expect(result.organizationReview.competitors.every(row=>row.decision==='retained')).toBe(true);
});
it('requires a named evidence-based rejection, retains invalid/uncertain rejection omissions, and rejects invented/cross-kind IDs',()=>{
  const {id,candidates}=fixture(),candidate=candidates.competitors[0];expect(candidate).toBeTruthy();
  const req=request({workspaceId:id,company:candidates.seller,candidates,model:'gpt-5.5'});
  const rejection={candidateId:candidate.id,reason:'Rival is a self-hosted alternative, not a managed-service competitor for this targeting.',supportingQuote:candidate.evidenceQuote};
  expect(req.validate({customers:[],competitors:[],rejectedCompetitors:[rejection]})).toBe(true);
  expect(materializeReview({customers:[],competitors:[],rejectedCompetitors:[rejection]},candidates).competitors).toEqual([]);
  for(const bad of [{...rejection,reason:'Not sure'},{...rejection,supportingQuote:'A fabricated quote that does not exist.'}]) {
    expect(()=>req.validate({customers:[],competitors:[],rejectedCompetitors:[bad]})).toThrow('specific reason');
    expect(materializeReview({customers:[],competitors:[],rejectedCompetitors:[bad]},candidates).competitors).toHaveLength(1);
  }
  expect(()=>req.validate({customers:[{candidateId:candidate.id}],competitors:[],rejectedCompetitors:[]})).toThrow('wrong kind');
  expect(()=>req.validate({customers:[],competitors:[{candidateId:'invented'}],rejectedCompetitors:[]})).toThrow('unknown');
  const uncertain=structuredClone(candidates);uncertain.competitors[0].status='uncertain_candidate';
  expect(materializeReview({customers:[],competitors:[]},uncertain).competitors).toEqual([]);
  uncertain.competitors[0].status='confirmed_candidate';uncertain.competitors[0].sourceUrl='https://third-party.example/vs';
  expect(materializeReview({customers:[],competitors:[]},uncertain).competitors).toEqual([]);
});
function droppedFixture(){
  let {state,id,candidates}=fixture();const candidate=candidates.competitors[0];
  const reviewed=materializeReview({customers:[],competitors:[],rejectedCompetitors:[{candidateId:candidate.id,reason:'Rival is a self-hosted alternative rather than a managed-service competitor.',supportingQuote:candidate.evidenceQuote}]},candidates);
  state=updateWorkspace(state,id,w=>{w.profileRevision=1;w.status='needs_review';w.sellerProfile={competitors:[],evidence:{},sources:[],targetCompanySize:''};w.icpConfig={triggerMapping:{competitor_names:[]},killPatterns:{sizeMetric:{label:'minEmployees',floor:50}}};w.research.synthesis={organizationReview:reviewed.organizationReview};w.reviewAcknowledgments=['old'];});return {state,id,candidate};
}
it('restores saved evidence only, clears acknowledgments, logs the reason and stays unapproved',()=>{
  const {state,id,candidate}=droppedFixture(),next=restoreCompetitor(state,id,{candidateId:candidate.id,revision:1});
  expect(next.workspaces[id].sellerProfile.competitors[0]).toMatchObject({name:'Rival',domain:'rival.example',inferred:false});
  expect(next.workspaces[id]).toMatchObject({status:'needs_review',profileRevision:2});expect(next.workspaces[id].sellerProfile.approvedAt).toBeNull();expect(next.workspaces[id].reviewAcknowledgments).toBeUndefined();
  expect(next.workspaces[id].icpConfig.triggerMapping.competitor_names).toEqual(['Rival']);
  expect(next.auditLog.at(-1)).toMatchObject({type:'competitor_candidate_restored',previousReason:expect.stringContaining('self-hosted')});
  expect(()=>restoreCompetitor(state,id,{candidateId:candidate.id,revision:0})).toThrow('another tab');
  expect(()=>restoreCompetitor(state,id,{candidateId:'invented',revision:1})).toThrow('not available');
  const missing=structuredClone(state);missing.workspaces[id].research.synthesis.organizationReview.competitors[0].receiptId='missing';
  expect(()=>restoreCompetitor(missing,id,{candidateId:candidate.id,revision:1})).toThrow('saved supporting receipt');
});
it('offers a one-click restore outside the edit form, with origin/workspace/revision guards over HTTP',async()=>{
  const {state,id,candidate}=droppedFixture(),dir=fs.mkdtempSync(path.join(os.tmpdir(),'whynow-restore-')),file=path.join(dir,'state.json');saveState(state,file);
  const server=http.createServer(createRouter({stateFile:file,env:{},runtimeFactory:()=>{throw Error('No network');}}));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
  try {
    const html=await(await fetch(base+'/onboarding/profile')).text();expect(html).toContain('Dropped competitor candidates');expect(html).toContain('Restore Rival');expect(html.indexOf('action="/onboarding/profile/restore-competitor"')).toBeLessThan(html.indexOf('action="/onboarding/profile/save"'));
    const post=(data,origin=base)=>fetch(base+'/onboarding/profile/restore-competitor',{method:'POST',redirect:'manual',headers:{Origin:origin},body:new URLSearchParams(data)});
    const data={workspaceId:id,revision:'1',candidateId:candidate.id};expect((await post(data,'https://other.example')).status).toBe(403);expect((await post({...data,workspaceId:'other'})).status).toBe(409);expect((await post({...data,revision:'0'})).status).toBe(400);expect((await post(data)).status).toBe(303);
    expect(loadState(file).workspaces[id].sellerProfile.competitors).toHaveLength(1);expect(loadState(file).workspaces[id].status).toBe('needs_review');
  }finally{await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true});}
});
it('recognizes measurable size identifiers, keeps blank target size editable/missing, and still flags true contradictions',()=>{
  const {state,id}=droppedFixture(),workspace=state.workspaces[id];
  for(const label of ['minEmployees','minEngineeringHeadcount','employee_count','annualRevenue','headcount','ARR']) {
    workspace.icpConfig.killPatterns.sizeMetric.label=label;
    expect(workspaceQualityFindings(workspace).filter(row=>row.code.startsWith('SIZE_')),label).toEqual([]);
  }
  expect(approvalProblems(workspace)).toContain('Describe the target company size.');expect(profilePage(state)).toContain('a blank value is not a size contradiction');
  workspace.sellerProfile.targetCompanySize='Startups under 50 employees';workspace.icpConfig.killPatterns.sizeMetric={label:'minEmployees',floor:100};
  expect(workspaceQualityFindings(workspace).map(row=>row.code)).toContain('SIZE_FLOOR_CONTRADICTS_TARGET');
  workspace.icpConfig.killPatterns.sizeMetric.label='Small businesses';expect(workspaceQualityFindings(workspace).map(row=>row.code)).toContain('SIZE_METRIC_UNMEASURABLE');
});
