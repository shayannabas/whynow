import {createRequire} from 'node:module';
import {describe,expect,it,vi} from 'vitest';
const require=createRequire(import.meta.url);
const {createPrepareDemoCoordinator,prepareDemoSettings}=require('../scripts/prepare-demo.cjs');

function harness({approved=true,openai='false'}={}){
  const workspaceId='vercel-workspace';let state={workspaces:{[workspaceId]:{id:workspaceId,status:approved?'active':'needs_review',sellerProfile:{approvedAt:approved?'2026-10-21T00:00:00.000Z':null},accounts:Array.from({length:25},(_,index)=>({id:`a${index}`,discoveryQuality:{sourceKind:'search'}})),runs:[]}}},writes=Promise.resolve();
  const read=()=>structuredClone(state),mutate=fn=>{const work=writes.then(()=>{state=fn(structuredClone(state));return structuredClone(state);});writes=work.catch(()=>{});return work;};
  const discoveryCoordinator={start:vi.fn(async(_id,options)=>({id:'discovery',options})),wait:vi.fn(async()=>({id:'discovery',status:'complete',serperQueries:20,errors:[]}))};
  const refreshAllCoordinator={start:vi.fn(async(_id,options)=>({id:'refresh',options})),wait:vi.fn(async()=>({id:'refresh',status:'complete',serperQueries:100,completedAccounts:25,errors:[]}))};
  const coordinator=createPrepareDemoCoordinator({read,mutate,discoveryCoordinator,refreshAllCoordinator,env:{OPENAI_ENABLED:openai,DISCOVERY_TARGET_COUNT:'25',PHASE_B_MAX_SERPER_QUERIES_PER_ACCOUNT:'5',PREPARE_DEMO_MAX_SERPER_QUERIES_PER_RUN:'150'},now:()=>new Date('2026-10-21T00:00:00.000Z'),id:()=> 'prepare-1'});
  return {workspaceId,coordinator,discoveryCoordinator,refreshAllCoordinator,read};
}

describe('Prepare demo background workflow',()=>{
  it('runs discovery then refresh-all under one cap without OpenAI',async()=>{
    const h=harness(),queued=await h.coordinator.start(h.workspaceId),run=await h.coordinator.wait(queued.id);
    expect(h.discoveryCoordinator.start).toHaveBeenCalledWith(h.workspaceId,{queryCap:25});
    expect(h.refreshAllCoordinator.start).toHaveBeenCalledWith(h.workspaceId,{queryCap:130});
    expect(run).toMatchObject({status:'complete',stage:'reranked',queryCap:150,serperQueries:120,accountsPrepared:25,progress:{completed:3,total:3}});
  });
  it('requires owner approval and OpenAI to be off',async()=>{
    await expect(harness({approved:false}).coordinator.start('vercel-workspace')).rejects.toThrow(/owner-approved/);
    await expect(harness({openai:'true'}).coordinator.start('vercel-workspace')).rejects.toThrow(/OpenAI off/);
  });
  it('uses a hard maximum of 150 queries by default',()=>{expect(prepareDemoSettings({}).maxQueries).toBe(150);expect(prepareDemoSettings({PREPARE_DEMO_MAX_SERPER_QUERIES_PER_RUN:'999'}).maxQueries).toBe(150);});
});
