const { createHash } = require('node:crypto');
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stableId = value => createHash('sha256').update(String(value)).digest('hex').slice(0, 24);
const nowIso = () => new Date().toISOString();
function json(res, status, value) { res.writeHead(status, {'Content-Type':'application/json; charset=utf-8'}); res.end(JSON.stringify(value)); }
module.exports = { esc, stableId, nowIso, json };
