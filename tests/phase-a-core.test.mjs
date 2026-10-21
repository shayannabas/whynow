import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {defaultState}=require('../scripts/server/state.cjs');
const {loadResolveReferenceDemo,REFERENCE_WORKSPACE_ID}=require('../scripts/reference-demo.cjs');
const {phaseAConfigForWorkspace}=require('../scripts/phase-a-config.cjs');
const {evaluateKills}=require('../scripts/kills.cjs');
const {signalRubric}=require('../scripts/signal-rubric.cjs');
const {sameEntity}=require('../scripts/entity-rules.cjs');
const {scoreSignals}=require('../scripts/scoring.cjs');

describe('Phase A workspace-driven rules',()=>{
  it('loads the Resolve config without approving a profile',()=>{
    const state=loadResolveReferenceDemo(defaultState(),{now:()=> '2026-10-20T12:00:00.000Z'}),workspace=state.workspaces[REFERENCE_WORKSPACE_ID];
    expect(workspace).toMatchObject({status:'reference_demo',deliveryMode:'demo',sellerProfile:{approvedAt:null,deliveryAllowed:false},referenceDemo:{loadOnly:true,sourceCommit:'130789f1bac1d5e11f5f5154f269155dc17f2d21'}});
    expect(state.auditLog.at(-1).type).toBe('reference_demo_loaded');
    expect(state.auditLog.some(row=>/approv/i.test(row.type))).toBe(false);
    expect(phaseAConfigForWorkspace(workspace).configSource).toBe('frozen_reference');
  });
  it('refuses an unapproved normal workspace',()=>{
    const workspace={status:'draft',sellerProfile:{approvedAt:null},icpConfig:{}};
    expect(()=>phaseAConfigForWorkspace(workspace)).toThrow(/owner-approved/);
  });
  it('reads seller, customer, competitor, and size rules from an approved workspace',()=>{
    const workspace={
      status:'active',
      name:'Example workspace',
      sellerProfile:{
        sellerName:'Workspace Seller',domain:'seller.example',approvedAt:'2026-10-20T12:00:00.000Z',
        customers:[{name:'Known Customer',domain:'customer.example',sourceUrl:'https://seller.example/customers/known'}],
        competitors:[{name:'Known Rival',domain:'rival.example',sourceUrl:'https://seller.example/compare/rival'}],
      },
      icpConfig:{
        killPatterns:{sizeMetric:{label:'employees',floor:500}},
        segments:[{key:'enterprise',label:'Enterprise',enabled:true}],
      },
    };
    expect(phaseAConfigForWorkspace(workspace)).toMatchObject({
      configSource:'owner_approved',
      seller:{name:'Workspace Seller',domain:'seller.example'},
      customers:[{name:'Known Customer',domain:'customer.example',sourceUrl:'https://seller.example/customers/known'}],
      competitors:[{name:'Known Rival',domain:'rival.example',sourceUrl:'https://seller.example/compare/rival'}],
      killPatterns:{sizeMetric:{label:'employees',floor:500}},
      segments:[{key:'enterprise',label:'Enterprise',enabled:true}],
    });
  });
  it('reads all six scorecard rows and weights from the workspace',()=>{
    const state=loadResolveReferenceDemo(defaultState()),workspace=state.workspaces[REFERENCE_WORKSPACE_ID],rows=signalRubric(workspace.icpConfig);
    expect(rows).toHaveLength(6);expect(rows.find(row=>row.key==='techStack')).toMatchObject({label:'Tech Stack',weight:1.3,scoreMinimum:1,scoreMaximum:5});
  });
  it('adds WhyNow seller/competitor protection without changing source kill precedence',()=>{
    const state=loadResolveReferenceDemo(defaultState()),workspace=state.workspaces[REFERENCE_WORKSPACE_ID];
    workspace.sellerProfile.competitors=[{name:'RivalCo',domain:'rival.example',sourceUrl:'https://resolve.ai/compare/rival'}];
    const config=phaseAConfigForWorkspace(workspace);
    expect(config.killPrecedence.slice(0,5)).toEqual(['KILL_EXISTING_CUSTOMER','KILL_UNSELLABLE_ORG','KILL_SOLVING_IN_HOUSE','KILL_BUILD_CULTURE','KILL_BELOW_ICP_SIZE']);
    expect(evaluateKills({name:'Resolve AI',domain:'resolve.ai'},config)[0]).toMatchObject({code:'KILL_SELLER_OR_COMPETITOR',reason:'Resolve AI is the seller, not a prospect.'});
    expect(evaluateKills({name:'RivalCo',domain:'rival.example'},config)[0]).toMatchObject({code:'KILL_SELLER_OR_COMPETITOR'});
  });
  it('uses configurable parent aliases rather than a hidden Uber constant',()=>{
    const rules=[{canonicalName:'Uber',aliases:['uber eats'],domains:['uber.com','ubereats.com']}];
    expect(sameEntity({name:'Uber Technologies',domain:'uber.com'},{name:'Uber Eats',domain:'ubereats.com'},rules)).toBe(true);
    expect(sameEntity({name:'Uber Eats'},{name:'Unrelated'},rules)).toBe(false);
  });
  it('treats uncollected signals as unknown low-confidence priors, not negative evidence',()=>{
    const score=scoreSignals({},{});
    expect(score.fitScore).toBe(8);expect(score.confidenceBand).toBe('mostly-inferred');expect(score.receiptedSignals).toBe(0);
    expect(Object.values(score.breakdown).every(row=>row.rawScore===1&&row.confidence===.4&&row.evidenceUrl==='')).toBe(true);
  });
});
