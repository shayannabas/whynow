import {createRequire} from 'node:module';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {it,expect} from 'vitest';
const require=createRequire(import.meta.url);
const {createRouter}=require('../scripts/server/router.cjs');
const {defaultState,saveState,loadState}=require('../scripts/server/state.cjs');
const {loadResolveReferenceDemo}=require('../scripts/reference-demo.cjs');
const {historyPage,runsPage,funnelPage,metricsPage}=require('../scripts/server/activity-pages.cjs');

it('renders every demo route and Results deep links without provider calls or state changes',async()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'whynow-ui-routes-')),stateFile=path.join(directory,'state.json');
  const state=loadResolveReferenceDemo(defaultState()),workspace=state.workspaces[state.activeWorkspaceId];
  workspace.accounts.push({schemaVersion:1,id:'synthetic-ui-company',name:'Synthetic UI Company',domain:'synthetic-ui.example',icpSegment:'data_ai_infrastructure',fitScore:40,tier:2,status:'new',signals:{},triggers:[],kills:[],sourceUrl:'https://synthetic-ui.example/about',updatedAt:new Date().toISOString()});
  saveState(state,stateFile);const before=JSON.stringify(loadState(stateFile));let providerCalls=0;
  const server=http.createServer(createRouter({stateFile,env:{NODE_ENV:'development',OPENAI_ENABLED:'false',SERPER_ENABLED:'false'},runtimeFactory:()=>{providerCalls++;throw Error('No live providers in UI tests');},researchCoordinator:{resumePending:async()=>{}},synthesisCoordinator:{},refreshCoordinator:{},phaseBRefreshCoordinator:{start:async()=>{throw Error('GET cannot refresh');}},phaseBRefreshAllCoordinator:{start:async()=>{throw Error('GET cannot refresh');}},discoveryCoordinator:{start:async()=>{throw Error('GET cannot discover');}}}));
  try{
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});const base=`http://127.0.0.1:${server.address().port}`;
    for(const route of ['/','/today','/results','/results?tab=queries','/review-queue','/icp-studio','/exports','/settings','/accounts/synthetic-ui-company?tab=personas','/results?lead=synthetic-ui-company&tab=outreach','/accounts','/accounts/synthetic-ui-company?tab=evidence','/discovery','/scorecard','/kill-log','/history','/runs','/funnel','/metrics','/collectors','/workspaces','/onboarding','/onboarding/results','/onboarding/profile']){
      const response=await fetch(base+route),body=await response.text();expect(response.status,route).toBe(200);expect(body,route).toContain('Primary navigation');expect(body,route).toContain('/fonts/manrope-latin-wght-normal.woff2');expect((body.match(/<main\b/g)||[]).length,route).toBe(1);expect(body,route).not.toMatch(/<form[^>]+action="[^"]*(?:\/send|\/hubspot|\/apollo|\/contact-lookup)/i);
    }
    for(const route of ['/icp-studio/save','/icp-studio/approve','/results/searches','/accounts/synthetic-ui-company/personas','/accounts/synthetic-ui-company/drafts/persona','/prepare-demo','/discovery/run','/accounts/refresh-all','/accounts/synthetic-ui-company/refresh','/accounts/synthetic-ui-company/status','/accounts/synthetic-ui-company/drafts/template']){
      const response=await fetch(base+route,{method:'POST',headers:{Origin:base},body:new URLSearchParams({workspaceId:'outdated-workspace',status:'working',senderFirstName:'Shayan'}),redirect:'manual'});
      expect([400,409],route).toContain(response.status);expect(await response.text(),route).toContain('Workspace changed');
    }
    expect(providerCalls).toBe(0);expect(JSON.stringify(loadState(stateFile))).toBe(before);
  }finally{await new Promise(resolve=>server.close(resolve));fs.rmSync(directory,{recursive:true,force:true});}
});

it('keeps support dashboards scoped to actual saved workspace activity and escapes public text',()=>{
  const state=loadResolveReferenceDemo(defaultState()),workspace=state.workspaces[state.activeWorkspaceId];
  state.auditLog.push({workspaceId:workspace.id,type:'account_status_changed',occurredAt:'2026-10-26T12:00:00Z',status:'skipped',reason:'<script>unsafe public text</script>'},{workspaceId:'other-workspace',type:'private-other-workspace-event'});
  workspace.runs.push({id:'run-one',type:'company_discovery',status:'complete',startedAt:'2026-10-26T12:00:00Z',rawFound:8,passedNoiseGate:4,newAccounts:3,rejectedCount:4,serperQueries:2,errors:[]});
  expect(historyPage(state)).toContain('&lt;script&gt;unsafe public text&lt;/script&gt;');expect(historyPage(state)).not.toContain('private-other-workspace-event');expect(runsPage(state)).toContain('3 new accounts');expect(funnelPage(state)).toContain('Passed noise gate');expect(metricsPage(state)).toContain('Local, copy-only drafts');
  workspace.runs.push({type:'prepare_demo',status:'running',progress:{completed:1,total:3,label:'Refreshing discovered accounts'},accountsPrepared:0});
  expect(runsPage(state)).toContain('1 / 3 stages · Refreshing discovered accounts');expect(runsPage(state)).toContain('0 accounts prepared');
});
