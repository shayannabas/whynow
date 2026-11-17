'use strict';

const {esc}=require('../utils.cjs');
const {shell,tierLabel}=require('./pages.cjs');
const {accountBrief}=require('./phase-a-pages.cjs');
const {phaseAConfigForWorkspace}=require('../phase-a-config.cjs');
const {todaySections,latestTrigger,needsReviewReason}=require('../account-lifecycle.cjs');
const {workspaceIcps,matchedIcp,playbookFor}=require('../icps.cjs');
const {contactReady,peopleSettings}=require('../collectors/apollo-people.cjs');
const {accountLink,link,chip,badge}=require('./results.cjs');

const current=state=>state.workspaces[state.activeWorkspaceId];
const page=(state,title,path,body)=>shell(state,`<div class="ss-page v2-page">${body}</div>`,title,path);
const hidden=(name,value)=>`<input type="hidden" name="${name}" value="${esc(value)}">`;
const feedback=error=>error?`<p class="notice" role="alert">${esc(error)}</p>`:'';
function heading(title,subtitle,actions=''){
  return `<header class="ss-header"><div><h1 class="ss-title">${esc(title)}</h1><p class="ss-subtitle">${esc(subtitle)}</p></div><div class="v2-actions">${actions}</div></header>`;
}
function icpFields(w,icp){
  const {firmographics:f}=icp;
  const textarea=(key,label,value)=>`<label>${label}<textarea rows="3" name="${key}">${esc(Array.isArray(value)?value.join('\n'):value||'')}</textarea></label>`;
  const number=(key,label)=>`<label>${label}<input type="number" name="${key}" min="0" value="${esc(f[key]??'')}"></label>`;
  const inputs=[textarea('industries','Industries',f.industries),number('employeeMin','Minimum employees'),number('employeeMax','Maximum employees'),
    textarea('geographies','Geographies',f.geographies),textarea('fundingStages','Funding stages',f.fundingStages),textarea('technologies','Tech stack',f.technologies),
    textarea('buyerPersonas','Buyer roles',icp.buyerPersonas),textarea('exclusions','Exclusions',icp.exclusions)];
  const triggers=(playbookFor(w)?.triggers||[]).map(rule=>{
    const days=icp.queryRules.find(row=>row.triggerId===rule.id)?.freshnessDays||rule.freshnessDays;
    return `<div class="v2-trigger-rule"><label><input type="checkbox" name="triggerId" value="${esc(rule.id)}"${icp.triggerIds.includes(rule.id)?' checked':''}> ${esc(rule.label)} <small>${esc(rule.source.replaceAll('_',' '))}</small></label><label>Freshness (days)<input name="days.${esc(rule.id)}" min="7" max="180" type="number" value="${esc(days)}"></label></div>`;
  }).join('');
  const receipts=(icp.receipts||[]).map(row=>`<li>${link(row.sourceUrl,'Open seller receipt')}<blockquote>${esc(row.quote)}</blockquote></li>`).join('');
  const revision=hidden('workspaceId',w.id)+hidden('id',icp.id)+hidden('version',icp.version);
  const approve=icp.status!=='approved'&&w.status==='active'?`<form method="post" action="/icp-studio/approve" class="v2-review-form">${revision}<label><input name="acknowledged" type="checkbox" required> I reviewed this ICP and its evidence.</label><button class="ss-btn primary">Approve ICP</button></form>`:'';
  return `<section class="panel v2-icp"><div class="work-section-head"><h2>${esc(icp.name)}</h2>${badge(`v${icp.version} · ${icp.status==='approved'?'Approved':'Needs review'}`,icp.status==='approved'?'ready':'review')}</div>
    <form method="post" action="/icp-studio/save">${revision}
      <div class="v2-fields"><label>ICP name<input name="name" required maxlength="120" value="${esc(icp.name)}"></label>${textarea('description','Description',icp.description)}${inputs.join('')}</div>
      <fieldset class="v2-rules"><legend>Playbook triggers and query windows</legend>${triggers||'<p>Save a playbook to link trigger rules.</p>'}</fieldset>
      <button class="ss-btn">Save review revision</button>
    </form>
    <details><summary>Seller receipts (${icp.receipts.length})</summary>${receipts?`<ul>${receipts}</ul>`:'<p>No segment-specific receipt was saved.</p>'}</details>
    ${approve}</section>`;
}
function icpStudio(state,params=new URLSearchParams(),error=''){
  const w=current(state),rows=w?workspaceIcps(w):[],selected=rows.find(row=>row.id===params.get('icp'))||rows[0];
  const title=heading('ICP Studio','Review who each segment targets and which playbook signals discovery should search for.','<a class="ss-btn" href="/onboarding/profile">Seller profile &amp; playbook</a>');
  if(!selected)return page(state,'ICP Studio','/icp-studio',title+'<section class="panel"><p>No ICPs yet. Save seller research with customer segments to create review drafts.</p><a class="ss-btn primary" href="/onboarding">Research a seller</a></section>');
  const list=rows.map(row=>chip(row.name,'/icp-studio?'+new URLSearchParams({icp:row.id}),row.id===selected.id)).join('');
  const history=(w.icpHistory||[]).filter(row=>row.id===selected.id).toReversed();
  const historyPanel=history.length?`<section class="panel"><h2>Version history</h2><ul>${history.map(row=>`<li>v${row.version} · ${esc(row.name)} · ${esc(row.status==='approved'?'Approved':'Needs review')}</li>`).join('')}</ul></section>`:'';
  return page(state,'ICP Studio','/icp-studio',title+feedback(error)+`<nav class="v2-chips" aria-label="Ideal customer profiles">${list}</nav>`+icpFields(w,selected)+historyPanel);
}
function priorityLeads(state,params=new URLSearchParams()){
  const w=current(state),now=new Date(),title=heading('Priority leads','Work through saved companies by timing, fit and review status.','<a class="ss-btn" href="/today">Today</a><a class="ss-btn" href="/results">Results</a>');
  if(!w)return page(state,'Priority leads','/review-queue',title+'<p>Choose a workspace to see priority leads.</p>');
  const queue=todaySections(w,now),compare=(a,b)=>Number(b.fitScore||0)-Number(a.fitScore||0)||String(a.name).localeCompare(String(b.name));
  const eligible=w.accounts.filter(row=>!row.kills?.length&&row.killStatus!=='killed'&&!['skipped','archived'].includes(row.status));
  const ordered=[...new Map([...queue.actNow,...queue.worthResearching,...queue.topProspects,...eligible.slice().sort(compare),...queue.needsReview].map(row=>[row.id,row])).values()];
  const review=new Set(queue.needsReview.map(row=>row.id));
  const active=new Set(queue.actNow.map(row=>row.id));
  ordered.sort((a,b)=>Number(active.has(b.id))-Number(active.has(a.id))||Number(review.has(a.id))-Number(review.has(b.id)));
  const tier=params.get('tier')||'all';
  const subset=key=>ordered.filter(row=>key==='all'||key==='review'&&review.has(row.id)||Number(key)===Number(row.tier));
  const filtered=subset(tier),selected=filtered.find(row=>row.id===params.get('lead'))||filtered[0];
  const href=(lead,key,tab)=>'/review-queue?'+new URLSearchParams({tier:key||tier,...(lead?{lead}:{}),...(tab?{tab}:{})});
  const pills=[['all','All tiers'],['1','Tier 1'],['2','Tier 2'],['3','Tier 3'],['review','Needs review']].map(([key,label])=>chip(`${label} · ${subset(key).length}`,href('',key),tier===key)).join('');
  const rules=playbookFor(w)?.triggers||[];
  const cards=filtered.map(row=>{
    const event=latestTrigger(row,now),label=event&&(rules.find(rule=>rule.id===event.metadata?.playbookTriggerId)?.label||String(event.type||'Signal').replaceAll('_',' '));
    const status=review.has(row.id)||needsReviewReason(row,now)?'Review required':contactReady(row)?'Contact path':'Needs enrichment';
    return `<a class="v2-lead ${row.id===selected?.id?'selected':''}" href="${esc(href(row.id))}"><span><small>${esc(label||'No active signal')}</small><b>${esc(row.name)}</b><span>${esc(matchedIcp(w,row)?.name||'ICP unmatched')} · ${esc(tierLabel(row))}</span>${badge(status,status==='Contact path'?'ready':'review')}</span><strong class="mini-score">${esc(row.fitScore??'—')}</strong></a>`;
  }).join('');
  const tab=['overview','outreach','evidence','score','personas'].includes(params.get('tab'))?params.get('tab'):'overview';
  let detail='<section class="panel ss-empty">No leads match this tier. Try another tier or open New discovery.</section>';
  if(selected){
    try{
      detail=accountBrief(state,w,selected,phaseAConfigForWorkspace(w),tab,{now,hrefForTab:key=>href(selected.id,tier,key)});
    }catch{
      detail=`<section class="panel"><h2>${esc(selected.name)}</h2><p>Finish the seller profile to open the scorecard.</p><a href="${accountLink(selected)}">Open account</a></section>`;
    }
  }
  return page(state,'Priority leads','/review-queue',title+`<div class="command results-layout"><aside class="lead-rail"><nav class="v2-chips" aria-label="Lead tiers">${pills}</nav><div class="v2-lead-list">${cards||'<p class="ss-empty">No leads found.</p>'}</div></aside><section class="results-detail">${detail}</section></div>`);
}
function settingsPage(state,env){
  const settings=peopleSettings(env);
  return page(state,'Settings','/settings',heading('Settings','Check the local workspace, provider switches and discovery controls.')+
    `<section class="panel"><h2>Provider switches</h2><dl class="v2-settings">${[
      ['Serper',env.SERPER_ENABLED==='true'],['Apollo company enrichment',env.APOLLO_ENABLED==='true'],['Apollo company search',env.APOLLO_ENABLED==='true'&&env.APOLLO_COMPANY_SEARCH_ENABLED==='true'],
      ['Apollo persona search',settings.enabled&&settings.cap>0],['OpenAI',env.OPENAI_ENABLED==='true'],['GDELT',env.GDELT_ENABLED==='true']
    ].map(([label,on])=>`<dt>${label}</dt><dd>${on?'Enabled':'Disabled'}</dd>`).join('')}</dl>
    <p>Persona searches per workspace per month: ${settings.cap}. Copy-only Demo mode is active.</p></section>
    <section class="panel"><h2>Manage local data</h2><div class="v2-actions"><a class="ss-btn" href="/workspaces">Workspaces</a><a class="ss-btn" href="/onboarding">Add company</a><a class="ss-btn" href="/onboarding/results">Research results</a><a class="ss-btn" href="/collectors">Collector diagnostics</a></div></section>`);
}
function exportsPage(state){
  return page(state,'Exports','/exports',heading('Exports','Download saved company rows as a file on this computer.')+
    '<section class="panel"><h2>Company results CSV</h2><p>Includes company, ICP, score, tier, receipt count and contact readiness.</p><div class="v2-actions"><a class="ss-btn primary" href="/results/export">Download CSV</a><a class="ss-btn" href="/results">Filter Results first</a></div></section>');
}
module.exports={icpStudio,priorityLeads,settingsPage,exportsPage};
