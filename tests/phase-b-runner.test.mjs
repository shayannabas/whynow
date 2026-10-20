import {describe,expect,it} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {defaultState}=require('../scripts/server/state.cjs');
const {loadResolveReferenceDemo}=require('../scripts/reference-demo.cjs');
const {addManualAccountToState}=require('../scripts/accounts.cjs');
const {createPhaseBRefreshCoordinator,mergeCollectorResult}=require('../scripts/phase-b-runner.cjs');
const {collectSerperEvidence}=require('../scripts/collectors/search-evidence.cjs');

function empty(collectorId){return async()=>({collectorId,signals:[],events:[],killHints:[],targetPatch:{},itemsFound:0});}
function setup(){
  let state=loadResolveReferenceDemo(defaultState(),{now:()=> '2026-10-20T12:00:00.000Z'}),workspaceId=state.activeWorkspaceId;
  state=addManualAccountToState(state,workspaceId,{name:'Acme',domain:'acme.example',segment:'data_ai_infrastructure',sourceUrl:'https://acme.example/about'},{now:()=> '2026-10-20T12:00:00.000Z',id:()=> 'acct-acme'});
  return {workspaceId,read:()=>structuredClone(state),mutate:async fn=>{state=fn(structuredClone(state));return structuredClone(state);},value:()=>state};
}

describe('Phase B background refresh',()=>{
  it('merges stronger receipted signals without replacing them with inferred guesses',()=>{
    const account={signals:{techStack:{key:'techStack',score:4,evidenceUrl:'https://acme.example/stack',observedAt:'2026-10-19T00:00:00Z',inferred:false}},triggers:[],killHints:[]};
    const inferred=mergeCollectorResult(account,{signals:[{key:'techStack',score:5,evidenceUrl:'',observedAt:'2026-10-20T00:00:00Z',inferred:true}]},'r1');
    expect(inferred.signals.techStack.score).toBe(4);
    const newer=mergeCollectorResult(inferred,{signals:[{id:'s2',key:'techStack',score:5,evidenceUrl:'https://acme.example/new',observedAt:'2026-10-20T00:00:00Z',inferred:false}],events:[{id:'e1',type:'reliability_hiring',evidenceUrl:'https://jobs.example/1'}]},'r1');
    expect(newer.signals.techStack).toMatchObject({score:5,evidenceUrl:'https://acme.example/new'});
    expect(newer.triggers).toHaveLength(1);
  });

  it('persists collector progress, Serper usage, score changes and retained kills',async()=>{
    const h=setup(),queries=[];
    const collectors={
      collectSerperEvidence,
      collectHiring:async()=>({signals:[{id:'sig-tech',key:'techStack',score:5,evidenceUrl:'https://jobs.example/acme',evidenceText:'Kubernetes and Datadog',observedAt:'2026-10-20T12:00:00.000Z',sourceId:'greenhouse',inferred:false}],events:[{id:'evt-hiring',type:'reliability_hiring',triggerType:'reliability_hiring',title:'SRE',evidenceUrl:'https://jobs.example/acme',evidenceText:'SRE role',occurredAt:'2026-10-20T12:00:00.000Z',decaysAt:'2026-12-01T00:00:00Z'}],killHints:[],targetPatch:{},itemsFound:1}),
      collectActivePain:async(_target,context)=>({signals:[{id:'sig-pain',key:'activePain',score:4,evidenceUrl:context.searchResults[0].url,evidenceText:'Acme outage',observedAt:'2026-10-20T12:00:00.000Z',sourceId:'serper',inferred:false}],events:[],killHints:[],targetPatch:{},itemsFound:1}),
      collectFirmographics:async()=>({signals:[],events:[],killHints:[],targetPatch:{firmographics:{isPublic:true,confidence:.7,confidenceLabel:'medium',source:'wikidata',sources:['https://www.wikidata.org/entity/Q1'],fields:{isPublic:{value:true,confidence:.7,sourceUrl:'https://www.wikidata.org/entity/Q1',provider:'wikidata'}}}},itemsFound:1}),
      collectExecutiveChange:empty('executive_change'),collectTechCulture:async()=>({signals:[],events:[],killHints:[{code:'KILL_BUILD_CULTURE',evidenceUrl:'https://acme.example/engineering',evidenceText:'Acme built internal observability.'}],targetPatch:{},itemsFound:1}),collectAiCompatibility:empty('ai_compatibility'),collectCompetitiveWedge:empty('competitive_wedge'),collectRevenueSensitivity:async()=>({signals:[{id:'sig-revenue',key:'revenueSensitivity',score:4,evidenceUrl:'',evidenceText:'Segment model',observedAt:'2026-10-20T12:00:00.000Z',sourceId:'segment_model',inferred:true}],events:[],killHints:[],targetPatch:{},itemsFound:0}),collectEdgarFormDUniverse:async()=>{throw new Error('EDGAR is disabled in this test');},
    };
    const runtime={usage:{},health:{},identity:()=> 'WhyNow test',snapshot(){return {schemaVersion:1,usage:this.usage,health:this.health};}};
    const coordinator=createPhaseBRefreshCoordinator({read:h.read,mutate:h.mutate,env:{CRAWLER_CONTACT_EMAIL:'crawler@example.org',SERPER_ENABLED:'true',SERPER_API_KEY:'test-only',WORKSPACE_MAX_SERPER_QUERIES_PER_RUN:'4',SERPER_MONTHLY_QUERY_LIMIT:'10',EDGAR_ENABLED:'false'},runtimeFactory:()=>runtime,now:()=>new Date('2026-10-20T12:00:00.000Z'),id:()=> 'run-1',collectors,searchProvider:async query=>{queries.push(query);return [{title:'Acme production update',url:'https://acme.example/incidents/1',snippet:'Acme outage incident'}];}});
    const started=await coordinator.start(h.workspaceId,'acct-acme');expect(started.status).toBe('queued');
    const run=await coordinator.wait(started.id),state=h.value(),workspace=state.workspaces[h.workspaceId],account=workspace.accounts[0];
    expect(queries).toHaveLength(4);expect(workspace.budgets.serperQueries).toEqual({month:'2026-10',queries:4});
    expect(run).toMatchObject({status:'complete',serperQueries:4,errors:[]});
    expect(account.signals).toMatchObject({techStack:{score:5},activePain:{score:4},revenueSensitivity:{score:4}});
    expect(account.fitScore).toBeGreaterThan(8);expect(account.tier).toBe(1);expect(account.tierProvisional).toBe(true);expect(account.killStatus).toBe('killed');expect(account.primaryKill.code).toBe('KILL_BUILD_CULTURE');expect(account.lastCollectorRun).toMatchObject({id:'run-1',status:'complete',serperQueries:4});
  });

  it('blocks a Serper request before it exceeds the persistent monthly cap but continues free collectors',async()=>{
    const h=setup();h.value().workspaces[h.workspaceId].budgets.serperQueries={month:'2026-10',queries:1};let hiringCalls=0;
    const collectors={collectSerperEvidence,collectHiring:async()=>{hiringCalls++;return {signals:[],events:[],killHints:[],targetPatch:{},itemsFound:0};},collectFirmographics:empty('firmographics'),collectActivePain:empty('active_pain'),collectExecutiveChange:empty('executive_change'),collectTechCulture:empty('tech_culture'),collectAiCompatibility:empty('ai_compatibility'),collectCompetitiveWedge:empty('competitive_wedge'),collectRevenueSensitivity:empty('revenue_sensitivity'),collectEdgarFormDUniverse:empty('edgar')};
    const runtime={usage:{},health:{},identity:()=> 'WhyNow test',snapshot(){return {schemaVersion:1,usage:this.usage,health:this.health};}};
    const coordinator=createPhaseBRefreshCoordinator({read:h.read,mutate:h.mutate,env:{CRAWLER_CONTACT_EMAIL:'crawler@example.org',SERPER_ENABLED:'true',SERPER_API_KEY:'test-only',WORKSPACE_MAX_SERPER_QUERIES_PER_RUN:'4',SERPER_MONTHLY_QUERY_LIMIT:'2',EDGAR_ENABLED:'false'},runtimeFactory:()=>runtime,now:()=>new Date('2026-10-20T12:00:00.000Z'),id:()=> 'run-cap',collectors,searchProvider:async()=>[]});
    const run=await coordinator.start(h.workspaceId,'acct-acme');const finished=await coordinator.wait(run.id);
    expect(finished.status).toBe('complete_with_errors');expect(finished.serperQueries).toBe(1);expect(finished.errors[0].code).toBe('SERPER_MONTHLY_LIMIT');expect(hiringCalls).toBe(1);
  });
});
