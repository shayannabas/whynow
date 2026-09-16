import { it, expect } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { resolveSeller, confirmCandidate, normalizeWebsite } = require('../scripts/onboarding/resolve-seller.cjs');
const { defaultState, createWorkspace, updateWorkspace } = require('../scripts/server/state.cjs');
const { onboardingPage } = require('../scripts/onboarding/pages.cjs');

it('accepts a supplied website without calling search or AI and requires confirmation', async () => {
  const result = await resolveSeller({ name: 'Company under test', website: 'www.example.org/product' }, {
    searchFn: () => { throw new Error('Provider must not be called'); }
  });
  expect(result.status).toBe('confirmation_required');
  expect(result.candidates[0]).toMatchObject({ domain: 'example.org', provenance: 'user_supplied', verified: false });
  expect(confirmCandidate(result, result.candidates[0].id).status).toBe('selected');
  expect(() => confirmCandidate(result, 'forged')).toThrow('listed');
});
it('offers an honest website fallback when search is not configured', async () => {
  expect(await resolveSeller({ name: 'Company under test' }, { env: {} })).toMatchObject({ status: 'website_required', candidates: [] });
});
it('deduplicates search candidates, skips directories and caps choices at five', async () => {
  const rows = [{ title: 'Directory', url: 'https://linkedin.com/company/test' },
    ...Array.from({ length: 7 }, (_, i) => ({ title: `Fixture ${i}`, url: `https://example${i}.org`, snippet: 'Unverified search result' })),
    { title: 'Duplicate', url: 'https://example0.org/about' }];
  const result = await resolveSeller({ name: 'Ambiguous company' }, { env: { SERPER_API_KEY: 'fixture' }, searchFn: async () => rows });
  expect(result.candidates).toHaveLength(5);
  expect(result.status).toBe('confirmation_required');
  expect(result.selectedCandidate).toBeUndefined();
  expect(result.candidates.every(c => !c.verified && c.sourceUrl)).toBe(true);
});
it('preserves zero search results without invented companies', async () => {
  expect(await resolveSeller({ name: 'No match' }, { env: { SERPER_API_KEY: 'fixture' }, searchFn: async () => [] })).toMatchObject({ status: 'no_results', candidates: [] });
});
it('rejects invalid websites and escapes candidate content in the review page', async () => {
  for (const url of ['http://example.org', 'https://user:password@example.org', 'https://127.0.0.1', 'https://service.local']) expect(() => normalizeWebsite(url)).toThrow();
  const state = createWorkspace(defaultState(), { name: 'Test' });
  const setup = await resolveSeller({ name: '<script>alert(1)</script>', website: 'example.org' });
  const changed = updateWorkspace(state, state.activeWorkspaceId, w => { w.onboarding = setup; });
  expect(onboardingPage(changed)).toContain('&lt;script&gt;');
  expect(onboardingPage(changed)).not.toContain('<script>alert(1)</script>');
  expect(state.workspaces[state.activeWorkspaceId].onboarding).toBeUndefined();
});
