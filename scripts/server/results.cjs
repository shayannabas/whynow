'use strict';

const {esc}=require('../utils.cjs');
const {shell,tierLabel}=require('./pages.cjs');
const {latestTrigger,needsReviewReason}=require('../account-lifecycle.cjs');
const {approvedPlaybook}=require('../playbook.cjs');
const {workspaceIcps,matchedIcp}=require('../icps.cjs');
const {contactReady,savedPersonas,searchPaths}=require('../collectors/apollo-people.cjs');

const TABS=[['companies','Companies'],['contacts','Contacts'],['signals','Signals'],['sources','Sources'],['queries','Queries'],['runs','Runs']];
const STATUSES=[['','All'],['tier1','Tier 1'],['tier2','Tier 2'],['tier3','Tier 3'],['review','Needs review'],['approved','Approved'],['blocked','Blocked'],['archived','Archived']];
const KEYS=['tab','q','session','status','icp','signal','tech','geo','source','freshness','exclusions','contact'];
const SIGNAL_LABELS={ats_jobs:'Hiring',news:'News',statuspage:'Incidents',sec:'Filings',apollo_firmographic:'Firmographics',other:'Other'};
const clean=value=>String(value||'').trim().slice(0,180);
const lower=value=>clean(value).toLowerCase();
const blocked=account=>Boolean(account.kills?.length||account.killStatus==='killed');
const archived=account=>account.status==='skipped'||account.status==='archived';
const accountLink=(account,tab='')=>'/accounts/'+encodeURIComponent(account.id)+(tab?'?tab='+encodeURIComponent(tab):'');
function link(value,label){
  if(!value)return '';
  const href=String(value);
  if(!/^\/sources\/[a-f0-9]{24}$/i.test(href)){
    try{const url=new URL(href);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)return '';}catch{return '';}
  }
  return `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`;
}
function date(value){
  const n=Date.parse(value||'');
  return Number.isFinite(n)?new Intl.DateTimeFormat('en-US',{dateStyle:'medium',timeZone:'UTC'}).format(n):'Date unknown';
}
function badge(text,tone=''){return `<span class="ss-badge ${tone}">${esc(text)}</span>`;}
function resultsFilters(params){
  const filters=Object.fromEntries(KEYS.map(key=>[key,clean(params.get(key))]));
  if(!TABS.some(([key])=>key===filters.tab))filters.tab='companies';
  if(!STATUSES.some(([key])=>key===filters.status))filters.status='';
  if(!['7','30','60','90','180'].includes(filters.freshness))filters.freshness='';
  if(filters.contact!=='missing')filters.contact='';
  if(!['only','hide'].includes(filters.exclusions))filters.exclusions='';
  return filters;
}
function resultHref(filters,change={},path='/results'){
  const query=new URLSearchParams(Object.entries({...filters,...change}).filter(([key,value])=>value&&KEYS.includes(key)));
  return query.size?path+'?'+query:path;
}
function discoveryRuns(workspace){
  return (workspace.runs||[]).filter(row=>row.type==='company_discovery').sort((a,b)=>Date.parse(b.startedAt)-Date.parse(a.startedAt));
}
function sessionIds(run){return new Set([...(run?.newAccountIds||[]),...(run?.reviewAccountIds||[]),...(run?.vendorAccountIds||[])]);}
function accountReceipts(account){
  const rows=[
    {url:account.sourceUrl||account.discoveryQuality?.sourceUrl,title:'Discovery source',source:account.discoveryQuality?.sourceKind||'public page'},
    {url:account.newsListing?.savedSourceId?'/sources/'+account.newsListing.savedSourceId:account.newsListing?.url,title:'Unverified news listing',source:'news listing',date:account.newsListing?.publishedAt},
    ...Object.values(account.signals||{}).filter(row=>row?.evidenceUrl).map(row=>({url:row.evidenceUrl,title:row.label||row.key||'Signal',source:row.sourceId||'signal',date:row.observedAt})),
    ...[...(account.triggers||[]),...(account.triggerHistory||[])].map(row=>({
      url:row.metadata?.savedSourceId?'/sources/'+row.metadata.savedSourceId:row.evidenceUrl,title:row.title||row.type||'Timing receipt',
      source:row.sourceId||row.metadata?.provider||'timing',date:row.occurredAt||row.detectedAt,rule:row.metadata?.playbookTriggerId
    })),
    ...(account.kills||[]).map(row=>({url:row.evidenceUrl,title:row.code||'Kill evidence',source:'kill evidence'}))
  ];
  return [...new Map(rows.filter(row=>row.url).map(row=>[row.url,row])).values()];
}
function signals(account){return [...(account.triggers||[]),...(account.triggerHistory||[])];}
function filterOptions(workspace){
  const icps=workspaceIcps(workspace),rules=approvedPlaybook(workspace)?.triggers||[];
  const options=values=>[...new Set(values.filter(Boolean))].sort().map(value=>[value,value]);
  return {
    icp:{label:'ICPs',values:icps.map(row=>[row.id,row.name])},
    signal:{label:'Signals',values:rules.map(row=>[row.id,`${SIGNAL_LABELS[row.source]} · ${row.label}`])},
    tech:{label:'Tech stack',values:options(icps.flatMap(row=>row.firmographics.technologies))},
    geo:{label:'Geography',values:options(icps.flatMap(row=>row.firmographics.geographies).concat(workspace.accounts.flatMap(row=>[row.firmographics?.country,row.firmographics?.fields?.country?.value])))},
    source:{label:'Sources',values:options(workspace.accounts.flatMap(row=>accountReceipts(row).map(receipt=>receipt.source)))},
    freshness:{label:'Query rules',values:[7,30,60,90,180].map(days=>[String(days),`Last ${days} days`])},
    exclusions:{label:`Exclusions (${workspace.accounts.filter(blocked).length+(workspace.rejectedDiscovery||[]).length})`,values:[['hide','Hide blocked'],['only','Only blocked']]}
  };
}
function matchStatus(account,status,now){
  if(status.startsWith('tier'))return !blocked(account)&&Number(account.tier)===Number(status.slice(4));
  if(status==='review')return !blocked(account)&&!archived(account)&&Boolean(needsReviewReason(account,now)||![1,2,3].includes(Number(account.tier)));
  if(status==='approved')return !blocked(account)&&!archived(account)&&Boolean(account.approvedAt||account.reviewStatus==='approved');
  if(status==='blocked')return blocked(account);
  if(status==='archived')return archived(account);
  return true;
}
function accountStatus(account,now){
  if(blocked(account))return 'Killed';
  if(archived(account))return 'Archived';
  if(matchStatus(account,'review',now))return 'Needs review';
  if(matchStatus(account,'approved',now))return 'Approved';
  return account.status==='working'?'Working':'New';
}
function filterAccounts(workspace,filters,now=new Date()){
  const runs=discoveryRuns(workspace),session=filters.session==='latest'?runs[0]:runs.find(row=>row.id===filters.session);
  const ids=sessionIds(session),rule=approvedPlaybook(workspace)?.triggers.find(row=>row.id===filters.signal);
  return workspace.accounts.filter(account=>{
    const icp=matchedIcp(workspace,account),receipts=accountReceipts(account);
    if(filters.q&&!lower([account.name,account.domain,icp?.name].join(' ')).includes(lower(filters.q)))return false;
    if(filters.session&&!ids.has(account.id)&&(!session||account.discovery?.runId!==session.id))return false;
    if(!matchStatus(account,filters.status,now))return false;
    if(filters.icp&&(account.matchedIcpId||account.icpSegment)!==filters.icp)return false;
    if(filters.signal&&(!rule||!signals(account).some(row=>row.metadata?.playbookTriggerId===rule.id)))return false;
    if(filters.tech&&!lower([account.firmographics?.technologies,account.discovery?.receipt?.values?.technologies,account.signals?.techStack?.evidenceText].flat().join(' ')).includes(lower(filters.tech)))return false;
    if(filters.geo&&![account.firmographics?.country,account.firmographics?.fields?.country?.value,account.discovery?.receipt?.values?.country].some(country=>lower(country)===lower(filters.geo)))return false;
    if(filters.source&&!receipts.some(receipt=>receipt.source===filters.source))return false;
    if(filters.freshness&&!receipts.some(receipt=>{const age=now.getTime()-Date.parse(receipt.date);return age>=0&&age<=Number(filters.freshness)*86400000;}))return false;
    if(filters.exclusions==='only'&&!blocked(account)||filters.exclusions==='hide'&&blocked(account))return false;
    return filters.contact!=='missing'||!contactReady(account);
  }).sort((a,b)=>Number(b.fitScore||0)-Number(a.fitScore||0)||String(a.name).localeCompare(String(b.name)));
}
function saveSearch(workspace,form,now,id){
  const name=clean(form.get('name')).slice(0,80);
  if(!name)throw Error('Name the search before saving.');
  const search={id,name,filters:resultsFilters(form),savedAt:now};
  const searches=workspace.savedSearches||[];
  workspace.savedSearches=[search,...searches.filter(row=>row.name.toLowerCase()!==name.toLowerCase())].slice(0,30);
}
function csvCell(value){
  const text=String(value??'').replace(/\r?\n/g,' ');
  return '"'+(/^[\s]*[=+@-]/.test(text)?"'":'')+text.replaceAll('"','""')+'"';
}
function exportCompanies(workspace,filters,ids=[],now=new Date()){
  const rows=filterAccounts(workspace,filters,now).filter(row=>!ids.length||ids.includes(row.id)).map(account=>[
    account.name,account.domain,matchedIcp(workspace,account)?.name,latestTrigger(account,now)?.title,account.fitScore,tierLabel(account,{includeKill:false}),
    accountReceipts(account).length,contactReady(account)?'Ready':'Search path',accountStatus(account,now)
  ]);
  return [['Company','Domain','Matched ICP','Top signal','Fit','Tier','Evidence count','Contact','Status'],...rows].map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';
}
function chip(label,href,selected=false){
  return `<a class="v2-chip${selected?' selected':''}" href="${esc(href)}"${selected?' aria-current="true"':''}>${esc(label)}</a>`;
}
function hiddenFilters(filters,omit=[]){
  return Object.entries(filters).filter(([key,value])=>value&&!omit.includes(key)).map(([key,value])=>`<input type="hidden" name="${esc(key)}" value="${esc(value)}">`).join('');
}
function companyCell(account,tab=''){
  const initials=String(account.name||'Company').split(/\s+/).slice(0,2).map(word=>word[0]).join('').toUpperCase();
  return `<a class="v2-company" href="${accountLink(account,tab)}"><span aria-hidden="true" class="v2-initials">${esc(initials)}</span><span><b>${esc(account.name)}</b><small>${esc(account.domain||'Domain unknown')}</small></span></a>`;
}
function table(columns,rows,empty,className=''){
  return `<div class="ss-table-shell"><table class="ss-table v2-table ${className}"><thead><tr>${columns.map(title=>`<th scope="col">${esc(title)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(cell=>`<td>${cell}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${columns.length}"><p class="ss-empty">${esc(empty)}</p></td></tr>`}</tbody></table></div>`;
}
function selection(account){return `<input type="checkbox" form="export-results" name="accountId" value="${esc(account.id)}" aria-label="Select ${esc(account.name)}">`;}
function companiesTable(workspace,rows,now){
  return table(['Select','Company','Matched ICP','Top signal','Score','Tier','Evidence','Contact','Status'],rows.map(account=>{
    const icp=matchedIcp(workspace,account),signal=latestTrigger(account,now),evidence=accountReceipts(account),status=accountStatus(account,now);
    return [
      selection(account),
      companyCell(account),
      icp?`<span title="${esc(account.matchedIcpReason||'Saved workspace segment')}">${esc(icp.name)}</span>`:'<span class="muted">Unmatched</span>',
      signal?link(require('../collectors/ats-receipts.cjs').primaryTriggerReceipt(signal).url,signal.title||signal.type)||esc(signal.title||signal.type):'<span class="muted">No active signal</span>',
      badge(account.fitScore??'—','score'),badge(tierLabel(account,{includeKill:false}),'tier'),`<a href="${accountLink(account,'evidence')}">${evidence.length} ${evidence.length===1?'source':'sources'}</a>`,
      `<a href="${accountLink(account,'personas')}">${badge(contactReady(account)?'Ready':'Search path',contactReady(account)?'ready':'review')}</a>`,
      badge(status,blocked(account)?'blocked':status==='Needs review'?'review':'evidence')
    ];
  }),'No companies match. Adjust the filters or open New discovery.','v2-companies');
}
function resultsContent(workspace,filters,accounts,now){
  if(filters.tab==='contacts')return table(['Select','Company','Contact','Personas','Search paths'],accounts.map(account=>[
    selection(account),companyCell(account,'personas'),badge(contactReady(account)?'Ready':'Search path',contactReady(account)?'ready':'review'),
    String(savedPersonas(account).length),`<details><summary>Search paths</summary><ul>${searchPaths(workspace,account).map(path=>`<li>${esc(path.title)} · ${link(path.url,'Search on LinkedIn')}</li>`).join('')}</ul></details>`
  ]),'No companies match the contact filters.');
  if(filters.tab==='signals')return table(['Company','Signal','Date','Receipt'],accounts.flatMap(account=>signals(account).map(row=>[
    companyCell(account),esc(row.title||row.type),esc(date(row.occurredAt||row.detectedAt)),link(require('../collectors/ats-receipts.cjs').primaryTriggerReceipt(row).url,'Open receipt')
  ])),'No saved signals match these filters.');
  if(filters.tab==='sources')return table(['Company','Source','Type','Date'],accounts.flatMap(account=>accountReceipts(account).map(row=>[
    companyCell(account),link(row.url,row.title),esc(row.source),esc(date(row.date))
  ])),'No account sources match these filters.');
  const runs=discoveryRuns(workspace);
  const visibleRuns=filters.session==='latest'?runs.slice(0,1):filters.session?runs.filter(row=>row.id===filters.session):runs;
  if(filters.tab==='queries')return table(['Query','ICP','Trigger','Window','Status'],visibleRuns.flatMap(run=>{
    const planned=run.plannedQueries||run.tasks||[];
    return planned.filter(row=>row.query&&(!filters.icp||filters.icp===(row.icpId||row.segment))&&(!filters.signal||filters.signal===row.ruleId)).map(row=>{
      const done=run.tasks?.find(task=>task.id===row.id||task.taskId===row.id||task.query===row.query);
      return [esc(row.query),esc(row.icpLabel||workspaceIcps(workspace).find(icp=>icp.id===(row.icpId||row.segment))?.name||'—'),
        esc(approvedPlaybook(workspace)?.triggers.find(rule=>rule.id===row.ruleId)?.label||row.ruleId||row.segment||'—'),esc(row.tbs||'—'),badge(done?.status||row.status||'Not run','evidence')];
    });
  }),'No saved discovery queries in this session.');
  if(filters.tab==='runs')return table(['Started','Strategy','Status','Queries used','Accounts'],visibleRuns.map(run=>[
    chip(date(run.startedAt),resultHref(filters,{tab:'queries',session:run.id})),esc(run.strategy||'Discovery'),badge(String(run.status||'unknown').replaceAll('_',' '),'evidence'),
    String(run.serperQueries||0),String(run.newAccounts??sessionIds(run).size)
  ]),'No discovery runs have been saved.');
  return companiesTable(workspace,accounts,now);
}
function resultsPageV2(state,query=new URLSearchParams(),error=''){
  const workspace=state.workspaces[state.activeWorkspaceId];
  if(!workspace)return shell(state,'<h1>Results</h1><p>Choose a workspace to view saved results.</p>','Results','/results');
  const filters=resultsFilters(query),now=new Date(),accounts=filterAccounts(workspace,filters,now),runs=discoveryRuns(workspace),options=filterOptions(workspace);
  const saved=(workspace.savedSearches||[]).map(row=>chip(row.name,resultHref(row.filters))).join('');
  const groups=Object.entries(options).filter(([key,value])=>key!=='signal'||value.values.length).map(([key,{label,values}])=>{
    const value=filters[key],selected=values.find(([id])=>id===value)?.[1]||value;
    const choices=values.filter(([id])=>id!==value).map(([id,text])=>chip(text,resultHref(filters,{[key]:id}))).join('');
    return `<div class="v21-filter"><b>${esc(label)}</b>${value?chip(selected+' ×',resultHref(filters,{[key]:''}),true):'<span class="v21-any">Any</span>'}${choices?`<details class="v21-choices"><summary aria-label="Choose ${esc(label)}">+</summary><div>${choices}</div></details>`:''}</div>`;
  }).join('');
  const body=`<div class="ss-page v2-page">
    <header class="ss-header"><div><h1 class="ss-title">Results</h1><p class="ss-subtitle">Review discovery, saved signals and evidence for ${esc(workspace.name)}.</p></div>
    <div class="v2-actions">
      <details class="v2-pop"><summary class="ss-btn">Save search</summary><form method="post" action="/results/searches">${hiddenFilters(filters)}<input type="hidden" name="workspaceId" value="${esc(workspace.id)}"><label>Search name<input name="name" required maxlength="80"></label><button class="ss-btn primary">Save</button></form></details>
      <form id="export-results" action="/results/export">${hiddenFilters(filters)}<button type="submit" class="ss-btn">Export</button></form>
      <button type="submit" form="export-results" formmethod="post" formaction="/results/personas" name="workspaceId" value="${esc(workspace.id)}" class="ss-btn primary">Find missing contacts</button>
    </div></header>
    ${error?`<p class="notice" role="alert">${esc(error)}</p>`:''}
    <section class="panel v2-surface">
      <nav aria-label="Result views" class="v2-tabs">${TABS.map(([key,label])=>chip(label,resultHref(filters,{tab:key,contact:key==='contacts'?filters.contact:''}),filters.tab===key)).join('')}</nav>
      <div class="v21-filters" aria-label="Result filters">${groups}${filters.contact==='missing'?chip('Search path ×',resultHref(filters,{contact:''}),true):''}</div>
      <h2 class="v21-result-count">${accounts.length} ${accounts.length===1?'company':'companies'} shown</h2>
      <form class="v2-search" action="/results">${hiddenFilters(filters,['q'])}<input type="search" name="q" aria-label="Search results" placeholder="Search company, domain or ICP" value="${esc(filters.q)}"><button class="ss-btn">Search</button></form>
      ${saved?`<nav class="v2-chips" aria-label="Saved searches">${saved}</nav>`:''}
      <nav class="v2-chips" aria-label="Discovery sessions">${chip(`All sessions · ${workspace.accounts.length}`,resultHref(filters,{session:''}),!filters.session)}${runs.length?chip(`Latest · ${sessionIds(runs[0]).size}`,resultHref(filters,{session:'latest'}),filters.session==='latest'):''}${runs.map(run=>chip(`${date(run.startedAt)} · ${sessionIds(run).size}`,resultHref(filters,{session:run.id}),filters.session===run.id)).join('')}</nav>
      <nav class="v2-chips" aria-label="Account status">${STATUSES.map(([key,label])=>chip(label,resultHref(filters,{status:key}),filters.status===key)).join('')}</nav>
      ${resultsContent(workspace,filters,accounts,now)}
    </section>
  </div>`;
  return shell(state,body,'Results','/results');
}

module.exports={resultsPageV2,resultsFilters,resultHref,filterAccounts,filterOptions,saveSearch,exportCompanies,accountReceipts,accountStatus,companyCell,accountLink,chip,link,badge,date};
