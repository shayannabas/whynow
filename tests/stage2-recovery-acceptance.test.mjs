import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require=createRequire(import.meta.url);
const {defaultState,createWorkspace,loadState,saveState,updateWorkspace}=require('../scripts/server/state.cjs');
const {createPersistentAdapter,snapshotFor,actualCostUsd}=require('../scripts/stage2-recovery-acceptance.cjs');

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
