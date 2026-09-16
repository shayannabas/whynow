const {getWorkspace,updateWorkspace}=require('./state.cjs');
const {esc,stableId}=require('../utils.cjs');
const {shell}=require('./pages.cjs');

function changeArchive(state,id,{restore=false,revision,profileRevision,now=()=>new Date().toISOString()}={}) {
  const workspace=getWorkspace(state,id);
  if(String(workspace.lifecycleRevision||0)!==String(revision) || String(workspace.profileRevision||0)!==String(profileRevision)) throw new Error('This workspace changed. Refresh before trying again.');
  if(restore ? workspace.status!=='archived' : !['draft','needs_review','active'].includes(workspace.status)) throw new Error('This action is not available for this workspace.');
  const at=now();
  const next=updateWorkspace(state,id,w=>{
    w.lifecycleRevision=(w.lifecycleRevision||0)+1;
    w.deliveryMode='demo';w.sellerProfile.deliveryAllowed=false;
    if(restore) {
      w.status=w.archivedFromStatus==='draft'?'draft':'needs_review';
      w.restoredAt=at;w.archivedAt=null;
      if(w.sellerProfile.approvedAt)w.sellerProfile.approvedAt=null;
      w.profileRevision=(w.profileRevision||0)+1;
    } else {
      w.archivedFromStatus=w.status;w.status='archived';w.archivedAt=at;
    }
  });
  if(!restore && next.activeWorkspaceId===id)next.activeWorkspaceId=Object.keys(next.workspaces).find(key=>next.workspaces[key].status!=='archived')||null;
  if(restore && !next.activeWorkspaceId)next.activeWorkspaceId=id;
  next.auditLog.push({schemaVersion:1,id:stableId(`${id}:lifecycle:${next.workspaces[id].lifecycleRevision}`),workspaceId:id,type:restore?'workspace_restored':'workspace_archived',occurredAt:at,actor:'local-admin'});
  return next;
}

function workspacesPage(state) {
  const workspaces=Object.keys(state.workspaces).map(id=>getWorkspace(state,id));
  const date=value=>value?esc(value.slice(0,10)):'Not yet';
  const cards=workspaces.map(w=>`<section class="card"><h2>${esc(w.name)}</h2><p><span class="badge">${esc(w.status.replaceAll('_',' '))}</span> ${state.activeWorkspaceId===w.id?'Current workspace':''}</p><p>Created: ${date(w.createdAt)} · Profile approved: ${date(w.sellerProfile.approvedAt)}</p>${w.status==='archived'?'<p>Archived. Saved data is retained. Restoring an approved profile requires a new review.</p>':`<form method="post" action="/workspaces/switch"><input type="hidden" name="id" value="${esc(w.id)}"><button>Open ${esc(w.name)}</button></form>`}<details><summary>${w.status==='archived'?'Restore workspace':'Archive workspace'}</summary><p>${w.status==='archived'?'Bring this workspace back in Demo mode.':'Remove this workspace from the switcher without deleting its profile or evidence.'}</p><form method="post" action="/workspaces/${w.status==='archived'?'restore':'archive'}"><input type="hidden" name="id" value="${esc(w.id)}"><input type="hidden" name="revision" value="${w.lifecycleRevision||0}"><input type="hidden" name="profileRevision" value="${w.profileRevision||0}"><label><input style="width:auto" type="checkbox" name="acknowledged" required> I want to ${w.status==='archived'?'restore':'archive'} ${esc(w.name)}.</label><button>${w.status==='archived'?'Restore':'Archive'}</button></form></details></section>`).join('');
  return shell(state,`<h1>Workspaces</h1><p>Each company has its own profile, review and prospecting data.</p><a href="/onboarding">Add a company</a>${cards||'<section class="card"><h2>No companies yet</h2><p>Add a company name to begin.</p></section>'}`,'Workspaces');
}
module.exports={changeArchive,workspacesPage};
