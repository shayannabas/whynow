const stage3Signals = require("../collector-triggers.cjs");
const { evidenceBelongsToTarget, event, withinDays } = require("./common.cjs");

const EXEC_ACTION = /\b(appoints?|appointed|joins?|joined|hires?|hired|names?|named)\b/i;
const DEPARTURE_ACTION = /\b(leaves?|left|departs?|departed|exits?|exited|steps?\s+down|stepped\s+down|resigns?|resigned)\b/i;
const EXEC_ROLE = /\b(CTO|chief technology officer|chief technical officer|SVP(?: of)? engineering|senior vice president(?: of)? engineering|VP(?: of)? engineering|vice president(?: of)? engineering|head of (?:platform|SRE|site reliability|infrastructure))\b/i;

function parsedDate(value = "", nowInput = new Date()) {
  const now = nowInput instanceof Date ? nowInput : new Date(nowInput);
  const direct = Date.parse(value);
  if (Number.isFinite(direct)) return new Date(direct).toISOString();
  const relative = String(value).match(/(\d+)\s+(hour|day|week|month)s?\s+ago/i);
  if (!relative) return "";
  const units = { hour: 3600000, day: stage3Signals.DAY_MS, week: 7 * stage3Signals.DAY_MS, month: 30 * stage3Signals.DAY_MS };
  return new Date(now.getTime() - Number(relative[1]) * units[relative[2].toLowerCase()]).toISOString();
}

function escaped(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function appointmentBelongsToTarget(target = {}, result = {}) {
  const name = String(target.name || "").trim();
  if (name.length < 3) return false;
  const targetPattern = escaped(name).replace(/\s+/g, "\\s+");
  const action = EXEC_ACTION.source.replace(/^\\b|\\b$/g, "");
  const role = EXEC_ROLE.source.replace(/^\\b|\\b$/g, "");
  const patterns = [
    new RegExp(`\\b${targetPattern}(?:'s)?(?:\\s+[a-z0-9&'-]+[,;:]?){0,5}\\s+${action}[\\s\\S]{0,180}${role}`, "i"),
    new RegExp(`${action}[\\s\\S]{0,180}${role}[\\s\\S]{0,80}\\b(?:at|for|of)\\s+${targetPattern}\\b`, "i"),
    new RegExp(`\\b(?:joins?|joined)\\s+${targetPattern}\\b[\\s\\S]{0,80}\\b(?:as|to become)\\s+${role}`, "i"),
    new RegExp(`${role}[\\s\\S]{0,80}\\b(?:joins?|joined)\\s+${targetPattern}\\b`, "i"),
  ];
  const sentences = [result.title || "", result.snippet || result.text || ""].flatMap((value) => String(value).split(/(?<=[.!?])\s+|\s+[|•]\s+/)).filter(Boolean);
  return sentences.some((sentence) => patterns.some((pattern) => pattern.test(sentence)));
}

function departureBelongsToTarget(target = {}, result = {}) {
  const name = String(target.name || "").trim();
  if (name.length < 3) return false;
  const targetPattern = escaped(name).replace(/\s+/g, "\\s+");
  const action = DEPARTURE_ACTION.source.replace(/^\\b|\\b$/g, "");
  const role = EXEC_ROLE.source.replace(/^\\b|\\b$/g, "");
  const patterns = [
    new RegExp(`\\b${targetPattern}(?:'s)?[\\s\\S]{0,180}${role}[\\s\\S]{0,120}${action}`, "i"),
    new RegExp(`${role}[\\s\\S]{0,120}${action}[\\s\\S]{0,80}\\b(?:at|from|of)\\s+${targetPattern}\\b`, "i"),
    new RegExp(`${action}[\\s\\S]{0,120}${role}[\\s\\S]{0,80}\\b(?:at|from|of)\\s+${targetPattern}\\b`, "i"),
    new RegExp(`\\b(?:leaves?|left|departs?|departed|exits?|exited)\\s+${targetPattern}\\b[\\s\\S]{0,120}\\b(?:as|after serving as)\\s+${role}`, "i"),
  ];
  const sentences = [result.title || "", result.snippet || result.text || ""].flatMap((value) => String(value).split(/(?<=[.!?])\s+|\s+[|•]\s+/)).filter(Boolean);
  return sentences.some((sentence) => patterns.some((pattern) => pattern.test(sentence)));
}

function executiveNewsEvents(target, searchResults = [], now = new Date(), slaConfig = {}) {
  return searchResults.flatMap((result) => {
    const text = `${result.title || ""}. ${result.snippet || result.text || ""}`;
    if (!result.url || !EXEC_ACTION.test(text) || !EXEC_ROLE.test(text) || !evidenceBelongsToTarget(target, result) || !appointmentBelongsToTarget(target, result)) return [];
    const reportedAt = parsedDate(result.date, now);
    if(!reportedAt)return [];
    const occurredAt = reportedAt;
    if (!withinDays(occurredAt, 120, now)) return [];
    return [stage3Signals.decorateTrigger(event({
      type: "exec_change",
      title: result.title || `${target.name} engineering leadership change`,
      evidenceUrl: result.url,
      evidenceText: text.slice(0, 600),
      occurredAt,
      sourceId: result.sourceId || "serper",
      metadata: { role: text.match(EXEC_ROLE)?.[0] || "senior engineering leader", route: "news", eventDateReported: Boolean(reportedAt) },
    }), slaConfig)];
  });
}

function executiveDepartureEvents(target, searchResults = [], now = new Date(), slaConfig = {}) {
  return searchResults.flatMap((result) => {
    const text = `${result.title || ""}. ${result.snippet || result.text || ""}`;
    if (!result.url || !DEPARTURE_ACTION.test(text) || !EXEC_ROLE.test(text) || !evidenceBelongsToTarget(target, result) || !departureBelongsToTarget(target, result)) return [];
    const reportedAt = parsedDate(result.date, now);
    if(!reportedAt)return [];
    const occurredAt = reportedAt;
    if (!withinDays(occurredAt, 120, now)) return [];
    return [stage3Signals.decorateTrigger(event({
      type: "executive_departure",
      title: result.title || `${target.name} engineering leadership departure`,
      evidenceUrl: result.url,
      evidenceText: text.slice(0, 600),
      occurredAt,
      sourceId: result.sourceId || "serper",
      metadata: { role: text.match(EXEC_ROLE)?.[0] || "senior engineering leader", route: "news", action: "departure", eventDateReported: Boolean(reportedAt), followUp: "find_successor" },
    }), slaConfig)];
  });
}

function hostFromUrl(value = "") {
  try {
    return new URL(value).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

const PUBLISHER_HOSTS = [
  "axios.com",
  "bloomberg.com",
  "businessinsider.com",
  "businesswire.com",
  "crunchbase.com",
  "forbes.com",
  "globenewswire.com",
  "linkedin.com",
  "prnewswire.com",
  "reuters.com",
  "sifted.eu",
  "techcrunch.com",
  "venturebeat.com",
];

function isPublisherHost(host = "") {
  return PUBLISHER_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

function hostMatchesCompany(host = "", companyName = "") {
  const compactHost = String(host).split(".")[0].replace(/[^a-z0-9]/g, "");
  const tokens = String(companyName)
    .toLowerCase()
    .replace(/\b(?:incorporated|inc|limited|ltd|llc|corp(?:oration)?|company|co)\b/g, " ")
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3);
  if (!compactHost || !tokens.length) return false;
  const compactCompany = tokens.join("");
  return compactHost.includes(compactCompany)
    || compactCompany.includes(compactHost)
    || tokens.some((token) => compactHost.includes(token));
}

function candidateDomain(result = {}, companyName = "") {
  const explicit = String(result.companyDomain || result.domain || result.metadata?.companyDomain || "")
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("/")[0]
    .toLowerCase();
  if (explicit && explicit.includes(".") && !isPublisherHost(explicit) && hostMatchesCompany(explicit, companyName)) return explicit;
  const host = hostFromUrl(result.companyWebsite || result.website || result.url || "");
  return host && !isPublisherHost(host) && hostMatchesCompany(host, companyName) ? host : "";
}

function cleanCompanyCandidate(value = "") {
  return String(value || "")
    .replace(/\s+(?:as|to become|where|after|from)\s+(?:the\s+)?(?:new\s+)?(?:chief|cto|cio|ceo|coo|cfo|cro|svp|vp|head)\b[\s\S]*$/i, "")
    .replace(/\s+to\s+(?:lead|run|build|oversee|head|manage|join)\b[\s\S]*$/i, "")
    .replace(/\s+[|–—-]\s+.*$/, "")
    .replace(/^(?:at|for|of)\s+/i, "")
    .replace(/[.,;:]+$/, "")
    .trim();
}

function extractNewCompany(person = {}, result = {}) {
  const explicit = cleanCompanyCandidate(result.companyName || result.newCompany || result.metadata?.companyName || "");
  if (explicit) return explicit;
  const name = escaped(person.name || "").replace(/\s+/g, "\\s+");
  if (!name) return "";
  const sources = [result.title || "", result.snippet || result.text || ""].filter(Boolean);
  const patterns = [
    new RegExp(`\\b${name}\\b[\\s\\S]{0,45}\\b(?:joins?|joined|appointed|named|hired)\\b(?:\\s+(?:as|by))?\\s+([A-Z][A-Za-z0-9&.'’ -]{1,90}?)(?=\\s+(?:as|to become|where|after|from)\\b|[.,;:|–—]|$)`, "i"),
    new RegExp(`\\b(?:joins?|joined)\\s+([A-Z][A-Za-z0-9&.'’ -]{1,90}?)(?=\\s+(?:as|to become)\\b|[.,;:|–—]|$)`, "i"),
    new RegExp(`\\b(?:at|for|of)\\s+([A-Z][A-Za-z0-9&.'’ -]{1,90}?)(?=[.,;:|–—]|$)`, "i"),
  ];
  const oldCompany = String(person.lastKnownCompany || "").trim().toLowerCase();
  for (const text of sources) {
    for (const pattern of patterns) {
      const candidate = cleanCompanyCandidate(text.match(pattern)?.[1] || "");
      if (candidate && candidate.toLowerCase() !== oldCompany && !/^(company|startup|organization|business|team)$/i.test(candidate)) return candidate;
    }
  }
  return "";
}

function trackedPersonChangeEvents(trackedPeople = [], searchResults = [], now = new Date(), slaConfig = {}) {
  const events = [];
  const discoveryCandidates = [];
  const activePeople = (trackedPeople || []).filter((person) => person?.watch !== false && String(person.name || "").trim());
  for (const person of activePeople) {
    const personPattern = new RegExp(`\\b${escaped(person.name).replace(/\s+/g, "\\s+")}\\b`, "i");
    const oldCompany = String(person.lastKnownCompany || "").trim();
    const oldPattern = oldCompany ? new RegExp(`\\b${escaped(oldCompany).replace(/\s+/g, "\\s+")}\\b`, "i") : null;
    for (const result of searchResults) {
      const text = `${result.title || ""}. ${result.snippet || result.text || ""}`;
      if (!result.url || !personPattern.test(text) || (!EXEC_ACTION.test(text) && !DEPARTURE_ACTION.test(text))) continue;
      const reportedAt = parsedDate(result.date, now);
      const occurredAt = reportedAt || now.toISOString();
      if (!withinDays(occurredAt, 120, now)) continue;
      const newCompany = EXEC_ACTION.test(text) ? extractNewCompany(person, result) : "";
      const domain = candidateDomain(result, newCompany);
      if (newCompany && (!oldPattern || !oldPattern.test(newCompany))) {
        events.push(stage3Signals.decorateTrigger(event({
          type: "new_account_with_warm_champion",
          title: `${person.name} joined ${newCompany}`,
          evidenceUrl: result.url,
          evidenceText: text.slice(0, 600),
          occurredAt,
          sourceId: result.sourceId || "tracked_people",
          metadata: { personName: person.name, lastKnownCompany: oldCompany, newCompany, newCompanyDomain: domain, relationshipNote: person.relationshipNote || "", relationshipType: "warm_champion" },
        }), slaConfig));
        if (domain) {
          discoveryCandidates.push({
            name: newCompany,
            domain,
            segment: result.segment || person.segment || "data_ai_infrastructure",
            segmentReviewRequired: true,
            provenance: { kind: "tracked_person_change", url: result.url, label: `${person.name} joined ${newCompany}` },
            relationship: { personName: person.name, lastKnownCompany: oldCompany, lastKnownTitle: person.lastKnownTitle || "", relationshipNote: person.relationshipNote || "" },
          });
        }
      }
      if (oldCompany && ((newCompany && newCompany.toLowerCase() !== oldCompany.toLowerCase()) || DEPARTURE_ACTION.test(text))) {
        events.push(stage3Signals.decorateTrigger(event({
          type: "old_account_inherited_pain",
          title: `${oldCompany} successor gap after ${person.name}`,
          evidenceUrl: result.url,
          evidenceText: text.slice(0, 600),
          occurredAt,
          sourceId: result.sourceId || "tracked_people",
          metadata: { personName: person.name, lastKnownCompany: oldCompany, lastKnownTitle: person.lastKnownTitle || "", relationshipNote: person.relationshipNote || "", followUp: "find_successor" },
        }), slaConfig));
      }
    }
  }
  return { events, discoveryCandidates };
}

async function collectExecutiveChange(target, context = {}) {
  const tracked = trackedPersonChangeEvents(context.trackedPeople || [], context.trackedPeopleSearchResults || context.searchResults || [], context.now || new Date(), context.slaConfig || {});
  const events = [
    ...executiveNewsEvents(target, context.searchResults || [], context.now || new Date(), context.slaConfig || {}),
    ...executiveDepartureEvents(target, context.searchResults || [], context.now || new Date(), context.slaConfig || {}),
    ...tracked.events,
  ];
  const deduped = [...new Map(events.map((item) => [item.id, item])).values()];
  return { collectorId: "executive_change", signals: [], events: deduped, killHints: [], targetPatch: {}, discoveryCandidates: tracked.discoveryCandidates, itemsFound: deduped.length + tracked.discoveryCandidates.length };
}

module.exports = { DEPARTURE_ACTION, EXEC_ACTION, EXEC_ROLE, appointmentBelongsToTarget, candidateDomain, cleanCompanyCandidate, collectExecutiveChange, departureBelongsToTarget, executiveDepartureEvents, executiveNewsEvents, extractNewCompany, hostMatchesCompany, parsedDate, trackedPersonChangeEvents };
