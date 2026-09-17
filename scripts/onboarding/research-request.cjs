const {createWorkspace,getWorkspace} = require('../server/state.cjs');

// This stores intent before the fail-closed research coordinator decides whether
// the authorized provider configuration is ready.
function requestResearch(state,name) {
  const companyName=String(name||'').trim();
  if(!companyName || companyName.length>120)throw new Error('Enter a company name of 1–120 characters.');
  const existing=Object.keys(state.workspaces).map(id=>getWorkspace(state,id)).find(w=>
    w.status==='draft' && w.research &&
    w.research.companyName.toLowerCase()===companyName.toLowerCase());
  if(existing)return {...structuredClone(state),activeWorkspaceId:existing.id};
  const next=createWorkspace(state,{name:companyName});
  next.workspaces[next.activeWorkspaceId].research={schemaVersion:1,companyName,status:'not_configured',
    steps:[{key:'identify',label:'Identify the company',status:'not_started'},
      {key:'research',label:'Research public sources',status:'not_started'},
      {key:'draft',label:'Draft seller facts and ideal customers',status:'not_started'},
      {key:'review',label:'Your review and approval',status:'not_started'}],facts:[],sources:[],icp:null};
  return next;
}
module.exports={requestResearch};
