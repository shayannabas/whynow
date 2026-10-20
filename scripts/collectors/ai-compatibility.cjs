const { signal, stripHtml, unique } = require("./common.cjs");

const AI_TERMS = ["LLM", "large language model", "generative AI", "AI coding", "code generation", "Copilot", "Cursor", "agentic engineering", "AI-assisted development"];

function aiTermsIn(text = "") {
  return AI_TERMS.filter((term) => new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(text));
}

function analyzeAiEvidence(documents = []) {
  const signals = [];
  for (const document of documents) {
    const text = stripHtml(`${document.title || ""} ${document.text || document.snippet || ""}`);
    const terms = unique(aiTermsIn(text));
    if (!terms.length || !document.url) continue;
    signals.push(signal({
      key: "aiCompatibility",
      score: Math.min(5, 2 + terms.length),
      evidenceUrl: document.url,
      evidenceText: `${document.title || "Public engineering evidence"}. AI engineering signals: ${terms.join(", ")}.`,
      observedAt: document.observedAt || document.date,
      sourceId: document.sourceId || "public_search",
      metadata: { terms },
    }));
  }
  return signals;
}

async function collectAiCompatibility(target, context) {
  const documents = [
    ...(context.searchResults || []).map((result) => ({ title: result.title, text: result.snippet || result.text, url: result.url || result.link, observedAt: result.date || result.publishedAt, sourceId: result.sourceId || "public_search" })),
    ...(context.hiringEvents || []).map((item) => ({ title: item.title, text: item.evidenceText, url: item.evidenceUrl, observedAt: item.occurredAt, sourceId: item.sourceId })),
  ];
  const signals = analyzeAiEvidence(documents);
  return { collectorId: "ai_compatibility", signals, events: [], killHints: [], targetPatch: {}, itemsFound: signals.length };
}

module.exports = { AI_TERMS, aiTermsIn, analyzeAiEvidence, collectAiCompatibility };
