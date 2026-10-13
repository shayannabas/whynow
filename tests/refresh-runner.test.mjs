import {it,expect} from 'vitest';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const {defaultState,createWorkspace,updateWorkspace}=require('../scripts/server/state.cjs');
const {recordSource}=require('../scripts/sources.cjs');
const {createRefreshCoordinator,refreshProvidersReady,dueAt,isRefreshDue}=require('../scripts/onboarding/refresh-runner.cjs');
const {workspacesPage}=require('../scripts/server/workspaces.cjs');

const NOW='2026-10-13T12:00:00.000Z';
const READY_ENV={
  SERPER_ENABLED:'true',SERPER_API_KEY:'fixture',WORKSPACE_MAX_SERPER_QUERIES_PER_RUN:'4',SERPER_MONTHLY_QUERY_LIMIT:'50',ONBOARDING_MAX_PAGES:'20',
  OPENAI_ENABLED:'true',OPENAI_API_KEY:'fixture',OPENAI_MONTHLY_LIMIT_USD:'1',OPENAI_WORKSPACE_MONTHLY_CALL_LIMIT:'3'
};

function savedProfile(source,value='Original category') {
  const evidence={schemaVersion:1,value,sourceId:source.id,sourceUrl:source.url,evidenceQuote:value,inferred:false,verification:'matched_saved_quote',reason:'Quote matched saved source text.'};
  return {schemaVersion:1,sellerName:'Example',domain:'example.com',category:value,productOneLiner:'',pricingModel:'',targetCompanySize:'',valueProps:[],proofPoints:[],credentials:[],targetIndustries:[],customers:[],competitors:[],evidence:{category:evidence},sources:[source.id],deliveryAllowed:false,generatedAt:NOW,approvedAt:'2026-08-01T00:00:00.000Z',updatedAt:NOW};
}

function fixture() {
  let state=createWorkspace(defaultState(),{name:'Example'}),id=state.activeWorkspaceId;
  let saved=recordSource(state,{url:'https://example.com/original',title:'Original',text:'Original category',fetchedAt:NOW});state=saved.state;
  state=updateWorkspace(state,id,workspace=>{
    const candidate={id:'example',name:'Example',domain:'example.com',website:'https://example.com',sourceUrl:'https://example.com'};
    workspace.status='active';workspace.profileRevision=2;workspace.onboarding={schemaVersion:1,status:'selected',selectedCandidate:candidate};
    workspace.sellerProfile=savedProfile(saved.source);workspace.icpConfig={schemaVersion:1,segments:[]};
  });
  return {state,id};
}

function store(initial) {
  let state=structuredClone(initial),writes=Promise.resolve();
  return {read:()=>structuredClone(state),mutate:fn=>{const operation=writes.then(()=>{state=fn(state);return structuredClone(state);});writes=operation.catch(()=>{});return operation;}};
}

it('recognizes due approved workspaces and stays dormant without both explicitly enabled providers',async()=>{
  const f=fixture(),workspace=f.state.workspaces[f.id];
  expect(dueAt(workspace)).toBe('2026-08-31T00:00:00.000Z');
  expect(isRefreshDue(workspace,NOW)).toBe(true);
  expect(refreshProvidersReady(READY_ENV)).toBe(true);
  expect(refreshProvidersReady({...READY_ENV,OPENAI_ENABLED:'false'})).toBe(false);
  const saved=store(f.state),coordinator=createRefreshCoordinator({read:saved.read,mutate:saved.mutate,env:{...READY_ENV,OPENAI_ENABLED:'false'},researchCoordinator:{start:async()=>{}},synthesisCoordinator:{start:async()=>{}},now:()=>NOW});
  expect(await coordinator.runDue()).toEqual([]);
  expect(saved.read()).toEqual(f.state);
});

it('runs research and drafting in a hidden workspace, then proposes but never auto-applies a grounded monthly diff',async()=>{
  const f=fixture(),saved=store(f.state);let researchCalls=0,draftCalls=0;
  const researchCoordinator={start:async shadowId=>{
    researchCalls++;
    await saved.mutate(state=>{
      const recorded=recordSource(state,{url:'https://example.com/updated',title:'Updated',text:'Updated category',fetchedAt:NOW});
      return updateWorkspace(recorded.state,shadowId,shadow=>{
        shadow.research.status='evidence_ready';shadow.research.revision++;
        shadow.research.sources=[{schemaVersion:1,sourceId:recorded.source.id,url:recorded.source.url,title:recorded.source.title,fetchedAt:NOW,kind:'seller_site',ownerDomain:'example.com',chars:16,bytes:16}];
      });
    });
  }};
  const synthesisCoordinator={start:async shadowId=>{
    draftCalls++;
    await saved.mutate(state=>updateWorkspace(state,shadowId,shadow=>{
      const sourceId=shadow.research.sources[0].sourceId,source=state.sources[sourceId],value='Updated category';
      shadow.sellerProfile=savedProfile(source,value);shadow.sellerProfile.approvedAt=null;
      shadow.icpConfig={schemaVersion:1,segments:[]};shadow.status='needs_review';shadow.profileRevision=1;shadow.research.status='review_required';
    }));
  }};
  let ids=0;
  const coordinator=createRefreshCoordinator({read:saved.read,mutate:saved.mutate,researchCoordinator,synthesisCoordinator,env:READY_ENV,now:()=>NOW,randomId:()=>`id-${++ids}`});
  await coordinator.start(f.id);
  const state=saved.read(),workspace=state.workspaces[f.id],shadows=Object.values(state.workspaces).filter(item=>item.systemRole==='seller_refresh');
  expect(researchCalls).toBe(1);expect(draftCalls).toBe(1);
  expect(workspace.sellerProfile.category).toBe('Original category');
  expect(workspace.refresh.running).toBeNull();
  expect(workspace.refresh.pending).toMatchObject({status:'needs_review',runId:'id-1',proposedSellerProfile:{category:'Updated category'}});
  expect(workspace.refresh.pending.diff).toContainEqual(expect.objectContaining({path:'sellerProfile.category',kind:'changed',before:'Original category',after:'Updated category'}));
  expect(shadows).toHaveLength(1);expect(shadows[0].status).toBe('archived');
  expect(workspacesPage(state)).not.toContain('Example monthly refresh');
  expect(state.auditLog.map(item=>item.type)).toEqual(expect.arrayContaining(['seller_refresh_started','seller_refresh_proposed']));
});
