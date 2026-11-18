import {it,expect} from 'vitest';
import pipeline from '../scripts/pipeline.cjs';
import routePage from '../scripts/server/pipeline-page.cjs';
import playbooks from '../scripts/playbook.cjs';

const clock=new Date('2026-11-17T18:00:00Z');
const receipts={fund:{sourceId:'0123456789abcdef01234567',sourceUrl:'https://paper-crane.example/about',evidenceQuote:'We help companies plan platform upgrades after funding.'}};
function scenario(){
  const p=playbooks.draftPlaybook({buyerRoles:{economicBuyer:['VP Engineering'],champion:['Platform Lead'],endUser:[]},triggers:[
    {id:'funding',label:'Recent funding',whyItMatters:'New resources can support an upgrade.',source:'news',strength:'strong',freshnessDays:60,keywords:['new funding'],messageAngle:'Ask about upgrade plans.',receiptIds:['fund']}
  ],antiTriggers:[]},receipts);
  const w={id:'paper',name:'Paper Crane',status:'active',profileRevision:3,budgets:{},icpConfig:{segments:[{key:'studio',label:'Product studios'}]},
    sellerProfile:{approvedAt:'2026-11-10',productOneLiner:'Software for platform upgrades.',playbook:{...p,status:'approved',approvedAt:'2026-11-17T16:00:00Z',approvedDigest:playbooks.digest(p)}},
    research:{status:'approved',sources:[{sourceId:receipts.fund.sourceId,title:'Seller guide'}]},accounts:[
      {id:'reed',name:'Reed Relay',domain:'reed.example',tier:1,fitScore:73,matchedIcpId:'studio',triggers:[{type:'funding',title:'Reed Relay closes round',occurredAt:'2026-11-15',evidenceUrl:'https://reed.example/news'}]}
    ],runs:[{id:'discovery',type:'company_discovery',status:'running',startedAt:'2026-11-17T17:55:00Z',queryCap:80,serperQueries:34,apolloCalls:6,apolloCap:15,rawFound:37,progress:{checked:18,total:25,verified:6,rejected:12},skippedPages:[{candidate:'Slate Bridge',reason:'ROBOTS_DISALLOWED'}]}]};
  const s={workspaces:{paper:w},activeWorkspaceId:'paper',auditLog:[]};
  return {s,w};
}
it('locks discovery until the seller, the latest ICPs and the playbook are separately approved',()=>{
  const {w}=scenario();
  expect(pipeline.pipelineModel(undefined,8).step).toBe(1);
  expect(pipeline.pipelineModel(w,8).step).toBe(4);
  w.icps=[{...pipeline.pipelineModel(w).icps[0],status:'approved'}];
  expect(pipeline.pipelineModel(w,8).step).toBe(6);
  w.runs[0].status='complete';
  w.runs[0].finishedAt='2026-11-17T17:59:00Z';
  expect(pipeline.pipelineModel(w,8).step).toBe(8);
});
it('reports real counts, caps and elapsed time as persisted discovery progresses',()=>{
  const {s}=scenario();
  expect(pipeline.pipelineProgress(s,{now:clock})).toMatchObject({stage:'Discovery',percent:72,elapsed:300,running:true,
    details:{checked:18,selected:25,verified:6,rejected:12,serper:34,serperCap:80,apollo:6,apolloCap:15},skipped:[{company:'Slate Bridge',reason:'ROBOTS_DISALLOWED'}]});
});
it('replays a saved run through eight read-only steps and renders receipt-backed results',()=>{
  const {s,w}=scenario(),run=w.runs[0];
  Object.assign(run,{status:'complete',finishedAt:'2026-11-17T17:59:00Z',newAccountIds:['reed']});
  for(let step=1;step<=8;step++){
    const page=routePage.pipelinePage(s,new URLSearchParams({mode:'replay',step:String(step),run:'discovery'}));
    expect(page).toContain('Replay of saved run');
    expect(page).toContain(`<h2>${pipeline.STAGES[step-1]}</h2>`);
    expect(page).not.toMatch(/action="\/(?:onboarding|pipeline)\//);
  }
  const page=routePage.pipelinePage(s,new URLSearchParams('mode=replay&step=8&run=discovery'));
  expect(page).toContain('Open dashboard');
  expect(page).toContain('https://reed.example/news');
  expect(pipeline.pipelineProgress(s,{mode:'replay',step:8,runId:'discovery',now:clock})).toMatchObject({percent:100,running:false,elapsed:240});
});
