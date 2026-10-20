'use strict';

const {randomUUID}=require('node:crypto');
const {phaseAConfigForWorkspace}=require('./phase-a-config.cjs');
const {rootDomain,sameEntity}=require('./entity-rules.cjs');
const {SIGNAL_KEYS}=require('./signal-rubric.cjs');
const {scoreAccount}=require('./score-account.cjs');
function publicHttps(value){try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&(!url.port||url.port==='443');}catch{return false;}}
function blankSignals(){return Object.fromEntries(SIGNAL_KEYS.map(key=>[key,{score:1,evidenceUrl:'',evidenceText:'Signal not collected.',inferred:true,metadata:{}}]));}
function addManualAccountToState(state,workspaceId,fields,{now=()=>new Date().toISOString(),id=()=>randomUUID()}={}){
  const next=structuredClone(state),workspace=next.workspaces[workspaceId];
  if(!workspace)throw new Error('Unknown workspace.');
  const config=phaseAConfigForWorkspace(workspace),name=String(fields.name||'').trim(),domain=rootDomain(fields.domain),segment=String(fields.segment||'').trim(),sourceUrl=String(fields.sourceUrl||'').trim();
  if(!name||name.length>120)throw new Error('Enter an account name of 1–120 characters.');
  if(!domain)throw new Error('Enter a valid company domain.');
  if(!config.segments.some(row=>row.key===segment&&row.enabled!==false))throw new Error('Choose a configured ICP segment.');
  if(!publicHttps(sourceUrl))throw new Error('Enter a public HTTPS source URL.');
  const candidate={name,domain};
  if(workspace.accounts.some(account=>sameEntity(account,candidate,config.entityRules)))throw new Error('That account already exists in this workspace.');
  const createdAt=now(),account=scoreAccount({schemaVersion:1,id:id(),name,domain,website:`https://${domain}`,icpSegment:segment,segmentClassification:{segment,confidence:1,requiresReview:false,reason:'manual_owner_selection'},sourceUrl,discoveryQuality:{sourceUrl,isValidTargetAccount:true,targetAccountName:name,targetDomain:domain},signals:blankSignals(),triggers:[],createdAt,updatedAt:createdAt,status:'new'},config,new Date(createdAt));
  workspace.accounts.push(account);
  next.auditLog.push({schemaVersion:1,type:'manual_account_added',workspaceId,accountId:account.id,occurredAt:createdAt,sourceUrl});
  return next;
}
function rescoreWorkspace(workspace,now=new Date()){
  const config=phaseAConfigForWorkspace(workspace);
  return {...workspace,accounts:workspace.accounts.map(account=>scoreAccount(account,config,now))};
}
module.exports={addManualAccountToState,blankSignals,rescoreWorkspace};
