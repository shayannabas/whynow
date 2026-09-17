import {it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {defaultState,createWorkspace}=require('../scripts/server/state.cjs');
const {approveRefresh,proposeRefresh,recordRefreshFailure,refreshDiff,rejectRefresh,validateRefreshGrounding,MAX_REFRESH_HISTORY}=require('../scripts/onboarding/refresh.cjs');
const {recordSource}=require('../scripts/sources.cjs');

const approvedAt='2026-08-01T00:00:00.000Z';
function addActive(state,{name,domain}){
  state=createWorkspace(state,{name});const id=state.activeWorkspaceId,w=state.workspaces[id];
  w.status='active';w.profileRevision=2;w.deliveryMode='demo';
  w.sellerProfile={schemaVersion:1,sellerName:name,domain,approvedAt,deliveryAllowed:false,sources:[],evidence:{}};
  w.icpConfig={schemaVersion:1,segments:[],personas:{buyerTitles:['CTO','VP Engineering'],championTitles:['Head of SRE'],wrongOrgTitles:[]},weights:{techStack:1.3},defaultsReviewRequired:false};
  return {state,id};
}
function setup(){return addActive(defaultState(),{name:'Vercel',domain:'vercel.com'});}
function proposalFor(workspace){
  const sellerProfile=structuredClone(workspace.sellerProfile),icpConfig=structuredClone(workspace.icpConfig);
  icpConfig.personas.buyerTitles.push('SVP Engineering');
  return {runId:'monthly-2026-09',sellerProfile,icpConfig,sourceIds:[],now:()=> '2026-09-01T00:00:00.000Z'};
}

it('creates a bounded review proposal without applying it and treats array order as semantic no-op',()=>{
  const {state,id}=setup(),before=structuredClone(state.workspaces[id]);
  const proposed=proposeRefresh(state,id,proposalFor(before)),workspace=proposed.workspaces[id];
  expect(workspace.sellerProfile).toEqual(before.sellerProfile);
  expect(workspace.icpConfig).toEqual(before.icpConfig);
  expect(workspace.refresh.pending).toMatchObject({workspaceId:id,status:'needs_review',basedOnProfileRevision:2,runId:'monthly-2026-09'});
  expect(workspace.refresh.pending.diff).toHaveLength(1);
  expect(workspace.refresh.pending.diff[0]).toMatchObject({kind:'added',before:null,after:'SVP Engineering'});
  expect(workspace.refresh.pending.proposedIcpConfig.personas.buyerTitles).toContain('SVP Engineering');
  expect(state.workspaces[id].refresh).toBeUndefined();

  const reorderedProfile=structuredClone(before.sellerProfile),reorderedConfig=structuredClone(before.icpConfig);
  reorderedConfig.personas.buyerTitles.reverse();
  expect(refreshDiff(before.sellerProfile,before.icpConfig,reorderedProfile,reorderedConfig)).toEqual([]);
  const noChange=proposeRefresh(state,id,{runId:'monthly-no-change',sellerProfile:reorderedProfile,icpConfig:reorderedConfig,sourceIds:[],now:()=> '2026-09-02T00:00:00.000Z'});
  expect(noChange.workspaces[id].refresh.pending).toBeNull();
  expect(noChange.workspaces[id].refresh.history.at(-1).status).toBe('no_changes');
  expect(noChange.workspaces[id].sellerProfile).toEqual(before.sellerProfile);
  expect(noChange.workspaces[id].icpConfig).toEqual(before.icpConfig);
});

it('shows a receipt-only change instead of silently treating it as no change',()=>{
  const {state,id}=setup(),workspace=state.workspaces[id];
  workspace.sellerProfile.category='Deployment platform';
  workspace.sellerProfile.evidence.category={sourceId:'old',sourceUrl:'https://vercel.com/old',evidenceQuote:'old quote',inferred:false};
  const nextProfile=structuredClone(workspace.sellerProfile);
  nextProfile.evidence.category={sourceId:'new',sourceUrl:'https://vercel.com/new',evidenceQuote:'new quote',inferred:false};
  expect(refreshDiff(workspace.sellerProfile,workspace.icpConfig,nextProfile,workspace.icpConfig)).toContainEqual(expect.objectContaining({path:'sellerProfile.category',kind:'evidence_changed',before:'Deployment platform',after:'Deployment platform'}));
});

it('rechecks every non-inferred receipt against the immutable saved source before approval',()=>{
  let {state,id}=setup();
  const saved=recordSource(state,{url:'https://vercel.com/docs',title:'Docs',text:'Vercel is a platform for developers.',fetchedAt:'2026-09-17T12:00:00.000Z'});state=saved.state;
  const profile=structuredClone(state.workspaces[id].sellerProfile);
  profile.category='Developer platform';profile.sources=[saved.source.id];profile.evidence.category={schemaVersion:1,value:profile.category,sourceId:saved.source.id,sourceUrl:saved.source.url,evidenceQuote:'Vercel is a platform for developers.',inferred:false};
  const input={state,sellerProfile:profile,sourceIds:[saved.source.id]};
  expect(validateRefreshGrounding(input)).toBe(true);
  expect(validateRefreshGrounding({...input,sellerProfile:{...profile,evidence:{category:{...profile.evidence.category,evidenceQuote:'Unsupported paraphrase'}}}})).toBe(false);
  expect(validateRefreshGrounding({...input,sourceIds:[]})).toBe(false);
});

it('requires evidence for every factual field while preserving explicitly inferred manual facts',()=>{
  const {state,id}=setup(),base=structuredClone(state.workspaces[id].sellerProfile);
  base.category='Developer platform';base.valueProps=['Fast deployments'];base.proofPoints=[{claim:'Used by teams'}];
  base.evidence={};
  const input={state,workspaceId:id,sellerProfile:base,sourceIds:[]};
  expect(validateRefreshGrounding(input)).toBe(false);

  base.evidence={
    category:{value:'Different category',inferred:true},
    'valueProps.0':{value:'Fast deployments',inferred:true},
    'proofPoints.0':{value:'Used by teams',inferred:true}
  };
  expect(validateRefreshGrounding(input)).toBe(false);

  base.evidence.category={value:'Developer platform',sourceId:null,sourceUrl:null,evidenceQuote:'',inferred:true,verification:'no_source',reason:'Manual fact awaiting evidence.'};
  expect(validateRefreshGrounding(input)).toBe(true);
});

it('requires a synchronous grounding hook and explicit approval before applying a refresh',()=>{
  const {state,id}=setup(),proposed=proposeRefresh(state,id,proposalFor(state.workspaces[id])),pending=proposed.workspaces[id].refresh.pending;
  expect(()=>approveRefresh(proposed,id,{proposalId:pending.id,revision:2})).toThrow('grounding validator');
  expect(()=>approveRefresh(proposed,id,{proposalId:pending.id,revision:2,groundingCheck:()=>false})).toThrow('grounding validation');
  expect(proposed.workspaces[id].icpConfig.personas.buyerTitles).not.toContain('SVP Engineering');
  const check=vi.fn(()=>true);
  const approved=approveRefresh(proposed,id,{proposalId:pending.id,revision:2,groundingCheck:check,now:()=> '2026-09-03T00:00:00.000Z'}),workspace=approved.workspaces[id];
  expect(check).toHaveBeenCalledOnce();
  expect(workspace.icpConfig.personas.buyerTitles).toContain('SVP Engineering');
  expect(workspace.profileRevision).toBe(3);
  expect(workspace.sellerProfile).toMatchObject({approvedAt:'2026-09-03T00:00:00.000Z',deliveryAllowed:false});
  expect(workspace.deliveryMode).toBe('demo');expect(workspace.status).toBe('active');
  expect(workspace.refresh.pending).toBeNull();expect(workspace.refresh.history.at(-1).status).toBe('approved');
  expect(approved.auditLog.at(-1)).toMatchObject({workspaceId:id,type:'seller_refresh_approved',proposalId:pending.id});
});

it('rejects stale or cross-workspace proposals and blocks archived workspaces',()=>{
  let {state,id}=setup();const proposed=proposeRefresh(state,id,proposalFor(state.workspaces[id])),pending=proposed.workspaces[id].refresh.pending;
  const stale=structuredClone(proposed);stale.workspaces[id].profileRevision=3;
  expect(()=>approveRefresh(stale,id,{proposalId:pending.id,revision:3,groundingCheck:()=>true})).toThrow('changed');

  const second=addActive(proposed,{name:'Shopify',domain:'shopify.com'}),shopifyId=second.id;
  expect(()=>approveRefresh(second.state,shopifyId,{proposalId:pending.id,revision:2,groundingCheck:()=>true})).toThrow('does not belong');
  expect(()=>proposeRefresh(state,id,{...proposalFor(state.workspaces[id]),sellerProfile:structuredClone(second.state.workspaces[shopifyId].sellerProfile)})).toThrow('another seller domain');
  const archived=structuredClone(state);archived.workspaces[id].status='archived';
  expect(()=>proposeRefresh(archived,id,proposalFor(archived.workspaces[id]))).toThrow('Restore');
  expect(second.state.workspaces[shopifyId].sellerProfile.domain).toBe('shopify.com');
});

it('preserves the active profile on rejection and failure, and bounds retained history',()=>{
  const {state,id}=setup(),original=structuredClone(state.workspaces[id].sellerProfile);
  let next=proposeRefresh(state,id,proposalFor(state.workspaces[id])),pending=next.workspaces[id].refresh.pending;
  next=rejectRefresh(next,id,{proposalId:pending.id,revision:2,now:()=> '2026-09-04T00:00:00.000Z'});
  expect(next.workspaces[id].sellerProfile).toEqual(original);expect(next.workspaces[id].refresh.history.at(-1).status).toBe('rejected');
  for(let index=0;index<MAX_REFRESH_HISTORY+2;index++){
    const day=String(index+1).padStart(2,'0');
    next=recordRefreshFailure(next,id,{runId:`failed-${index}`,code:'COLLECTION_FAILED',now:()=>`2026-10-${day}T00:00:00.000Z`});
  }
  expect(next.workspaces[id].sellerProfile).toEqual(original);
  expect(next.workspaces[id].status).toBe('active');
  expect(next.workspaces[id].refresh.history).toHaveLength(MAX_REFRESH_HISTORY);
  expect(next.workspaces[id].refresh.history.every(entry=>entry.workspaceId===id)).toBe(true);
  expect(next.workspaces[id].refresh.history.at(-1)).toMatchObject({runId:`failed-${MAX_REFRESH_HISTORY+1}`,status:'failed',code:'COLLECTION_FAILED'});
});
