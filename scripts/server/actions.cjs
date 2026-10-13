const { createWorkspace, getWorkspace } = require('./state.cjs');
async function workspaceAction(req, state, pathname) {
  if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) throw new Error('Invalid origin');
  let body=''; for await (const chunk of req) { body+=chunk; if (Buffer.byteLength(body)>4096) throw new Error('Form too large'); }
  const fields = new URLSearchParams(body);
  if (pathname === '/workspaces') return createWorkspace(state,{name:fields.get('name')});
  const id = fields.get('id');
  const workspace=getWorkspace(state,id);
  if(workspace.systemRole)throw new Error('System workspaces cannot be opened.');
  if(workspace.status==='archived')throw new Error('Restore this workspace before opening it.');
  return {...state,activeWorkspaceId:id};
}
module.exports = { workspaceAction };
