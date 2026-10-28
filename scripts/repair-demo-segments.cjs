// Owner-requested categorization correction using the already-saved job text.
const {loadState,saveState,statePath}=require('./server/state.cjs');
const {REFERENCE_WORKSPACE_ID}=require('./reference-demo.cjs');
const {scoreAccount}=require('./score-account.cjs');
const {phaseAConfigForWorkspace}=require('./phase-a-config.cjs');
function repair(state,{now=new Date()}={}){
  const next=structuredClone(state),workspace=next.workspaces[REFERENCE_WORKSPACE_ID],index=workspace.accounts.findIndex(row=>row.domain==='altana.com');
  if(index<0)throw Error('Altana not found.');const account=workspace.accounts[index],receipt=account.triggers.find(row=>/network for trusted trade/i.test(row.evidenceText||''));
  if(!receipt)throw Error('No saved Altana identity receipt.');
  const previous=account.icpSegment;account.icpSegment='enterprise_platforms';account.segmentClassification={segment:'enterprise_platforms',subIndustry:'Supply-chain AI',confidence:1,requiresReview:false,reason:'Owner corrected supply-chain AI into the existing broad enterprise-platform segment.',evidenceUrl:receipt.evidenceUrl,evidenceText:receipt.evidenceText,reviewedAt:now.toISOString()};
  workspace.accounts[index]=scoreAccount(account,phaseAConfigForWorkspace(workspace),now);
  next.auditLog.push({schemaVersion:1,type:'account_segment_corrected',workspaceId:workspace.id,accountId:account.id,previous,segment:account.icpSegment,subIndustry:'Supply-chain AI',sourceUrl:receipt.evidenceUrl,occurredAt:now.toISOString(),actor:'owner-directed-maintenance'});return next;
}
if(require.main===module){const file=statePath(),next=repair(loadState(file));saveState(next,file);console.log('Altana: Enterprise platforms · Supply-chain AI (saved receipt; no calls).');}
module.exports={repair};
