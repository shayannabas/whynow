// Offline promotion of existing merge-field outputs. No contact lookup or AI.
const fs=require('node:fs'),path=require('node:path');
const {randomUUID}=require('node:crypto');
const {loadState,saveState,statePath}=require('./server/state.cjs');
const {buildDraftContext,OUTREACH_VERSION}=require('./outreach-drafts.cjs');
const {validatedDraft}=require('./outreach-live.cjs');
function saveRecordedDemoDraft(state,workspaceId,accountId,record,{model=null,now=new Date()}={}){
  const next=structuredClone(state),workspace=next.workspaces[workspaceId],account=workspace?.accounts.find(row=>row.id===accountId);
  if(!account||workspace.deliveryMode!=='demo'||!String(record.body||'').startsWith('Hi {{first_name}},'))throw Error('Only an existing Demo merge-field draft can be promoted.');
  if(model&&!/^gpt-5\.5(?:-|$)/.test(model))throw Error('Recorded model must be the configured GPT-5.5 model.');
  const context=buildDraftContext(workspace,account,{demoMergeField:true,senderFirstName:'Shayan'},now),generated=validatedDraft(record,context);
  if(workspace.drafts.some(row=>row.accountId===accountId&&row.subject===generated.subject&&row.body===generated.body))return next;
  const createdAt=now.toISOString(),draft={schemaVersion:1,id:randomUUID(),accountId,kind:'outreach_email',deliveryMode:'demo',watermark:'Demo · copy only · no send path',version:OUTREACH_VERSION,createdAt,contact:context.persona,sender:context.sender,templateLabel:context.persona.templateLabel,contactSource:context.persona.contactSource,triggerVerification:context.trigger.corroboration?.label||'',subject:generated.subject,body:generated.body,evidenceRefs:generated.evidenceRefs,claimRefs:generated.usedClaims.map(row=>row.sourceUrl),triggerId:context.trigger.id,triggerOccurredAt:context.trigger.occurredAt,triggerDecaysAt:context.trigger.decaysAt,generatedBy:model?'openai':'deterministic_template',model,validation:generated.validation,importedRecordedOutput:true};
  workspace.drafts.push(draft);next.auditLog.push({schemaVersion:1,type:'recorded_demo_draft_saved',workspaceId,accountId,draftId:draft.id,occurredAt:createdAt,model,providerCalls:0,deliveryMode:'demo'});return next;
}
if(require.main===module){const file=statePath(),report=JSON.parse(fs.readFileSync(path.join(path.dirname(file),'resolve-demo-readable-drafts-report.json'),'utf8'));let state=loadState(file);const workspaceId='reference-demo-resolve-ai';
  for(const name of ['Okta','CrowdStrike']){const saved=report.results.find(row=>row.account===name),account=state.workspaces[workspaceId].accounts.find(row=>row.name===name);if(!saved||!account)throw Error('Requested recorded draft not found.');state=saveRecordedDemoDraft(state,workspaceId,account.id,name==='CrowdStrike'?saved.templateFallback:saved,{model:name==='Okta'?saved.modelReturned:null});}
  saveState(state,file);console.log('Saved passing Okta GPT-5.5 and CrowdStrike template-v2 Demo copy-only drafts; zero provider calls.');
}
module.exports={saveRecordedDemoDraft};
