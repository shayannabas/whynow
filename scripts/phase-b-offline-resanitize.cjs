'use strict';
const path=require('node:path'),fs=require('node:fs');
const {loadEnv}=require('./env.cjs');
const {loadState,saveState,statePath,atomicWrite}=require('./server/state.cjs');
const {REFERENCE_WORKSPACE_ID}=require('./reference-demo.cjs');
const {phaseAConfigForWorkspace}=require('./phase-a-config.cjs');
const {sanitizeWhyNow}=require('./phase-b-runner.cjs');
const {scoreAccount}=require('./score-account.cjs');
const firmographics=require('./firmographics.cjs');
const NAMES=new Set(['Databricks','Uber Eats','Binance','Replicate','DraftKings']);
function main(){
  loadEnv(path.resolve(__dirname,'../.env'));if(process.env.OPENAI_ENABLED==='true')throw new Error('Offline re-sanitization refuses to run while OpenAI is enabled.');
  const file=statePath(process.env),state=loadState(file),workspace=state.workspaces[REFERENCE_WORKSPACE_ID],config=phaseAConfigForWorkspace(workspace),now=new Date();
  workspace.accounts=workspace.accounts.map(account=>{if(!NAMES.has(account.name))return account;const normalized=account.firmographics?firmographics.pruneUnattributedFields(account.firmographics,account):account.firmographics,clean=sanitizeWhyNow({...account,...(normalized?{firmographics:normalized}: {})},config,now);return scoreAccount(clean,config,now);});
  saveState(state,file);
  const reportFile=path.join(path.dirname(file),'phase-b-live-report.json');
  if(fs.existsSync(reportFile)){const report=JSON.parse(fs.readFileSync(reportFile,'utf8'));report.offlineResanitizedAt=now.toISOString();report.results=report.results.map(row=>{const account=workspace.accounts.find(item=>item.name===row.name);if(!account)return row;return {...row,fitScore:account.fitScore,tier:account.tier,tierReason:account.tierReason,tierProvisional:Boolean(account.tierProvisional),priority:account.priority,firmographics:{employeeCount:account.firmographics?.employeeCount??null,revenueEstimate:account.firmographics?.revenueEstimate??null,revenueBand:account.firmographics?.revenueBand||'',fundingStage:account.firmographics?.fundingStage||'',totalRaised:account.firmographics?.totalRaised??null,valuation:account.firmographics?.valuation??null,isPublic:account.firmographics?.isPublic??null,confidence:account.firmographics?.confidence??0,confidenceLabel:account.firmographics?.confidenceLabel||'',fields:account.firmographics?.fields||{}},signals:account.signals,triggers:account.triggers||[],kills:account.kills||[]};});atomicWrite(reportFile,JSON.stringify(report,null,2));}
  console.log(JSON.stringify({status:'complete',accounts:workspace.accounts.filter(account=>NAMES.has(account.name)).length,providerCalls:0}));
}
if(require.main===module)main();
module.exports={main};
