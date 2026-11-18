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
const TIER_RULES = Object.freeze({
  tier1:Object.freeze({public:true,revenue:500000000,employees:2000,valuation:5000000000}),
  tier2:Object.freeze({revenue:25000000,employees:150,fundingStages:Object.freeze(['Series A','Series B','Series C','Series D','growth','PE'])}),
  tier3:Object.freeze({maxEmployees:149,minRaised:2000000}),
  unclassified:'parked'
});

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
  const quality=source?require('./validate.cjs').receiptQuality(value,evidenceQuote,url):null;
  const verified=Boolean(source && quality?.ok && (!customer || firstParty));
  return {schemaVersion:1,value,sourceUrl:url||null,sourceId:source?.id||null,evidenceQuote,inferred:!verified,
    verification:verified?'matched_saved_quote':url?'linked_unverified':'no_source',
    reason:verified?'Quote matched saved source text and passed contextual quality checks.':customer && url && !firstParty?'Customer claim needs the seller’s own public source.':quality&&!quality.ok?quality.reason:url?'Link supplied; claim has not been verified against saved source text.':'No supporting source supplied.'};
}
function field(form,name,fallback='') {
  return form.has(name)?form.get(name):fallback;
}
function numberSetting(form,name,fallback,{label,min=0,max=Number.MAX_SAFE_INTEGER,integer=false}={}) {
  const raw=String(field(form,name,String(fallback))).trim(),value=Number(raw);
  if(!raw||!Number.isFinite(value)||(integer&&!Number.isInteger(value))||value<min||value>max) {
    const kind=integer?'a whole number':'a number';
    throw new Error(`${label} must be ${kind} from ${min} to ${max}.`);
  }
  return value;
}
function rows(form, group, max=30) {
  const escaped=group.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const indexes=[...new Set([...form.keys()].flatMap(key=>{const match=key.match(new RegExp(`^${escaped}\\.(\\d+)\\.`));return match?[Number(match[1])]:[];}))].sort((a,b)=>a-b);
  if(indexes.length>max)throw new Error(`Too many ${group} entries.`);
  return indexes.map(index=>({__index:index,...Object.fromEntries([...form].filter(([key])=>key.startsWith(`${group}.${index}.`)).map(([key,value])=>[key.slice(`${group}.${index}.`.length),value]))}));
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
  if(workspace.sellerProfile.playbook)profile.playbook=require('../playbook.cjs').draftPlaybook(workspace.sellerProfile.playbook,require('../playbook.cjs').receiptsForWorkspace(state,workspace),now(),workspace.sellerProfile.playbook.version+1);
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
        const savedOrganization=workspace.sellerProfile[group]?.find(item=>item.name===value),suggestion=require('./domain-suggestions.cjs').pendingDomain(workspace,group,value);
        if(!savedOrganization?.domain&&suggestion?.domain===domain)domain=''; // A normal Save must not silently confirm a prefill.
        if(domain && !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/.test(domain))throw new Error('Enter a domain such as company.com, without a path.');
        if(group==='competitors'&&!domain)throw new Error('Each competitor needs its domain.');
        profile[group].push({name:value,domain:domain||null,...(savedOrganization?.domain===domain&&savedOrganization.domainEvidence?{domainEvidence:structuredClone(savedOrganization.domainEvidence),domainStatus:savedOrganization.domainStatus}:{}),...item});
      } else if(group==='proofPoints') profile[group].push({claim:value,...item});
      else profile[group].push(value);
    });
  }
  profile.evidence=evidenceMap;
  profile.sources=[...new Set(Object.values(evidenceMap).map(e=>e.sourceId).filter(Boolean))];
  const segments=rows(form,'segments',10).filter(row=>text(row.label)).map(row=>{
    const label=text(row.label,100),queries=lines(row.queryTemplates,8);
    if(queries.length && queries.length<4)throw new Error('Each segment needs 4–8 search phrases, or leave them blank for basic defaults.');
    const sensitivity=Number(row.revenueSensitivityBase||3);
    if(!Number.isInteger(sensitivity)||sensitivity<1||sensitivity>5)throw new Error('Each segment impact sensitivity must be a whole number from 1 to 5.');
    const savedSegment=workspace.icpConfig?.segments?.find(segment=>segment.key===stableId(label.toLowerCase()));
    const enabledRaw=String(row.enabled??savedSegment?.enabled??true).trim();
    if(!['true','false'].includes(enabledRaw))throw new Error('Each customer segment must be enabled or paused.');
    const exampleTargets=rows(form,`segments.${row.__index}.exampleTargets`,20).filter(target=>!target.remove).map(target=>{
      const name=text(target.name,200),domain=text(target.domain,253).toLowerCase().replace(/^www\./,'');
      if(!name&&!domain)return null;
      if(!name||!domain||!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/.test(domain))throw new Error('Each example target needs a name and a domain such as company.com.');
      const receipt=evidence(state,name,target.url,target.quote,selected.domain);
      return {name,domain,sourceUrl:receipt.sourceUrl,sourceId:receipt.sourceId,evidenceQuote:receipt.evidenceQuote,inferred:receipt.inferred,verification:receipt.verification,reason:receipt.reason};
    }).filter(Boolean);
    return {key:stableId(label.toLowerCase()),label,enabled:enabledRaw==='true',subIndustries:lines(row.subIndustries),queryTemplates:queries.length?queries:strategyQueries(label),revenueSensitivityBase:sensitivity,wedgeCustomers:lines(row.wedgeCustomers,20),exampleTargets};
  });
  if(new Set(segments.map(s=>s.key)).size!==segments.length)throw new Error('Give each customer segment a different name.');
  const savedDefinitions=workspace.icpConfig?.signalDefinitions||{};
  const definitions=Object.fromEntries(Object.keys(WEIGHTS).map(key=>{
    const saved=savedDefinitions[key]||{},prefix=`signals.${key}`;
    const enabledRaw=String(field(form,`${prefix}.enabled`,String(saved.enabled??true))).trim();
    if(!['true','false'].includes(enabledRaw))throw new Error(`${LABELS[key]} must be used or marked not applicable.`);
    return [key,{
      enabled:enabledRaw==='true',
      label:text(field(form,`${prefix}.label`,saved.label||LABELS[key]),100),
      description:text(field(form,`${prefix}.description`,saved.description||'Manual starting configuration; review before scoring.'),500),
      evidenceKeywords:lines(field(form,`${prefix}.evidenceKeywords`,field(form,prefix,saved.evidenceKeywords?.join('\n')||''))),
      negativeKeywords:lines(field(form,`${prefix}.negativeKeywords`,saved.negativeKeywords?.join('\n')||'')),
      preferredSources:lines(field(form,`${prefix}.preferredSources`,saved.preferredSources?.join('\n')||''),20),
      rubric:{
        1:text(field(form,`${prefix}.rubric.1`,saved.rubric?.[1]||'No verified relevant evidence'),300),
        3:text(field(form,`${prefix}.rubric.3`,saved.rubric?.[3]||'Some verified relevant evidence'),300),
        5:text(field(form,`${prefix}.rubric.5`,saved.rubric?.[5]||'Strong verified relevant evidence'),300)
      }
    }];
  }));
  const floor=Number(form.get('sizeFloor')||0);
  if(!Number.isInteger(floor)||floor<0||floor>10000000)throw new Error('The minimum team size must be a whole number from 0 to 10,000,000.');
  const savedPitch=workspace.icpConfig?.pitch||{};
  const savedOutreach=require('./messaging-proposals.cjs').messagingProposals(workspace);
  const framingLibrary=lines(field(form,'outreach.framingLibrary',(savedOutreach.framingLibrary||[
    'Use a verified change to open a practical conversation.',
    'Growing technical teams often revisit workflows as responsibilities change.'
  ]).join('\n')),8);
  if(!framingLibrary.length||framingLibrary.some(row=>!/[.!?]$/.test(row)))throw new Error('Add at least one complete outreach framing sentence ending in punctuation.');
  const closingQuestions=lines(field(form,'outreach.closingQuestions',(savedOutreach.closingQuestions||[
    'Would it be worth a look at how this could help keep investigations from slowing on-call and deployment work?',
    'Worth a quick look at how this could support your on-call rotation?',
    'Worth a look at where this could support your on-call and incident workflows?'
  ]).join('\n')),3);
  if(closingQuestions.length!==3||closingQuestions.some(row=>!row.endsWith('?'))||new Set(closingQuestions.map(row=>row.toLowerCase())).size!==3)throw new Error('Keep exactly three different approved closing questions.');
  const objectionDefaults=['Acknowledge the concern and ask a clarifying question.','Use a verified proof point only when relevant.','Offer a small next step without pressure.'];
  const objectionTemplates=[0,1,2].map(index=>text(field(form,`objectionTemplates.${index}`,workspace.icpConfig?.objectionTemplates?.[index]||objectionDefaults[index]),500));
  if(objectionTemplates.some(item=>!item)||new Set(objectionTemplates.map(item=>item.toLowerCase())).size!==3)throw new Error('Keep three different objection response guidelines.');
  const savedWeights=workspace.icpConfig?.weights||{};
  const weights=Object.fromEntries(Object.keys(WEIGHTS).map(key=>[key,numberSetting(form,`weights.${key}`,savedWeights[key]??WEIGHTS[key],{label:`${LABELS[key]} scoring weight`,min:0.01,max:100})]));
  const savedSlas=workspace.icpConfig?.slaDays||{};
  const slaDays=Object.fromEntries(Object.keys(SLAS).map(key=>[key,numberSetting(form,`slaDays.${key}`,savedSlas[key]??SLAS[key],{label:`${key.replaceAll('_',' ')} time window`,min:1,max:3650,integer:true})]));
  const savedTiers=workspace.icpConfig?.tierRules||{};
  const tierOne=savedTiers.tier1||{},tierTwo=savedTiers.tier2||{},tierThree=savedTiers.tier3||{};
  const publicRaw=String(field(form,'tierRules.tier1.public',String(tierOne.public??TIER_RULES.tier1.public))).trim();
  if(!['true','false'].includes(publicRaw))throw new Error('Tier 1 public-company rule must be true or false.');
  const tierRules={
    tier1:{
      public:publicRaw==='true',
      revenue:numberSetting(form,'tierRules.tier1.revenue',tierOne.revenue??TIER_RULES.tier1.revenue,{label:'Tier 1 revenue threshold',min:0,integer:true}),
      employees:numberSetting(form,'tierRules.tier1.employees',tierOne.employees??TIER_RULES.tier1.employees,{label:'Tier 1 employee threshold',min:0,max:10000000,integer:true}),
      valuation:numberSetting(form,'tierRules.tier1.valuation',tierOne.valuation??TIER_RULES.tier1.valuation,{label:'Tier 1 valuation threshold',min:0,integer:true})
    },
    tier2:{
      revenue:numberSetting(form,'tierRules.tier2.revenue',tierTwo.revenue??TIER_RULES.tier2.revenue,{label:'Tier 2 revenue threshold',min:0,integer:true}),
      employees:numberSetting(form,'tierRules.tier2.employees',tierTwo.employees??TIER_RULES.tier2.employees,{label:'Tier 2 employee threshold',min:0,max:10000000,integer:true}),
      fundingStages:lines(field(form,'tierRules.tier2.fundingStages',(tierTwo.fundingStages||TIER_RULES.tier2.fundingStages).join('\n')),20)
    },
    tier3:{
      maxEmployees:numberSetting(form,'tierRules.tier3.maxEmployees',tierThree.maxEmployees??TIER_RULES.tier3.maxEmployees,{label:'Tier 3 maximum employees',min:0,max:10000000,integer:true}),
      minRaised:numberSetting(form,'tierRules.tier3.minRaised',tierThree.minRaised??TIER_RULES.tier3.minRaised,{label:'Tier 3 minimum funding',min:0,integer:true})
    },
    unclassified:text(field(form,'tierRules.unclassified',savedTiers.unclassified||TIER_RULES.unclassified),100)
  };
  if(!tierRules.tier2.fundingStages.length)throw new Error('Add at least one Tier 2 funding stage.');
  if(!tierRules.unclassified)throw new Error('Add the handling rule for unclassified companies.');
  const config={schemaVersion:1,segments,personas:{buyerTitles:lines(form.get('buyerTitles')),championTitles:lines(form.get('championTitles')),wrongOrgTitles:lines(form.get('wrongOrgTitles'))},signalDefinitions:definitions,
    triggerMapping:{pain_event:lines(form.get('painKeywords')),buying_intent:lines(form.get('buyingKeywords')),function_roles:lines(form.get('functionRoles')),tech_adoption:lines(form.get('technologies')),competitor_names:profile.competitors.map(c=>c.name)},
    killPatterns:{solvingInHouse:lines(form.get('solvingInHouse')),buildCulture:lines(form.get('buildCulture')),sizeMetric:{label:text(form.get('sizeLabel')||'employees',100),floor}},
    painSources:{statuspage:form.has('source.statuspage'),hn:form.has('source.hn'),news:form.has('source.news'),filings:form.has('source.filings')},
    pitch:{receiptOpenerStyle:text(field(form,'pitch.receiptOpenerStyle',savedPitch.receiptOpenerStyle||'Start with a verified prospect event.'),500),oneSentenceProduct:text(field(form,'pitch.oneSentenceProduct',savedPitch.oneSentenceProduct||profile.productOneLiner),500),credentialLine:text(field(form,'pitch.credentialLine',savedPitch.credentialLine||''),500),ctaStyle:text(field(form,'pitch.ctaStyle',savedPitch.ctaStyle||'Ask permission for a brief conversation.'),500)},
    outreach:{...structuredClone(savedOutreach),framingLibrary,closingQuestions},
    objectionTemplates,
    weights,slaDays,tierRules,
    defaultsReviewRequired:true};
  return {profile,config};
}
function profileWarnings(profile) {
  return Object.entries(profile.evidence||{}).filter(([,item])=>item.value&&item.inferred).map(([key,item])=>({key,value:item.value,reason:item.reason}));
}
function qualityFindings(workspace) {
  return require('./validate.cjs').workspaceQualityFindings(workspace);
}
function blockingQualityFindings(workspace) {
  return qualityFindings(workspace).filter(item=>item.severity==='blocking');
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
  return updateWorkspace(state,id,w=>{
    w.sellerProfile=profile;w.icpConfig=config;w.status='needs_review';w.profileRevision=(w.profileRevision||0)+1;w.deliveryMode='demo';
    require('../icps.cjs').reseedIcps(w);
    delete w.reviewAcknowledgments;
    if(w.research&&['review_required','approved'].includes(w.research.status)){
      w.research.status='review_required';w.research.revision=(w.research.revision||0)+1;
      w.research.steps=(w.research.steps||[]).map(step=>step.key==='review'?{...step,status:'pending'}:step);
    }
  });
}
function approveManualProfile(state,id,{revision,acknowledged=false,qualityReasons={},reviewIcps=true,now=()=>new Date().toISOString()}={}) {
  const workspace=getWorkspace(state,id);checkRevision(workspace,revision);
  if(workspace.status!=='needs_review')throw new Error('Save a draft before approving it.');
  const errors=approvalProblems(workspace);if(errors.length)throw new Error(errors.join(' '));
  if(!acknowledged)throw new Error('Confirm that you reviewed the profile, defaults and unverified claims.');
  const qualityAcknowledgments=blockingQualityFindings(workspace).map(item=>{
    const reason=text(qualityReasons?.[item.id]||'',500);
    if(reason.length<10)throw new Error(`Explain why you are accepting this warning before approval: ${item.message}`);
    return {schemaVersion:1,id:item.id,code:item.code,path:item.path,reason};
  });
  const next=updateWorkspace(state,id,w=>{
    w.status='active';w.sellerProfile.approvedAt=now();w.sellerProfile.deliveryAllowed=false;
    if(reviewIcps)require('../icps.cjs').approveIcps(w,w.sellerProfile.approvedAt);
    w.icpConfig.defaultsReviewRequired=false;w.deliveryMode='demo';w.profileRevision+=1;
    if(w.research?.status==='review_required'){
      w.research.status='approved';w.research.revision=(w.research.revision||0)+1;w.research.completedAt=w.sellerProfile.approvedAt;
      w.research.steps=(w.research.steps||[]).map(step=>step.key==='review'?{...step,status:'complete'}:step);
    }
  });
  next.auditLog.push({schemaVersion:1,id:stableId(`${id}:${next.workspaces[id].profileRevision}`),workspaceId:id,type:'seller_profile_approved',occurredAt:now(),profileRevision:next.workspaces[id].profileRevision,actor:'local-admin',unverifiedClaims:profileWarnings(workspace.sellerProfile).length,qualityAcknowledgments});
  return next;
}
module.exports={FACT_FIELDS,COLLECTIONS,WEIGHTS,LABELS,SLAS,TIER_RULES,profileWarnings,qualityFindings,blockingQualityFindings,approvalProblems,saveManualProfile,approveManualProfile,draftFromForm};
