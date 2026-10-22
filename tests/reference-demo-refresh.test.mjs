import {createRequire} from 'node:module';
import {expect,it} from 'vitest';
const require=createRequire(import.meta.url);
const {defaultState}=require('../scripts/server/state.cjs');
const {loadResolveReferenceDemo,REFERENCE_WORKSPACE_ID}=require('../scripts/reference-demo.cjs');
const {approvedSellerClaims}=require('../scripts/outreach-drafts.cjs');

it('refreshes a stale load-only Resolve config in memory without removing saved accounts',()=>{
  const original=loadResolveReferenceDemo(defaultState()),workspace=original.workspaces[REFERENCE_WORKSPACE_ID];
  workspace.referenceDemo.referenceProfileVersion='resolve-ai-v4-chunk-3';
  workspace.icpConfig.outreach.claims.product={value:'Old unsupported claim',quote:'Different text',sourceUrl:'https://resolve.ai/old'};
  workspace.accounts.push({id:'saved-account',name:'Saved Account'});
  const refreshed=loadResolveReferenceDemo(original),next=refreshed.workspaces[REFERENCE_WORKSPACE_ID];
  expect(next.accounts).toEqual([{id:'saved-account',name:'Saved Account'}]);
  expect(next.referenceDemo.referenceProfileVersion).toBe('resolve-ai-v7-outreach-polish-2026-10-21');
  expect(approvedSellerClaims(next)).not.toBeNull();
});
