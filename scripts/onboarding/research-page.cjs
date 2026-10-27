const {esc}=require('../utils.cjs');
const {getWorkspace}=require('../server/state.cjs');
const {shell}=require('../server/pages.cjs');

const ACTIVE_STATUSES=new Set(['queued','identifying','researching']);
const STATUS_LABELS={
  not_started:'Not started',pending:'Waiting',running:'In progress',complete:'Complete',
  failed:'Needs attention',configuration_required:'Setup required',waiting_for_confirmation:'Waiting for you'
};

function providerCopy(providers={}) {
  if(providers.serperReady)return 'Serper search is ready with local safety limits. You will confirm the company before any public pages are collected.';
  return 'Serper setup is not complete. Add the key only to the local .env file; never paste it into chat or commit it to GitHub.';
}

function nameEntryPage(state,{error='',name='',providers={}}={}) {
  return shell(state,`<div class="ss-page ss-discovery-page"><div class="page-header"><div><div class="page-kicker">New seller · Demo mode</div><h1 class="page-title">Who are you selling for?</h1><p class="page-subtitle">Start with a company name. Review its public evidence and ideal customer profile before approval.</p></div></div>${error?`<p role="alert">${esc(error)}</p>`:''}<section class="panel ss-composer-wrap"><form method="post" action="/onboarding/start"><label for="company-name">Company name</label><div class="row"><input id="company-name" name="name" required maxlength="120" placeholder="e.g. Vercel" value="${esc(name)}"><button>Continue</button></div></form><p>${esc(providerCopy(providers))}</p><p>OpenAI drafting is ${providers.openAiReady?'ready behind an explicit button':'off, so no paid AI request will run'}.</p></section><details><summary>Manual fallback</summary><p>You can still enter a company website and profile yourself.</p><a href="/onboarding/manual">Choose a company manually</a></details></div>`,'Seller onboarding');
}

function postForm(action,workspace,fields,label) {
  return `<form method="post" action="${action}"><input type="hidden" name="workspaceId" value="${esc(workspace.id)}">${Object.entries(fields).map(([name,value])=>`<input type="hidden" name="${esc(name)}" value="${esc(value)}">`).join('')}<button>${esc(label)}</button></form>`;
}

function candidates(workspace,research) {
  if(research.status!=='confirmation_required'||!research.candidates?.length)return '';
  return `<section class="card"><h2>Choose the right company</h2><p>These are search matches, not verified facts. Check the website and choose one before collection starts.</p>${research.candidates.map(candidate=>`<article class="candidate"><h3>${esc(candidate.name)}</h3><p>${esc(candidate.domain)}</p>${candidate.description?`<p>${esc(candidate.description)}</p>`:''}<a href="${esc(candidate.sourceUrl||candidate.website)}" target="_blank" rel="noreferrer">Open possible official website</a>${postForm('/onboarding/research/confirm',workspace,{candidateId:candidate.id,revision:research.revision},'Use this company')}</article>`).join('')}</section>`;
}

function progress(research) {
  const events=(Array.isArray(research.progressEvents)?research.progressEvents:[]).slice(-8).reverse();
  const activity=events.length?`<details ${ACTIVE_STATUSES.has(research.status)?'open':''}><summary>Recent research activity</summary><ol class="activity">${events.map(event=>`<li><span>${esc(event.message||String(event.type||'Research update').replaceAll('_',' '))}</span><small>${esc(event.pagesSaved||0)} saved · ${esc(event.pagesAttempted||0)} checked${event.at?` · ${esc(event.at)}`:''}</small></li>`).join('')}</ol></details>`:'';
  return `<section class="card"><h2>Research progress</h2><ol class="steps">${(research.steps||[]).map(step=>`<li><strong>${esc(step.label)}</strong><span>${esc(STATUS_LABELS[step.status]||String(step.status||'Not started').replaceAll('_',' '))}</span>${step.message?`<small>${esc(step.message)}</small>`:''}</li>`).join('')}</ol>${activity}</section>`;
}

function evidence(research) {
  const sources=Array.isArray(research.sources)?research.sources:[];
  if(!sources.length)return '<section class="card"><h2>Saved public evidence</h2><p>No readable pages have been saved yet.</p></section>';
  return `<section class="card"><h2>Saved public evidence</h2><p>${sources.length} page${sources.length===1?'':'s'} saved for this research run. Search snippets are not used as proof.</p><ul>${sources.map(source=>`<li><a href="/sources/${esc(typeof source==='string'?source:source.sourceId)}">${esc(source.title||source.url||'Saved page')}</a>${source.fetchedAt?` — fetched ${esc(source.fetchedAt)}`:''}</li>`).join('')}</ul>${research.pageErrors?.length?`<details><summary>${research.pageErrors.length} page${research.pageErrors.length===1?'':'s'} could not be used</summary><ul>${research.pageErrors.map(item=>`<li>${esc(item.url)} — ${esc(item.message)}</li>`).join('')}</ul></details>`:''}</section>`;
}

function draftAndReview(workspace,research,providers) {
  if(research.status==='review_required'||workspace.status==='needs_review'||workspace.status==='active') {
    const profile=workspace.sellerProfile||{},segments=workspace.icpConfig?.segments||[],report=research.synthesis?.report;
    return `<section class="card"><h2>Draft ready for your review</h2><p><strong>${esc(profile.productOneLiner||'No product summary was supported')}</strong></p><p>Category: ${esc(profile.category||'Not supported by the saved evidence')}</p><p>${segments.length} proposed customer segment${segments.length===1?'':'s'}. ${report?`${Math.round((report.receiptCoverage||0)*100)}% of attempted factual claims had matched receipts; unsupported customer and competitor claims were removed.`:'Every saved fact keeps its evidence label.'}</p><a href="/onboarding/profile">Review, edit and approve the draft</a></section>`;
  }
  if(research.status!=='evidence_ready')return '<section class="card"><h2>Seller facts and ideal customers</h2><p>No generated draft yet. Nothing can be approved until evidence collection finishes.</p></section>';
  const job=research.synthesisJob;
  if(job?.status==='running')return '<section class="card" role="status"><h2>Drafting from saved evidence</h2><p>OpenAI is checking the bounded evidence packet. This does not approve the profile.</p></section>';
  if(!providers.openAiReady)return `<section class="card"><h2>Evidence is ready</h2><p>The public pages are saved. Paid OpenAI drafting remains off, so no AI request has been made.</p><p>You can review the sources now, use the manual fallback, or enable OpenAI later with your own key and approved limits.</p>${job?.error?`<p role="alert">${esc(job.error.message)}</p>`:''}<a href="/onboarding/manual">Use the manual profile fallback</a></section>`;
  return `<section class="card"><h2>Generate a reviewable draft</h2><p>This sends only bounded saved excerpts to the approved model. The result still needs your review and cannot send outreach.</p>${job?.error?`<p role="alert">${esc(job.error.message)}</p>`:''}${postForm('/onboarding/research/generate',workspace,{},job?.status==='failed'?'Try drafting again':'Generate seller facts and ideal customers')}</section>`;
}

function statusCard(workspace,research,providers) {
  const selected=research.selectedCandidate;
  if(research.status==='configuration_required')return `<section class="card"><h2>Serper setup needed</h2><p>${esc(research.error?.message||providerCopy(providers))}</p><p>The request is saved and no search was charged. Put the key after <code>SERPER_API_KEY=</code> in the local .env file, restart WhyNow, then retry.</p>${providers.serperReady?postForm('/onboarding/research/retry',workspace,{},'Retry research'):''}</section>`;
  if(research.status==='failed')return `<section class="card"><h2>Research needs attention</h2><p role="alert">${esc(research.error?.message||'Research could not complete.')}</p>${providers.serperReady?postForm('/onboarding/research/retry',workspace,{},'Retry within the saved limits'):''}</section>`;
  if(research.status==='confirmation_required')return '<section class="card" role="status"><h2>Company confirmation required</h2><p>Research is paused until you choose the correct official company.</p></section>';
  if(ACTIVE_STATUSES.has(research.status))return `<section class="card" role="status"><h2>${research.status==='researching'?'Collecting public evidence':'Finding the official company'}</h2><p>This runs on your computer. It uses no more than four Serper searches and twenty public pages for one run.</p></section>`;
  if(selected)return `<section class="card"><h2>${esc(selected.name)}</h2><p>${esc(selected.domain)} · confirmed for this workspace</p></section>`;
  return '<section class="card"><h2>Research request saved</h2><p>The company name is saved. Research has not started yet.</p></section>';
}

function researchPage(state,{error='',providers={}}={}) {
  const workspace=state.activeWorkspaceId?getWorkspace(state,state.activeWorkspaceId):null;
  if(!workspace?.research)return shell(state,'<h1>Research results</h1><p>No research request in this workspace.</p><a href="/onboarding">Enter a company name</a>','Research results');
  const research=workspace.research,autoRefresh=ACTIVE_STATUSES.has(research.status)||research.synthesisJob?.status==='running';
  const body=`<style>.steps,.activity{padding:0;list-style:none}.steps li{display:grid;grid-template-columns:minmax(220px,1fr) auto;gap:6px 20px;padding:14px 0;border-bottom:1px solid var(--line)}.steps small{grid-column:1/-1;color:var(--muted)}.activity li{display:grid;gap:4px;padding:10px 0;border-bottom:1px solid var(--line)}.activity small{color:var(--muted)}.candidate{padding:18px 0;border-bottom:1px solid var(--line)}code{background:#eef2fa;padding:2px 5px;border-radius:4px}</style><div class="ss-page research-page"><div class="page-header"><div><div class="page-kicker">Seller research</div><h1 class="page-title">${esc(research.companyName)}</h1><p class="page-subtitle">Saved public evidence and drafting progress for ${esc(workspace.name)}.</p></div><a class="button" href="/onboarding/profile">Review seller profile</a></div>${error?`<p role="alert">${esc(error)}</p>`:''}${statusCard(workspace,research,providers)}${candidates(workspace,research)}${progress(research)}${evidence(research)}${draftAndReview(workspace,research,providers)}<p><a href="/onboarding">Research another company</a></p><details><summary>Manual fallback</summary><p>Manual entries remain separate and still need review.</p><a href="/onboarding/manual">Choose or edit the company manually</a></details>${autoRefresh?'<script>setTimeout(()=>location.reload(),2000)</script>':''}</div>`;
  return shell(state,body,'Research results');
}

module.exports={nameEntryPage,researchPage};
