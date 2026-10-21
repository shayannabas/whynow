'use strict';
const path=require('node:path');
const {loadEnv}=require('./env.cjs');
const {loadState,saveState,statePath}=require('./server/state.cjs');
const {REFERENCE_WORKSPACE_ID}=require('./reference-demo.cjs');
const {phaseAConfigForWorkspace}=require('./phase-a-config.cjs');
const {sanitizeWhyNow}=require('./phase-b-runner.cjs');
const {scoreAccount}=require('./score-account.cjs');

function rescoreWorkspaceFromSavedEvidence(state,workspaceId,{now=new Date()}={}){
  const next=structuredClone(state),workspace=next.workspaces[workspaceId];
  if(!workspace)throw new Error('Workspace not found.');
  const config=phaseAConfigForWorkspace(workspace),before=new Map(workspace.accounts.map(account=>[account.id,(account.triggers||[]).length]));
  workspace.accounts=workspace.accounts.map(account=>scoreAccount(sanitizeWhyNow(account,config,now),config,now));
  return {state:next,report:{workspaceId,accounts:workspace.accounts.length,providerCalls:0,removedTriggers:workspace.accounts.reduce((sum,account)=>sum+Math.max(0,(before.get(account.id)||0)-(account.triggers||[]).length),0)}};
}

function main(){
  loadEnv(path.resolve(__dirname,'../.env'));
  if(process.env.OPENAI_ENABLED==='true'||process.env.SERPER_ENABLED==='true')throw new Error('Saved-evidence rescoring requires OpenAI and Serper to be disabled.');
  const file=statePath(process.env),current=loadState(file),result=rescoreWorkspaceFromSavedEvidence(current,REFERENCE_WORKSPACE_ID,{now:new Date()});
  saveState(result.state,file);process.stdout.write(`${JSON.stringify(result.report)}\n`);
}
if(require.main===module)main();
module.exports={rescoreWorkspaceFromSavedEvidence};
