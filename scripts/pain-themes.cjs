const crypto = require("node:crypto");

const PAIN_THEME_VERSION = "resolve-pain-themes-v1";
const MAX_QUOTE_LENGTH = 200;
const INCIDENT_QUOTE_KIND = /(?:incident|outage|downtime|degrad|active[_ ]?pain|production[_ ]?reliability|public[_ ]?postmortem)/i;
const NON_CITABLE_ATTRIBUTIONS = new Set(["upstream_provider", "physical_infra", "unknown"]);

const PAIN_THEMES = Object.freeze({
  A: Object.freeze({
    key: "investigation_too_long",
    label: "Investigation takes too long",
    vocabulary: Object.freeze([
      "incident investigation",
      "root-cause analysis",
      "root cause analysis",
      "observability gaps",
      "critical incident response",
      "time to root cause",
      "time-to-root-cause",
    ]),
  }),
  B: Object.freeze({
    key: "repeat_incidents",
    label: "Repeat incidents",
    vocabulary: Object.freeze([
      "recurring incidents",
      "repeat incidents",
      "repeated incidents",
      "fault reoccurrence",
      "fault recurrence",
      "preventive measures",
      "systemic improvements over local fixes",
      "systemic improvement",
      "prevent recurrence",
      "prevent reoccurrence",
    ]),
  }),
  C: Object.freeze({
    key: "operational_toil",
    label: "Operational toil",
    vocabulary: Object.freeze([
      "operational toil",
      "repetitive operational",
      "on-call rotations",
      "on call rotations",
      "automate toil",
      "reduce toil",
      "on-call load",
      "on call load",
    ]),
  }),
  D: Object.freeze({
    key: "alert_quality",
    label: "Alert quality",
    vocabulary: Object.freeze([
      "alert fatigue",
      "signal-to-noise",
      "signal to noise",
      "alert correlation",
      "noise reduction",
      "actionable alerts",
      "alert context",
    ]),
  }),
});

const THEME_LETTERS = Object.freeze(Object.keys(PAIN_THEMES));
const USABILITY_VALUES = new Set(["usable", "needs_verification", "do_not_use"]);

function cleanList(value, fallback = [], limit = 40) {
  const rows = Array.isArray(value) ? value : fallback;
  const normalized = rows.map((item) => String(item || "").trim().toLowerCase()).filter(Boolean).slice(0, limit);
  return normalized.length ? [...new Set(normalized)] : [...fallback];
}

function normalizePainThemeConfig(input = {}) {
  return Object.fromEntries(THEME_LETTERS.map((letter) => {
    const defaults = PAIN_THEMES[letter];
    const candidate = input?.[letter] || input?.[defaults.key] || {};
    return [letter, {
      key: defaults.key,
      label: String(candidate.label || defaults.label).trim().slice(0, 100) || defaults.label,
      enabled: candidate.enabled !== false,
      vocabulary: cleanList(candidate.vocabulary, defaults.vocabulary),
    }];
  }));
}

function normalizeForMatch(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/[’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function classifyPainThemes(value = "", configInput = {}) {
  const text = normalizeForMatch(value);
  const config = normalizePainThemeConfig(configInput);
  const matches = [];
  for (const letter of THEME_LETTERS) {
    const theme = config[letter];
    if (!theme.enabled) continue;
    const phrases = theme.vocabulary.filter((phrase) => text.includes(normalizeForMatch(phrase)));
    if (phrases.length) matches.push({ letter, key: theme.key, label: theme.label, phrases });
  }
  return {
    letters: matches.map((match) => match.letter),
    keys: matches.map((match) => match.key),
    matches,
  };
}

function wordBoundaryEnd(value, maximum) {
  if (value.length <= maximum) return value.length;
  const slice = value.slice(0, maximum + 1);
  const boundary = Math.max(slice.lastIndexOf(" "), slice.lastIndexOf("\n"), slice.lastIndexOf("\t"));
  return Math.max(0, boundary);
}

function verbatimQuote(value = "", maximum = MAX_QUOTE_LENGTH) {
  const source = String(value || "").trim();
  if (source.length <= maximum) return source;
  const end = wordBoundaryEnd(source, maximum);
  return source.slice(0, end).trimEnd();
}

function verbatimQuoteAroundMatch(value = "", phrases = [], maximum = MAX_QUOTE_LENGTH) {
  const source = String(value || "").trim();
  if (!source) return "";
  const lower = source.toLowerCase();
  const phrase = phrases.find((candidate) => lower.includes(String(candidate || "").toLowerCase()));
  if (!phrase) return verbatimQuote(source, maximum);
  const matchStart = lower.indexOf(String(phrase).toLowerCase());
  const matchEnd = matchStart + String(phrase).length;
  const tokens = [...source.matchAll(/\S+/g)].map((match) => ({ start: match.index, end: match.index + match[0].length }));
  let left = tokens.findIndex((token) => token.end > matchStart);
  let right = tokens.findLastIndex((token) => token.start < matchEnd);
  if (left < 0 || right < left || tokens[right].end - tokens[left].start > maximum) return "";
  while (left > 0 || right < tokens.length - 1) {
    const canAddLeft = left > 0 && tokens[right].end - tokens[left - 1].start <= maximum;
    const canAddRight = right < tokens.length - 1 && tokens[right + 1].end - tokens[left].start <= maximum;
    if (!canAddLeft && !canAddRight) break;
    const leftRoom = matchStart - tokens[left].start;
    const rightRoom = tokens[right].end - matchEnd;
    if (canAddLeft && (!canAddRight || leftRoom <= rightRoom)) left -= 1;
    else right += 1;
  }
  return source.slice(tokens[left].start, tokens[right].end);
}

function quoteId(input = {}) {
  const key = [input.sourceUrl, input.jobTitle, input.postingDate, input.quote].map((value) => String(value || "")).join(":" );
  return `quote_${crypto.createHash("sha1").update(key).digest("hex").slice(0, 16)}`;
}

function normalizeUsability(value = "", fallback = "needs_verification") {
  return USABILITY_VALUES.has(value) ? value : fallback;
}

function quoteFromReceipt(receipt = {}, configInput = {}) {
  const sourceText = String(receipt.text || receipt.evidenceText || receipt.description || receipt.title || "").trim();
  const themes = classifyPainThemes(sourceText, configInput);
  if (!sourceText || !themes.letters.length) return null;
  const sourceUrl = String(receipt.sourceUrl || receipt.evidenceUrl || receipt.url || "").trim();
  const quote = verbatimQuoteAroundMatch(sourceText, themes.matches.flatMap((match) => match.phrases));
  if (!quote) return null;
  const sourceBacked = /^https?:\/\//i.test(sourceUrl);
  const attribution = String(receipt.attribution || receipt.metadata?.attribution || "").trim().toLowerCase();
  const incidentLike = INCIDENT_QUOTE_KIND.test(String(receipt.kind || receipt.triggerType || receipt.type || ""));
  const citable = receipt.citable !== false
    && receipt.metadata?.citable !== false
    && receipt.citationStatus !== "not_citable"
    && !NON_CITABLE_ATTRIBUTIONS.has(attribution)
    && (!incidentLike || attribution === "internal");
  const citationStatus = citable ? "citable" : "not_citable";
  const fallbackUsability = !citable
    ? attribution === "unknown" || !attribution ? "needs_verification" : "do_not_use"
    : sourceBacked ? "usable" : "needs_verification";
  const requestedUsability = normalizeUsability(receipt.usability, fallbackUsability);
  const usability = !citable && requestedUsability === "usable" ? fallbackUsability : requestedUsability;
  const reason = String(receipt.notCitableReason || receipt.metadata?.notCitableReason || receipt.usabilityReason || receipt.reason || (!citable
    ? "Incident attribution is not verified internal, so this quote is not citable."
    : sourceBacked ? "Public receipt contains exact theme language." : "A public source URL must be verified before this quote can be used.")).trim().slice(0, 300);
  const entry = {
    quote,
    sourceUrl,
    jobTitle: String(receipt.jobTitle || receipt.metadata?.jobTitle || receipt.title || "").trim().slice(0, 180),
    postingDate: String(receipt.postingDate || receipt.observedAt || receipt.occurredAt || receipt.detectedAt || "").trim(),
    themes: themes.letters,
    themeKeys: themes.keys,
    usability,
    reason,
    sourceKind: String(receipt.kind || receipt.triggerType || receipt.type || "public_receipt"),
    attribution,
    citable,
    citationStatus,
    autoMined: receipt.autoMined !== false,
  };
  return { id: receipt.quoteId || quoteId(entry), ...entry };
}

function normalizeQuoteEntry(entry = {}) {
  const quote = verbatimQuote(entry.quote || entry.text || "");
  const sourceUrl = String(entry.sourceUrl || entry.url || "").trim();
  const themes = [...new Set((entry.themes || []).map((letter) => String(letter || "").toUpperCase()).filter((letter) => THEME_LETTERS.includes(letter)))];
  if (!quote || !themes.length) return null;
  const sourceKind = String(entry.sourceKind || entry.kind || entry.triggerType || "public_receipt");
  const attribution = String(entry.attribution || entry.metadata?.attribution || "").trim().toLowerCase();
  const incidentLike = INCIDENT_QUOTE_KIND.test(sourceKind);
  const citable = entry.citable !== false
    && entry.metadata?.citable !== false
    && entry.citationStatus !== "not_citable"
    && !NON_CITABLE_ATTRIBUTIONS.has(attribution)
    && (!incidentLike || attribution === "internal");
  const requestedUsability = normalizeUsability(entry.usability, /^https?:\/\//i.test(sourceUrl) ? "usable" : "needs_verification");
  const usability = !citable && requestedUsability === "usable"
    ? attribution === "unknown" || !attribution ? "needs_verification" : "do_not_use"
    : requestedUsability;
  const normalized = {
    ...entry,
    quote,
    sourceUrl,
    jobTitle: String(entry.jobTitle || "").trim().slice(0, 180),
    postingDate: String(entry.postingDate || "").trim(),
    themes,
    themeKeys: themes.map((letter) => PAIN_THEMES[letter].key),
    usability,
    reason: String(entry.reason || (!citable ? "Incident attribution is not verified internal, so this quote is not citable." : "")).trim().slice(0, 300),
    sourceKind,
    attribution,
    citable,
    citationStatus: citable ? "citable" : "not_citable",
    autoMined: entry.autoMined !== false,
  };
  return { id: entry.id || quoteId(normalized), ...normalized };
}

function mergeQuotebook(existing = [], incoming = []) {
  const byId = new Map();
  for (const raw of existing || []) {
    const entry = normalizeQuoteEntry(raw);
    if (entry) byId.set(entry.id, entry);
  }
  for (const raw of incoming || []) {
    const entry = normalizeQuoteEntry(raw);
    if (!entry) continue;
    const current = byId.get(entry.id);
    byId.set(entry.id, current ? { ...entry, ...current, id: entry.id } : entry);
  }
  return [...byId.values()].sort((left, right) => {
    const usabilityRank = { usable: 0, needs_verification: 1, do_not_use: 2 };
    return (usabilityRank[left.usability] ?? 3) - (usabilityRank[right.usability] ?? 3)
      || Date.parse(right.postingDate || 0) - Date.parse(left.postingDate || 0)
      || left.id.localeCompare(right.id);
  });
}

function quotebookFromReceipts(receipts = [], configInput = {}) {
  return mergeQuotebook([], receipts.map((receipt) => quoteFromReceipt(receipt, configInput)).filter(Boolean));
}

function usableQuotesForContext(account = {}, limit = 4) {
  return mergeQuotebook(account.quotebook || [], [])
    .filter((entry) => entry.usability === "usable" && entry.citable !== false && entry.citationStatus !== "not_citable" && /^https?:\/\//i.test(entry.sourceUrl))
    .slice(0, Math.max(0, Math.min(10, Number(limit) || 4)))
    .map((entry) => ({
      id: entry.id,
      quote: entry.quote,
      sourceUrl: entry.sourceUrl,
      jobTitle: entry.jobTitle,
      postingDate: entry.postingDate,
      themes: entry.themes,
      themeKeys: entry.themeKeys,
      attribution: entry.attribution,
      citationStatus: entry.citationStatus,
    }));
}

function preferredTheme(account = {}) {
  const quote = usableQuotesForContext(account, 1)[0];
  const letter = quote?.themes?.[0] || "";
  return letter ? { letter, ...PAIN_THEMES[letter], quoteId: quote.id } : null;
}

module.exports = {
  MAX_QUOTE_LENGTH,
  PAIN_THEMES,
  PAIN_THEME_VERSION,
  THEME_LETTERS,
  classifyPainThemes,
  mergeQuotebook,
  normalizePainThemeConfig,
  normalizeQuoteEntry,
  preferredTheme,
  quoteFromReceipt,
  quotebookFromReceipts,
  usableQuotesForContext,
  verbatimQuote,
  verbatimQuoteAroundMatch,
};
