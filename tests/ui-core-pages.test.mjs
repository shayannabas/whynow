import { expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { defaultState } = require('../scripts/server/state.cjs');
const { esc } = require('../scripts/utils.cjs');
const { loadResolveReferenceDemo } = require('../scripts/reference-demo.cjs');
const { buildDiscoveryTasks } = require('../scripts/company-discovery.cjs');
const { signalRubric } = require('../scripts/signal-rubric.cjs');
const { accountPage, accountsPage, discoveryPage, killLogPage, resultsPage, scorecardPage, todayPage } = require('../scripts/server/phase-a-pages.cjs');

function uiFixture() {
  const state = loadResolveReferenceDemo(defaultState());
  const workspace = state.workspaces[state.activeWorkspaceId];
  const segment = workspace.icpConfig.segments[0].key;
  const occurredAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  workspace.accounts.push({
    schemaVersion: 1,
    id: 'ui-acme',
    name: 'Acme Systems',
    domain: 'acme.example',
    icpSegment: segment,
    fitScore: 55,
    tier: 1,
    status: 'new',
    priority: 0.82,
    score: { fitScore: 55, fitConfidence: 0.74, breakdown: {} },
    signals: {},
    triggers: [{ id: 'ui-trigger', type: 'executive_change', title: 'Acme appointed a new CTO', evidenceUrl: 'https://acme.example/news/cto', occurredAt }],
    kills: [],
    sourceUrl: 'https://acme.example/about',
    discoveryQuality: { sourceKind: 'serper_discovery', sourceUrl: 'https://acme.example/about' },
    updatedAt: occurredAt,
  }, {
    schemaVersion: 1,
    id: 'ui-killed',
    name: 'Killed Example',
    domain: 'killed.example',
    icpSegment: segment,
    fitScore: 77,
    tier: 2,
    status: 'new',
    score: { fitScore: 77, fitConfidence: 0.6, breakdown: {} },
    signals: {},
    triggers: [],
    kills: [{ code: 'KILL_TEST', reason: 'Synthetic retained disqualification for UI test.', evidenceUrl: 'https://killed.example/receipt' }],
    killStatus: 'killed',
    primaryKill: { code: 'KILL_TEST', reason: 'Synthetic retained disqualification for UI test.', evidenceUrl: 'https://killed.example/receipt' },
    sourceUrl: 'https://killed.example/about',
    discoveryQuality: { sourceKind: 'curated_seed', sourceUrl: 'https://killed.example/about' },
    updatedAt: occurredAt,
  });
  const task = buildDiscoveryTasks(workspace, { maxQueries: 1 })[0];
  workspace.runs.push({
    id: 'ui-discovery-run', type: 'company_discovery', status: 'complete', startedAt: occurredAt,
    finishedAt: occurredAt, serperQueries: 1, queryCap: 60, rawFound: 2, passedNoiseGate: 1,
    newAccounts: 1, newAccountIds: ['ui-acme'], rejectedCount: 1,
    tasks: [{ taskId: task.id, segment, status: 'complete', results: 2, candidates: 1 }], errors: [],
  });
  workspace.drafts.push({ schemaVersion: 1, id: 'ui-draft', kind: 'outreach_email', accountId: 'ui-acme', createdAt: occurredAt, templateLabel: 'Synthetic local template', subject: 'A receipt-backed question', body: 'Synthetic local Demo copy.', evidenceRefs: [] });
  return { state, workspace, task };
}

it('renders full-height saved email bodies and descriptive receipt labels',()=>{
  const {state,workspace}=uiFixture(),claims=workspace.icpConfig.outreach.claims;
  workspace.drafts[0].evidenceRefs=['https://acme.example/news/cto',claims.product.sourceUrl,claims.customerProofs[0].sourceUrl];
  const html=accountPage(state,'ui-acme','',new URLSearchParams('tab=outreach'));
  expect(html).toContain('data-autosize-draft rows="12"');expect(html).toContain('field.scrollHeight+2');
  expect(html).toContain('Acme Systems leadership report');expect(html).toContain('Resolve AI product');expect(html).toContain(`${claims.customerProofs[0].customer} quote`);
});

it('renders Results as a distinct searchable master-detail workspace with working account tabs', () => {
  const { state } = uiFixture();
  const defaultResults = resultsPage(state);
  expect(defaultResults).toContain('data-brief-account="ui-acme"');
  expect(defaultResults).not.toContain('data-brief-account="ui-killed"');
  expect(defaultResults).not.toContain('Killed Example');
  const html = resultsPage(state, new URLSearchParams('lead=ui-acme&tab=score'));
  expect(html).toContain('class="command results-layout"');
  expect(html).toContain('class="lead-rail"');
  expect(html).toContain('class="brief"');
  expect(html).toContain('Queue-ready');
  expect(html).toContain('class="brief-tab active" href="/results?lead=ui-acme&amp;tab=score"');
  expect((html.match(/<main\b/g) || []).length).toBe(1);
  const killedOnly = resultsPage(state, new URLSearchParams('tier=killed'));
  expect(killedOnly).toContain('data-brief-account="ui-killed"');
});

it('applies the Scorecard tier/fit drilldown to the canonical Accounts filters', () => {
  const { state } = uiFixture();
  const scorecard = scorecardPage(state);
  expect(scorecard).toContain('href="/accounts?tier=1&fit=40-69"');
  const filtered = accountsPage(state, '', new URLSearchParams('tier=1&fit=40-69&q=Acme'));
  expect(filtered).toContain('Acme Systems');
  expect(filtered).not.toContain('Killed Example');
  expect(filtered).toContain('name="fit"');
});

it('keeps account detail tabs present and preserves Demo form/action contracts', () => {
  const { state, workspace } = uiFixture();
  const html = accountPage(state, 'ui-acme', '', new URLSearchParams('tab=outreach'));
  expect(html).toContain('class="brief-tab active"');
  expect(html).toContain('Create template draft');
  expect(html).toContain('Your first name');
  expect(html).toContain('value="Shayan"');
  expect(html).toContain('name="workspaceId"');
  expect(html).toContain('value="' + workspace.id + '"');
  expect(html).toContain('<b>Contact source:</b> deferred (Apollo planned)');
  expect(html).toContain('class="outreach-workspace"');
  expect(html).toContain('class="outreach-section-head"');
  expect(html).toContain('class="outreach-contact-grid"');
  expect(html).toContain('class="outreach-draft-form"');
  expect(html).toContain('id="draft-subject-ui-draft" readonly');
  expect(html).toContain('id="draft-body-ui-draft" readonly');
  expect(html).toContain('data-copy-target="#draft-body-ui-draft"');
  expect(html).toContain('Step 3 · Demo only');
  expect(html).toContain('not sent, synchronized, or recorded as contacted');
  expect(html).toContain('data-copy-draft=');
  expect(html).not.toContain('onclick=');
  const hero = html.slice(html.indexOf('credibility-chip-row'), html.indexOf('<div class="score-box"'));
  expect(hero).toContain('Act now');
  expect(hero.indexOf('Act now')).toBeLessThan(hero.indexOf('Tier 1'));
});

it('keeps blank signal placeholders unknown while showing saved inferred evidence without trigger rows', () => {
  const { state, workspace } = uiFixture();
  const account = workspace.accounts.find(row => row.id === 'ui-acme');
  account.triggers = [];
  account.triggerHistory = [];
  account.signals = {
    aiCompatibility: { score: 1, evidenceUrl: '', evidenceText: 'Signal not collected.', inferred: true, metadata: {} },
    competitiveWedge: { score: 1, evidenceUrl: '', evidenceText: 'Signal not collected.', inferred: true, metadata: {} },
    activePain: { score: 3, evidenceUrl: '', evidenceText: 'Public company materials describe growing infrastructure complexity.', confidence: 0.82, inferred: true, metadata: {} },
  };
  account.score.breakdown.aiCompatibility = { used: true, fitPoints: 4.27, confidence: 0.2 };
  account.score.breakdown.competitiveWedge = { used: true, fitPoints: 1.75, confidence: 0.35 };
  const aiLabel = signalRubric(workspace.icpConfig).find(row => row.key === 'aiCompatibility').label;
  const score = accountPage(state, 'ui-acme', '', new URLSearchParams('tab=score'));
  const signalAt = score.indexOf(`<b>${esc(aiLabel)}</b>`);
  const signalRow = score.slice(signalAt, score.indexOf('</tr>', signalAt));
  expect(signalRow).toContain('Unknown');
  expect(signalRow).toContain('Low confidence prior');
  expect(signalRow).toContain('4.27');
  expect(signalRow).toContain('20%');
  expect(signalRow).toContain('Not collected — no negative conclusion.');
  expect(signalRow).not.toContain('1 / 5');

  const evidence = accountPage(state, 'ui-acme', '', new URLSearchParams('tab=evidence'));
  expect(evidence).toContain('1 saved');
  expect(evidence).toContain('Public company materials describe growing infrastructure complexity.');
  expect(evidence).toContain('82%');
  expect(evidence).toContain('0 records');
  expect(evidence).toContain('No trigger records are saved for this account.');
  expect(evidence).not.toContain('Signal not collected.');
});

it('shows saved discovery plan and scopes Latest run to newAccountIds', () => {
  const { state, task } = uiFixture();
  const latest = discoveryPage(state, '', new URLSearchParams('scope=latest'));
  expect(latest).toContain('Workspace discovery plan');
  expect(latest).toContain('Acme Systems');
  expect(latest).not.toContain('Killed Example');
  const queries = discoveryPage(state, '', new URLSearchParams('view=queries'));
  expect(queries).toContain(esc(task.query));
  expect(queries).toContain('Edit ICP');
});

it('puts Today summaries before the full Act now card list and keeps queue operations collapsed', () => {
  const { state, workspace } = uiFixture();
  const html = todayPage(state);
  expect(html.indexOf('class="daily-brief-grid"')).toBeLessThan(html.indexOf('class="today-list"'));
  expect(html).toContain('Acme appointed a new CTO');
  expect(html).toContain('https://acme.example/news/cto');
  expect(html).toContain('Worth researching');
  expect(html).toContain('Needs review');
  expect(html).toContain('details class="panel fold today-operations"');
  expect(html).toContain('name="workspaceId" value="' + workspace.id + '"');
});

it('retains killed-account firmographic tier and primary receipt in scorecard and Kill Log', () => {
  const { state } = uiFixture();
  const scorecard = scorecardPage(state), killLog = killLogPage(state);
  expect(scorecard).toContain('Tier 2');
  expect(killLog).toContain('KILL_TEST');
  expect(killLog).toContain('Tier 2');
  expect(killLog).toContain('https://killed.example/receipt');
});
