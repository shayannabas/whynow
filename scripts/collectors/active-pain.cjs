const { domainForTarget, event, normalizeEntityText, signal, stripHtml, withinDays } = require("./common.cjs");
const painThemes = require("../pain-themes.cjs");
const incidentAttribution = require("../incident-attribution.cjs");

const IMPACT_SCORE = { critical: 5, major: 5, minor: 4, none: 3, maintenance: 1 };

function statusApiUrl(base, endpoint) {
  const url = new URL(base);
  url.pathname = `/api/v2/${endpoint}.json`;
  url.search = "";
  url.hash = "";
  return url.href;
}

async function discoverStatusPage(target, runtime) {
  const domain = domainForTarget(target);
  const candidates = [target.statusPageUrl, domain ? `https://status.${domain}` : ""].filter(Boolean);
  for (const base of Array.from(new Set(candidates))) {
    try {
      const normalized = new URL(base).origin;
      const response = await runtime.requestJson(statusApiUrl(normalized, "status"), "statuspage");
      if (response.value?.page || response.value?.status) return normalized;
    } catch {
      // A missing/unsupported public status endpoint is an honest no-match.
    }
  }
  return "";
}

function incidentDurationMinutes(incident) {
  const start = Date.parse(incident.created_at || incident.started_at || "");
  const end = Date.parse(incident.resolved_at || incident.updated_at || "");
  return Number.isFinite(start) && Number.isFinite(end) && end >= start ? Math.round((end - start) / 60000) : undefined;
}

function incidentEvidence(incident) {
  const updates = (incident.incident_updates || []).map((update) => stripHtml(update.body)).filter(Boolean);
  const components = (incident.components || []).map((component) => component.name).filter(Boolean);
  return [incident.name, components.length ? `Affected: ${components.join(", ")}.` : "", updates[0] || ""].filter(Boolean).join(" ");
}

function themedPainEvent(input = {}, painThemeConfig = {}, attributionOptions = {}) {
  const classified = painThemes.classifyPainThemes(input.evidenceText || "", painThemeConfig);
  return incidentAttribution.decorateIncidentReceipt(event({ ...input, painThemes: classified.letters, metadata: { ...(input.metadata || {}), painThemes: classified.letters, painThemeMatches: classified.matches } }), attributionOptions);
}

function statuspageItems(target, incidents, apiUrl, now, painThemeConfig = {}) {
  const recent = (incidents || []).filter((incident) => withinDays(incident.created_at || incident.started_at, 90, now));
  const events = [];
  const signals = [];
  const quoteReceipts = [];
  for (const incident of recent) {
    const durationMinutes = incidentDurationMinutes(incident);
    const score = Math.min(5, (IMPACT_SCORE[String(incident.impact || "none").toLowerCase()] || 3) + (durationMinutes >= 60 ? 1 : 0));
    const evidenceText = incidentEvidence(incident);
    const evidenceUrl = incident.shortlink || apiUrl;
    const themes = painThemes.classifyPainThemes(evidenceText, painThemeConfig);
    const attributed = incidentAttribution.classifyIncidentAttribution({ type: "production_incident", evidenceText, sourceId: "statuspage" }, { sourceKind: "statuspage", companyOwned: true });
    events.push(themedPainEvent({
      type: "production_incident",
      title: incident.name || `${target.name} status incident`,
      evidenceUrl,
      evidenceText,
      occurredAt: incident.created_at || incident.started_at,
      sourceId: "statuspage",
      metadata: { incidentId: incident.id, impact: incident.impact, durationMinutes, status: incident.status },
    }, painThemeConfig, { sourceKind: "statuspage", companyOwned: true }));
    signals.push(signal({
      key: "activePain",
      score,
      evidenceUrl,
      evidenceText,
      observedAt: incident.created_at || incident.started_at,
      sourceId: "statuspage",
      metadata: { incidentId: incident.id, impact: incident.impact, durationMinutes, painThemes: themes.letters, attribution: attributed.attribution, citable: attributed.citable, citationStatus: attributed.citable ? "citable" : "not_citable", notCitableReason: attributed.citable ? "" : attributed.reason },
      confidence: incidentAttribution.confidenceForAttribution(attributed.attribution),
    }));
    quoteReceipts.push({ kind: "production_incident", text: evidenceText, sourceUrl: evidenceUrl, postingDate: incident.created_at || incident.started_at, attribution: attributed.attribution, citable: attributed.citable, citationStatus: attributed.citable ? "citable" : "not_citable", notCitableReason: attributed.citable ? "" : attributed.reason });
  }
  return { events, signals, quotebook: painThemes.quotebookFromReceipts(quoteReceipts, painThemeConfig) };
}

function stronglyAttributedToTarget(target, result = {}) {
  const targetDomain = domainForTarget(target);
  const evidenceUrl = String(result.url || result.link || result.evidenceUrl || "");
  if (targetDomain && evidenceUrl) {
    try {
      const host = new URL(evidenceUrl).hostname.replace(/^www\./, "").toLowerCase();
      if (host === targetDomain || host.endsWith(`.${targetDomain}`)) return true;
    } catch {
      // Continue with title and URL-path attribution.
    }
  }
  const targetName = normalizeEntityText(target.discoveryQuality?.targetAccountName || target.name || "");
  const title = normalizeEntityText(result.title || "");
  if (!targetName || !title) {
    if (!targetName || !evidenceUrl) return false;
  } else {
    if (` ${title} `.includes(` ${targetName} `)) return true;
    const compactTarget = targetName.replace(/\s+/g, "");
    if (compactTarget.length >= 7 && title.replace(/\s+/g, "").includes(compactTarget)) return true;
  }
  const urlText = normalizeEntityText(evidenceUrl);
  const distinctiveTokens = targetName.split(" ").filter((token) => token.length >= 5 && !["group", "health", "systems"].includes(token));
  return distinctiveTokens.some((token) => urlText.includes(token));
}

function companyOwnedSource(target = {}, evidenceUrl = "") {
  const targetDomain = domainForTarget(target);
  if (!targetDomain || !evidenceUrl) return false;
  try {
    const host = new URL(evidenceUrl).hostname.replace(/^www\./, "").toLowerCase();
    return host === targetDomain || host.endsWith(`.${targetDomain}`);
  } catch {
    return false;
  }
}

function operationalPainEvidence(target, result = {}) {
  if (!stronglyAttributedToTarget(target, result)) return false;
  const evidenceUrl = String(result.url || result.link || result.evidenceUrl || "");
  const text = stripHtml(`${result.title || ""} ${result.snippet || result.text || result.evidenceText || ""}`).toLowerCase();
  const strongIncident = /\b(outage|downtime|degraded|service disruption|unavailable)\b/.test(text);
  const genericIncident = /\b(incident|down)\b/.test(text);
  const operationalContext = /\b(api|app|application|software|platform|service|website|system|technical|technology|production|infrastructure|database|server|cloud|latency|errors?|status page|users?|customers?|checkout|payments?|booking|orders?|calls?|voice ai|automation)\b/.test(text);
  const unrelatedContext = /\b(police|crime|injury|accident|airport|customs|flight|weather|protest|lawsuit|compensation payout)\b/.test(text);
  const propertyUtilityIssue = /\b(power|electricity|utility)\s+(?:cut|failure|outage)\b/.test(text) && /\b(property|rental|home|house|guest|host)\b/.test(text);
  const nonOperationalProductPath = /\/rooms(?:\/|$)/i.test(evidenceUrl);
  if (!strongIncident && !(genericIncident && operationalContext)) return false;
  if (!operationalContext || unrelatedContext || propertyUtilityIssue || nonOperationalProductPath) return false;
  return true;
}

function searchPainItems(target, results = [], now = new Date(), painThemeConfig = {}) {
  const events = [];
  const signals = [];
  const quoteReceipts = [];
  for (const result of results) {
    const text = `${result.title || ""} ${result.snippet || result.text || ""}`;
    if (!operationalPainEvidence(target, result)) continue;
    const occurredAt = result.date || result.publishedAt || now.toISOString();
    if (!withinDays(occurredAt, 365, now)) continue;
    const evidenceUrl = result.url || result.link || "";
    if (!evidenceUrl) continue;
    const themes = painThemes.classifyPainThemes(text, painThemeConfig);
    const attributionOptions = { sourceKind: result.sourceId || "public_search", companyOwned: companyOwnedSource(target, evidenceUrl) };
    const attributed = incidentAttribution.classifyIncidentAttribution({ type: "outage_news", evidenceText: text, sourceId: result.sourceId || "public_search" }, attributionOptions);
    const painEvent = themedPainEvent({ type: "outage_news", title: result.title || `${target.name} outage evidence`, evidenceUrl, evidenceText: text, occurredAt, sourceId: result.sourceId || "public_search" }, painThemeConfig, attributionOptions);
    events.push(painEvent);
    signals.push(signal({ key: "activePain", score: withinDays(occurredAt, 90, now) ? 4 : 3, evidenceUrl, evidenceText: text, observedAt: occurredAt, sourceId: result.sourceId || "public_search", metadata: { painThemes: themes.letters, attribution: attributed.attribution, citable: attributed.citable, citationStatus: attributed.citable ? "citable" : "not_citable", notCitableReason: attributed.citable ? "" : attributed.reason }, confidence: incidentAttribution.confidenceForAttribution(attributed.attribution) }));
    quoteReceipts.push({ kind: "outage_news", text, sourceUrl: evidenceUrl, postingDate: occurredAt, attribution: attributed.attribution, citable: attributed.citable, citationStatus: attributed.citable ? "citable" : "not_citable", notCitableReason: attributed.citable ? "" : attributed.reason });
  }
  return { events, signals, quotebook: painThemes.quotebookFromReceipts(quoteReceipts, painThemeConfig) };
}

async function hackerNewsPain(target, runtime, now, painThemeConfig = {}) {
  const query = encodeURIComponent(`${target.name} outage incident`);
  const url = `https://hn.algolia.com/api/v1/search_by_date?query=${query}&tags=story&hitsPerPage=8`;
  const { value } = await runtime.requestJson(url, "hn");
  return searchPainItems(target, (value.hits || []).map((hit) => ({
    title: hit.title,
    text: hit.story_text,
    url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
    publishedAt: hit.created_at,
    sourceId: "hn",
  })), now, painThemeConfig);
}

function googleNewsRssItems(target, xml = "", now = new Date(), painThemeConfig = {}) {
  const field = (block, tag) => stripHtml(String(block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"))?.[1] || "").replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, ""));
  const results = [];
  for (const match of String(xml).matchAll(/<item\b[\s\S]*?<\/item>/gi)) {
    const block = match[0];
    const title = field(block, "title");
    const url = field(block, "link");
    const publishedAt = field(block, "pubDate");
    const description = field(block, "description");
    if (!title || !/^https:\/\//i.test(url)) continue;
    results.push({ title, snippet: description, url, publishedAt, sourceId: "google_news_rss" });
  }
  return searchPainItems(target, results, now, painThemeConfig);
}

async function googleNewsPain(target, runtime, now, painThemeConfig = {}) {
  const query = encodeURIComponent(`"${String(target.name || "").replace(/["\n\r]/g, " ").trim()}" (outage OR incident OR downtime OR degraded) when:90d`);
  const url = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;
  const { value } = await runtime.requestText(url, "google_news_rss");
  return googleNewsRssItems(target, value, now, painThemeConfig);
}

async function collectActivePain(target, context) {
  const { runtime } = context;
  const now = context.now || new Date();
  const signals = [];
  const events = [];
  const targetPatch = {};
  const quoteEntries = [];
  const painThemeConfig = context.painThemeConfig || {};
  const statusPageUrl = await discoverStatusPage(target, runtime);
  if (statusPageUrl) {
    targetPatch.statusPageUrl = statusPageUrl;
    const apiUrl = statusApiUrl(statusPageUrl, "incidents");
    const { value } = await runtime.requestJson(apiUrl, "statuspage");
    const items = statuspageItems(target, value.incidents || [], apiUrl, now, painThemeConfig);
    signals.push(...items.signals);
    events.push(...items.events);
    quoteEntries.push(...(items.quotebook || []));
  }
  if (!context.statusOnly) {
    try {
      const hn = await hackerNewsPain(target, runtime, now, painThemeConfig);
      signals.push(...hn.signals);
      events.push(...hn.events);
      quoteEntries.push(...(hn.quotebook || []));
    } catch {
      // Health remains source-specific in the runtime; other pain sources still count.
    }
  }
  if (!context.statusOnly) {
    try {
      const news = await googleNewsPain(target, runtime, now, painThemeConfig);
      signals.push(...news.signals);
      events.push(...news.events);
      quoteEntries.push(...(news.quotebook || []));
    } catch {
      // Google News RSS is a free fallback; a failure cannot suppress other receipts.
    }
  }
  if (!context.statusOnly) {
    const search = searchPainItems(target, context.searchResults || [], now, painThemeConfig);
    signals.push(...search.signals);
    events.push(...search.events);
    quoteEntries.push(...(search.quotebook || []));
  }
  targetPatch.quotebook = painThemes.mergeQuotebook(target.quotebook || [], quoteEntries);
  return { collectorId: "active_pain", signals, events, targetPatch, itemsFound: events.length };
}

module.exports = { collectActivePain, discoverStatusPage, googleNewsPain, googleNewsRssItems, incidentDurationMinutes, operationalPainEvidence, searchPainItems, statusApiUrl, statuspageItems, stronglyAttributedToTarget };
