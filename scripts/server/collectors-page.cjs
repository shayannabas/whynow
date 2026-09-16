const {esc} = require('../utils.cjs');
const {getWorkspace} = require('./state.cjs');
const {shell} = require('./pages.cjs');
const {DEFAULT_BUDGETS} = require('../collectors/runtime.cjs');

function collectorsPage(state,{configured=false,job=null}={}) {
  const workspace=state.activeWorkspaceId?getWorkspace(state,state.activeWorkspaceId):null;
  const snapshot=workspace?.budgets.collector;
  const today=snapshot?.day===new Date().toISOString().slice(0,10);
  const rows=Object.entries(DEFAULT_BUDGETS).map(([key,budget])=>{
    const usage=today?snapshot?.usage?.[key]:null;
    const health=snapshot?.health?.[key];
    return `<tr><th scope="row">${esc(key.replaceAll('_',' '))}</th><td>${health?esc(health.status):'Not run'}</td><td>${usage?.requests||0} / ${budget.limit}</td><td>${usage?.cacheHits||0}</td><td>${budget.minIntervalMs} ms</td><td>${Math.round(budget.ttlMs/60000)} min</td></tr>`;
  }).join('');
  const status=job?`<p role="status" id="fetch-status">${esc(job.message)}</p>${job.sourceId?`<a href="/sources/${esc(job.sourceId)}">View saved evidence</a>`:''}`:'';
  return shell(state,`<span class="eyebrow">Local administrator · Stage 1</span><h1>Collectors</h1><p>Check one public page and save its evidence. Company research starts in a later stage.</p>
    ${!workspace?'<p>Create a workspace from Overview before checking a page.</p>':`<section class="card"><h2>Check a public page</h2><p>${configured?'WhyNow will identify itself, check robots.txt, and save the public text.':'Set CRAWLER_CONTACT_EMAIL in your local environment before fetching a page.'}</p><form method="post" action="/collectors/fetch"><input type="hidden" name="workspaceId" value="${esc(workspace.id)}"><label for="source-url">Public HTTPS page</label><div class="row"><input type="url" id="source-url" name="url" required placeholder="https://…"><button ${!configured || job?.status==='running'?'disabled':''}>Fetch and save evidence</button></div></form>${status}</section>`}
    <section class="card"><h2>Source health and daily budgets</h2><p>Requests count against this workspace's UTC-day budget. Cached pages avoid another page download. These are fetching services, not finished prospect collectors.</p><div style="overflow-x:auto"><table><thead><tr><th>Source</th><th>Last result</th><th>Requests</th><th>Cache hits</th><th>Minimum pause</th><th>Cache life</th></tr></thead><tbody>${rows}</tbody></table></div></section>
    ${job?.status==='running'?`<script>const poll=setInterval(async()=>{try{const r=await fetch('/collectors/jobs/${esc(job.id)}');if(!r.ok){clearInterval(poll);return}const j=await r.json();document.querySelector('#fetch-status').textContent=j.message;if(j.status!=='running'){clearInterval(poll);location.reload()}}catch{clearInterval(poll);document.querySelector('#fetch-status').textContent='Connection interrupted. Refresh to check progress.'}},1000);</script>`:''}`,'Collectors');
}
module.exports={collectorsPage};
