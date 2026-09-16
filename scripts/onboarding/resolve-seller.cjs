const { search } = require('../serper.cjs');
const { stableId } = require('../utils.cjs');

function normalizeWebsite(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  let url;
  try { url = new URL(text.includes('://') ? text : `https://${text}`); }
  catch { throw new Error('Enter a valid company website'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port ||
      !url.hostname.includes('.') || /^[\d.]+$/.test(url.hostname) ||
      /(?:^|\.)(localhost|local|internal|test|invalid)$/.test(url.hostname)) {
    throw new Error('Use the company’s public HTTPS website');
  }
  return { domain: url.hostname.toLowerCase().replace(/^www\./, ''), website: url.origin };
}

const DIRECTORY_DOMAINS = new Set(['linkedin.com', 'facebook.com', 'wikipedia.org', 'crunchbase.com', 'zoominfo.com', 'x.com', 'twitter.com', 'youtube.com']);

async function resolveSeller({ name, website }, { runtime, env = process.env, searchFn = search } = {}) {
  const sellerName = String(name || '').trim();
  if (!sellerName || sellerName.length > 120) throw new Error('Enter a company name of 1–120 characters');
  const supplied = normalizeWebsite(website);
  if (supplied) {
    return {
      schemaVersion: 1,
      status: 'confirmation_required',
      candidates: [{ id: stableId(supplied.domain), name: sellerName, ...supplied,
        description: 'Website supplied by you; not researched yet.', sourceUrl: null, provenance: 'user_supplied', verified: false }]
    };
  }
  if (!env.SERPER_API_KEY) return { schemaVersion: 1, status: 'website_required', candidates: [] };

  const rows = await searchFn(`${sellerName} official website`, { runtime, env });
  const seen = new Set();
  const candidates = [];
  for (const row of rows) {
    let parsed;
    try { parsed = normalizeWebsite(row.url); } catch { continue; }
    if (!parsed || seen.has(parsed.domain) || [...DIRECTORY_DOMAINS].some(domain => parsed.domain === domain || parsed.domain.endsWith(`.${domain}`))) continue;
    seen.add(parsed.domain);
    candidates.push({ id: stableId(parsed.domain), name: String(row.title || sellerName).slice(0, 200), ...parsed,
      description: String(row.snippet || '').slice(0, 500), sourceUrl: row.url, provenance: 'search_result', verified: false });
    if (candidates.length === 5) break;
  }
  return { schemaVersion: 1, status: candidates.length ? 'confirmation_required' : 'no_results', candidates };
}

function confirmCandidate(onboarding, candidateId) {
  const candidate = onboarding?.candidates?.find(item => item.id === candidateId);
  if (!candidate) throw new Error('Choose one of the listed companies');
  return { ...structuredClone(onboarding), status: 'selected', selectedCandidate: structuredClone(candidate) };
}

module.exports = { normalizeWebsite, resolveSeller, confirmCandidate };
