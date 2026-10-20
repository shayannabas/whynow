const stage3Signals = require("../collector-triggers.cjs");
const painThemes = require("../pain-themes.cjs");
const { domainForTarget, event, signal, stripHtml, unique, withinDays } = require("./common.cjs");

const RELIABILITY_ROLE = /\b(site reliability|sre|reliability engineer|incident management|incident response|chaos engineer|platform engineer|infrastructure engineer|production engineer|performance engineer|observability engineer)\b/i;
const SENIOR_ROLE = /\b(chief|vp|vice president|head|director|principal|staff|senior|lead|manager)\b/i;
const FIRST_INFRA_ROLE = /\b(founding|first|head of)\b/i;
const INTERNAL_TOOL_MAINTENANCE = /\b(?:maintain|maintaining|operate|operating|support|own|owning|extend|improve|administer)\b[\s\S]{0,160}\b(?:internal|in-house|homegrown)\b[\s\S]{0,160}\b(?:ai|llm|debugg(?:ing)?|investigation|root[- ]cause|incident|triage|observability)\b|\b(?:internal|in-house|homegrown)\b[\s\S]{0,160}\b(?:ai|llm|debugg(?:ing)?|investigation|root[- ]cause|incident|triage|observability)\b[\s\S]{0,160}\b(?:tool|platform|system|workflow)\b/i;
const AI_RCA_HIRING = /\b(?:ai[-\s]?(?:assisted|powered|driven)|llm[-\s]?(?:assisted|powered|driven)|machine[-\s]?learning[-\s]?(?:assisted|powered|driven))\b[\s\S]{0,180}\b(?:root[-\s]?cause(?: analysis)?|rca|incident investigation|production investigation|incident triage|debugg(?:ing)?|remediation)\b|\b(?:build|building|develop|developing|operate|operating|own|owning|maintain|maintaining)\b[\s\S]{0,140}\b(?:ai|llm|machine learning)\b[\s\S]{0,140}\b(?:root[-\s]?cause|rca|incident investigation|production investigation|incident triage|debugg(?:ing)?|remediation)\b/i;
const TOOL_PATTERNS = ["Datadog", "Grafana", "PagerDuty", "OpenTelemetry", "Kubernetes", "Prometheus", "Splunk", "AWS", "GCP", "Azure"];

function slugCandidates(target) {
  const domain = domainForTarget(target).split(".")[0];
  const name = String(target.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  const aliases=[...(target.ats?.slugCandidates||[]),...(target.atsSlugCandidates||[]),...(target.aliases||[])].map(value=>String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,''));
  return unique([target.ats?.slug,...aliases,domain,name]).filter(Boolean).slice(0,6);
}

function providerEndpoints(slug) {
  return [
    { provider: "greenhouse", url: `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs?content=true` },
    { provider: "lever", url: `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json` },
    { provider: "ashby", url: `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(slug)}?includeCompensation=true` },
  ];
}

function normalizeJobs(provider, payload) {
  if (provider === "greenhouse") return (payload.jobs || []).map((job) => ({ id: job.id, title: job.title, text: stripHtml(job.content), url: job.absolute_url, location: job.location?.name, updatedAt: job.updated_at }));
  if (provider === "lever") return (Array.isArray(payload) ? payload : []).map((job) => ({ id: job.id, title: job.text, text: stripHtml(`${job.descriptionPlain || job.description || ""} ${(job.lists || []).map((list) => `${list.text} ${stripHtml(list.content)}`).join(" ")}`), url: job.hostedUrl || job.applyUrl, location: job.categories?.location, updatedAt: job.createdAt ? new Date(job.createdAt).toISOString() : undefined }));
  if (provider === "ashby") return (payload.jobs || []).filter((job) => job.isListed !== false).map((job) => ({ id: job.id || job.jobUrl, title: job.title, text: stripHtml(`${job.descriptionPlain || job.descriptionHtml || ""} ${job.department || ""} ${job.team || ""}`), url: job.jobUrl || job.applyUrl, location: job.location, updatedAt: job.publishedAt }));
  return [];
}

function toolsIn(text = "") {
  return TOOL_PATTERNS.filter((tool) => new RegExp(`\\b${tool.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text));
}

function themedHiringEvent(input = {}, painThemeConfig = {}) {
  const classified = painThemes.classifyPainThemes(input.evidenceText || "", painThemeConfig);
  return event({
    ...input,
    painThemes: classified.letters,
    metadata: { ...(input.metadata || {}), painThemes: classified.letters, painThemeMatches: classified.matches },
  });
}

function jobSignals(target, provider, jobs, now = new Date(), painThemeConfig = {}, slaConfig = {}) {
  const signals = [];
  const events = [];
  const quoteReceipts = [];
  for (const job of jobs) {
    const text = `${job.title || ""} ${job.text || ""}`;
    if (!job.url) continue;
    if (AI_RCA_HIRING.test(text)) {
      const evidenceText = `${job.title}. ${job.location ? `Location: ${job.location}. ` : ""}${String(job.text || "").slice(0, 420)}`;
      const aiRcaEvent = themedHiringEvent({
        type: "ai_rca_hiring",
        title: job.title || `${target.name} AI-assisted RCA role`,
        evidenceUrl: job.url,
        evidenceText,
        occurredAt: job.updatedAt || now.toISOString(),
        sourceId: provider,
        strength: 3,
        metadata: {
          provider,
          jobId: job.id,
          jobTitle: job.title,
          hiringForWhatWeSell: true,
          reason: "ai_assisted_production_investigation_hiring",
        },
      }, painThemeConfig);
      events.push(stage3Signals.decorateTrigger(aiRcaEvent, slaConfig));
      quoteReceipts.push({ kind: "ai_rca_hiring", text: job.text || evidenceText, sourceUrl: job.url, jobTitle: job.title, postingDate: job.updatedAt || now.toISOString() });
      signals.push(signal({
        key: "observabilityScale",
        score: 5,
        evidenceUrl: job.url,
        evidenceText,
        observedAt: job.updatedAt || now.toISOString(),
        sourceId: provider,
        metadata: { jobId: job.id, hiringForWhatWeSell: true },
      }));
    }
    if (INTERNAL_TOOL_MAINTENANCE.test(text)) {
      const evidenceText = `${job.title}. ${job.location ? `Location: ${job.location}. ` : ""}${String(job.text || "").slice(0, 420)}`;
      events.push(themedHiringEvent({
        type: "internal_tool_maintenance",
        title: job.title || `${target.name} internal tool maintenance role`,
        evidenceUrl: job.url,
        evidenceText,
        occurredAt: job.updatedAt || now.toISOString(),
        sourceId: provider,
        metadata: { provider, jobId: job.id, jobTitle: job.title, buildWatchEvidence: true, reason: "maintenance_hiring_req" },
      }, painThemeConfig));
      quoteReceipts.push({ kind: "internal_tool_maintenance", text: job.text || evidenceText, sourceUrl: job.url, jobTitle: job.title, postingDate: job.updatedAt || now.toISOString() });
    }
    if (!RELIABILITY_ROLE.test(job.title || "")) continue;
    const tools = toolsIn(text);
    const senior = SENIOR_ROLE.test(job.title || "");
    const evidenceText = `${job.title}. ${job.location ? `Location: ${job.location}. ` : ""}${tools.length ? `Named stack: ${tools.join(", ")}. ` : ""}${String(job.text || "").slice(0, 360)}`;
    events.push(themedHiringEvent({ type: "reliability_hiring", title: job.title, evidenceUrl: job.url, evidenceText, occurredAt: job.updatedAt || now.toISOString(), sourceId: provider, metadata: { provider, jobId: job.id, jobTitle: job.title, senior, tools } }, painThemeConfig));
    quoteReceipts.push({ kind: "reliability_hiring", text: job.text || evidenceText, sourceUrl: job.url, jobTitle: job.title, postingDate: job.updatedAt || now.toISOString() });
    signals.push(signal({ key: "observabilityScale", score: senior ? 5 : 4, evidenceUrl: job.url, evidenceText, observedAt: job.updatedAt || now.toISOString(), sourceId: provider, metadata: { jobId: job.id, senior, tools } }));
    if (tools.length) signals.push(signal({ key: "techStack", score: Math.min(5, 2 + tools.length), evidenceUrl: job.url, evidenceText: `Job posting names ${tools.join(", ")}.`, observedAt: job.updatedAt || now.toISOString(), sourceId: provider, metadata: { jobId: job.id, tools } }));
  }
  return { signals, events, quotebook: painThemes.quotebookFromReceipts(quoteReceipts, painThemeConfig) };
}

function matchingInfraJobs(jobs = []) {
  return jobs.filter((job) => RELIABILITY_ROLE.test(job.title || "") && /^https?:\/\//i.test(String(job.url || "")));
}

function hiringSnapshot(provider, jobs = [], now = new Date()) {
  const matching = matchingInfraJobs(jobs);
  return {
    asOf: now.toISOString(),
    provider,
    openReqCount: jobs.length,
    matchingReqCount: matching.length,
    matchingJobIds: matching.map((job) => String(job.id || job.url)),
    firstInfraJobIds: matching.filter((job) => FIRST_INFRA_ROLE.test(job.title || "")).map((job) => String(job.id || job.url)),
    sourceUrls: matching.map((job) => job.url),
  };
}

function mergeHiringHistory(history = [], snapshot) {
  const rows = [...history].filter((row) => row?.asOf && Number.isFinite(Date.parse(row.asOf)));
  const dayKey = `${snapshot.provider}:${snapshot.asOf.slice(0, 10)}`;
  const byDay = new Map(rows.map((row) => [`${row.provider}:${String(row.asOf).slice(0, 10)}`, row]));
  byDay.set(dayKey, snapshot);
  return [...byDay.values()].sort((left, right) => Date.parse(left.asOf) - Date.parse(right.asOf)).slice(-104);
}

function atsVelocityEvents(target, provider, jobs = [], now = new Date(), slaConfig = {}) {
  const matching = matchingInfraJobs(jobs);
  const history = target.hiringHistory || [];
  const previouslySeen = new Set(history.flatMap((snapshot) => snapshot.matchingJobIds || []).map(String));
  const recentNew = matching.filter((job) => !previouslySeen.has(String(job.id || job.url)) && job.updatedAt && withinDays(job.updatedAt, 30, now));
  const events = [];
  if (recentNew.length >= 3) {
    const newest = [...recentNew].sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))[0];
    events.push(stage3Signals.decorateTrigger(event({
      type: "hiring_surge",
      title: `${target.name} added ${recentNew.length} reliability/platform roles`,
      evidenceUrl: newest.url,
      evidenceText: `${target.name} has ${recentNew.length} newly observed SRE, platform, reliability, incident, performance, or observability openings inside 30 days.`,
      occurredAt: newest.updatedAt,
      sourceId: provider,
      metadata: { provider, newReqCount: recentNew.length, jobIds: recentNew.map((job) => job.id), evidenceUrls: recentNew.map((job) => job.url) },
    }), slaConfig));
  }
  const explicitFirst = matching.filter((job) => /\b(founding|first)\b/i.test(job.title || "") && job.updatedAt && withinDays(job.updatedAt, 30, now));
  const newlyObservedHead = history.length ? matching.filter((job) => /\bhead of\b/i.test(job.title || "") && !previouslySeen.has(String(job.id || job.url)) && job.updatedAt && withinDays(job.updatedAt, 30, now)) : [];
  const firstJob = [...explicitFirst, ...newlyObservedHead].sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))[0];
  if (firstJob) {
    events.push(stage3Signals.decorateTrigger(event({
      type: "first_infra_hire",
      title: `${target.name}: ${firstJob.title}`,
      evidenceUrl: firstJob.url,
      evidenceText: `${firstJob.title} is an explicitly founding/first infrastructure role or a newly observed Head of infrastructure role on ${provider}.`,
      occurredAt: firstJob.updatedAt,
      sourceId: provider,
      metadata: { provider, jobId: firstJob.id, title: firstJob.title },
    }), slaConfig));
  }
  return events;
}

async function discoverAts(target, runtime) {
  const configured = target.ats?.provider && target.ats?.slug
    ? [{ provider: target.ats.provider, url: providerEndpoints(target.ats.slug).find((candidate) => candidate.provider === target.ats.provider)?.url, slug: target.ats.slug }]
    : slugCandidates(target).flatMap((slug) => providerEndpoints(slug).map((candidate) => ({ ...candidate, slug })));
  for (const candidate of configured) {
    if (!candidate.url) continue;
    try {
      const { value } = await runtime.requestJson(candidate.url, candidate.provider);
      const jobs = normalizeJobs(candidate.provider, value);
      if (jobs.length || target.ats?.provider === candidate.provider) return { ...candidate, jobs };
    } catch {
      // Probe the next public ATS endpoint; failures remain visible in source usage.
    }
  }
  return undefined;
}

async function collectHiring(target, context) {
  const match = await discoverAts(target, context.runtime);
  if (!match) return { collectorId: "hiring", signals: [], events: [], targetPatch: {}, itemsFound: 0 };
  const output = jobSignals(target, match.provider, match.jobs, context.now || new Date(), context.painThemeConfig || {}, context.slaConfig || {});
  const now = context.now || new Date();
  const velocityEvents = atsVelocityEvents(target, match.provider, match.jobs, now, context.slaConfig || {});
  const snapshot = hiringSnapshot(match.provider, match.jobs, now);
  const events = [...new Map([...output.events, ...velocityEvents].map((item) => [item.id, item])).values()];
  return { collectorId: "hiring", signals: output.signals, events, targetPatch: { ats: { provider: match.provider, slug: match.slug, endpoint: match.url }, hiringHistory: mergeHiringHistory(target.hiringHistory || [], snapshot), quotebook: painThemes.mergeQuotebook(target.quotebook || [], output.quotebook || []) }, itemsFound: events.length };
}

module.exports = { AI_RCA_HIRING, FIRST_INFRA_ROLE, INTERNAL_TOOL_MAINTENANCE, RELIABILITY_ROLE, atsVelocityEvents, collectHiring, discoverAts, hiringSnapshot, jobSignals, matchingInfraJobs, mergeHiringHistory, normalizeJobs, providerEndpoints, slugCandidates, toolsIn };
