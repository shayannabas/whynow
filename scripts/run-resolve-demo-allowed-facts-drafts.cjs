#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {loadEnv}=require('./env.cjs');
const {loadState,atomicWrite}=require('./server/state.cjs');
const {loadResolveReferenceDemo}=require('./reference-demo.cjs');
const {buildDraftContext,OUTREACH_VERSION}=require('./outreach-drafts.cjs');
const {buildOutreachRequest,estimateOutreachRequest}=require('./outreach-model.cjs');
const {createOutreachGenerator}=require('./outreach-live.cjs');
const {safeError}=require('./run-chunk3-outreach-paid.cjs');

const ROOT=path.resolve(__dirname,'..'),MARKER_FILE=path.join(ROOT,'.whynow','resolve-demo-allowed-facts-drafts-started.json'),REPORT_FILE=path.join(ROOT,'.whynow','resolve-demo-allowed-facts-drafts-report.json'),TARGETS=['Coalition','CrowdStrike'],PROCESS_CAP_USD=.15;
function localEnvironment(){const env={};loadEnv(path.join(ROOT,'.env'),env);return env;}
function providerDefaults(){const env=localEnvironment();return {openaiDisabled:env.OPENAI_ENABLED==='false',openaiLocalLimitZero:Number(env.OPENAI_MONTHLY_LIMIT_USD)===0};}
async function main(){
  if(fs.existsSync(MARKER_FILE)||fs.existsSync(REPORT_FILE))throw new Error('The allowed-facts regeneration has already started.');
  const loaded=localEnvironment(),defaultsBefore=providerDefaults();if(!defaultsBefore.openaiDisabled||!defaultsBefore.openaiLocalLimitZero)throw new Error('Normal local OpenAI settings must be disabled with a zero local limit before the bounded run.');if(!loaded.OPENAI_API_KEY?.trim())throw new Error('The private OpenAI API key is not configured.');
  const state=loadResolveReferenceDemo(loadState()),workspace=state.workspaces[state.activeWorkspaceId],contexts=TARGETS.map(name=>{const account=workspace.accounts.find(row=>row.name===name);if(!account)throw new Error(`${name} is missing.`);const context=buildDraftContext(workspace,account,{demoMergeField:true,senderFirstName:'Shayan'},new Date());if(context.blockers.length)throw new Error(`${name} is blocked: ${context.blockers.map(row=>row.code).join(', ')}`);return {name,context};}),paidEnv={...loaded,OPENAI_ENABLED:'true',OPENAI_MONTHLY_LIMIT_USD:String(PROCESS_CAP_USD),OPENAI_OUTREACH_CALL_LIMIT:'2',OPENAI_OUTREACH_RETRY_LIMIT:'0',OPENAI_OUTREACH_MODEL:'gpt-5.5'},estimates=contexts.map(({name,context})=>({name,...estimateOutreachRequest(buildOutreachRequest(context,paidEnv))})),plannedUsd=Number(estimates.reduce((sum,row)=>sum+row.plannedTotalCostUsd,0).toFixed(6));if(plannedUsd>PROCESS_CAP_USD)throw new Error('The two-call plan exceeds the authorized process cap.');
  const commit=execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim(),startedAt=new Date().toISOString();atomicWrite(MARKER_FILE,JSON.stringify({schemaVersion:1,startedAt,commit,targets:TARGETS,logicalCallLimit:2,retryLimit:0,processCapUsd:PROCESS_CAP_USD,noSend:true}));
  const report={schemaVersion:1,status:'running',startedAt,finishedAt:'',commit,model:'gpt-5.5',templateVersion:OUTREACH_VERSION,processCapUsd:PROCESS_CAP_USD,plannedUsd,estimates,results:[],failures:[],providerDefaultsBefore:defaultsBefore,providerDefaultsAfter:null,generator:null,noSend:true,savedToApplicationState:false},generator=createOutreachGenerator({env:paidEnv});
  try{for(const {name,context} of contexts){try{const result=await generator.generate(context);report.results.push({account:name,templateVersion:OUTREACH_VERSION,templateLabel:context.persona.templateLabel,persona:{title:context.persona.title,reason:context.persona.selectionReason},subject:result.draft.subject,body:result.draft.body,receipts:result.draft.evidenceRefs,validation:result.draft.validation,usage:result.usage,costUsd:result.costUsd,modelReturned:result.responseModel});}catch(error){report.failures.push({account:name,...safeError(error),rejectedDraft:error.rejectedDraft||null,validation:error.validation||null});}atomicWrite(REPORT_FILE,JSON.stringify(report,null,2));}report.generator=generator.snapshot();report.status=report.results.length===2?'complete':'complete_with_errors';}
  finally{report.finishedAt=new Date().toISOString();report.generator=generator.snapshot();report.providerDefaultsAfter=providerDefaults();atomicWrite(REPORT_FILE,JSON.stringify(report,null,2));}
  if(report.generator.logicalCalls!==2||report.generator.attempts!==2)throw new Error('The regeneration did not use exactly one attempt per account.');if(!report.providerDefaultsAfter.openaiDisabled||!report.providerDefaultsAfter.openaiLocalLimitZero)throw new Error('Normal local OpenAI settings were not restored.');
  process.stdout.write(`${JSON.stringify({status:report.status,logicalCalls:report.generator.logicalCalls,attempts:report.generator.attempts,actualCostUsd:report.generator.actualUsd,validDrafts:report.results.map(row=>row.account),failedDrafts:report.failures.map(row=>({account:row.account,code:row.code,validationCodes:row.validation?.reasons?.map(reason=>reason.code)||[]})),providerDefaultsAfter:report.providerDefaultsAfter})}\n`);
}
if(require.main===module)main().catch(error=>{process.stderr.write(`${JSON.stringify(safeError(error))}\n`);process.exitCode=1;});
module.exports={MARKER_FILE,PROCESS_CAP_USD,REPORT_FILE,TARGETS};
