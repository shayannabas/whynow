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
  const workspaces=Object.keys(state.workspaces).map(id=>getWorkspace(state,id)).filter(workspace=>!workspace.systemRole);
  const date=value=>value?esc(value.slice(0,10)):'Not yet';
  const cards=workspaces.map(w=>`<section class="panel workspace-card"><div class="work-section-head"><div><span>Seller workspace</span><h2>${esc(w.name)}</h2></div><span class="ss-badge ${w.status==='active'?'ready':w.status==='needs_review'?'review':'new'}">${esc(w.status.replaceAll('_',' '))}</span></div>${state.activeWorkspaceId===w.id?'<p class="ss-domain">Current workspace</p>':''}<div class="compact-list"><span><b>Created</b><em>${date(w.createdAt)}</em></span><span aria-label="Profile approved: ${date(w.sellerProfile.approvedAt)}"><b>Profile approved</b><em>${date(w.sellerProfile.approvedAt)}</em></span><span><b>Saved accounts</b><em>${w.accounts.length}</em></span><span><b>Delivery</b><em>Demo · copy only</em></span></div>${w.status==='archived'?'<p>Archived. Saved data is retained. Restoring an approved profile requires a new review.</p>':`<form method="post" action="/workspaces/switch"><input type="hidden" name="id" value="${esc(w.id)}"><button class="button primary">Open ${esc(w.name)}</button></form>`}${w.status==='reference_demo'?'<p class="muted">Frozen reference configuration · load only</p>':`<details class="credibility-expander"><summary>${w.status==='archived'?'Restore workspace':'Archive workspace'}</summary><p>${w.status==='archived'?'Bring this workspace back in Demo mode.':'Remove this workspace from the switcher without deleting its profile or evidence.'}</p><form method="post" action="/workspaces/${w.status==='archived'?'restore':'archive'}"><input type="hidden" name="id" value="${esc(w.id)}"><input type="hidden" name="revision" value="${w.lifecycleRevision||0}"><input type="hidden" name="profileRevision" value="${w.profileRevision||0}"><label><input type="checkbox" name="acknowledged" required> I want to ${w.status==='archived'?'restore':'archive'} ${esc(w.name)}.</label><button class="button">${w.status==='archived'?'Restore':'Archive'}</button></form></details>`}</section>`).join('');
  return shell(state,`<div class="ss-page"><div class="page-header"><div><div class="page-kicker">Setup</div><h1 class="page-title">Workspaces</h1><p class="page-subtitle">Each company has its own profile, review and prospecting data.</p></div><a class="button primary" href="/onboarding">Add a company</a></div><div class="workspace-grid">${cards||'<section class="panel"><h2>No companies yet</h2><p>Add a company name to begin.</p></section>'}</div></div>`,'Workspaces');
}
module.exports={changeArchive,workspacesPage};
