#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const {loadEnv}=require('./env.cjs');
const {loadState,atomicWrite}=require('./server/state.cjs');
const {loadResolveReferenceDemo}=require('./reference-demo.cjs');
const {buildDraftContext,OUTREACH_VERSION}=require('./outreach-drafts.cjs');
const {createOutreachGenerator}=require('./outreach-live.cjs');
const {safeError}=require('./run-chunk3-outreach-paid.cjs');
const firstRun=require('./run-resolve-demo-drafts.cjs');

const ROOT=path.resolve(__dirname,'..');
const TARGET='CrowdStrike';
const TOTAL_CAP_USD=.15;
const RESUME_MARKER_FILE=path.join(ROOT,'.whynow','resolve-demo-accuracy-drafts-resumed.json');
function localEnvironment(){const env={};loadEnv(path.join(ROOT,'.env'),env);return env;}
function providerDefaults(){const env=localEnvironment();return {openaiDisabled:env.OPENAI_ENABLED==='false',openaiLocalLimitZero:Number(env.OPENAI_MONTHLY_LIMIT_USD)===0};}
async function main(){
  if(fs.existsSync(RESUME_MARKER_FILE))throw new Error('The single authorized continuation has already started.');
  const prior=JSON.parse(fs.readFileSync(firstRun.REPORT_FILE,'utf8')),priorActual=Number(prior.generator?.actualUsd||0);
  if(prior.status!=='failed'||prior.generator?.logicalCalls!==1||prior.generator?.attempts!==1||prior.error?.code!=='DRAFT_BLOCKED'||prior.results?.length!==0)throw new Error('The saved run is not the exact one-call validation-failure checkpoint.');
  const loaded=localEnvironment(),defaultsBefore=providerDefaults();if(!defaultsBefore.openaiDisabled||!defaultsBefore.openaiLocalLimitZero)throw new Error('Normal local OpenAI settings must be disabled with a zero local limit before the continuation.');if(!loaded.OPENAI_API_KEY?.trim())throw new Error('The private OpenAI API key is not configured.');
  const remainingCap=Number((TOTAL_CAP_USD-priorActual).toFixed(6));if(!(remainingCap>0))throw new Error('The original $0.15 authorization is exhausted.');
  const state=loadResolveReferenceDemo(loadState()),workspace=Object.values(state.workspaces).find(row=>row.referenceDemo?.loadOnly===true),account=workspace?.accounts.find(row=>row.name===TARGET);if(!account)throw new Error(`${TARGET} is missing from the Resolve demo.`);
  const context=buildDraftContext(workspace,account,{demoMergeField:true,senderFirstName:'Shayan'},new Date());if(context.blockers.length)throw new Error(`${TARGET} is blocked: ${context.blockers.map(row=>row.code).join(', ')}`);
  atomicWrite(RESUME_MARKER_FILE,JSON.stringify({schemaVersion:1,startedAt:new Date().toISOString(),target:TARGET,priorLogicalCalls:1,remainingLogicalCalls:1,totalCapUsd:TOTAL_CAP_USD,remainingCapUsd:remainingCap,noSend:true}));
  const paidEnv={...loaded,OPENAI_ENABLED:'true',OPENAI_MONTHLY_LIMIT_USD:String(remainingCap),OPENAI_OUTREACH_CALL_LIMIT:'1',OPENAI_OUTREACH_MODEL:'gpt-5.5'},generator=createOutreachGenerator({env:paidEnv});let result,error=null;
  try{result=await generator.generate(context);}catch(caught){error=safeError(caught);throw caught;}finally{
    const snapshot=generator.snapshot(),report={...prior,status:error?'failed':'complete',finishedAt:new Date().toISOString(),results:result?[{account:TARGET,templateVersion:OUTREACH_VERSION,templateLabel:context.persona.templateLabel,persona:{title:context.persona.title,reason:context.persona.selectionReason,recipientMode:context.persona.recipientMode,contactSource:context.persona.contactSource},subject:result.draft.subject,body:result.draft.body,receipts:result.draft.evidenceRefs,validation:result.draft.validation,modelRequested:'gpt-5.5',modelReturned:result.responseModel,usage:result.usage,costUsd:result.costUsd}]:[],firstCallError:prior.error,error,totalLogicalCalls:1+snapshot.logicalCalls,totalAttempts:1+snapshot.attempts,totalActualCostUsd:Number((priorActual+snapshot.actualUsd).toFixed(6)),providerDefaultsAfter:providerDefaults(),noSend:true,savedToApplicationState:false};atomicWrite(firstRun.REPORT_FILE,JSON.stringify(report,null,2));
  }
  const final=JSON.parse(fs.readFileSync(firstRun.REPORT_FILE,'utf8'));if(!final.providerDefaultsAfter.openaiDisabled||!final.providerDefaultsAfter.openaiLocalLimitZero)throw new Error('Normal local OpenAI settings were not restored.');
  process.stdout.write(`${JSON.stringify({status:final.status,totalLogicalCalls:final.totalLogicalCalls,totalAttempts:final.totalAttempts,totalActualCostUsd:final.totalActualCostUsd,providerDefaultsAfter:final.providerDefaultsAfter,account:final.results[0]&&{name:final.results[0].account,persona:final.results[0].persona.title,valid:final.results[0].validation.ok,costUsd:final.results[0].costUsd}})}\n`);
}
if(require.main===module)main().catch(error=>{process.stderr.write(`${JSON.stringify(safeError(error))}\n`);process.exitCode=1;});
module.exports={RESUME_MARKER_FILE,TARGET,TOTAL_CAP_USD};
