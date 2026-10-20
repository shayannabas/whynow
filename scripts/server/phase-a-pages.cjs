'use strict';

const {esc}=require('../utils.cjs');
const {getWorkspace}=require('./state.cjs');
const {phaseAConfigForWorkspace}=require('../phase-a-config.cjs');
const {signalRubric}=require('../signal-rubric.cjs');
const {shell}=require('./pages.cjs');
function activeWorkspace(state){return state.activeWorkspaceId?getWorkspace(state,state.activeWorkspaceId):null;}
function unavailable(state,title){return shell(state,`<span class="eyebrow">Phase A</span><h1>${esc(title)}</h1><section class="card"><p>Load the frozen Resolve reference demo or select an owner-approved workspace first.</p><form method="post" action="/reference-demo/load"><button>Load Resolve reference demo</button></form></section>`,title);}
function accountsPage(state,error=''){
  const workspace=activeWorkspace(state);if(!workspace)return unavailable(state,'Accounts');
  let config;try{config=phaseAConfigForWorkspace(workspace);}catch{return unavailable(state,'Accounts');}
  const segments=config.segments.filter(row=>row.enabled!==false).map(row=>`<option value="${esc(row.key)}">${esc(row.label)}</option>`).join('');
  const rows=workspace.accounts.map(account=>`<tr><td><b>${esc(account.name)}</b><br><span class="muted">${esc(account.domain)}</span></td><td>${esc(config.segments.find(row=>row.key===account.icpSegment)?.label||account.icpSegment)}</td><td>${esc(account.fitScore??0)} / 100</td><td>${esc(account.tier==='parked'?'Parked':`Tier ${account.tier}`)}</td><td>${account.killStatus==='killed'?`<span class="badge danger">${esc(account.primaryKill?.code||account.kills?.[0]?.code)}</span>`:'<span class="badge">Clear</span>'}</td><td><a href="${esc(account.sourceUrl||account.discoveryQuality?.sourceUrl)}" target="_blank" rel="noreferrer">Source</a></td></tr>`).join('');
  return shell(state,`<span class="eyebrow">Phase A · manual test surface</span><h1>Accounts</h1><p>Add one public company at a time. WhyNow immediately applies the active workspace's score, tier and kill rules. No provider runs.</p>${error?`<p class="error">${esc(error)}</p>`:''}<section class="card"><h2>Add account</h2><form method="post" action="/accounts"><label>Name <input name="name" required maxlength="120" placeholder="e.g. Coinbase"></label><label>Domain <input name="domain" required placeholder="coinbase.com"></label><label>Segment <select name="segment" required>${segments}</select></label><label>Public source URL <input name="sourceUrl" type="url" required placeholder="https://example.com/source"></label><button>Add and score</button></form></section><section class="card"><h2>Saved accounts</h2>${rows?`<div class="table-wrap"><table><thead><tr><th>Account</th><th>Segment</th><th>Fit</th><th>Tier</th><th>Decision</th><th>Receipt</th></tr></thead><tbody>${rows}</tbody></table></div>`:'<p>No accounts yet.</p>'}</section>`, 'Accounts');
}
function scorecardPage(state){
  const workspace=activeWorkspace(state);if(!workspace)return unavailable(state,'Scorecard');
  let config;try{config=phaseAConfigForWorkspace(workspace);}catch{return unavailable(state,'Scorecard');}
  const rubric=signalRubric(workspace.icpConfig),rows=workspace.accounts.map(account=>`<tr><td><b>${esc(account.name)}</b></td>${rubric.map(signal=>{const value=account.score?.breakdown?.[signal.key]||{};return `<td>${esc(value.rawScore??1)}<br><span class="muted">${esc(Number(value.fitPoints||0).toFixed(2))} pts</span></td>`;}).join('')}<td><b>${esc(account.fitScore??0)}</b><br><span class="muted">${esc(account.score?.confidenceBand||'mostly-inferred')}</span></td><td>${esc(account.tier==='parked'?'Parked':`Tier ${account.tier}`)}</td><td>${esc(Number(account.priority||0).toFixed(4))}</td></tr>`).join('');
  return shell(state,`<span class="eyebrow">Phase A · six-signal fit</span><h1>Scorecard</h1><p>Fit and evidence confidence are calculated separately from company tier. A kill overrides priority but does not erase the fit score.</p><section class="card">${rows?`<div class="table-wrap"><table><thead><tr><th>Account</th>${rubric.map(signal=>`<th title="Weight ${esc(signal.weight)}">${esc(signal.label)}</th>`).join('')}<th>Fit / 100</th><th>Tier</th><th>Priority</th></tr></thead><tbody>${rows}</tbody></table></div>`:'<p>No accounts yet. <a href="/accounts">Add one manually.</a></p>'}</section>`, 'Scorecard');
}
function killLogPage(state){
  const workspace=activeWorkspace(state);if(!workspace)return unavailable(state,'Kill Log');
  const rows=workspace.accounts.flatMap(account=>(account.kills||[]).map((kill,index)=>`<tr><td><b>${esc(account.name)}</b>${index===0?'<br><span class="badge danger">Primary</span>':''}</td><td><code>${esc(kill.code)}</code></td><td>${esc(kill.reason)}</td><td>${esc(kill.evidenceText)}</td><td><a href="${esc(kill.evidenceUrl)}" target="_blank" rel="noreferrer">Open evidence</a></td></tr>`)).join('');
  return shell(state,`<span class="eyebrow">Phase A · retained disqualifications</span><h1>Kill Log</h1><p>Killed accounts stay visible. The first row is the primary reason; additional rules are kept as secondary reasons.</p><section class="card">${rows?`<div class="table-wrap"><table><thead><tr><th>Account</th><th>Code</th><th>Reason</th><th>Evidence</th><th>Receipt</th></tr></thead><tbody>${rows}</tbody></table></div>`:'<p>No killed accounts.</p>'}</section>`, 'Kill Log');
}
module.exports={accountsPage,killLogPage,scorecardPage};
