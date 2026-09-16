const { getWorkspace, updateWorkspace } = require('../server/state.cjs');
const { quoteIsGrounded } = require('../sources.cjs');
const { stableId } = require('../utils.cjs');

const FACT_FIELDS = {
  category: 'Product category', productOneLiner: 'What the company sells',
  pricingModel: 'Pricing model', targetCompanySize: 'Target company size'
};
const COLLECTIONS = {
  valueProps: 'Value propositions', proofPoints: 'Proof points', credentials: 'Credentials',
  targetIndustries: 'Target industries', customers: 'Customers', competitors: 'Competitors'
};
const WEIGHTS = {techStack:1.3, activePain:1.2, revenueSensitivity:1.1, observabilityScale:1, aiCompatibility:0.9, competitiveWedge:0.8};
const LABELS = {techStack:'Environment fit', activePain:'Active pain', revenueSensitivity:'Impact sensitivity', observabilityScale:'Operational scale', aiCompatibility:'Adoption readiness', competitiveWedge:'Competitive wedge'};
const SLAS = {form_d_filing:14,funding:30,exec_change:30,executive_departure:30,new_account_with_warm_champion:30,old_account_inherited_pain:30,hiring_surge:45,first_function_hire:45,headcount_surge:45,risk_factor_added:120,pain_event:30,public_postmortem:30,public_pain_writeup:30,buying_intent_hiring:60,function_hiring:90,internal_tool_maintenance:90,tech_adoption:90,competitor_adoption:120,conference_talk:120};

function text(value, max=2000) {
  const result = String(value ?? '').trim();
  if (result.length > max) throw new Error(`Please keep each entry under ${max} characters.`);
  return result;
}
function lines(value, max=30) {
  const values = [...new Set(text(value,10000).split(/\r?\n/).map(v=>text(v,200)).filter(Boolean))];
  if (values.length > max) throw new Error(`Use no more than ${max} entries in a list.`);
  return values;
}
function receiptUrl(value) {
  if (!value) return '';
  let url; try {url=new URL(text(value,2000));} catch {throw new Error('Use a full HTTPS source link.');}
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Source links must use HTTPS without embedded login details.');
  url.hash=''; return url.href;
}
function evidence(state, value, sourceUrl, quote, sellerDomain, customer=false) {
  const url=receiptUrl(sourceUrl), evidenceQuote=text(quote,200);
  const source=Object.values(state.sources).find(s=>s.url===url && evidenceQuote && quoteIsGrounded(state,s.id,evidenceQuote));
  let firstParty=false;
  if (url) {const host=new URL(url).hostname.replace(/^www\./,'');firstParty=host===sellerDomain || host.endsWith(`.${sellerDomain}`);}
  const verified=Boolean(source && (!customer || firstParty));
  return {schemaVersion:1,value,sourceUrl:url||null,sourceId:source?.id||null,evidenceQuote,inferred:!verified,
    verification:verified?'matched_saved_quote':url?'linked_unverified':'no_source',
    reason:verified?'Quote matched saved source text.':customer && url && !firstParty?'Customer claim needs the seller’s own public source.':url?'Link supplied; claim has not been verified against saved source text.':'No supporting source supplied.'};
}
function rows(form, group, max=30) {
  const indexes=[...new Set([...form.keys()].flatMap(key=>{const match=key.match(new RegExp(`^${group}\\.(\\d+)\\.`));return match?[Number(match[1])]:[];}))].sort((a,b)=>a-b);
  if(indexes.length>max)throw new Error(`Too many ${group} entries.`);
  return indexes.map(index=>Object.fromEntries([...form].filter(([key])=>key.startsWith(`${group}.${index}.`)).map(([key,value])=>[key.slice(`${group}.${index}.`.length),value])));
}
function strategyQueries(label) {
  // Search strategies, not claims about any existing company.
  return [`${label} companies`, `${label} industry directory`, `${label} company funding`, `${label} companies hiring`];
}
function draftFromForm(state, workspace, form, now=()=>new Date().toISOString()) {
  const selected=workspace.onboarding?.selectedCandidate;
  if (!selected) throw new Error('Choose a seller company before editing its profile.');
  const evidenceMap={};
  const profile={schemaVersion:1,sellerName:selected.name,domain:selected.domain,deliveryAllowed:false,generatedAt:null,approvedAt:null,updatedAt:now(),sources:[]};
  for(const key of Object.keys(FACT_FIELDS)) {
    const value=text(form.get(key));profile[key]=value;
    evidenceMap[key]=evidence(state,value,form.get(`${key}.url`),form.get(`${key}.quote`),selected.domain);
  }
  for(const group of Object.keys(COLLECTIONS)) {
    profile[group]=[];
    rows(form,group).forEach(row=>{
      const value=text(row.value);if(!value)return;
      const item=evidence(state,value,row.url,row.quote,selected.domain,group==='customers');
      const index=profile[group].length;evidenceMap[`${group}.${index}`]=item;
      if(group==='customers'||group==='competitors') {
        if(!item.sourceUrl)throw new Error(`${COLLECTIONS[group]} require a source link for every entry.`);
        let domain=text(row.domain,253).toLowerCase().replace(/^www\./,'');
        if(domain && !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/.test(domain))throw new Error('Enter a domain such as company.com, without a path.');
        if(group==='competitors'&&!domain)throw new Error('Each competitor needs its domain.');
        profile[group].push({name:value,domain:domain||null,...item});
      } else if(group==='proofPoints') profile[group].push({claim:value,...item});
      else profile[group].push(value);
    });
  }
  profile.evidence=evidenceMap;
  profile.sources=[...new Set(Object.values(evidenceMap).map(e=>e.sourceId).filter(Boolean))];
  const segments=rows(form,'segments',10).filter(row=>text(row.label)).map(row=>{
    const label=text(row.label,100),queries=lines(row.queryTemplates,8);
    if(queries.length && queries.length<4)throw new Error('Each segment needs 4–8 search phrases, or leave them blank for basic defaults.');
    return {key:stableId(label.toLowerCase()),label,enabled:true,subIndustries:lines(row.subIndustries),queryTemplates:queries.length?queries:strategyQueries(label),revenueSensitivityBase:3,wedgeCustomers:[],exampleTargets:[]};
  });
  if(new Set(segments.map(s=>s.key)).size!==segments.length)throw new Error('Give each customer segment a different name.');
  const definitions=Object.fromEntries(Object.keys(WEIGHTS).map(key=>[key,{label:LABELS[key],description:'Manual starting configuration; review before scoring.',evidenceKeywords:lines(form.get(`signals.${key}`)),negativeKeywords:[],preferredSources:[],rubric:{1:'No verified relevant evidence',3:'Some verified relevant evidence',5:'Strong verified relevant evidence'}}]));
  const floor=Number(form.get('sizeFloor')||0);
  if(!Number.isInteger(floor)||floor<0||floor>10000000)throw new Error('The minimum team size must be a whole number from 0 to 10,000,000.');
  const config={schemaVersion:1,segments,personas:{buyerTitles:lines(form.get('buyerTitles')),championTitles:lines(form.get('championTitles')),wrongOrgTitles:lines(form.get('wrongOrgTitles'))},signalDefinitions:definitions,
    triggerMapping:{pain_event:lines(form.get('painKeywords')),buying_intent:lines(form.get('buyingKeywords')),function_roles:lines(form.get('functionRoles')),tech_adoption:lines(form.get('technologies')),competitor_names:profile.competitors.map(c=>c.name)},
    killPatterns:{solvingInHouse:lines(form.get('solvingInHouse')),buildCulture:lines(form.get('buildCulture')),sizeMetric:{label:text(form.get('sizeLabel')||'employees',100),floor}},
    painSources:{statuspage:form.has('source.statuspage'),hn:form.has('source.hn'),news:form.has('source.news'),filings:form.has('source.filings')},
    pitch:{receiptOpenerStyle:'Start with a verified prospect event.',oneSentenceProduct:profile.productOneLiner,credentialLine:'',ctaStyle:'Ask permission for a brief conversation.'},
    objectionTemplates:['Acknowledge the concern and ask a clarifying question.','Use a verified proof point only when relevant.','Offer a small next step without pressure.'],
    weights:{...WEIGHTS},slaDays:{...SLAS},tierRules:{tier1:{public:true,revenue:500000000,employees:2000,valuation:5000000000},tier2:{revenue:25000000,employees:150,fundingStages:['Series A','Series B','Series C','Series D','growth','PE']},tier3:{maxEmployees:149,minRaised:2000000},unclassified:'parked'},
    defaultsReviewRequired:true};
  return {profile,config};
}
function profileWarnings(profile) {
  return Object.entries(profile.evidence||{}).filter(([,item])=>item.value&&item.inferred).map(([key,item])=>({key,value:item.value,reason:item.reason}));
}
function approvalProblems(workspace) {
  const p=workspace.sellerProfile,c=workspace.icpConfig,errors=[];
  if(!workspace.onboarding?.selectedCandidate)errors.push('Choose the seller company.');
  if(!p.category)errors.push('Add the product category.');
  if(!p.productOneLiner)errors.push('Describe what the company sells.');
  if(!p.targetCompanySize)errors.push('Describe the target company size.');
  if(!p.targetIndustries?.length)errors.push('Add at least one target industry.');
  if(!c.segments || c.segments.length<3 || c.segments.length>10)errors.push('Add 3–10 customer segments.');
  if(!c.personas?.buyerTitles?.length)errors.push('Add at least one buyer role.');
  if(!c.personas?.championTitles?.length)errors.push('Add at least one champion role.');
  return errors;
}
function checkRevision(workspace,revision) {
  if(!['draft','needs_review','active'].includes(workspace.status))throw new Error('This workspace cannot be edited.');
  if(String(workspace.profileRevision||0)!==String(revision))throw new Error('The profile changed in another tab. Refresh before saving or approving.');
}
function saveManualProfile(state,id,form,{now=()=>new Date().toISOString()}={}) {
  const workspace=getWorkspace(state,id);checkRevision(workspace,form.get('revision'));
  const {profile,config}=draftFromForm(state,workspace,form,now);
  return updateWorkspace(state,id,w=>{w.sellerProfile=profile;w.icpConfig=config;w.status='needs_review';w.profileRevision=(w.profileRevision||0)+1;w.deliveryMode='demo';});
}
function approveManualProfile(state,id,{revision,acknowledged=false,now=()=>new Date().toISOString()}={}) {
  const workspace=getWorkspace(state,id);checkRevision(workspace,revision);
  if(workspace.status!=='needs_review')throw new Error('Save a draft before approving it.');
  const errors=approvalProblems(workspace);if(errors.length)throw new Error(errors.join(' '));
  if(!acknowledged)throw new Error('Confirm that you reviewed the profile, defaults and unverified claims.');
  const next=updateWorkspace(state,id,w=>{
    w.status='active';w.sellerProfile.approvedAt=now();w.sellerProfile.deliveryAllowed=false;
    w.icpConfig.defaultsReviewRequired=false;w.deliveryMode='demo';w.profileRevision+=1;
  });
  next.auditLog.push({schemaVersion:1,id:stableId(`${id}:${next.workspaces[id].profileRevision}`),workspaceId:id,type:'seller_profile_approved',occurredAt:now(),profileRevision:next.workspaces[id].profileRevision,actor:'local-admin',unverifiedClaims:profileWarnings(workspace.sellerProfile).length});
  return next;
}
module.exports={FACT_FIELDS,COLLECTIONS,WEIGHTS,LABELS,SLAS,profileWarnings,approvalProblems,saveManualProfile,approveManualProfile,draftFromForm};
