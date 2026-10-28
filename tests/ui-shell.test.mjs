import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { shell, overview } = require('../scripts/server/pages.cjs');
const { defaultState, createWorkspace } = require('../scripts/server/state.cjs');

function workspaceState(accounts = []) {
  const state = createWorkspace(defaultState(), { name: 'Acme' });
  const workspaceId = state.activeWorkspaceId;
  state.workspaces[workspaceId].accounts = accounts;
  return state;
}

describe('WhyNow SignalScout UI shell', () => {
  it('renders the grouped route navigation and active Results route', () => {
    const html = shell(defaultState(), '<h1>Results</h1>', 'Results', '/results');
    expect(html).toContain('class="nav-section-label">Work</div>');
    expect(html).toContain('class="nav-section-label">Pipeline</div>');
    expect(html).toContain('href="/results" class="active" aria-current="page"');
    expect(html).toContain('href="/history"');
    expect(html).toContain('href="/runs"');
    expect(html).toContain('href="/funnel"');
    expect(html).toContain('href="/metrics"');
    expect(html).toContain('data-mobile-nav-toggle');
  });

  it('marks account detail as active under Accounts', () => {
    const html = shell(defaultState(), '<span class="eyebrow">Chunk 3 · account detail</span>', 'Acme');
    expect(html).toContain('href="/accounts" class="active" aria-current="page"');
  });

  it('shows overview metrics from saved workspace accounts only', () => {
    const html = overview(workspaceState([{
      id: 'account-1', name: 'Acme Cloud', domain: 'acme.example', tier: 1, fitScore: 62,
      status: 'new', sourceUrl: 'https://acme.example/about', createdAt: new Date().toISOString(),
      signals: {}, triggers: [], triggerHistory: [], kills: []
    }]));
    expect(html).toContain('1 saved accounts');
    expect(html).toContain('1 of 1 saved accounts have a receipt');
    expect(html).toContain('Tier 1 accounts');
    expect(html).toContain('>1</strong>');
    expect(html).toContain('href="/accounts/account-1"');
    expect(html).not.toContain('outreach sent');
  });

  it('applies overview search, tier filter, and sort from GET query parameters', () => {
    const state = workspaceState([
      { id: 'a1', name: 'Acme Cloud', domain: 'acme.example', tier: 1, fitScore: 62, status: 'new', sourceUrl: 'https://acme.example/about', signals: {}, triggers: [], triggerHistory: [], kills: [] },
      { id: 'b1', name: 'Beta Systems', domain: 'beta.example', tier: 2, fitScore: 48, status: 'new', signals: {}, triggers: [], triggerHistory: [], kills: [] }
    ]);
    const html = overview(state, new URLSearchParams('q=Acme&sort=name&filter=tier-1'));
    expect(html).toContain('name="q" value="Acme"');
    expect(html).toContain('<option value="name" selected>Company A–Z</option>');
    expect(html).toContain('<option value="tier-1" selected>Tier 1</option>');
    expect(html).toContain('1 shown of 2 saved');
    expect(html).toContain('Acme Cloud');
    expect(html).not.toContain('Beta Systems');
  });

  it('uses the source stylesheet final layers and WhyNow layout adaptations', () => {
    const html = shell(defaultState(), '<h1>Results</h1>', 'Results', '/results');
    expect(html).toContain('SignalScout');
    expect(html).toContain('.credibility-signal-grid{');
    expect(html).toContain('grid-template-columns:252px minmax(0,1fr)');
    expect(html).toContain('.brief-body>.brief-main');
    expect(html).toContain('.scorecard-page .ss-table td>a.ss-source-link{display:block;min-height:36px}');
    expect(html).toContain('@media(max-width:760px){.ss-page .ss-table td:first-child{display:block}}');
    expect(html).toContain('.results-page .metrics-kpis{grid-template-columns:repeat(4');
    expect(html).toContain('.workspace-grid{display:grid;grid-template-columns:repeat(2');
    expect(html).toContain('.ss-toolbar input:not([type=checkbox]):not([type=radio])');
    expect(html).toContain('.field input:not([type=checkbox]):not([type=radio])');
    expect(html).toContain('.accounts-filters{display:grid;grid-template-columns:minmax(220px,1.4fr)');
    expect(html).toContain('.today-list{max-width:none');
    expect(html).toContain('.ss-btn:disabled,button:disabled');
  });

  it('emits parseable delegated client behavior', () => {
    const html = shell(defaultState(), '<h1>Overview</h1>');
    const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
    expect(script).toBeTruthy();
    expect(() => new Function(script)).not.toThrow();
    expect(script).toContain('popstate');
    expect(script).toContain('data-copy');
    expect(script).toContain('data-brief-tab');
  });
});
