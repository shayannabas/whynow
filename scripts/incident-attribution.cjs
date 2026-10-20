const INCIDENT_ATTRIBUTION_VERSION = "incident-attribution-v1";

const INCIDENT_TYPES = /(?:incident|outage|downtime|degrad|active[_ ]?pain|production[_ ]?reliability|public[_ ]?postmortem)/i;
const PHYSICAL_INFRA = /\b(?:(?:subsea|undersea)\s+)?(?:fibre|fiber|network|internet)\s+(?:cable\s+)?(?:cut|severed|damaged?|break)|\b(?:subsea|undersea)\s+(?:fibre|fiber)\s+cable\b[\s\S]{0,40}\b(?:cut|severed|damaged?|break)\b|\b(?:cut|severed|damaged)\s+(?:a\s+)?(?:(?:subsea|undersea)\s+)?(?:fibre|fiber|network|internet)\s+cable\b|\bphysical infrastructure failure\b/i;
const UPSTREAM_PROVIDER = /\b(?:aws|amazon web services|gcp|google cloud(?: platform)?|microsoft azure|azure|cloudflare)\b[\s\S]{0,80}\b(?:outage|incident|failure|degrad|unavailable|disruption)\b|\b(?:outage|incident|failure|degrad|unavailable|disruption)\b[\s\S]{0,80}\b(?:aws|amazon web services|gcp|google cloud(?: platform)?|microsoft azure|azure|cloudflare)\b|\b(?:isp|internet service provider|cdn provider|upstream provider)\b[\s\S]{0,80}\b(?:outage|failure|incident|disruption)\b/i;
const INTERNAL_CAUSE = /\b(?:our|internal)\s+(?:service|system|platform|database|deployment|configuration|code|api|infrastructure)\b|\b(?:bug|bad deploy|deployment|configuration change|database issue|software defect|capacity issue|service regression)\b[\s\S]{0,80}\b(?:caused|triggered|resulted|led to|root cause)\b|\broot cause\b[\s\S]{0,120}\b(?:our|internal|deployment|configuration|database|service|code)\b/i;

function triggerKind(item = {}) {
  return String(item.triggerType || item.type || item.kind || item.key || "");
}

function isIncidentReceipt(item = {}) {
  return INCIDENT_TYPES.test(triggerKind(item));
}

function evidenceText(item = {}) {
  return [item.title, item.evidenceText, item.text, item.description, item.metadata?.cause, item.metadata?.rootCause].filter(Boolean).join(" ");
}

function classifyIncidentAttribution(item = {}, options = {}) {
  const override = String(item.attributionOverride || item.metadata?.attributionOverride || "");
  if (override === "internal") return { attribution: "internal", citable: true, reason: "Operator verified this public receipt as an internal incident." };
  const text = evidenceText(item);
  if (PHYSICAL_INFRA.test(text)) return { attribution: "physical_infra", citable: false, reason: "The public receipt attributes the event to physical network infrastructure." };
  if (UPSTREAM_PROVIDER.test(text)) return { attribution: "upstream_provider", citable: false, reason: "The public receipt attributes the event to an upstream cloud, ISP, or CDN provider." };
  const sourceKind = String(options.sourceKind || item.sourceId || item.sourceName || item.metadata?.provider || "").toLowerCase();
  const companyOwned = options.companyOwned === true || item.metadata?.companyOwned === true;
  if (INTERNAL_CAUSE.test(text) || (sourceKind === "statuspage" && companyOwned !== false) || (companyOwned && /\b(?:incident|outage|degraded|unavailable|errors?)\b/i.test(text))) {
    return { attribution: "internal", citable: true, reason: "The company-owned public receipt describes an internal production event." };
  }
  return { attribution: "unknown", citable: false, reason: "The public receipt does not yet establish whether the incident was internal." };
}

function confidenceForAttribution(attribution = "unknown") {
  return ({ internal: 0.9, upstream_provider: 0.55, physical_infra: 0.5, unknown: 0.6 })[attribution] || 0.6;
}

function decorateIncidentReceipt(item = {}, options = {}) {
  if (!isIncidentReceipt(item)) return item;
  const result = classifyIncidentAttribution(item, options);
  return {
    ...item,
    attribution: result.attribution,
    citable: result.citable,
    citationStatus: result.citable ? "citable" : "not_citable",
    notCitableReason: result.citable ? "" : result.reason,
    metadata: {
      ...(item.metadata || {}),
      attribution: result.attribution,
      citable: result.citable,
      citationStatus: result.citable ? "citable" : "not_citable",
      notCitableReason: result.citable ? "" : result.reason,
      attributionVersion: INCIDENT_ATTRIBUTION_VERSION,
    },
  };
}

function incidentAttribution(item = {}) {
  if (!isIncidentReceipt(item)) return "not_incident";
  return String(item.attribution || item.metadata?.attribution || classifyIncidentAttribution(item).attribution);
}

function isCitableIncident(item = {}) {
  return !isIncidentReceipt(item) || incidentAttribution(item) === "internal";
}

function markVerifiedInternal(item = {}, verification = {}) {
  if (!isIncidentReceipt(item)) return item;
  return decorateIncidentReceipt({
    ...item,
    attributionOverride: "internal",
    metadata: {
      ...(item.metadata || {}),
      attributionOverride: "internal",
      attributionVerifiedAt: verification.at || new Date().toISOString(),
      attributionVerifiedBy: String(verification.actor || "operator").slice(0, 120),
    },
  });
}

module.exports = {
  INCIDENT_ATTRIBUTION_VERSION,
  INCIDENT_TYPES,
  classifyIncidentAttribution,
  confidenceForAttribution,
  decorateIncidentReceipt,
  incidentAttribution,
  isCitableIncident,
  isIncidentReceipt,
  markVerifiedInternal,
};
