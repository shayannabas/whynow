const { createHash } = require('node:crypto');
const { stableId } = require('./utils.cjs');

const normalizeWhitespace = value => String(value).replace(/\s+/g,' ').trim();
function recordSource(state, {url, fetchedAt, title='', text}) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || !Number.isFinite(Date.parse(fetchedAt)) || typeof text !== 'string') throw new Error('Invalid public source');
  parsed.hash = '';
  const contentHash = createHash('sha256').update(text).digest('hex');
  const id = stableId(`${parsed.href}\n${contentHash}`);
  const next = structuredClone(state);
  // Content-addressed records retain older text so old quotes remain checkable.
  if (!Object.hasOwn(next.sources,id)) next.sources[id] = {schemaVersion:1,id,url:parsed.href,fetchedAt,contentHash,title:String(title),text};
  return {state:next, source:getSource(next,id)};
}
function getSource(state,id) {
  return Object.hasOwn(state.sources,id) ? structuredClone(state.sources[id]) : null;
}
function quoteIsGrounded(state,sourceId,quote) {
  const source=getSource(state,sourceId);
  const normalized=normalizeWhitespace(quote);
  return Boolean(source && normalized && normalizeWhitespace(source.text).includes(normalized));
}
module.exports = {recordSource,getSource,quoteIsGrounded};
