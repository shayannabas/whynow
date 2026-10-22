#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {loadEnv}=require('./env.cjs');
const {loadState,atomicWrite}=require('./server/state.cjs');
const {buildDraftContext,OUTREACH_VERSION}=require('./outreach-drafts.cjs');
const {buildOutreachRequest,estimateOutreachRequest}=require('./outreach-model.cjs');
const {createOutreachGenerator}=require('./outreach-live.cjs');
const {safeError}=require('./run-chunk3-outreach-paid.cjs');

const ROOT=path.resolve(__dirname,'..');
const MARKER_FILE=path.join(ROOT,'.whynow','resolve-demo-accuracy-drafts-started.json');
const REPORT_FILE=path.join(ROOT,'.whynow','resolve-demo-accuracy-drafts-report.json');
const TARGETS=['Coalition','CrowdStrike'];
const PROCESS_CAP_USD=.15;
function localEnvironment(){const env={};loadEnv(path.join(ROOT,'.env'),env);return env;}
function providerDefaults(){const env=localEnvironment();return {openaiDisabled:env.OPENAI_ENABLED==='false',openaiLocalLimitZero:Number(env.OPENAI_MONTHLY_LIMIT_USD)===0};}
async function main(){
  if(fs.existsSync(MARKER_FILE)||fs.existsSync(REPORT_FILE))throw new Error('The authorized two-draft accuracy run has already started or completed.');
  const loaded=localEnvironment(),defaultsBefore=providerDefaults();if(!defaultsBefore.openaiDisabled||!defaultsBefore.openaiLocalLimitZero)throw new Error('Normal local OpenAI settings must be disabled with a zero local limit before the bounded run.');if(!loaded.OPENAI_API_KEY?.trim())throw new Error('The private OpenAI API key is not configured.');
  const state=loadState(),workspace=Object.values(state.workspaces).find(row=>row.referenceDemo?.loadOnly===true);if(!workspace)throw new Error('Load the frozen Resolve reference demo first.');
  const now=new Date(),contexts=TARGETS.map(name=>{const account=workspace.accounts.find(row=>row.name===name);if(!account)throw new Error(`${name} is missing from the Resolve demo.`);const context=buildDraftContext(workspace,account,{demoMergeField:true,senderFirstName:'Shayan'},now);if(context.blockers.length)throw new Error(`${name} is blocked: ${context.blockers.map(row=>row.code).join(', ')}`);return {name,context};});
  const paidEnv={...loaded,OPENAI_ENABLED:'true',OPENAI_MONTHLY_LIMIT_USD:String(PROCESS_CAP_USD),OPENAI_OUTREACH_CALL_LIMIT:String(TARGETS.length),OPENAI_OUTREACH_MODEL:'gpt-5.5'},estimates=contexts.map(({name,context})=>({name,...estimateOutreachRequest(buildOutreachRequest(context,paidEnv))})),plannedUsd=Number(estimates.reduce((sum,row)=>sum+row.plannedTotalCostUsd,0).toFixed(6)),oneTransientRetryPlannedUsd=Number((plannedUsd+Math.max(...estimates.map(row=>row.plannedTotalCostUsd))).toFixed(6));if(oneTransientRetryPlannedUsd>PROCESS_CAP_USD)throw new Error('The two-call plan plus one transient retry exceeds the authorized process cap.');
  fs.mkdirSync(path.dirname(MARKER_FILE),{recursive:true});const commit=execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim(),startedAt=new Date().toISOString();atomicWrite(MARKER_FILE,JSON.stringify({schemaVersion:1,startedAt,commit,authorization:'resolve-demo-accuracy-two-draft-run',targets:TARGETS,model:'gpt-5.5',logicalCallLimit:2,processCapUsd:PROCESS_CAP_USD,noSend:true}));
  const report={schemaVersion:1,status:'running',startedAt,finishedAt:'',commit,model:'gpt-5.5',templateVersion:OUTREACH_VERSION,processCapUsd:PROCESS_CAP_USD,plannedUsd,oneTransientRetryPlannedUsd,estimates,results:[],providerDefaultsBefore:defaultsBefore,providerDefaultsAfter:null,generator:null,error:null,noSend:true,savedToApplicationState:false};
  const generator=createOutreachGenerator({env:paidEnv});
  try{
    for(const {name,context} of contexts){const result=await generator.generate(context);report.results.push({account:name,templateVersion:OUTREACH_VERSION,templateLabel:context.persona.templateLabel,persona:{title:context.persona.title,reason:context.persona.selectionReason,recipientMode:context.persona.recipientMode,contactSource:context.persona.contactSource},subject:result.draft.subject,body:result.draft.body,receipts:result.draft.evidenceRefs,validation:result.draft.validation,modelRequested:'gpt-5.5',modelReturned:result.responseModel,usage:result.usage,costUsd:result.costUsd});atomicWrite(REPORT_FILE,JSON.stringify(report,null,2));}
    report.generator=generator.snapshot();if(report.generator.logicalCalls!==2||report.results.length!==2||report.results.some(row=>!row.validation.ok))throw new Error('The bounded run did not produce exactly two validated drafts.');report.status='complete';
  }catch(error){report.status='failed';report.error=safeError(error);report.generator=generator.snapshot();throw error;}
  finally{report.finishedAt=new Date().toISOString();report.providerDefaultsAfter=providerDefaults();atomicWrite(REPORT_FILE,JSON.stringify(report,null,2));}
  if(!report.providerDefaultsAfter.openaiDisabled||!report.providerDefaultsAfter.openaiLocalLimitZero)throw new Error('Normal local OpenAI settings were not restored.');
  process.stdout.write(`${JSON.stringify({status:report.status,model:report.model,logicalCalls:report.generator.logicalCalls,attempts:report.generator.attempts,actualCostUsd:report.generator.actualUsd,providerDefaultsAfter:report.providerDefaultsAfter,accounts:report.results.map(row=>({account:row.account,persona:row.persona.title,valid:row.validation.ok,costUsd:row.costUsd}))})}\n`);
}
if(require.main===module)main().catch(error=>{process.stderr.write(`${JSON.stringify(safeError(error))}\n`);process.exitCode=1;});
module.exports={MARKER_FILE,PROCESS_CAP_USD,REPORT_FILE,TARGETS,localEnvironment,providerDefaults};
