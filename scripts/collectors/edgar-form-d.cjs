const stage3Signals = require("../collector-triggers.cjs");
const { normalizeEntityText, stableId, stripHtml } = require("./common.cjs");

const EFTS_ENDPOINT = "https://efts.sec.gov/LATEST/search-index";
const EDGAR_ARCHIVES = "https://www.sec.gov/Archives";
const MAX_DETAIL_REQUESTS = 8;

function isoDay(value) {
  return value.toISOString().slice(0, 10);
}

function dailyIndexUrls(nowInput = new Date(), days = 3) {
  const now = nowInput instanceof Date ? nowInput : new Date(nowInput);
  const dates = [];
  for (let offset = 0; dates.length < days && offset < days + 10; offset += 1) {
    const date = new Date(now.getTime() - offset * stage3Signals.DAY_MS);
    if ([0, 6].includes(date.getUTCDay())) continue;
    dates.push(date);
  }
  return dates.map((date) => {
    const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
    const compact = isoDay(date).replaceAll("-", "");
    return `${EDGAR_ARCHIVES}/edgar/daily-index/${date.getUTCFullYear()}/QTR${quarter}/form.${compact}.idx`;
  });
}

function archiveUrl(path = "") {
  const cleaned = String(path).trim().replace(/^\/+/, "");
  return cleaned ? `${EDGAR_ARCHIVES}/${cleaned}` : "";
}

function parseDailyIndex(text = "") {
  const rows = [];
  for (const line of String(text).split(/\r?\n/)) {
    const match = line.match(/^\s*(D(?:\/A)?)\s{2,}(.+?)\s{2,}(\d+)\s{2,}(\d{8}|\d{4}-\d{2}-\d{2})\s{2,}(edgar\/data\/\S+)\s*$/i);
    if (!match) continue;
    const filedAt = match[4].includes("-") ? match[4] : `${match[4].slice(0, 4)}-${match[4].slice(4, 6)}-${match[4].slice(6, 8)}`;
    rows.push({ form: match[1].toUpperCase(), companyName: stripHtml(match[2]), cik: match[3], filedAt, evidenceUrl: archiveUrl(match[5]), textUrl: archiveUrl(match[5]), source: "edgar_daily_index" });
  }
  return rows;
}

function segmentRow(segment,segments={}) {
  if(Array.isArray(segments))return segments.find(row=>row.key===segment)||{};
  return segments?.[segment]||{};
}
function segmentTerms(segment,segments={}) {
  const row=segmentRow(segment,segments);
  return [...(row.subIndustries||[]),...(row.keywords||[])].slice(0,3).map(term=>String(term).trim()).filter(Boolean);
}
function segmentQuery(segment,segments={},segmentQueries={}) {return segmentQueries?.[segment]||segmentTerms(segment,segments).map(term=>`"${term}"`).join(' OR ');}
function eftsSearchUrl(segment, nowInput = new Date(),segments={},segmentQueries={}) {
  const now = nowInput instanceof Date ? nowInput : new Date(nowInput);
  const query = segmentQuery(segment,segments,segmentQueries);
  if (!query) return "";
  const start = new Date(now.getTime() - 7 * stage3Signals.DAY_MS);
  const params = new URLSearchParams({ q: query, forms: "D,D/A", startdt: isoDay(start), enddt: isoDay(now), from: "0", size: "10" });
  return `${EFTS_ENDPOINT}?${params}`;
}

function accessionFromHit(hit = {}) {
  return String(hit._source?.adsh || hit._source?.accession_no || hit._id || "").match(/\d{10}-\d{2}-\d{6}/)?.[0] || "";
}

function filingUrlsFromHit(hit = {}) {
  const source = hit._source || {};
  const direct = source.linkToHtml || source.link_to_html || source.filing_url || "";
  if (direct) {
    const evidenceUrl = String(direct).startsWith("http") ? String(direct) : `https://www.sec.gov${String(direct).startsWith("/") ? "" : "/"}${direct}`;
    return { evidenceUrl, textUrl: evidenceUrl };
  }
  const accession = accessionFromHit(hit);
  const cik = String(Array.isArray(source.ciks) ? source.ciks[0] : source.cik || "").replace(/^0+/, "");
  if (!accession || !cik) return { evidenceUrl: "", textUrl: "" };
  const directory = `${EDGAR_ARCHIVES}/edgar/data/${cik}/${accession.replaceAll("-", "")}`;
  return { evidenceUrl: `${directory}/${accession}-index.html`, textUrl: `${directory}/${accession}.txt` };
}

function companyNameFromHit(hit = {}) {
  const source = hit._source || {};
  const name = source.entity_name || source.company_name || source.display_names?.[0] || source.display_name || "";
  return stripHtml(String(name).replace(/\s+\(CIK\s+\d+\).*$/i, "")).trim();
}

function parseEftsHits(payload = {}, segment = "",segments={}) {
  const hits = payload.hits?.hits || payload.hits || [];
  return (Array.isArray(hits) ? hits : []).map((hit) => {
    const source = hit._source || {};
    const urls = filingUrlsFromHit(hit);
    return {
      form: String((Array.isArray(source.root_forms) ? source.root_forms[0] : source.root_forms) || source.form || "D").toUpperCase(),
      companyName: companyNameFromHit(hit),
      cik: String(Array.isArray(source.ciks) ? source.ciks[0] : source.cik || ""),
      filedAt: String(source.file_date || source.filed_at || source.period_of_report || ""),
      segment,
      matchedTerms: segmentTerms(segment,segments),
      evidenceUrl: urls.evidenceUrl,
      textUrl: urls.textUrl,
      source: "edgar_efts_full_text",
    };
  }).filter((row) => row.companyName && /^D(?:\/A)?$/.test(row.form) && /^https:\/\/www\.sec\.gov\//.test(row.evidenceUrl));
}

function filingKey(filing = {}) {
  const accession = String(filing.evidenceUrl || filing.textUrl || "").match(/\d{10}-\d{2}-\d{6}/)?.[0];
  return accession || filing.evidenceUrl || `${normalizeEntityText(filing.companyName)}:${filing.filedAt}`;
}

function matchTarget(filing = {}, targets = []) {
  const filingName = normalizeEntityText(filing.companyName);
  if (filingName.length < 3) return null;
  const matches = targets.filter((target) => {
    const names = [target.name, ...(target.aliases || [])].map(normalizeEntityText).filter(Boolean);
    // Form D entity names frequently describe SPVs/funds such as
    // "Databricks 1 Mar 2025 a Series of ...". Prefix matching turns those
    // investment vehicles into false corporate-funding signals. Legal suffixes
    // are already normalized, so only an exact canonical name or alias is safe.
    return names.some((name) => name === filingName);
  });
  return matches.length === 1 ? matches[0] : null;
}

function isInvestmentVehicleName(value = "") {
  return /\b(?:fund|series of|co[ -]?invest(?:ment|ing)?|special purpose vehicle|spv|feeder|access vehicle|access fund|pooled investment)\b/i.test(String(value));
}

function xmlValue(text, tag) {
  const match = String(text).match(new RegExp(`<(?:\\w+:)?${tag}\\b[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?${tag}>`, "i"));
  return match ? stripHtml(match[1]) : "";
}

function moneyValue(value = "") {
  const number = Number(String(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(number) && number > 0 ? Math.round(number) : null;
}

function parseFilingDetails(text = "") {
  const securityTags = [
    ["isEquityType", "Equity"], ["isDebtType", "Debt"], ["isOptionToAcquireType", "Option"],
    ["isPooledInvestmentFundType", "Pooled investment fund"], ["isSecurityToBeAcquiredType", "Acquisition security"],
  ];
  const securityTypes = securityTags.filter(([tag]) => /^(true|1|yes)$/i.test(xmlValue(text, tag))).map(([, label]) => label);
  const people = [];
  for (const block of String(text).match(/<(?:\w+:)?relatedPersonInfo\b[\s\S]*?<\/(?:\w+:)?relatedPersonInfo>/gi) || []) {
    const name = [xmlValue(block, "firstName"), xmlValue(block, "middleName"), xmlValue(block, "lastName")].filter(Boolean).join(" ");
    if (name) people.push(name);
  }
  const isNew = /^(true|1|yes)$/i.test(xmlValue(text, "isNew"));
  const firstSaleBlock = String(text).match(/<(?:\w+:)?dateOfFirstSale\b[\s\S]*?<\/(?:\w+:)?dateOfFirstSale>/i)?.[0] || "";
  return {
    issuerName: xmlValue(text, "entityName") || xmlValue(text, "issuerName"),
    amountRaised: moneyValue(xmlValue(text, "totalAmountSold")),
    offeringAmount: moneyValue(xmlValue(text, "totalOfferingAmount")),
    roundType: `${isNew ? "New" : "Amended"}${securityTypes.length ? ` ${securityTypes.join(" + ")}` : " Form D offering"}`,
    executiveNames: [...new Set(people)].slice(0, 12),
    firstSaleAt: xmlValue(firstSaleBlock, "value") || xmlValue(text, "dateOfFirstSale"),
    securityTypes,
  };
}

function formDEvent(filing, details = {}, slaConfig = {}) {
  const occurredAt = Number.isFinite(Date.parse(filing.filedAt || "")) ? new Date(filing.filedAt).toISOString() : new Date().toISOString();
  const amount = details.amountRaised || details.offeringAmount;
  const evidenceText = [
    `${filing.companyName} filed SEC Form ${filing.form} on ${occurredAt.slice(0, 10)}.`,
    amount ? `${details.amountRaised ? "Amount sold" : "Offering amount"}: $${amount.toLocaleString("en-US")}.` : "Offering amount was not disclosed in the parsed filing.",
    details.roundType ? `Offering: ${details.roundType}.` : "",
    details.executiveNames?.length ? `Related executives: ${details.executiveNames.join(", ")}.` : "",
  ].filter(Boolean).join(" ");
  return stage3Signals.decorateTrigger({
    id: stableId("evt", `form_d_filing:${filing.evidenceUrl}:${filing.companyName}`),
    type: "form_d_filing",
    triggerType: "form_d_filing",
    title: `${filing.companyName} Form D filing`,
    evidenceUrl: filing.evidenceUrl,
    evidenceText,
    occurredAt,
    detectedAt: occurredAt,
    sourceId: "sec_edgar",
    sourceName: "SEC EDGAR",
    metadata: { form: filing.form, cik: filing.cik, issuerName: filing.companyName, amountRaised: details.amountRaised || null, offeringAmount: details.offeringAmount || null, roundType: details.roundType || "", executiveNames: details.executiveNames || [], firstSaleAt: details.firstSaleAt || "" },
  }, slaConfig);
}

async function collectEdgarFormDUniverse({targets=[],runtime,now=new Date(),segments={},segmentQueries={},enabledSegments,enabled=false,slaConfig={}}={}) {
  if (!enabled) return { status: "disabled", eventsByTargetId: {}, discoveryCandidates: [], filings: [], reports: [], errors: [] };
  const filingsByKey = new Map();
  const reports = [];
  const errors = [];
  for (const url of dailyIndexUrls(now)) {
    try {
      const { value } = await runtime.requestText(url, "edgar_index", { cacheTtlMs: 6 * 60 * 60 * 1000 });
      const rows = parseDailyIndex(value);
      rows.forEach((row) => filingsByKey.set(filingKey(row), row));
      reports.push({ source: "daily_index", url, status: "ok", found: rows.length });
    } catch (error) {
      const message = error instanceof Error ? error.message : "EDGAR daily index failed";
      const currentIndexPending = url === dailyIndexUrls(now, 1)[0] && [403, 404].includes(Number(error?.status));
      if (!currentIndexPending) errors.push({ source: "daily_index", url, error: message });
      reports.push({ source: "daily_index", url, status: currentIndexPending ? "pending" : "error", found: 0, ...(currentIndexPending ? {} : { error: message }) });
    }
  }
  const configuredSegments=enabledSegments|| (Array.isArray(segments)?segments.filter(row=>row.enabled!==false).map(row=>row.key):Object.keys(segments).filter(key=>segments[key]?.enabled!==false));
  for (const segment of configuredSegments.filter(key=>segmentRow(key,segments).key||(!Array.isArray(segments)&&segments[key]))) {
    const url = eftsSearchUrl(segment,now,segments,segmentQueries);
    if (!url) continue;
    try {
      const { value } = await runtime.requestJson(url, "edgar_search", { cacheTtlMs: 6 * 60 * 60 * 1000 });
      const rows = parseEftsHits(value,segment,segments);
      rows.forEach((row) => {
        const existing = filingsByKey.get(filingKey(row)) || {};
        const matchedSegments = [...new Set([...(existing.matchedSegments || (existing.segment ? [existing.segment] : [])), row.segment].filter(Boolean))];
        filingsByKey.set(filingKey(row), { ...existing, ...row, segment: matchedSegments.length === 1 ? matchedSegments[0] : "unclassified", matchedSegments });
      });
      reports.push({ source: "efts", segment, url, status: "ok", found: rows.length });
    } catch (error) {
      const message = error instanceof Error ? error.message : "EDGAR EFTS search failed";
      errors.push({ source: "efts", segment, url, error: message });
      reports.push({ source: "efts", segment, url, status: "error", found: 0, error: message });
    }
  }
  const filings = [...filingsByKey.values()];
  const targetByFiling = new Map(filings.map((filing) => [filingKey(filing), matchTarget(filing, targets)]));
  const detailPriority = filings.filter((filing) => targetByFiling.get(filingKey(filing)) || filing.segment).sort((left, right) => (
    Number(Boolean(targetByFiling.get(filingKey(right)))) - Number(Boolean(targetByFiling.get(filingKey(left))))
    || Date.parse(right.filedAt || 0) - Date.parse(left.filedAt || 0)
  )).slice(0, MAX_DETAIL_REQUESTS);
  const details = new Map();
  for (const filing of detailPriority) {
    if (!filing.textUrl) continue;
    try {
      const { value } = await runtime.requestText(filing.textUrl, "edgar_filing", { cacheTtlMs: 30 * stage3Signals.DAY_MS });
      details.set(filingKey(filing), parseFilingDetails(value));
    } catch (error) {
      errors.push({ source: "filing", url: filing.textUrl, error: error instanceof Error ? error.message : "EDGAR filing fetch failed" });
    }
  }
  const eventsByTargetId = {};
  const discoveryCandidates = [];
  for (const filing of filings) {
    const target = targetByFiling.get(filingKey(filing));
    const filingDetails = details.get(filingKey(filing)) || {};
    if (target) {
      (eventsByTargetId[target.id] ||= []).push(formDEvent(filing, filingDetails, slaConfig));
    } else if ((filing.segment || filing.matchedSegments?.length) && !isInvestmentVehicleName(filing.companyName)) {
      discoveryCandidates.push({
        id: stableId("edgar_candidate", filingKey(filing)),
        name: filing.companyName,
        segment: filing.segment || "unclassified",
        segmentReviewRequired: true,
        detectedAt: filing.filedAt,
        evidenceUrl: filing.evidenceUrl,
        provenance: { kind: "sec_form_d_full_text_match", url: filing.evidenceUrl, label: `SEC Form ${filing.form} filing`, queryTerms: filing.matchedTerms || [], matchedSegments: filing.matchedSegments || [filing.segment] },
        filing: { form: filing.form, cik: filing.cik, ...filingDetails },
      });
    }
  }
  const dedupedCandidates = [...new Map(discoveryCandidates.map((candidate) => [candidate.id, candidate])).values()];
  const eventCount = Object.values(eventsByTargetId).reduce((total, rows) => total + rows.length, 0);
  return { status: filings.length ? errors.length ? "degraded" : "ok" : errors.length ? "error" : "empty", eventsByTargetId, discoveryCandidates: dedupedCandidates, filings, reports, errors, eventCount };
}

module.exports={EDGAR_ARCHIVES,EFTS_ENDPOINT,MAX_DETAIL_REQUESTS,archiveUrl,collectEdgarFormDUniverse,companyNameFromHit,dailyIndexUrls,eftsSearchUrl,filingUrlsFromHit,formDEvent,isInvestmentVehicleName,matchTarget,parseDailyIndex,parseEftsHits,parseFilingDetails,segmentQuery,segmentTerms};
