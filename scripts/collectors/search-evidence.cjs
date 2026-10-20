const { evidenceBelongsToTarget } = require("./common.cjs");

function serperQueries(target) {
  const name = String(target.name || "").replace(/["\n\r]/g, " ").trim();
  if (!name) return [];
  return [
    { kind: "active_pain", query: `"${name}" outage OR incident OR downtime` },
    { kind: "tech_culture", query: `"${name}" Kubernetes OR microservices OR observability SRE` },
    { kind: "ai_compatibility", query: `"${name}" LLM OR Copilot OR Cursor engineering` },
    { kind: "exec_change", query: `"${name}" (appoints OR joins OR hires OR names OR leaves OR departs OR resigns OR "steps down") ("VP Engineering" OR CTO OR SVP OR "Head of Platform" OR "Head of SRE")` },
  ];
}

// The live adapter stays within five queries per account: one dated news query,
// one combined engineering/AI query, leadership, and two firmographic passes.
// The frozen SignalScout query plan above remains unchanged for parity tests.
function phaseBQueryPlan(target){
  const name=String(target.name||'').replace(/["\n\r]/g,' ').trim();
  if(!name)return [];
  return [
    {kind:'active_pain_news',query:`"${name}" outage OR incident OR downtime OR degraded`},
    {kind:'tech_and_ai',query:`"${name}" Kubernetes OR microservices OR observability OR SRE OR LLM OR Copilot OR Cursor engineering`},
    {kind:'exec_change',query:`"${name}" (appoints OR joins OR hires OR names OR leaves OR departs OR resigns OR "steps down") ("VP Engineering" OR CTO OR SVP OR "Head of Platform" OR "Head of SRE")`},
    {kind:'firmographics_size',query:`"${name}" employees revenue public company`},
    {kind:'firmographics_funding',query:`"${name}" raised funding valuation founded headquartered`},
  ];
}

function trackedPersonQueries(trackedPeople = []) {
  return (trackedPeople || [])
    .filter((person) => person?.watch !== false && String(person.name || "").trim())
    .slice(0, 25)
    .map((person) => ({
      person,
      query: `"${String(person.name).replace(/["\n\r]/g, " ").trim()}" (joins OR joined OR appointed OR named OR hired OR leaves OR left OR departs OR resigned) company`,
    }));
}

async function collectTrackedPeopleEvidence(trackedPeople = [], context = {}) {
  if (!context.serperApiKey) return [];
  const results = [];
  for (const descriptor of trackedPersonQueries(trackedPeople)) {
    const { value } = await context.runtime.requestJsonPost("https://google.serper.dev/search", "serper", {
      q: descriptor.query,
      gl: "us",
      hl: "en",
      num: 10,
      tbs: "qdr:m",
    }, { headers: { "X-API-KEY": context.serperApiKey } });
    for (const item of value.organic || []) {
      if (!item.link) continue;
      const text = `${item.title || ""} ${item.snippet || ""}`;
      if (!text.toLowerCase().includes(String(descriptor.person.name).toLowerCase())) continue;
      results.push({ kind: "tracked_person_change", title: item.title, snippet: item.snippet, url: item.link, date: item.date, sourceId: "serper", trackedPersonId: descriptor.person.id || "", trackedPersonName: descriptor.person.name });
    }
  }
  return [...new Map(results.map((item) => [`${item.trackedPersonName}:${item.url}`, item])).values()];
}

async function collectSerperEvidence(target, context) {
  if (!context.search && !context.serperApiKey) return [];
  const results = [];
  const kinds = new Set(context.kinds || []);
  const limit=Number.isInteger(context.maxQueries)&&context.maxQueries>=0?context.maxQueries:Infinity;
  const plan=typeof context.queryPlan==='function'?context.queryPlan(target):serperQueries(target);
  for (const descriptor of plan.filter((item) => !kinds.size || kinds.has(item.kind)).slice(0,limit)) {
    if(context.beforeQuery)await context.beforeQuery(descriptor);
    const organic=context.search
      ? await context.search(descriptor.query,{num:10,kind:descriptor.kind})
      : (await context.runtime.requestJsonPost("https://google.serper.dev/search", "serper", {
        q: descriptor.query,
        gl: "us",
        hl: "en",
        num: 10,
        tbs: descriptor.kind === "active_pain" ? "qdr:y" : descriptor.kind === "exec_change" ? "qdr:m" : undefined,
      }, { headers: { "X-API-KEY": context.serperApiKey } })).value.organic || [];
    for (const item of organic) {
      const itemUrl=item.url||item.link;
      if (!itemUrl) continue;
      const evidence = { kind: descriptor.kind, title: item.title, snippet: item.snippet, url: itemUrl, date: item.date, sourceId: "serper" };
      if (evidenceBelongsToTarget(target, evidence)) results.push(evidence);
    }
  }
  return results;
}

module.exports = { collectSerperEvidence, collectTrackedPeopleEvidence, phaseBQueryPlan, serperQueries, trackedPersonQueries };
