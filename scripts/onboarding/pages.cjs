const { esc } = require('../utils.cjs');
const { getWorkspace } = require('../server/state.cjs');
const { shell } = require('../server/pages.cjs');

function onboardingPage(state, { searchConfigured = false, error = '' } = {}) {
  const workspace = state.activeWorkspaceId ? getWorkspace(state, state.activeWorkspaceId) : null;
  if (!workspace) return shell(state, '<h1>Seller setup</h1><p>Create a workspace first, then choose the seller it represents.</p><a href="/">Create a workspace</a>', 'Seller setup');
  const setup = workspace.onboarding;
  const selected = setup?.selectedCandidate;
  const result = selected ? `<section class="card"><h2>Company selected</h2><p>${esc(selected.name)} · ${esc(selected.domain)}</p><p>Profile status: ${esc(workspace.status.replaceAll('_',' '))}. AI and automated research are disabled.</p><a href="/onboarding/profile">Edit and review seller profile</a></section>` :
    setup?.status === 'no_results' ? '<p role="status">No company matches found. Enter its website to continue; no company was guessed.</p>' :
    setup?.status === 'website_required' ? '<p role="status">Company search is not configured. Enter the seller’s website below.</p>' : '';
  const candidates = !selected && setup?.candidates?.length ? `<section class="card"><h2>Confirm the right company</h2><p>Search matches and supplied websites are candidates, not verified seller facts.</p>${setup.candidates.map(candidate => `<article><h3>${esc(candidate.name)}</h3><p>${esc(candidate.domain)}</p><p>${esc(candidate.description)}</p><a href="${esc(candidate.sourceUrl || candidate.website)}" target="_blank" rel="noreferrer">Open candidate website</a><form method="post" action="/onboarding/confirm"><input type="hidden" name="workspaceId" value="${esc(workspace.id)}"><input type="hidden" name="candidateId" value="${esc(candidate.id)}"><button>Use this company</button></form></article>`).join('')}</section>` : '';
  return shell(state, `<div class="ss-page"><div class="page-header"><div><div class="page-kicker">${esc(workspace.name)} · Manual setup</div><h1 class="page-title">Choose your seller</h1><p class="page-subtitle">Identify the company you want to prepare prospects for.</p></div><a class="button" href="/onboarding">Company-name research</a></div>${error ? `<p role="alert">${esc(error)}</p>` : ''}${result}${candidates}<section class="card"><h2>${selected ? 'Change company selection' : 'Find a company'}</h2><p>${searchConfigured ? 'Enter a name to see possible matches, or supply its website.' : 'Search is not configured yet. You can still select a company by supplying its website.'}</p><form method="post" action="/onboarding/resolve"><input type="hidden" name="workspaceId" value="${esc(workspace.id)}"><label for="seller-name">Company name</label><input id="seller-name" name="name" required maxlength="120" value="${esc(setup?.name || workspace.name)}"><label for="seller-website">Company website${searchConfigured ? ' (optional)' : ''}</label><input id="seller-website" name="website" maxlength="1000" placeholder="https://company.com" value="${esc(selected?.website || '')}"><p><button>Find company</button></p></form></section></div>`, 'Seller setup');
}

module.exports = { onboardingPage };
