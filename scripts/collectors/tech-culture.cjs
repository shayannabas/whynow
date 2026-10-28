const stage3Signals = require("../collector-triggers.cjs");
const { event, signal, stripHtml, unique } = require("./common.cjs");

const STACK_TERMS = ["Kubernetes", "microservices", "multi-cloud", "AWS", "GCP", "Azure", "Datadog", "Grafana", "PagerDuty", "OpenTelemetry", "Prometheus", "Splunk"];
const OBSERVABILITY_TERMS = ["observability", "site reliability", "SRE", "incident response", "on-call", "tracing", "metrics", "logging", "root cause", "Jaeger", "Grafana", "Datadog", "PagerDuty", "OpenTelemetry", "Prometheus", "Splunk"];
const BUILD_CULTURE = /\b(invented|open[- ]sourced?|built|developed)\b[\s\S]{0,100}\b(jaeger|m3|observability|monitoring|tracing|incident|debugging)\b/i;
const IN_HOUSE = /\b(internal|in-house|homegrown)\b[\s\S]{0,80}\b(ai |production )?(debugging|incident|root[- ]cause|observability)\b|reinventing operational observability[\s\S]{0,180}root[- ]cause/i;
const OTEL_ADOPTION = /\b(?:migrated|migrating|migration)\s+(?:[a-z0-9'’-]+\s+){0,5}to\s+OpenTelemetry\b|\b(?:adopting|adopted)\s+OpenTelemetry\b/i;

function termsIn(text, terms) {
  return terms.filter((term) => new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text));
}

function documentsFromFeed(body, fallbackUrl) {
  const blocks = [...String(body).matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)].map((match) => match[0]);
  if (!blocks.length) return [{ title: "Engineering source", text: stripHtml(body), url: fallbackUrl }];
  return blocks.slice(0, 40).map((block) => {
    const title = stripHtml(block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "Engineering post");
    const text = stripHtml(block.match(/<(content|description|summary)[^>]*>([\s\S]*?)<\/\1>/i)?.[2] || block);
    const href = block.match(/<link[^>]+href=["']([^"']+)/i)?.[1] || stripHtml(block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] || "") || fallbackUrl;
    const observedAt = stripHtml(block.match(/<(published|updated|pubDate)[^>]*>([\s\S]*?)<\/\1>/i)?.[2] || "");
    return { title, text, url: href, observedAt };
  });
}

function analyzeDocuments(documents = [], now = new Date(), slaConfig = {}) {
  const signals = [];
  const events = [];
  const killHints = [];
  for (const document of documents) {
    const text = `${document.title || ""} ${document.text || ""}`;
    const stack = termsIn(text, STACK_TERMS);
    const observability = termsIn(text, OBSERVABILITY_TERMS);
    if (stack.length && document.url) signals.push(signal({ key: "techStack", score: Math.min(5, 2 + stack.length), evidenceUrl: document.url, evidenceText: `${document.title}. Production stack evidence: ${unique(stack).join(", ")}.`, observedAt: document.observedAt, sourceId: document.sourceId || "engineering_web", metadata: { terms: unique(stack) } }));
    if (observability.length && document.url) signals.push(signal({ key: "observabilityScale", score: Math.min(5, 2 + observability.length), evidenceUrl: document.url, evidenceText: `${document.title}. Reliability practice evidence: ${unique(observability).join(", ")}.`, observedAt: document.observedAt, sourceId: document.sourceId || "engineering_web", metadata: { terms: unique(observability) } }));
    if (OTEL_ADOPTION.test(text) && document.url) {
      const occurredAt = Number.isFinite(Date.parse(document.observedAt || "")) ? new Date(document.observedAt).toISOString() : now.toISOString();
      events.push(stage3Signals.decorateTrigger(event({ type: "otel_adoption", title: `${document.title || "Engineering team"} OpenTelemetry adoption`, evidenceUrl: document.url, evidenceText: `${document.title}. The public engineering source says the team migrated to or is adopting OpenTelemetry.`, occurredAt, sourceId: document.sourceId || "engineering_web", metadata: { phrase: String(text.match(OTEL_ADOPTION)?.[0] || "OpenTelemetry adoption") } }), slaConfig));
    }
    if (BUILD_CULTURE.test(text) && document.url) killHints.push({ code: "KILL_BUILD_CULTURE", evidenceUrl: document.url, evidenceText: `${document.title}. ${String(document.text || "").slice(0, 500)}`, sourceId: document.sourceId || "engineering_web" });
    if (IN_HOUSE.test(text) && document.url) killHints.push({ code: "KILL_SOLVING_IN_HOUSE", evidenceUrl: document.url, evidenceText: `${document.title}. ${String(document.text || "").slice(0, 500)}`, sourceId: document.sourceId || "engineering_web" });
  }
  return { signals, events: [...new Map(events.map((item) => [item.id, item])).values()], killHints };
}

async function collectTechCulture(target, context) {
  const documents = (context.searchResults || []).map((result) => ({ title: result.title, text: result.snippet || result.text, url: result.url || result.link, observedAt: result.date || result.publishedAt, sourceId: result.sourceId || "public_search" }));
  for (const source of target.engineeringSources || []) {
    const url = typeof source === "string" ? source : source.url;
    if (!url) continue;
    try {
      const { value } = await context.runtime.requestPublicText(url, "engineering_web");
      documents.push(...documentsFromFeed(value, url).map((document) => ({ ...document, sourceId: "engineering_web" })));
    } catch {
      // A blocked or failed source remains absent rather than being fabricated.
    }
  }
  const output = analyzeDocuments(documents, context.now || new Date(), context.slaConfig || {});
  output.killHints=output.killHints.filter(row=>require('../kill-evidence.cjs').internalToolEvidence(target,row));
  return { collectorId: "tech_culture", ...output, targetPatch: {}, itemsFound: output.signals.length + output.events.length + output.killHints.length };
}

module.exports = { BUILD_CULTURE, IN_HOUSE, OTEL_ADOPTION, analyzeDocuments, collectTechCulture, documentsFromFeed, termsIn };
