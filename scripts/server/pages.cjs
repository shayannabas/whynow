'use strict';

const { esc } = require('../utils.cjs');
const { getWorkspace } = require('./state.cjs');
const { todaySections, whyNow } = require('../account-lifecycle.cjs');
const styles = require('./styles.cjs');

const NAV_SECTIONS = [
  ['Work', [
    ['/today', 'Today', 'actNow'],
    ['/results', 'Results', 'accounts'],
    ['/discovery', 'Discovery', 'discovered'],
    ['/kill-log', 'Kill Log', 'killed']
  ]],
  ['Pipeline', [
    ['/', 'Overview'],
    ['/accounts', 'Accounts', 'accounts'],
    ['/scorecard', 'Scorecard']
  ]],
  ['Data', [
    ['/history', 'History', 'history'],
    ['/runs', 'Runs', 'runs'],
    ['/funnel', 'Funnel', 'accounts'],
    ['/metrics', 'Metrics'],
    ['/collectors', 'Collectors']
  ]],
  ['Setup', [
    ['/onboarding', 'Add company'],
    ['/onboarding/results', 'Research results', 'research'],
    ['/onboarding/profile', 'Seller profile', 'profile'],
    ['/workspaces', 'Workspaces', 'workspaces']
  ]]
];

function safeWorkspace(state) {
  if (!state?.activeWorkspaceId || !state.workspaces?.[state.activeWorkspaceId]) return null;
  return getWorkspace(state, state.activeWorkspaceId);
}

function routeForTitle(title, body = '') {
  if (/Chunk 3 · account detail|Account not found/.test(String(body))) return '/accounts';
  const routes = {
    Overview: '/',
    Today: '/today',
    Results: '/results',
    Discovery: '/discovery',
    Accounts: '/accounts',
    Account: '/accounts',
    Scorecard: '/scorecard',
    'Kill Log': '/kill-log',
    History: '/history',
    Runs: '/runs',
    Funnel: '/funnel',
    Metrics: '/metrics',
    Collectors: '/collectors',
    'Saved evidence': '/collectors',
    Workspaces: '/workspaces',
    'Seller profile': '/onboarding/profile',
    'Research results': '/onboarding/results',
    'Seller onboarding': '/onboarding',
    'Seller setup': '/onboarding',
    'Not found': ''
  };
  return routes[String(title || '').trim()] ?? '';
}

function normalizePath(path) {
  const raw = String(path || '').trim();
  if (!raw) return '';
  const value = raw.split('?')[0] || '/';
  if (value.startsWith('/accounts/')) return '/accounts';
  if (value.startsWith('/collectors/') || value.startsWith('/sources/')) return '/collectors';
  if (value === '/onboarding/manual' || value === '/onboarding/profile') return '/onboarding/profile';
  if (value === '/onboarding/research/status') return '/onboarding/results';
  return value;
}

function receiptCount(account = {}) {
  const urls = new Set();
  for (const value of Object.values(account.signals || {})) {
    if (value?.evidenceUrl) urls.add(String(value.evidenceUrl));
  }
  for (const row of [...(account.triggers || []), ...(account.triggerHistory || [])]) {
    if (row?.evidenceUrl) urls.add(String(row.evidenceUrl));
  }
  const sourceUrl = account.sourceUrl || account.discoveryQuality?.sourceUrl;
  if (sourceUrl) urls.add(String(sourceUrl));
  return urls.size;
}

function tierLabel(account = {}) {
  if (account.killStatus === 'killed' || account.kills?.length) return 'Killed';
  const value = String(account.tier ?? '').trim().toLowerCase().replace(/^tier\s*/, '');
  if (['1', '2', '3'].includes(value)) return `Tier ${value}`;
  if (value === 'parked') return 'Tier unknown';
  return 'Tier unknown';
}

function navCounts(state, workspace) {
  const accounts = workspace?.accounts || [];
  const sections = workspace ? todaySections(workspace) : { actNow: [], worthResearching: [], needsReview: [] };
  const killed = accounts.filter(account => account.killStatus === 'killed' || account.kills?.length).length;
  const availableWorkspaces = Object.keys(state?.workspaces || {}).map(id => getWorkspace(state, id)).filter(item => item.status !== 'archived' && !item.systemRole).length;
  return {
    actNow: sections.actNow.length,
    accounts: accounts.length,
    discovered: accounts.filter(account => account.discoveryQuality?.sourceKind).length,
    killed,
    runs: workspace?.runs?.length || 0,
    history: (state?.auditLog || []).filter(item => item.workspaceId === workspace?.id).length,
    research: workspace?.research ? 1 : 0,
    profile: workspace?.onboarding?.selectedCandidate ? 1 : 0,
    workspaces: availableWorkspaces
  };
}

function navHtml(activePath, counts) {
  const active = normalizePath(activePath);
  return NAV_SECTIONS.map(([section, links]) => `<section class="nav-section"><div class="nav-section-label">${esc(section)}</div>${links.map(([href, label, countKey]) => {
    const isActive = normalizePath(href) === active;
    const count = countKey ? `<span class="nav-count" aria-label="${esc(String(counts[countKey] ?? 0))} ${esc(label.toLowerCase())}">${esc(String(counts[countKey] ?? 0))}</span>` : '';
    return `<a href="${esc(href)}" class="${isActive ? 'active' : ''}"${isActive ? ' aria-current="page"' : ''}>${esc(label)}${count}</a>`;
  }).join('')}</section>`).join('');
}

const clientScript = `
function sizeDraftBodies(){document.querySelectorAll('[data-autosize-draft]').forEach(field=>{if(!field.getClientRects().length)return;field.style.height='auto';field.style.height=(field.scrollHeight+2)+'px';});}
function activateBriefTab(root,key,href,push){
  if(!root||!key)return false;
  const panels=[...root.querySelectorAll('[data-brief-panel],[data-tab-panel]')];
  const found=panels.some(panel=>(panel.getAttribute('data-brief-panel')||panel.getAttribute('data-tab-panel'))===key);
  if(!found)return false;
  panels.forEach(panel=>{const current=(panel.getAttribute('data-brief-panel')||panel.getAttribute('data-tab-panel'))===key;panel.hidden=!current;});
  root.querySelectorAll('[data-brief-tab],.brief-tab[data-tab-key]').forEach(item=>{const current=(item.getAttribute('data-brief-tab')||item.getAttribute('data-tab-key'))===key;item.classList.toggle('active',current);item.setAttribute('aria-selected',String(current));});
  if(push&&href)history.pushState({briefTab:key},'',href);
  sizeDraftBodies();
  return true;
}
async function copyValue(value){
  if(navigator.clipboard&&navigator.clipboard.writeText){await navigator.clipboard.writeText(value);return;}
  const field=document.createElement('textarea');field.value=value;field.setAttribute('readonly','');field.style.position='fixed';field.style.opacity='0';document.body.appendChild(field);field.select();const copied=document.execCommand('copy');field.remove();if(!copied)throw new Error('Copy unavailable');
}
document.addEventListener('click',function(event){
  const toggle=event.target.closest('[data-mobile-nav-toggle]');
  if(toggle){const side=document.querySelector('.side');if(!side)return;const open=side.classList.toggle('is-open');toggle.setAttribute('aria-expanded',String(open));toggle.textContent=open?'Close':'Menu';return;}
  if(event.target.closest('.nav a')){const side=document.querySelector('.side'),button=document.querySelector('[data-mobile-nav-toggle]');side?.classList.remove('is-open');if(button){button.setAttribute('aria-expanded','false');button.textContent='Menu';}}
  const copyButton=event.target.closest('[data-copy],[data-copy-target],[data-copy-draft]');
  if(copyButton){event.preventDefault();event.stopImmediatePropagation();let value=copyButton.getAttribute('data-copy')||'';const selector=copyButton.getAttribute('data-copy-target');const id=copyButton.getAttribute('data-copy-draft');const source=selector?document.querySelector(selector):id?document.getElementById(id):null;if(source)value=source.value||source.textContent||'';if(!value)return;const old=copyButton.textContent;copyValue(value).then(()=>{copyButton.textContent='Copied';window.setTimeout(()=>{copyButton.textContent=old;},1100);}).catch(()=>{copyButton.setAttribute('title','Copy failed — select the text manually.');});return;}
  const tab=event.target.closest('[data-brief-tab],.brief-tab[data-tab-key]');
  if(!tab||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  const root=tab.closest('.brief[data-brief-account],.brief')||document.querySelector('.brief');
  const key=tab.getAttribute('data-brief-tab')||tab.getAttribute('data-tab-key');
  if(!root||!key)return;
  event.preventDefault();
  const href=tab.getAttribute('href');activateBriefTab(root,key,href&&href!=='#'?href:'',Boolean(href&&href!=='#'));
});
function syncBriefTab(useRenderedDefault=false){const root=document.querySelector('.brief[data-brief-account],.brief');if(!root)return;const params=new URLSearchParams(location.search);const rendered=root.querySelector('[data-brief-tab][aria-selected="true"]')?.getAttribute('data-brief-tab');const key=params.get('tab')||(useRenderedDefault?rendered:'overview')||'overview';activateBriefTab(root,key,'',false);}
window.addEventListener('popstate',()=>syncBriefTab(false));
document.addEventListener('DOMContentLoaded',()=>syncBriefTab(true),{once:true});
window.addEventListener('resize',sizeDraftBodies);
`;

function shell(state, body, title = 'Overview', activePath = '') {
  const workspace = safeWorkspace(state);
  const options = Object.keys(state?.workspaces || {}).map(id => getWorkspace(state, id))
    .filter(item => item.status !== 'archived' && !item.systemRole)
    .map(item => `<option value="${esc(item.id)}" ${state.activeWorkspaceId === item.id ? 'selected' : ''}>${esc(item.name)}</option>`).join('');
  const path = normalizePath(activePath || routeForTitle(title, body));
  const counts = navCounts(state, workspace);
  const sellerProfileStatus = workspace?.sellerProfile?.approvedAt ? '<span>Seller profile approved</span>' : '';
  const switcher = `<form method="post" action="/workspaces/switch" class="workspace-switcher"><label for="workspace">Active workspace</label><div class="workspace-control"><select id="workspace" name="id" ${options ? '' : 'disabled'}>${options || '<option>No workspaces yet</option>'}</select>${options ? '<button type="submit">Switch</button>' : ''}</div></form>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#0B0F14"><title>${esc(title)} · WhyNow</title><style>${styles}</style><script>${clientScript}</script></head><body><div class="layout"><aside class="side" aria-label="App sidebar"><div class="side-head"><a class="logo" href="/" aria-label="WhyNow overview"><span class="logo-mark" aria-hidden="true">W</span><span>WhyNow</span></a><button class="mobile-nav-toggle" type="button" data-mobile-nav-toggle aria-controls="primary-nav" aria-expanded="false">Menu</button></div>${switcher}<nav id="primary-nav" class="nav" aria-label="Primary navigation">${navHtml(path, counts)}</nav><footer class="sidebar-footer"><span>${esc(workspace?.name || 'Local workspace')}</span>${sellerProfileStatus}<span>Demo mode · no send path</span></footer></aside><main tabindex="-1"><div class="ss-page-body">${body}</div></main></div></body></html>`;
}

function sevenDaySeries(accounts, now = new Date()) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - (6 - index));
    return { key: date.toISOString().slice(0, 10), label: date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }), count: 0 };
  });
  const byDay = new Map(days.map(day => [day.key, day]));
  for (const account of accounts) {
    const stamp = Date.parse(account.createdAt || '');
    if (!Number.isFinite(stamp)) continue;
    const day = byDay.get(new Date(stamp).toISOString().slice(0, 10));
    if (day) day.count += 1;
  }
  return days;
}

function overviewBarChart(series) {
  const max = Math.max(1, ...series.map(day => day.count));
  const bars = series.map((day, index) => {
    const height = Math.max(day.count ? 6 : 2, Math.round((day.count / max) * 50));
    const x = 10 + index * 32;
    return `<g><title>${esc(day.label)}: ${esc(String(day.count))} new accounts</title><rect x="${x}" y="${60 - height}" width="18" height="${height}" rx="5" fill="${day.count ? 'var(--accent)' : 'var(--line)'}"></rect><text x="${x + 9}" y="78" text-anchor="middle">${esc(day.label.slice(0, 1))}</text></g>`;
  }).join('');
  return `<svg class="overview-bars" viewBox="0 0 224 84" role="img" aria-label="New accounts over the last seven days">${bars}</svg>`;
}

function overviewGauge(percent) {
  const value = Math.max(0, Math.min(100, Math.round(Number(percent || 0))));
  return `<div class="overview-gauge"><svg viewBox="0 0 120 70" role="img" aria-label="${esc(String(value))}% of accounts have at least one saved receipt"><path d="M10 60 A50 50 0 0 1 110 60" pathLength="100" class="gauge-track"></path><path d="M10 60 A50 50 0 0 1 110 60" pathLength="100" class="gauge-value" stroke-dasharray="${esc(String(value))} 100"></path></svg><strong>${esc(String(value))}%</strong></div>`;
}

function accountCard(account, laneLabel) {
  const signal = account.whyNow || whyNow(account);
  const receipts = receiptCount(account);
  const score = Number(account.fitScore || 0);
  const tier = tierLabel(account);
  const date = account.updatedAt || account.createdAt || '';
  const dateLabel = date ? esc(String(date).slice(0, 10)) : 'Saved account';
  const why = signal.line || account.reviewReason || 'No current timing signal saved.';
  return `<a class="kanban-card" href="/accounts/${encodeURIComponent(account.id)}" aria-label="Open ${esc(account.name)}"><div class="kanban-card-top"><span class="kanban-date">${dateLabel}</span><span class="kanban-tier">${esc(tier)}</span></div><h3>${esc(account.name)}</h3><p title="${esc(why)}">${esc(why)}</p><div class="kanban-card-meta"><span>${esc(String(receipts))} receipts</span><span>Fit ${esc(String(score))}</span><span>${esc(account.status || 'new')}</span><span>${esc(laneLabel)}</span></div></a>`;
}

function overview(state, queryParams = new URLSearchParams()) {
  const params = queryParams instanceof URLSearchParams ? queryParams : new URLSearchParams(queryParams || '');
  const query = String(params.get('q') || '').trim();
  const sort = ['priority', 'newest', 'name', 'fit'].includes(params.get('sort')) ? params.get('sort') : 'priority';
  const filter = ['all', 'act-now', 'worth-researching', 'needs-review', 'unranked', 'skipped-killed', 'tier-1', 'tier-2', 'tier-3', 'with-receipts'].includes(params.get('filter')) ? params.get('filter') : 'all';
  const workspace = safeWorkspace(state);
  const accounts = workspace?.accounts || [];
  const sections = workspace ? todaySections(workspace) : { actNow: [], worthResearching: [], needsReview: [] };
  const killed = accounts.filter(account => account.killStatus === 'killed' || account.kills?.length);
  const skipped = accounts.filter(account => account.status === 'skipped' && !killed.includes(account));
  const queuedIds = new Set([...sections.actNow, ...sections.worthResearching, ...sections.needsReview].map(account => account.id));
  const unranked = accounts.filter(account => !killed.includes(account) && account.status !== 'skipped' && !queuedIds.has(account.id));
  const receiptAccounts = accounts.filter(account => receiptCount(account) > 0).length;
  const receiptCoverage = accounts.length ? Math.round(receiptAccounts / accounts.length * 100) : 0;
  const tierOne = accounts.filter(account => tierLabel(account) === 'Tier 1').length;
  const series = sevenDaySeries(accounts);
  const newThisWeek = series.reduce((total, day) => total + day.count, 0);
  const currentStatus = workspace?.status?.replaceAll('_', ' ') || 'No active workspace';
  const researchStatus = workspace?.research?.status ? String(workspace.research.status).replaceAll('_', ' ') : '';
  const latestRun = [...(workspace?.runs || [])].sort((left, right) => (Date.parse(right.startedAt || right.finishedAt || '') || 0) - (Date.parse(left.startedAt || left.finishedAt || '') || 0))[0];
  const runSummary = latestRun
    ? `${String(latestRun.type || 'Workspace run').replaceAll('_', ' ')} · ${String(latestRun.status || 'saved').replaceAll('_', ' ')} · ${String(latestRun.startedAt || latestRun.finishedAt || '').slice(0, 10) || 'date unavailable'}`
    : 'No background runs have been saved yet.';
  const selected = workspace?.onboarding?.selectedCandidate;
  const accountList = [
    ['Act now', 'Fresh, relevant trigger with a known tier', sections.actNow],
    ['Worth researching', `Good fit without a current trigger`, sections.worthResearching],
    ['Needs review', 'Missing attribution or firmographic confidence', sections.needsReview],
    ['Unranked', 'No current queue reason', unranked],
    ['Skipped or killed', 'Retained for review history', [...skipped, ...killed]]
  ];
  const categoryByFilter = {
    'act-now': 'Act now', 'worth-researching': 'Worth researching',
    'needs-review': 'Needs review', unranked: 'Unranked', 'skipped-killed': 'Skipped or killed'
  };
  const searchText = query.toLowerCase();
  const searchable = account => `${account.name || ''} ${account.domain || ''} ${account.icpSegment || ''} ${account.status || ''} ${account.whyNow?.line || whyNow(account).line || ''} ${account.reviewReason || ''} ${(account.triggers || []).map(row => `${row.title || ''} ${row.evidenceText || ''}`).join(' ')}`.toLowerCase();
  const filteredAccountList = accountList.map(([label, description, rows]) => {
    const visibleRows = rows.filter(account => {
      if (searchText && !searchable(account).includes(searchText)) return false;
      if (categoryByFilter[filter] && label !== categoryByFilter[filter]) return false;
      if (filter === 'tier-1' && tierLabel(account) !== 'Tier 1') return false;
      if (filter === 'tier-2' && tierLabel(account) !== 'Tier 2') return false;
      if (filter === 'tier-3' && tierLabel(account) !== 'Tier 3') return false;
      if (filter === 'with-receipts' && receiptCount(account) === 0) return false;
      return true;
    }).sort((left, right) => {
      if (sort === 'name') return String(left.name || '').localeCompare(String(right.name || ''));
      if (sort === 'newest') return (Date.parse(right.createdAt || right.updatedAt || '') || 0) - (Date.parse(left.createdAt || left.updatedAt || '') || 0);
      if (sort === 'fit') return Number(right.fitScore || 0) - Number(left.fitScore || 0) || String(left.name || '').localeCompare(String(right.name || ''));
      return Number(right.priority || 0) - Number(left.priority || 0) || Number(right.fitScore || 0) - Number(left.fitScore || 0) || String(left.name || '').localeCompare(String(right.name || ''));
    });
    return [label, description, visibleRows];
  });
  const shownCount = filteredAccountList.reduce((total, [, , rows]) => total + rows.length, 0);
  const filterOptions = [
    ['all', 'All accounts'], ['act-now', 'Act now'], ['worth-researching', 'Worth researching'],
    ['needs-review', 'Needs review'], ['unranked', 'Unranked'], ['skipped-killed', 'Skipped or killed'],
    ['tier-1', 'Tier 1'], ['tier-2', 'Tier 2'], ['tier-3', 'Tier 3'], ['with-receipts', 'With receipts']
  ].map(([value, label]) => `<option value="${value}"${filter === value ? ' selected' : ''}>${label}</option>`).join('');
  const sortOptions = [['priority', 'Priority'], ['newest', 'Newest'], ['name', 'Company A–Z'], ['fit', 'Fit score']]
    .map(([value, label]) => `<option value="${value}"${sort === value ? ' selected' : ''}>${label}</option>`).join('');
  const toolbar = `<form class="overview-toolbar" method="get" action="/"><label class="overview-search"><span>Search</span><input name="q" value="${esc(query)}" placeholder="Search accounts, segments, or signals" aria-label="Search pipeline"></label><label><span>Sort by</span><select name="sort">${sortOptions}</select></label><label><span>Filter</span><select name="filter">${filterOptions}</select></label><button class="button" type="submit">Apply</button><a class="button" href="/">Clear</a></form>`;
  const filterName = {
    'act-now': 'Act now', 'worth-researching': 'Worth researching', 'needs-review': 'Needs review',
    unranked: 'Unranked', 'skipped-killed': 'Skipped or killed', 'tier-1': 'Tier 1',
    'tier-2': 'Tier 2', 'tier-3': 'Tier 3', 'with-receipts': 'With receipts'
  }[filter] || '';
  const board = `<section class="kanban-section"><div class="kanban-heading"><div><span class="overview-label">Seller workflow</span><h2>Account board</h2><p>${esc(String(shownCount))} shown${shownCount !== accounts.length ? ` of ${esc(String(accounts.length))} saved` : ''} · ${esc(String(killed.length))} killed · ${esc(String(skipped.length))} skipped${filterName ? ` · Filter: ${esc(filterName)}` : ''}</p></div><a class="button" href="/results">Open all results</a></div><div class="kanban-board">${filteredAccountList.map(([label, description, rows]) => `<article class="kanban-column" data-stage="${esc(label.toLowerCase().replaceAll(' ', '-'))}"><header><div><h3>${esc(label)}</h3><p>${esc(description)}</p></div><span>${esc(String(rows.length))}</span></header><div class="kanban-stack">${rows.slice(0, 8).map(account => accountCard(account, label)).join('') || '<div class="kanban-empty">No accounts in this section</div>'}${rows.length > 8 ? `<a class="kanban-more" href="/results">+ ${esc(String(rows.length - 8))} more accounts</a>` : ''}</div></article>`).join('')}</div></section>`;
  const recentRun = `<section class="card"><div class="overview-card-head"><div><span class="overview-label">Workspace activity</span><h2>Latest saved run</h2></div><a href="/history">View history</a></div><p>${esc(runSummary)}</p>${latestRun?.serperQueries !== undefined ? `<p class="muted">${esc(String(latestRun.serperQueries))} Serper queries recorded for this run.</p>` : ''}</section>`;
  const companyForm = `<section class="card overview-onboarding"><div><span class="overview-label">Start with a company name</span><h2>${workspace ? 'Research another company' : 'Build your first workspace'}</h2><p>WhyNow gathers public evidence and prepares a seller profile for review. Provider calls stay behind the local configuration and explicit controls.</p></div><form method="post" action="/onboarding/start"><label for="company-name">Company name</label><div class="row"><input id="company-name" name="name" required maxlength="120" placeholder="e.g. Vercel"><button class="primary">Continue</button></div></form>${workspace?.research ? `<p><span class="badge">Research · ${esc(researchStatus)}</span> <a href="/onboarding/results">View saved research</a></p>` : ''}${selected ? `<p><a href="/onboarding/profile">Review ${esc(selected.name)} seller profile</a></p>` : ''}</section>`;
  const demoCard = `<section class="card"><div class="overview-card-head"><div><span class="overview-label">Frozen reference</span><h2>Resolve parity demo</h2></div><span class="badge">${esc(currentStatus)}</span></div><p>Load the saved Resolve configuration to inspect scoring and retained disqualifications. This does not approve a seller profile.</p><form method="post" action="/reference-demo/load"><button>Load Resolve reference demo</button></form></section>`;
  const hero = `<section class="overview-hero-band"><article class="overview-chart-card"><div><span class="overview-label">New accounts · 7 days</span><strong>${esc(String(newThisWeek))}</strong><small>From saved account creation dates</small></div>${overviewBarChart(series)}</article><article class="overview-gauge-card"><div><span class="overview-label">Receipt coverage</span><small>${esc(String(receiptAccounts))} of ${esc(String(accounts.length))} saved accounts have a receipt</small></div>${overviewGauge(receiptCoverage)}</article><article class="overview-kpi"><span class="overview-label">Act now</span><strong>${esc(String(sections.actNow.length))}</strong><small>Fresh trigger and known tier</small></article><article class="overview-kpi"><span class="overview-label">Tier 1 accounts</span><strong>${esc(String(tierOne))}</strong><small>From the active workspace</small></article></section>`;
  const title = workspace ? workspace.name : 'Overview';
  return shell(state, `<div class="overview-v2"><header class="overview-top"><div><div class="page-kicker">WhyNow · ${workspace ? esc(workspace.name) : 'Local workspace'}</div><h1>Pipeline overview</h1><p>See the saved account queue, public evidence coverage, and recent workspace activity.</p></div>${toolbar}</header>${hero}${board}${companyForm}${recentRun}${demoCard}</div>`, title, '/');
}

module.exports = { shell, overview, navHtml, routeForTitle, receiptCount, tierLabel };
