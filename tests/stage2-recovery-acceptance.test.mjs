import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require=createRequire(import.meta.url);
const {defaultState,createWorkspace,loadState,saveState,updateWorkspace}=require('../scripts/server/state.cjs');
const {createPersistentAdapter,snapshotFor,actualCostUsd}=require('../scripts/stage2-recovery-acceptance.cjs');
const {COMPANIES,MAX_SOURCES,validateFinalPlan,chooseSourceRefs,resetWorkspaceForFinalDraft}=require('../scripts/stage2-final-rerun.cjs');

describe('Stage 2 recovery acceptance persistence',()=>{
  it('serializes every mutation through the normal saveState path',async()=>{
    const dir=fs.mkdtempSync(path.join(os.tmpdir(),'whynow-recovery-')),file=path.join(dir,'acceptance-state.json');
    try{
      saveState(createWorkspace(defaultState(),{name:'Recovery seller'}),file);
      const adapter=createPersistentAdapter(file),id=adapter.read().activeWorkspaceId;
      await adapter.mutate(state=>updateWorkspace(state,id,workspace=>{workspace.status='needs_review';workspace.profileRevision=1;}));
      await adapter.settled();
      expect(loadState(file).workspaces[id]).toMatchObject({status:'needs_review',profileRevision:1});
      expect(fs.existsSync(`${file}.bak`)).toBe(true);
    }finally{fs.rmSync(dir,{recursive:true,force:true});}
  });

  it('builds a public review snapshot with required provenance and no workspace internals',()=>{
    const workspace={id:'private-workspace-id',status:'needs_review',budgets:{openai:{calls:1}},llmCache:{secret:'not public'},
      sellerProfile:{schemaVersion:1,sellerName:'Resolve AI',domain:'resolve.ai',deliveryAllowed:false},
      icpConfig:{schemaVersion:1,segments:[]},research:{synthesis:{model:'gpt-4o-mini',promptVersion:'prompt-v4',report:{attemptedClaims:2,receiptedClaims:2}}}};
    const snapshot=snapshotFor(workspace,{capturedOn:'2026-10-13T00:00:00.000Z',commit:'abc123'});
    expect(snapshot).toMatchObject({capturedOn:'2026-10-13T00:00:00.000Z',model:'gpt-4o-mini',promptVersion:'prompt-v4',commitHash:'abc123',
      seller:{name:'Resolve AI',domain:'resolve.ai'},receiptReport:{attemptedClaims:2,receiptedClaims:2}});
    expect(snapshot.sellerProfile).toEqual(workspace.sellerProfile);
    expect(snapshot.icpConfig).toEqual(workspace.icpConfig);
    expect(snapshot).not.toHaveProperty('workspaceId');
    expect(snapshot).not.toHaveProperty('budgets');
    expect(snapshot).not.toHaveProperty('llmCache');
  });

  it('computes GPT-4o mini token cost from successful API usage',()=>{
    expect(actualCostUsd([{promptTokens:1_000_000,completionTokens:1_000_000}])).toBeCloseTo(0.75,8);
  });
});

describe('final Stage 2 rerun plan',()=>{
  function source(id,url){return {schemaVersion:1,id,url,fetchedAt:'2026-10-19T00:00:00.000Z',contentHash:id.padEnd(64,'0'),title:url,text:'Readable public seller evidence.'};}
  function stateForPlan(){
    let state=defaultState();
    for(const company of COMPANIES){
      state=createWorkspace(state,{name:company.name});const id=state.activeWorkspaceId,w=state.workspaces[id];
      w.sellerProfile.domain=company.domain;w.research={schemaVersion:1,selectedCandidate:{name:company.name,domain:company.domain,website:`https://${company.domain}/`},
        plan:{urls:company.name==='Vercel'?[]:[...company.customerPages]},sources:[],steps:[]};
      for(const [index,url] of [...company.livePages,...company.retainedPages].entries()){
        const sourceId=`${company.slug}-${index}`,saved=source(sourceId,url);state.sources[sourceId]=saved;
        w.research.sources.push({schemaVersion:1,sourceId,url,title:saved.title,fetchedAt:saved.fetchedAt,kind:/customer|case-stud/i.test(url)?'seller_customer_page':'seller_site',ownerDomain:company.domain,chars:saved.text.length,bytes:saved.text.length});
      }
    }
    return state;
  }

  it('uses only first-party pages, needs no Serper queries and stays within the source ceiling',()=>{
    const report=validateFinalPlan(stateForPlan());
    expect(report).toHaveLength(3);
    expect(report.every(item=>item.serperQueries===0&&item.maximumSynthesisSources<=MAX_SOURCES)).toBe(true);
    expect(report.find(item=>item.company==='Resolve AI').customerPageCount).toBeGreaterThanOrEqual(4);
    expect(report.find(item=>item.company==='Shopify').customerPageCount).toBeGreaterThanOrEqual(4);
  });

  it('prepares a fresh review draft without carrying approval or paid-call state',()=>{
    let state=stateForPlan(),workspace=Object.values(state.workspaces)[0];workspace.status='needs_review';workspace.llmCache={old:{value:{}}};workspace.budgets.openai={month:'2026-10',calls:2,reservedMicros:2000};
    const refs=chooseSourceRefs(state,workspace,COMPANIES[0]);
    state=resetWorkspaceForFinalDraft(state,workspace.id,COMPANIES[0],refs);
    const reset=state.workspaces[workspace.id];
    expect(reset.status).toBe('draft');expect(reset.research.status).toBe('evidence_ready');expect(reset.research.sources.length).toBeLessThanOrEqual(MAX_SOURCES);
    expect(reset.llmCache).toEqual({});expect(reset.budgets.openai).toEqual({});expect(reset.sellerProfile).toEqual({schemaVersion:1,deliveryAllowed:false});
  });
});
