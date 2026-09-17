const { createHash } = require('node:crypto');
const { getWorkspace, updateWorkspace } = require('../server/state.cjs');
const { getSource, quoteIsGrounded } = require('../sources.cjs');
const { stableId } = require('../utils.cjs');
const { WEIGHTS, LABELS, SLAS } = require('./manual-profile.cjs');

const FACT_KEYS = ['category', 'productOneLiner', 'pricingModel', 'targetCompanySize'];
const LIST_FACT_KEYS = ['valueProps', 'credentials', 'targetIndustries'];
const SIGNAL_KEYS = Object.keys(WEIGHTS);
const MAX_SYNTHESIS_SOURCES = 20;
const MAX_EVIDENCE_PACKET_BYTES = 32000;
const MAX_SOURCE_EXCERPT_BYTES = 6000;
const CUSTOMER_SOURCE_KINDS = new Set([
  'customer_case_study',
  'customer_press_release',
  'first_party_case_study',
  'first_party_press_release'
]);
const DEFAULT_TIER_RULES = Object.freeze({
  tier1: {public:true, revenue:500000000, employees:2000, valuation:5000000000},
  tier2: {revenue:25000000, employees:150, fundingStages:['Series A','Series B','Series C','Series D','growth','PE']},
  tier3: {maxEmployees:149, minRaised:2000000},
  unclassified: 'parked'
});

class SynthesisValidationError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

function object(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new SynthesisValidationError('INVALID_OUTPUT', `${name} must be an object.`);
  return value;
}
function exactKeys(value, required, name) {
  object(value, name);
  const keys = Object.keys(value).sort(), expected = [...required].sort();
  if (keys.length !== expected.length || keys.some((key,index)=>key !== expected[index])) throw new SynthesisValidationError('INVALID_OUTPUT', `${name} has unexpected fields.`);
}
function string(value, name, max, {empty=true}={}) {
  if (typeof value !== 'string' || value.length > max || (!empty && !value.trim())) throw new SynthesisValidationError('INVALID_OUTPUT', `${name} is invalid.`);
  return value;
}
function array(value, name, min, max) {
  if (!Array.isArray(value) || value.length < min || value.length > max) throw new SynthesisValidationError('INVALID_OUTPUT', `${name} must contain ${min}–${max} entries.`);
  return value;
}
function fact(value, name, valueKey='value') {
  exactKeys(value,[valueKey,'sourceId','evidenceQuote'],name);
  string(value[valueKey],`${name}.${valueKey}`,2000);
  string(value.sourceId,`${name}.sourceId`,100);
  string(value.evidenceQuote,`${name}.evidenceQuote`,200);
}
function stringList(value, name, min=0, max=30, itemMax=200) {
  array(value,name,min,max).forEach((item,index)=>string(item,`${name}[${index}]`,itemMax,{empty:false}));
}
function organization(value, name) {
  exactKeys(value,['name','domain','sourceId','evidenceQuote'],name);
  string(value.name,`${name}.name`,200,{empty:false});
  string(value.domain,`${name}.domain`,253);
  string(value.sourceId,`${name}.sourceId`,100);
  string(value.evidenceQuote,`${name}.evidenceQuote`,200);
}
function exampleTarget(value,name) { organization(value,name); }

function assertSynthesisOutput(value) {
  exactKeys(value,['sellerProfile','icpConfig'],'result');
  const profile=value.sellerProfile;
  exactKeys(profile,[...FACT_KEYS,...LIST_FACT_KEYS,'proofPoints','customers','competitors'],'sellerProfile');
  FACT_KEYS.forEach(key=>fact(profile[key],`sellerProfile.${key}`));
  LIST_FACT_KEYS.forEach(key=>array(profile[key],`sellerProfile.${key}`,0,30).forEach((item,index)=>fact(item,`sellerProfile.${key}[${index}]`)));
  array(profile.proofPoints,'sellerProfile.proofPoints',0,30).forEach((item,index)=>fact(item,`sellerProfile.proofPoints[${index}]`,'claim'));
  array(profile.customers,'sellerProfile.customers',0,30).forEach((item,index)=>organization(item,`sellerProfile.customers[${index}]`));
  array(profile.competitors,'sellerProfile.competitors',0,30).forEach((item,index)=>organization(item,`sellerProfile.competitors[${index}]`));

  const config=value.icpConfig;
  exactKeys(config,['segments','personas','signalDefinitions','triggerMapping','killPatterns','painSources','pitch','objectionTemplates'],'icpConfig');
  const labels=new Set();
  array(config.segments,'icpConfig.segments',3,10).forEach((segment,index)=>{
    const name=`icpConfig.segments[${index}]`;
    exactKeys(segment,['label','subIndustries','queryTemplates','revenueSensitivityBase','wedgeCustomers','exampleTargets'],name);
    const label=string(segment.label,`${name}.label`,100,{empty:false}).trim().toLowerCase();
    if(labels.has(label))throw new SynthesisValidationError('INVALID_OUTPUT','Segment labels must be unique.');
    labels.add(label);
    stringList(segment.subIndustries,`${name}.subIndustries`,0,30);
    stringList(segment.queryTemplates,`${name}.queryTemplates`,4,8,500);
    if(new Set(segment.queryTemplates.map(item=>item.trim().toLowerCase())).size<4)throw new SynthesisValidationError('INVALID_OUTPUT','Each segment needs four different search phrases.');
    if(!Number.isInteger(segment.revenueSensitivityBase)||segment.revenueSensitivityBase<1||segment.revenueSensitivityBase>5)throw new SynthesisValidationError('INVALID_OUTPUT',`${name}.revenueSensitivityBase is invalid.`);
    stringList(segment.wedgeCustomers,`${name}.wedgeCustomers`,0,20);
    array(segment.exampleTargets,`${name}.exampleTargets`,0,20).forEach((item,targetIndex)=>exampleTarget(item,`${name}.exampleTargets[${targetIndex}]`));
  });
  exactKeys(config.personas,['buyerTitles','championTitles','wrongOrgTitles'],'icpConfig.personas');
  stringList(config.personas.buyerTitles,'icpConfig.personas.buyerTitles',1,30);
  stringList(config.personas.championTitles,'icpConfig.personas.championTitles',1,30);
  stringList(config.personas.wrongOrgTitles,'icpConfig.personas.wrongOrgTitles',0,30);

  exactKeys(config.signalDefinitions,SIGNAL_KEYS,'icpConfig.signalDefinitions');
  SIGNAL_KEYS.forEach(key=>{
    const definition=config.signalDefinitions[key], name=`icpConfig.signalDefinitions.${key}`;
    exactKeys(definition,['label','description','evidenceKeywords','negativeKeywords','preferredSources','rubric'],name);
    string(definition.label,`${name}.label`,100,{empty:false});
    string(definition.description,`${name}.description`,500,{empty:false});
    stringList(definition.evidenceKeywords,`${name}.evidenceKeywords`,0,30);
    stringList(definition.negativeKeywords,`${name}.negativeKeywords`,0,30);
    stringList(definition.preferredSources,`${name}.preferredSources`,0,20);
    exactKeys(definition.rubric,['1','3','5'],`${name}.rubric`);
    ['1','3','5'].forEach(score=>string(definition.rubric[score],`${name}.rubric.${score}`,300,{empty:false}));
  });
  exactKeys(config.triggerMapping,['pain_event','buying_intent','function_roles','tech_adoption','competitor_names'],'icpConfig.triggerMapping');
  Object.entries(config.triggerMapping).forEach(([key,items])=>stringList(items,`icpConfig.triggerMapping.${key}`,0,30));
  exactKeys(config.killPatterns,['solvingInHouse','buildCulture','sizeMetric'],'icpConfig.killPatterns');
  stringList(config.killPatterns.solvingInHouse,'icpConfig.killPatterns.solvingInHouse',0,30);
  stringList(config.killPatterns.buildCulture,'icpConfig.killPatterns.buildCulture',0,30);
  exactKeys(config.killPatterns.sizeMetric,['label','floor'],'icpConfig.killPatterns.sizeMetric');
  string(config.killPatterns.sizeMetric.label,'icpConfig.killPatterns.sizeMetric.label',100,{empty:false});
  if(!Number.isInteger(config.killPatterns.sizeMetric.floor)||config.killPatterns.sizeMetric.floor<0||config.killPatterns.sizeMetric.floor>10000000)throw new SynthesisValidationError('INVALID_OUTPUT','The proposed minimum size is invalid.');
  exactKeys(config.painSources,['statuspage','hn','news','filings'],'icpConfig.painSources');
  Object.entries(config.painSources).forEach(([key,item])=>{if(typeof item!=='boolean')throw new SynthesisValidationError('INVALID_OUTPUT',`icpConfig.painSources.${key} must be true or false.`);});
  exactKeys(config.pitch,['receiptOpenerStyle','oneSentenceProduct','credentialLine','ctaStyle'],'icpConfig.pitch');
  Object.entries(config.pitch).forEach(([key,item])=>string(item,`icpConfig.pitch.${key}`,500));
  stringList(config.objectionTemplates,'icpConfig.objectionTemplates',3,3,500);
  return true;
}

function validateSynthesisOutput(value) {
  try { return assertSynthesisOutput(value); } catch { return false; }
}

function clean(value,max=2000) { return String(value??'').trim().slice(0,max); }
function dedupeStrings(values,max=30,itemMax=200) {
  const seen=new Set(), result=[];
  for(const value of values||[]) {
    const item=clean(value,itemMax), key=item.toLowerCase();
    if(!item||seen.has(key))continue;
    seen.add(key);result.push(item);
    if(result.length===max)break;
  }
  return result;
}
function normalizeDomain(value) {
  const domain=clean(value,253).toLowerCase().replace(/^www\./,'').replace(/\.$/,'');
  return domain && /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/.test(domain) ? domain : null;
}
function hostMatches(host,domain) { return Boolean(domain && (host===domain||host.endsWith(`.${domain}`))); }
function normalizeWhitespace(value) { return String(value??'').replace(/\s+/g,' ').trim(); }
function truncateUtf8(value,maxBytes) {
  const bytes=Buffer.from(value);
  if(bytes.length<=maxBytes)return value;
  return bytes.subarray(0,maxBytes).toString('utf8').replace(/\uFFFD$/,'').trimEnd();
}

function researchSourceContext(state,workspace) {
  const refs=Array.isArray(workspace.research?.sources)?workspace.research.sources:[];
  const legacy=Array.isArray(workspace.research?.sourceIds)?workspace.research.sourceIds:[];
  const map=new Map();
  for(const raw of [...refs,...legacy]) {
    const ref=typeof raw==='string'?{sourceId:raw}:raw;
    if(!ref||typeof ref.sourceId!=='string'||map.has(ref.sourceId))continue;
    const source=getSource(state,ref.sourceId);
    if(!source)continue;
    let host='';try{host=new URL(source.url).hostname.toLowerCase().replace(/^www\./,'');}catch{continue;}
    map.set(ref.sourceId,{source,...structuredClone(ref),sourceId:ref.sourceId,host,kind:clean(ref.kind,100),ownerDomain:normalizeDomain(ref.ownerDomain)});
  }
  return map;
}
function sourceSetHash(state,workspace) {
  const rows=[...researchSourceContext(state,workspace).values()].sort((a,b)=>a.sourceId.localeCompare(b.sourceId));
  return createHash('sha256').update(rows.map(row=>`${row.sourceId}:${row.source.contentHash}`).join('\n')).digest('hex');
}
function buildResearchEvidence(state,workspace) {
  const refs=[...researchSourceContext(state,workspace).values()].sort((a,b)=>a.sourceId.localeCompare(b.sourceId));
  if(!refs.length)throw new SynthesisValidationError('NO_SOURCES','Collect at least one public source before generating a profile.');
  if(refs.length>MAX_SYNTHESIS_SOURCES)throw new SynthesisValidationError('TOO_MANY_SOURCES',`Use no more than ${MAX_SYNTHESIS_SOURCES} sources for one synthesis request.`);
  const metadata=refs.map(ref=>({sourceId:ref.sourceId,url:clean(ref.source.url,1000),title:clean(ref.source.title,300),kind:clean(ref.kind,100),ownerDomain:ref.ownerDomain||'',text:''}));
  const baseBytes=Buffer.byteLength(JSON.stringify({sources:metadata}));
  if(baseBytes>=MAX_EVIDENCE_PACKET_BYTES)throw new SynthesisValidationError('INPUT_TOO_LARGE','Source metadata exceeds the synthesis input limit.');
  const perSource=Math.min(MAX_SOURCE_EXCERPT_BYTES,Math.floor((MAX_EVIDENCE_PACKET_BYTES-baseBytes-256)/refs.length));
  if(perSource<200)throw new SynthesisValidationError('INPUT_TOO_LARGE','There is not enough room for bounded source excerpts.');
  return refs.map((ref,index)=>({...ref,excerpt:truncateUtf8(normalizeWhitespace(ref.source.text),perSource),packet:metadata[index]}));
}
function selectedCandidate(workspace) {
  const candidate=workspace.research?.selectedCandidate||workspace.onboarding?.selectedCandidate;
  const domain=normalizeDomain(candidate?.domain);
  if(!candidate||!clean(candidate.name,200)||!domain)throw new SynthesisValidationError('COMPANY_NOT_CONFIRMED','Confirm the seller company before generating its profile.');
  return {...structuredClone(candidate),name:clean(candidate.name,200),domain};
}

function evidenceFor(state,workspace,raw,value,context) {
  const sourceId=clean(raw?.sourceId,100), quote=clean(raw?.evidenceQuote,200), ref=context.get(sourceId);
  const grounded=Boolean(ref&&quote&&quoteIsGrounded(state,sourceId,quote)&&normalizeWhitespace(ref.excerpt).includes(normalizeWhitespace(quote)));
  return {schemaVersion:1,value,sourceUrl:ref?.source.url||null,sourceId:ref?.sourceId||null,evidenceQuote:quote,inferred:!grounded,
    verification:grounded?'matched_saved_quote':ref?'quote_not_matched':sourceId?'source_not_in_research':'no_source',
    reason:grounded?'Quote matched saved source text.':ref?'The quote did not match the saved source text.':sourceId?'The cited source was not included in this research run.':'No supporting source was cited.'};
}
function customerSourceAllowed(item,ref,sellerDomain) {
  if(!ref)return false;
  if(hostMatches(ref.host,sellerDomain))return true;
  const customerDomain=normalizeDomain(item.domain);
  return Boolean(customerDomain&&CUSTOMER_SOURCE_KINDS.has(ref.kind)&&ref.ownerDomain===customerDomain&&hostMatches(ref.host,customerDomain));
}

function materializeGeneratedDraft(state,workspace,output,{now=()=>new Date().toISOString()}={}) {
  assertSynthesisOutput(output);
  const candidate=selectedCandidate(workspace), context=new Map(buildResearchEvidence(state,workspace).map(ref=>[ref.sourceId,ref])), evidence={}, warnings=[], droppedCustomers=[], droppedCompetitors=[];
  let attemptedClaims=0, acceptedClaims=0, receiptedClaims=0;
  const count=item=>{attemptedClaims++;acceptedClaims++;if(!item.inferred)receiptedClaims++;else warnings.push({value:item.value,reason:item.reason});};
  const profile={schemaVersion:1,sellerName:candidate.name,domain:candidate.domain,deliveryAllowed:false,generatedAt:now(),approvedAt:null,updatedAt:now(),sources:[]};
  for(const key of FACT_KEYS) {
    const value=clean(output.sellerProfile[key].value), item=evidenceFor(state,workspace,output.sellerProfile[key],value,context);
    profile[key]=value;evidence[key]=item;if(value)count(item);
  }
  for(const key of LIST_FACT_KEYS) {
    profile[key]=[];const seen=new Set();
    for(const raw of output.sellerProfile[key]) {
      const value=clean(raw.value,200), dedupe=value.toLowerCase();if(!value||seen.has(dedupe))continue;
      seen.add(dedupe);const item=evidenceFor(state,workspace,raw,value,context), index=profile[key].length;
      profile[key].push(value);evidence[`${key}.${index}`]=item;count(item);
    }
  }
  profile.proofPoints=[];
  for(const raw of output.sellerProfile.proofPoints) {
    const value=clean(raw.claim), key=value.toLowerCase();
    if(!value||profile.proofPoints.some(item=>item.claim.toLowerCase()===key))continue;
    const item=evidenceFor(state,workspace,raw,value,context), index=profile.proofPoints.length;
    profile.proofPoints.push({claim:value,...item});evidence[`proofPoints.${index}`]=item;count(item);
  }
  profile.customers=[];
  const seenCustomers=new Set();
  for(const raw of output.sellerProfile.customers) {
    const name=clean(raw.name,200),domain=normalizeDomain(raw.domain),dedupe=domain||name.toLowerCase();
    if(!name||seenCustomers.has(dedupe))continue;seenCustomers.add(dedupe);attemptedClaims++;
    const item=evidenceFor(state,workspace,raw,name,context),ref=context.get(clean(raw.sourceId,100));
    if(!name||item.inferred||!customerSourceAllowed(raw,ref,candidate.domain)) { droppedCustomers.push({name,reason:item.inferred?item.reason:'Customer evidence was not from an allowed first-party source.'});continue; }
    const index=profile.customers.length;profile.customers.push({name,domain,...item});evidence[`customers.${index}`]=item;acceptedClaims++;receiptedClaims++;
  }
  profile.competitors=[];
  const seenCompetitors=new Set();
  for(const raw of output.sellerProfile.competitors) {
    const name=clean(raw.name,200),domain=normalizeDomain(raw.domain),dedupe=domain||name.toLowerCase();
    if(!name||seenCompetitors.has(dedupe))continue;seenCompetitors.add(dedupe);attemptedClaims++;
    const item=evidenceFor(state,workspace,raw,name,context);
    if(!name||!domain||item.inferred) { droppedCompetitors.push({name,reason:!domain?'Competitor domain was missing or invalid.':item.reason});continue; }
    const index=profile.competitors.length;profile.competitors.push({name,domain,...item});evidence[`competitors.${index}`]=item;acceptedClaims++;receiptedClaims++;
  }
  profile.evidence=evidence;
  profile.sources=[...new Set(Object.values(evidence).filter(item=>!item.inferred).map(item=>item.sourceId))];

  const validCustomerNames=new Set(profile.customers.map(item=>item.name.toLowerCase()));
  const segmentKeys=new Set();
  const segments=output.icpConfig.segments.map(segment=>{
    const label=clean(segment.label,100), key=stableId(label.toLowerCase());
    if(segmentKeys.has(key))throw new SynthesisValidationError('INVALID_OUTPUT','Segment labels must be unique.');segmentKeys.add(key);
    const queryTemplates=dedupeStrings(segment.queryTemplates,8,500);
    if(queryTemplates.length<4)throw new SynthesisValidationError('INVALID_OUTPUT','Each segment needs 4–8 different search phrases.');
    const exampleTargets=[];
    for(const raw of segment.exampleTargets) {
      const name=clean(raw.name,200),domain=normalizeDomain(raw.domain),item=evidenceFor(state,workspace,raw,name,context);
      if(!name||!domain||item.inferred)continue;
      if(exampleTargets.some(target=>target.domain===domain))continue;
      exampleTargets.push({name,domain,sourceUrl:item.sourceUrl,sourceId:item.sourceId,evidenceQuote:item.evidenceQuote});
    }
    return {key,label,enabled:true,subIndustries:dedupeStrings(segment.subIndustries),queryTemplates,revenueSensitivityBase:segment.revenueSensitivityBase,
      wedgeCustomers:dedupeStrings(segment.wedgeCustomers,20).filter(name=>validCustomerNames.has(name.toLowerCase())),exampleTargets};
  });
  const definitions=Object.fromEntries(SIGNAL_KEYS.map(key=>{
    const raw=output.icpConfig.signalDefinitions[key];
    return [key,{label:clean(raw.label,100)||LABELS[key],description:clean(raw.description,500),evidenceKeywords:dedupeStrings(raw.evidenceKeywords),negativeKeywords:dedupeStrings(raw.negativeKeywords),preferredSources:dedupeStrings(raw.preferredSources,20),rubric:{1:clean(raw.rubric[1],300),3:clean(raw.rubric[3],300),5:clean(raw.rubric[5],300)}}];
  }));
  const rawConfig=output.icpConfig;
  const config={schemaVersion:1,segments,personas:{buyerTitles:dedupeStrings(rawConfig.personas.buyerTitles),championTitles:dedupeStrings(rawConfig.personas.championTitles),wrongOrgTitles:dedupeStrings(rawConfig.personas.wrongOrgTitles)},signalDefinitions:definitions,
    triggerMapping:{pain_event:dedupeStrings(rawConfig.triggerMapping.pain_event),buying_intent:dedupeStrings(rawConfig.triggerMapping.buying_intent),function_roles:dedupeStrings(rawConfig.triggerMapping.function_roles),tech_adoption:dedupeStrings(rawConfig.triggerMapping.tech_adoption),competitor_names:profile.competitors.map(item=>item.name)},
    killPatterns:{solvingInHouse:dedupeStrings(rawConfig.killPatterns.solvingInHouse),buildCulture:dedupeStrings(rawConfig.killPatterns.buildCulture),sizeMetric:{label:clean(rawConfig.killPatterns.sizeMetric.label,100),floor:rawConfig.killPatterns.sizeMetric.floor}},
    painSources:{...rawConfig.painSources},pitch:{receiptOpenerStyle:clean(rawConfig.pitch.receiptOpenerStyle,500),oneSentenceProduct:profile.productOneLiner,credentialLine:clean(rawConfig.pitch.credentialLine,500),ctaStyle:clean(rawConfig.pitch.ctaStyle,500)},
    objectionTemplates:dedupeStrings(rawConfig.objectionTemplates,3,500),weights:{...WEIGHTS},slaDays:{...SLAS},tierRules:structuredClone(DEFAULT_TIER_RULES),defaultsReviewRequired:true};
  if(config.objectionTemplates.length!==3)throw new SynthesisValidationError('INVALID_OUTPUT','Three different objection templates are required.');
  const report={schemaVersion:1,attemptedClaims,acceptedClaims,receiptedClaims,receiptCoverage:attemptedClaims?receiptedClaims/attemptedClaims:0,warnings,droppedCustomers,droppedCompetitors};
  return {profile,config,report};
}

function saveGeneratedProfile(state,id,{output,expectedResearchRevision,expectedRunId,expectedSourceSetHash,expectedProfileRevision,model='unknown',promptVersion='unknown',now=()=>new Date().toISOString()}={}) {
  if(!Number.isInteger(expectedResearchRevision)||!Number.isInteger(expectedProfileRevision)||typeof expectedSourceSetHash!=='string')throw new SynthesisValidationError('INVALID_INPUT','Generation guards are required.');
  const workspace=getWorkspace(state,id);
  if(workspace.status==='archived')throw new SynthesisValidationError('ARCHIVED','Restore this workspace before saving generated research.');
  if(workspace.status==='active')throw new SynthesisValidationError('ACTIVE_PROFILE','Approved profiles require a reviewable refresh diff and cannot be overwritten.');
  if((workspace.research?.revision??0)!==expectedResearchRevision||String(workspace.profileRevision||0)!==String(expectedProfileRevision)||(expectedRunId&&workspace.research?.runId!==expectedRunId)||sourceSetHash(state,workspace)!==expectedSourceSetHash)throw new SynthesisValidationError('STALE_RESEARCH','Research changed while the profile was being generated. Run synthesis again.');
  const generatedAt=now(),{profile,config,report}=materializeGeneratedDraft(state,workspace,output,{now:()=>generatedAt});
  let next=updateWorkspace(state,id,w=>{
    const candidate=selectedCandidate(w);
    w.onboarding={...(w.onboarding||{schemaVersion:1}),status:'selected',selectedCandidate:candidate};
    w.sellerProfile=profile;w.icpConfig=config;w.status='needs_review';w.deliveryMode='demo';w.profileRevision=(w.profileRevision||0)+1;
    const steps=(w.research.steps||[]).map(step=>({...step,status:step.key==='review'?'pending':'complete'}));
    w.research={...w.research,status:'review_required',revision:(w.research.revision||0)+1,steps,synthesis:{schemaVersion:1,promptVersion,model,generatedAt,sourceSetHash:expectedSourceSetHash,report}};
  });
  const revision=next.workspaces[id].profileRevision;
  next.auditLog.push({schemaVersion:1,id:stableId(`${id}:seller_profile_generated:${revision}:${generatedAt}`),workspaceId:id,type:'seller_profile_generated',occurredAt:generatedAt,profileRevision:revision,actor:'system',receiptedClaims:report.receiptedClaims,acceptedClaims:report.acceptedClaims,droppedClaims:report.droppedCustomers.length+report.droppedCompetitors.length});
  return next;
}

module.exports={FACT_KEYS,LIST_FACT_KEYS,SIGNAL_KEYS,DEFAULT_TIER_RULES,MAX_SYNTHESIS_SOURCES,MAX_EVIDENCE_PACKET_BYTES,MAX_SOURCE_EXCERPT_BYTES,SynthesisValidationError,assertSynthesisOutput,validateSynthesisOutput,researchSourceContext,buildResearchEvidence,sourceSetHash,materializeGeneratedDraft,saveGeneratedProfile};
