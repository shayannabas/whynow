import {it,expect,vi} from 'vitest';
import runner from '../scripts/persona-runner.cjs';
import people from '../scripts/collectors/apollo-people.cjs';
import playbook from '../scripts/playbook.cjs';

const now=()=>new Date('2026-11-17T15:00:00Z');
const raw={buyerRoles:{economicBuyer:['VP Engineering'],champion:['Platform Lead'],endUser:[]},triggers:[
  {id:'funding',label:'Recent funding',whyItMatters:'Funding can support a new project.',messageAngle:'Discuss timing.',source:'news',keywords:['funding'],strength:'strong',freshnessDays:45,receiptIds:['receipt']}
],antiTriggers:[]};
const p=playbook.draftPlaybook(raw,{receipt:{sourceId:'receipt',sourceUrl:'https://seller.example/about',evidenceQuote:'We cover project funding.'}});
const account=(id,tier=1)=>({id,name:id+' Works',domain:id+'.example',matchedIcpId:'ops',tier,fitScore:70,triggers:[{type:'funding',occurredAt:'2026-11-12',evidenceUrl:'https://'+id+'.example/news'}]});
function fixture(){
  const w={id:'fiction',status:'active',profileRevision:1,budgets:{},runs:[],sellerProfile:{approvedAt:'2026-11-10',playbook:{...p,status:'approved',approvedAt:'2026-11-10',approvedDigest:playbook.digest(p)}},
    icps:[{id:'ops',name:'Cloud operations',status:'approved',buyerPersonas:['VP Engineering']}],accounts:[account('cedar'),account('birch'),account('fir','parked')]};
  const s={activeWorkspaceId:w.id,workspaces:{[w.id]:w}};
  const env={APOLLO_ENABLED:'true',APOLLO_PEOPLE_ENABLED:'true',APOLLO_PEOPLE_MONTHLY_CALL_LIMIT:'2',APOLLO_PEOPLE_MAX_CALLS_PER_RUN:'1',APOLLO_API_KEY:'fake-test-key'};
  const requestJsonPost=vi.fn(async (url,source,body,options)=>({value:options.transformValue({people:[{
    name:'Fictional Person',title:'VP Engineering',linkedin_url:'https://www.linkedin.com/in/fictional-profile',email:'private@example.test'
  }]})}));
  const coordinator=runner.createPersonaCoordinator({read:()=>s,mutate:async fn=>fn(s),env,now,runtimeFactory:()=>({requestJsonPost}),id:()=>String(w.runs.length+1)});
  return {w,env,coordinator,requestJsonPost};
}
it('uses matched ICP roles for an external search path, including fallback for an unmatched record',()=>{
  const {w}=fixture();
  expect(people.searchPaths(w,w.accounts[0]).map(x=>x.title)).toEqual(['VP Engineering']);
  const [fallback]=people.searchPaths({}, {name:'Ivy Works'});
  expect(new URL(fallback.url).searchParams.get('keywords')).toBe('Ivy Works');
});
it('queues fresh qualifying accounts after discovery and honors both monthly and run caps',async()=>{
  const {w,env,coordinator,requestJsonPost}=fixture();
  env.APOLLO_ENABLED='false';
  await coordinator.afterDiscovery(w.id,{id:'no-lookup',status:'complete'});
  expect(w.runs).toHaveLength(0);
  env.APOLLO_ENABLED='true';
  await coordinator.afterDiscovery(w.id,{id:'discovery',status:'complete'});
  await coordinator.wait(w.id,'1');
  expect(w.runs[0]).toMatchObject({discoveryRunId:'discovery',apolloCalls:1,skipped:1,status:'complete'});
  expect(requestJsonPost).toHaveBeenCalledTimes(1);
  expect(w.runs[0].results[0].count).toBe(1);
  expect(JSON.stringify(w.runs)).not.toMatch(/Fictional Person|linkedin|private@example/);
  const selected=await coordinator.start(w.id,{accountIds:['cedar','cedar']});
  await coordinator.wait(w.id,selected.id);
  await expect(coordinator.start(w.id,{accountIds:['fir']})).rejects.toThrow(/cap is exhausted/);
  expect(requestJsonPost).toHaveBeenCalledTimes(2);
});
