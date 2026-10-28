// Offline only: re-apply current validation/retention to saved focused outputs.
// No LLM client, fetch, provider configuration or approval function is imported.
const path=require('node:path');
const {loadState,saveState,statePath}=require('./server/state.cjs');
const {buildFocusedSynthesisRequests,expandRunLocalReceiptIds}=require('./onboarding/synthesize.cjs');
const {materializeReview}=require('./onboarding/review-organizations.cjs');
const {rawPageMap}=require('./onboarding/extract-organizations.cjs');
const {saveGeneratedProfile}=require('./onboarding/validate.cjs');
const {publicResult}=require('./run-any-seller-live-research.cjs');

function rematerialize(state,id,{rawPages}={}) {
  const workspace=state.workspaces[id];
  if(!workspace||workspace.status!=='needs_review'||workspace.sellerProfile.approvedAt)throw Error('Only an unapproved saved draft may be re-materialized.');
  const cache=Object.values(workspace.llmCache||{}),one=test=>{const rows=cache.filter(test);if(rows.length!==1)throw Error('Expected exactly one matching saved focused output.');return rows[0];};
  const seller=one(row=>row.value?.sellerProfile),organizations=one(row=>Array.isArray(row.value?.customers)&&Array.isArray(row.value?.competitors)),targeting=one(row=>row.value?.icpConfig);
  const prepared=structuredClone(state);prepared.workspaces[id].research.status='evidence_ready';
  const built=buildFocusedSynthesisRequests(prepared,id,{rawPages});
  if(workspace.research.synthesis.sourceSetHash!==built.guard.expectedSourceSetHash)throw Error('Saved source set changed; refusing to reinterpret run-local receipts.');
  const sellerValue=expandRunLocalReceiptIds(seller.value,built.receiptIdMap),targetingValue=expandRunLocalReceiptIds(targeting.value,built.receiptIdMap);
  const {organizationReview,...reviewed}=materializeReview(organizations.value,built.candidates);
  const output={sellerProfile:{...sellerValue.sellerProfile,...reviewed},icpConfig:targetingValue.icpConfig};
  return saveGeneratedProfile(state,id,{output,organizationReview,...built.guard,model:workspace.research.synthesis.model,promptVersion:`${workspace.research.synthesis.promptVersion}:offline-retention-v2`});
}
if(require.main===module){
  const file=statePath(),state=loadState(file),domain=process.argv[2];
  if(domain!=='vercel.com')throw Error('This offline recovery is restricted to the requested Vercel draft.');
  const workspace=Object.values(state.workspaces).find(row=>row.research?.selectedCandidate?.domain===domain&&row.status==='needs_review');
  const rawPages=rawPageMap([path.join(path.dirname(file),'collector-cache'),path.join(path.dirname(file),'stage2-final-live-cache')]);
  const next=rematerialize(state,workspace?.id,{rawPages});saveState(next,file);
  process.stdout.write(JSON.stringify({offline:true,providerCalls:0,...publicResult(next.workspaces[workspace.id])},null,2)+'\n');
}
module.exports={rematerialize};
