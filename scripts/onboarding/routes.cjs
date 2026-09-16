const path = require('node:path');
const { getWorkspace, updateWorkspace } = require('../server/state.cjs');
const { json } = require('../utils.cjs');
const { resolveSeller, confirmCandidate } = require('./resolve-seller.cjs');
const { onboardingPage } = require('./pages.cjs');
const { profilePage } = require('./profile-page.cjs');
const { saveManualProfile, approveManualProfile } = require('./manual-profile.cjs');

async function onboardingRoute({ req, res, pathname, state, mutate, env, runtimeFactory, stateFile }) {
  if (!pathname.startsWith('/onboarding')) return false;
  const remote = req.socket.remoteAddress;
  if (env.NODE_ENV === 'production' || !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remote) ||
      !/^(127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/.test(req.headers.host || '')) {
    json(res, 403, { error: 'Local administrator access only' }); return true;
  }
  const render = (status, error = '') => {
    res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(onboardingPage(state, { searchConfigured: Boolean(env.SERPER_API_KEY), error }));
  };
  if (req.method === 'GET' && pathname === '/onboarding/profile') {
    res.writeHead(200, {'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
    res.end(profilePage(state)); return true;
  }
  if (req.method === 'GET' && pathname === '/onboarding') { render(200); return true; }
  if (req.method !== 'POST' || !['/onboarding/resolve', '/onboarding/confirm', '/onboarding/profile/save', '/onboarding/profile/approve'].includes(pathname)) {
    json(res, 404, { error: 'Page not found' }); return true;
  }
  if (req.headers.origin !== `http://${req.headers.host}`) { json(res, 403, { error: 'Use the local page form' }); return true; }
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > 128 * 1024) { json(res, 413, { error: 'Form too large' }); return true; }
  }
  const form = new URLSearchParams(body);
  const id = form.get('workspaceId');
  if (!state.activeWorkspaceId || id !== state.activeWorkspaceId) { json(res, 409, { error: 'Workspace changed. Refresh and try again.' }); return true; }
  const workspace = getWorkspace(state, id);
  if (pathname.startsWith('/onboarding/profile/')) {
    try {
      await mutate(current => {
        if(current.activeWorkspaceId !== id) throw new Error('Workspace changed. Refresh and try again.');
        return pathname.endsWith('/save') ? saveManualProfile(current,id,form) : approveManualProfile(current,id,{revision:form.get('revision'),acknowledged:form.has('acknowledged')});
      });
      res.writeHead(303,{Location:'/onboarding/profile'});res.end();
    } catch(error) {
      res.writeHead(400,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
      res.end(profilePage(state,{error:error.message,submitted:pathname.endsWith('/save')?form:null}));
    }
    return true;
  }
  if (workspace.status !== 'draft') { json(res, 409, { error: 'Only draft workspaces can change company selection' }); return true; }
  try {
    if (pathname === '/onboarding/confirm') {
      await mutate(current => {
        if (current.activeWorkspaceId !== id || getWorkspace(current, id).status !== 'draft') throw new Error('Workspace changed. Refresh and try again.');
        return updateWorkspace(current, id, w => { w.onboarding = confirmCandidate(w.onboarding, form.get('candidateId')); });
      });
    } else {
      const runtime = runtimeFactory({ env, cacheDir: stateFile ? path.join(path.dirname(stateFile), 'collector-cache') : undefined });
      const previous = workspace.budgets.collector;
      const day = new Date().toISOString().slice(0, 10);
      if (previous?.day === day) { runtime.usage = structuredClone(previous.usage); runtime.health = structuredClone(previous.health); }
      let resolved;
      try { resolved = await resolveSeller({ name: form.get('name'), website: form.get('website') }, { runtime, env }); }
      finally {
        if (runtime.usage.serper.requests || runtime.usage.serper.cacheHits) await mutate(current => updateWorkspace(current, id, w => { w.budgets.collector = { ...runtime.snapshot(), day }; }));
      }
      await mutate(current => {
        if (current.activeWorkspaceId !== id || getWorkspace(current, id).status !== 'draft') throw new Error('Workspace changed. Refresh and try again.');
        return updateWorkspace(current, id, w => { w.onboarding = { ...resolved, name: form.get('name').trim() }; });
      });
    }
    res.writeHead(303, { Location: '/onboarding' }); res.end();
  } catch (error) { render(400, error.code ? 'Company lookup could not complete. Check the collector configuration and try again.' : error.message); }
  return true;
}

module.exports = { onboardingRoute };
