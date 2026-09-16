const { stableId } = require('../utils.cjs');

function stripHtml(html) {
  return String(html).replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ').replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, key) => ({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '}[key]))
    .replace(/&#(x[\da-f]+|\d+);/gi, (whole, value) => {
      const code = value[0].toLowerCase() === 'x' ? parseInt(value.slice(1),16) : Number(value);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    }).replace(/\s+/g, ' ').trim();
}
const normalizeEntityText = value => String(value ?? '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const clampScore = value => Math.max(1, Math.min(5, Number(value) || 1));
function publicReceipt(value) {
  try { const url = new URL(value); return ['http:','https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null; } catch { return null; }
}
function signal({score=1, evidenceUrl=null, evidenceText='', observedAt, ...rest} = {}) {
  const receipt = publicReceipt(evidenceUrl);
  return {...rest, schemaVersion:1, score:clampScore(score), evidenceUrl:receipt, evidenceText:String(evidenceText), observedAt:observedAt ?? null, inferred:!receipt || rest.inferred === true};
}
function event({type, evidenceUrl=null, detectedAt, ...rest}) {
  const receipt = publicReceipt(evidenceUrl);
  return {...rest, schemaVersion:1, id:stableId(JSON.stringify([type,receipt,detectedAt])), type, evidenceUrl:receipt, detectedAt, inferred:!receipt};
}
function withinDays(value, days, now=Date.now()) {
  const age = Number(new Date(now)) - Date.parse(value);
  return Number.isFinite(age) && age >= 0 && age <= days * 86400000;
}
function domainForTarget(target) {
  try { return new URL(target.website || `https://${target.domain}`).hostname.toLowerCase().replace(/^www\./,''); } catch { return ''; }
}
function evidenceBelongsToTarget(target, url, text='') {
  const domain = domainForTarget(target);
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./,'');
    if (domain && (host === domain || host.endsWith(`.${domain}`))) return true;
  } catch { return false; }
  const name = normalizeEntityText(target.name);
  return name.length >= 3 && ` ${normalizeEntityText(text)} `.includes(` ${name} `);
}
module.exports = {stripHtml,stableId,clampScore,signal,event,withinDays,domainForTarget,normalizeEntityText,evidenceBelongsToTarget};
