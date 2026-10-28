// Owner-directed, saved-evidence-only migration. Never fetches or approves.
const fs=require('node:fs'),path=require('node:path');
const {loadState,saveState,statePath}=require('./server/state.cjs');
const {loadResolveReferenceDemo,REFERENCE_WORKSPACE_ID}=require('./reference-demo.cjs');
const {recordSource}=require('./sources.cjs');
const {rescoreWorkspaceFromSavedEvidence}=require('./rescore-saved-evidence.cjs');
function savedAtlassianVendorReceipt(directory){
  for(const file of fs.readdirSync(directory).filter(file=>file.endsWith('.json'))){
    const cached=JSON.parse(fs.readFileSync(path.join(directory,file),'utf8'));if(!cached.url?.startsWith('https://google.serper.dev/'))continue;
    let payload=cached.text;for(let n=0;n<3&&typeof payload==='string';n++)try{payload=JSON.parse(payload);}catch{break;}
    const row=[...(payload?.news||[]),...(payload?.organic||[])].find(row=>/Opsgenie End of Life/i.test(row.title||'')&&/Atlassian.*Opsgenie/i.test(row.snippet||''));
    if(row)return {url:row.link,title:row.title,text:row.snippet,fetchedAt:cached.fetchedAt};
  }
  throw Error('No saved Atlassian/Opsgenie receipt found; no change applied.');
}
function repair(state,receipt,{now=new Date()}={}){
  const activeId=state.activeWorkspaceId;let next=loadResolveReferenceDemo(state),workspace=next.workspaces[REFERENCE_WORKSPACE_ID];
  const account=workspace.accounts.find(row=>row.domain==='atlassian.com');if(!account)throw Error('Atlassian account not found.');
  const saved=recordSource(next,receipt);next=saved.state;workspace=next.workspaces[REFERENCE_WORKSPACE_ID];
  workspace.accounts.find(row=>row.id===account.id).adjacentVendorEvidence={ownerConfirmed:true,category:'incident management',evidenceUrl:receipt.url,evidenceText:receipt.text,sourceId:saved.source.id,decisionBasis:'Owner explicitly identified Atlassian/Opsgenie as an adjacent incident-tooling vendor; saved reporting identifies the relationship.',recordedAt:now.toISOString()};
  next.auditLog.push({schemaVersion:1,type:'adjacent_vendor_classification_reviewed',workspaceId:workspace.id,accountId:account.id,actor:'owner-directed-maintenance',occurredAt:now.toISOString(),sourceUrl:receipt.url,reason:'Owner requested Atlassian/Opsgenie adjacent-vendor exclusion, not an internal-tooling inference.'});
  next=rescoreWorkspaceFromSavedEvidence(next,workspace.id,{now}).state;next.activeWorkspaceId=activeId;
  return next;
}
if(require.main===module){const file=statePath(),next=repair(loadState(file),savedAtlassianVendorReceipt(path.join(path.dirname(file),'collector-cache')));saveState(next,file);console.log(JSON.stringify(next.workspaces[REFERENCE_WORKSPACE_ID].accounts.filter(row=>row.kills.length||row.killHistory?.length).map(row=>({name:row.name,kills:row.kills,retiredKills:row.killHistory?.length||0})),null,2));}
module.exports={repair,savedAtlassianVendorReceipt};
