'use strict';

const {esc}=require('../utils.cjs');
const {shell}=require('./pages.cjs');
const {link,date,accountLink,badge}=require('./results.cjs');
const {icpSummary}=require('./targeting-pages.cjs');
const {STAGES,ACTIVE,terminal,work,discoveryRuns,pipelineModel,queueSnapshot,stageStates}=require('../pipeline.cjs');
const {approvalProblems,blockingQualityFindings}=require('../onboarding/manual-profile.cjs');
const {validatePlaybook}=require('../playbook.cjs');

const hidden=(name,value)=>`<input type="hidden" name="${esc(name)}" value="${esc(value)}">`;
const btn=(href,label,primary=false)=>`<a class="ss-btn${primary?' primary':''}" href="${esc(href)}">${esc(label)}</a>`;
const href=(step,opts={})=>'/pipeline?'+new URLSearchParams({step,...opts});
const guided=hidden('guided','1');
function action(url,fields,label){
  return `<form method="post" action="${url}">${guided}${Object.entries(fields).map(([key,value])=>hidden(key,value)).join('')}<button class="ss-btn primary">${esc(label)}</button></form>`;
}
function evidenceLinks(research){
  return (research?.sources||[]).slice(0,5).map(row=>`<li>${link(row.sourceId?'/sources/'+row.sourceId:row.url,row.title||row.url)}</li>`).join('');
}
function overview(profile={}){
  return `<p>${esc(profile.productOneLiner||profile.oneLiner||'Product summary pending.')}</p><div class="v21-stat-grid">${[['Customers',profile.customers?.length||0],['Competitors',profile.competitors?.length||0],['Target size',profile.targetCompanySize||'To review']].map(([label,n])=>`<div><small>${label}</small><strong>${esc(n)}</strong></div>`).join('')}</div>`;
}
function profileStep(w){
  const p=w.sellerProfile,errors=approvalProblems(w),blocking=blockingQualityFindings(w);
  if(w.status==='active')return overview(p)+btn('/onboarding/profile','Open seller profile');
  return overview(p)+btn('/onboarding/profile','Edit seller facts and receipts')+
    `<form method="post" action="/onboarding/profile/approve" class="v21-guide-form">${guided}${hidden('workspaceId',w.id)}${hidden('revision',w.profileRevision)}
      ${errors.map(message=>`<p class="notice">${esc(message)}</p>`).join('')}
      ${blocking.map(row=>`<label>${esc(row.message)}<textarea name="qualityReason.${esc(row.id)}" required minlength="10" maxlength="500" rows="2"></textarea></label>`).join('')}
      <label><input type="checkbox" name="acknowledged" required> I reviewed the saved seller facts and their sources.</label><button class="ss-btn primary" ${errors.length?'disabled':''}>Approve seller profile</button></form>`;
}
function icpStep(w,icps){
  const proposals=icps.filter(row=>row.status!=='approved');
  return `<ul class="v21-step-items">${icps.map(row=>`<li><div><b>${esc(row.name)}</b><p>${esc(icpSummary(row))}</p></div>${badge(row.status==='approved'?'Approved':'Needs review',row.status==='approved'?'ready':'review')}</li>`).join('')}</ul>`+
    btn('/icp-studio','Open ICP Studio')+(proposals.length?`<form class="v21-guide-form" method="post" action="/pipeline/icps/approve">${hidden('workspaceId',w.id)}${hidden('profileRevision',w.profileRevision)}
      ${proposals.map(row=>hidden('icpVersion',row.id+':'+row.version)).join('')}
      <label><input type="checkbox" name="acknowledged" required> I reviewed these ICP versions and their evidence.</label><button class="ss-btn primary">Approve ICPs</button></form>`:'');
}
function playbookStep(w,readOnly=false){
  const playbook=w.sellerProfile.playbook;
  if(!playbook)return '<p>No saved playbook yet.</p>'+(!readOnly?btn('/onboarding/profile#seller-playbook','Open playbook editor'):'');
  const warnings=validatePlaybook(playbook,playbook.receipts,w);
  const rules=`<ul class="v21-step-items">${playbook.triggers.map(row=>`<li><div><b>${esc(row.label)}</b><p>${esc(row.whyItMatters)}</p><span>${esc(row.source.replaceAll('_',' '))} · ${esc(row.freshnessDays)} days · ${esc(row.strength)}</span>
       ${(row.receiptIds||[]).map(id=>playbook.receipts?.[id]).filter(Boolean).map(receipt=>`<span> · ${link(receipt.sourceId?'/sources/'+receipt.sourceId:receipt.sourceUrl,'Receipt')}</span>`).join('')}</div></li>`).join('')}</ul>`;
  if(readOnly)return rules;
  return rules+btn('/onboarding/profile#seller-playbook','Open playbook editor')+
    (warnings.length?`<ul>${warnings.map(row=>`<li>${esc(row.message)}</li>`).join('')}</ul>`:'')+
    (playbook.status==='approved'?'':`<form class="v21-guide-form" method="post" action="/onboarding/playbook/approve">${guided}${hidden('workspaceId',w.id)}
     ${hidden('profileRevision',w.profileRevision)}${hidden('revision',playbook.version)}<label><input type="checkbox" name="acknowledged" required> I reviewed the timing rules and their receipts.</label><button class="ss-btn primary" ${warnings.length?'disabled':''}>Approve playbook</button></form>`);
}
function researchStep(w){
  const research=w.research,base={workspaceId:w.id};
  const running=ACTIVE.includes(research?.status)||ACTIVE.includes(research?.synthesisJob?.status);
  if(running)return '<p role="status" data-guide-wait>Research is running in the background. Results will appear here.</p>';
  if(research?.status==='confirmation_required')return `<p>Choose the seller’s official company page.</p><ul class="v21-step-items">${(research.candidates||[]).map(c=>`<li><div><b>${esc(c.name)}</b><p>${esc(c.domain)}</p></div>${action('/onboarding/research/confirm',{...base,candidateId:c.id,revision:research.revision},'Confirm')}</li>`).join('')}</ul>`;
  if(w.profileRevision)return `<p>${research?.sources?.length||0} saved seller pages.</p><ul>${evidenceLinks(research)}</ul>`;
  if(research?.status==='evidence_ready')return `<p>${research.sources?.length||0} public pages are ready.</p><ul>${evidenceLinks(research)}</ul>`+action('/onboarding/research/generate',base,'Generate profile draft');
  return `<p>${esc(research?.error?.message||'Save research or use manual entry to continue.')}</p>`+action('/onboarding/research/retry',base,'Retry research')+btn('/onboarding/manual','Manual seller entry');
}
function stats(snapshot,scoring=false){
  const labels=scoring?[['Scored accounts',snapshot.scored],...snapshot.tiers.map((n,i)=>['Tier '+(i+1),n])]:
    [['Act now',snapshot.counts.actNow],['Top prospects',snapshot.counts.topProspects],['Needs review',snapshot.counts.needsReview],['Killed',snapshot.counts.killed]];
  return `<div class="v21-stat-grid">${labels.map(([label,n])=>`<div><small>${label}</small><strong>${n}</strong></div>`).join('')}</div>`;
}
function resultsStep(snapshot){
  return stats(snapshot)+`<h2>Top accounts</h2><ol class="v21-step-items">${snapshot.top.map(row=>`<li><div><a href="${accountLink(row)}"><b>${esc(row.name)}</b></a><p>${esc(row.evidence.line)}</p>${link(row.evidence.receipt,'Receipt')}</div><strong>${esc(row.fit??'—')}</strong></li>`).join('')||'<li>No ranked accounts are saved for this run.</li>'}</ol>`+btn('/results','Open dashboard',true);
}
function discoveryStep(w,run,replay){
  const running=ACTIVE.includes(run?.status),completed=terminal(run);
  const info=run?`<p>${Number.isInteger(run.serperQueries)?run.serperQueries+' searches used. ':''}${run.rawFound??run.progress?.candidates??0} candidates found. ${run.newAccounts??run.progress?.verified??0} saved.</p>`:'<p>Search the approved ICPs and playbook triggers for companies with public evidence.</p>';
  if(replay||completed)return info+btn('/results?tab=queries','View saved queries');
  if(running)return info+'<p role="status" data-guide-wait>Discovery is running in the background.</p>';
  return info+action('/pipeline/discovery',{workspaceId:w.id},'Start discovery');
}
function pipelinePage(state,query=new URLSearchParams(),error=''){
  const w=work(state),model=pipelineModel(w,query.get('step'));
  const saved=discoveryRuns(w).find(run=>terminal(run)&&(!query.get('run')||query.get('run')===run.id));
  const replay=query.get('mode')==='replay'&&Boolean(saved);
  const step=replay?Math.max(1,Math.min(STAGES.length,Math.trunc(Number(query.get('step')))||1)):model.step;
  const replayParams=replay?{mode:'replay',run:saved.id}:{};
  const links=stageStates(replay?step:model.current,false,false);
  const stageList=links.map((item,i)=>{
    const n=i+1,status=n===step?'Current':replay?item.status: n<model.current?'Done':'Locked';
    const label=`<span class="v21-step-icon">${status==='Done'?'✓':n}</span><span>${esc(item.name)}</span>`;
    return status==='Locked'?`<span class="v21-step locked">${label}</span>`:`<a class="v21-step ${status.toLowerCase()}" href="${esc(href(n,replayParams))}"${n===step?' aria-current="step"':''}>${label}</a>`;
  }).join('');
  const run=replay?saved:model.run,snapshot=w?queueSnapshot(w,run):null;
  let body;
  if(step===1)body=replay?`<p>Saved workspace · <b>${esc(w.name)}</b></p>`:`<form class="v21-guide-form" method="post" action="/onboarding/start">${guided}<label>Company name <input name="name" required maxlength="120" placeholder="Enter the company you sell for"></label><button class="ss-btn primary">Continue</button></form>`;
  if(step===2)body=replay?`<p>${w.research?.sources?.length||0} seller pages saved.</p><ul>${evidenceLinks(w.research)}</ul>`:researchStep(w);
  if(step===3)body=replay?overview(w.sellerProfile):profileStep(w);
  if(step===4)body=replay?`<ul class="v21-step-items">${model.icps.map(i=>`<li><div><b>${esc(i.name)}</b><p>${esc(icpSummary(i))}</p></div></li>`).join('')}</ul>`:icpStep(w,model.icps);
  if(step===5)body=playbookStep(w,replay);
  if(step===6)body=discoveryStep(w,run,replay);
  if(step===7)body=stats(snapshot,true)+'<p>Fit scores and tiers come from the saved discovery results.</p>';
  if(step===8)body=resultsStep(snapshot);
  const autoplay=replay&&query.get('play')==='1'&&step<STAGES.length;
  const next=replay||step<model.current?step<STAGES.length?href(step+1,replayParams):'':'';
  return shell(state,`<div class="ss-page v21-guide" ${replay?`data-replay-step="${step}" data-replay-run="${esc(saved.id)}"`:''} ${autoplay?`data-replay-next="${esc(href(step+1,{...replayParams,play:'1'}))}"`:''}>
    <header class="ss-header"><div><h1 class="ss-title">Guided pipeline</h1>${replay?`<p class="ss-subtitle">Replay of saved run ${esc(date(saved.finishedAt||saved.startedAt))}</p>`:''}</div>
    <div class="v2-actions">${replay?btn(href(step,replayParams),autoplay?'Pause replay':'Step by step')+(!autoplay&&step<8?btn(href(step,{...replayParams,play:'1'}),'Play replay'):btn('/pipeline','Exit replay')):saved?btn(href(1,{mode:'replay',run:saved.id,play:'1'}),'Replay pipeline'):''}</div></header>
    <nav class="v21-stepper" aria-label="Pipeline stages">${stageList}</nav>
    ${error?`<p class="notice" role="alert">${esc(error)}</p>`:''}
    <section class="panel v21-guide-card"><h2>${esc(STAGES[step-1])}</h2>${body}<div class="v2-actions v21-guide-nav">${step>1?btn(href(step-1,replayParams),'Back'):''}${next?btn(next,'Continue',true):''}</div></section></div>`,'Guided pipeline','/pipeline');
}
module.exports={pipelinePage};
