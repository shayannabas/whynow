'use strict';
const fs=require('node:fs'),path=require('node:path');
const {loadEnv}=require('./env.cjs');
const {loadState,saveState,statePath,atomicWrite}=require('./server/state.cjs');
const {CollectorRuntime}=require('./collectors/runtime.cjs');
const {createDiscoveryCoordinator}=require('./discovery-runner.cjs');
const {createPhaseBRefreshCoordinator}=require('./phase-b-runner.cjs');
const {createRefreshAllCoordinator}=require('./refresh-all-runner.cjs');
const {createPrepareDemoCoordinator}=require('./prepare-demo.cjs');
const {todaySections,whyNow}=require('./account-lifecycle.cjs');
function approvedVercel(state){const w=Object.values(state.workspaces).find(w=>w.name==='Vercel');if(!w||w.status!=='active'||!w.sellerProfile.approvedAt)throw Error('Vercel must already be owner-approved.');if(w.runs.some(r=>['prepare_demo','company_discovery','account_collector_refresh_all'].includes(r.type)&&['queued','running'].includes(r.status)))throw Error('An existing background job must not be duplicated.');return w;}
function publicReport(w){const sections=todaySections(w),row=a=>({name:a.name,domain:a.domain,fit:a.fitScore,tier:a.tier,segment:a.icpSegment,whyNow:whyNow(a),reviewReason:a.reviewReason||'',sizeReceipt:a.tierEvidenceReceipt||''});return {workspace:w.name,profileRevision:w.profileRevision,prospects:w.accounts.length,sections:Object.fromEntries(['actNow','worthResearching','needsReview'].map(k=>[k,{total:sections[k].length,top10:sections[k].slice(0,10).map(row)}])),kills:w.accounts.filter(a=>a.kills?.length).map(a=>({name:a.name,kills:a.kills})),runs:w.runs.filter(r=>r.type==='prepare_demo')};}
async function main(){
 const env={...process.env};loadEnv(path.resolve(__dirname,'../.env'),env);const file=statePath(env),initial=loadState(file),w=approvedVercel(initial),folder=path.dirname(file),marker=path.join(folder,'vercel-prepare-oct28'),reportFile=path.join(folder,'vercel-prepare-oct28-report.json');
 if(!env.CRAWLER_CONTACT_EMAIL||!env.SERPER_API_KEY)throw Error('Crawler identity and Serper key must be configured privately.');
 const month=new Date().toISOString().slice(0,7),used=w.budgets.serperQueries?.month===month?w.budgets.serperQueries.queries:0;
 Object.assign(env,{OPENAI_ENABLED:'false',OPENAI_MONTHLY_LIMIT_USD:'0',SERPER_ENABLED:'true',SERPER_MONTHLY_QUERY_LIMIT:String(used+150),WORKSPACE_MAX_SERPER_QUERIES_PER_RUN:'4',DISCOVERY_MAX_SERPER_QUERIES_PER_RUN:'25',DISCOVERY_TARGET_COUNT:'25',PHASE_B_MAX_SERPER_QUERIES_PER_ACCOUNT:'5',REFRESH_ALL_MAX_SERPER_QUERIES_PER_RUN:'150',PREPARE_DEMO_MAX_SERPER_QUERIES_PER_RUN:'150',SCHEDULER_ENABLED:'false'});
 fs.mkdirSync(marker);let writes=Promise.resolve();const read=()=>loadState(file),mutate=fn=>{const op=writes.then(()=>{const next=fn(read());saveState(next,file);return next;});writes=op.catch(()=>{});return op;},runtimeFactory=options=>new CollectorRuntime({...options,cacheDir:path.join(folder,'collector-cache')});
 const discoveryCoordinator=createDiscoveryCoordinator({read,mutate,env,runtimeFactory}),accountCoordinator=createPhaseBRefreshCoordinator({read,mutate,env,runtimeFactory}),refreshAllCoordinator=createRefreshAllCoordinator({read,mutate,env,accountCoordinator}),coordinator=createPrepareDemoCoordinator({read,mutate,env,discoveryCoordinator,refreshAllCoordinator});
 const run=await coordinator.start(w.id);console.log(JSON.stringify({started:run.id,cap:150,approvedRevision:w.profileRevision}));const timer=setInterval(()=>{const current=read().workspaces[w.id],saved=current.runs.find(r=>r.id===run.id);console.log(JSON.stringify({stage:saved.stage,accounts:current.accounts.length,queries:current.budgets.serperQueries?.queries-used}));},30000);timer.unref();
 try{const result=await coordinator.wait(run.id),latest=read().workspaces[w.id];if(latest.profileRevision!==w.profileRevision||latest.sellerProfile.approvedAt!==w.sellerProfile.approvedAt)throw Error('Approved profile changed during preparation.');const report={...publicReport(latest),run:result,serperQueries:latest.budgets.serperQueries.queries-used};atomicWrite(reportFile,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(report.serperQueries>150)throw Error('Serper cap exceeded.');}finally{clearInterval(timer);env.SERPER_ENABLED='false';}
}
if(require.main===module)main().catch(e=>{console.error(JSON.stringify({error:e.code||'PREPARE_FAILED',message:e.message}));process.exitCode=1;});
module.exports={approvedVercel,publicReport};
