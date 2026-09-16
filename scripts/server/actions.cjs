const { createWorkspace, getWorkspace } = require('./state.cjs');
async function workspaceAction(req, state, pathname) {
  if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) throw new Error('Invalid origin');
  let body=''; for await (const chunk of req) { body+=chunk; if (Buffer.byteLength(body)>4096) throw new Error('Form too large'); }
  const fields = new URLSearchParams(body);
  if (pathname === '/workspaces') return createWorkspace(state,{name:fields.get('name')});
  const id = fields.get('id'); getWorkspace(state,id);
  return {...state,activeWorkspaceId:id};
}
module.exports = { workspaceAction };
