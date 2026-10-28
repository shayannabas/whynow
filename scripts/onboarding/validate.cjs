const { createHash } = require('node:crypto');
const { getWorkspace, updateWorkspace } = require('../server/state.cjs');
const { getSource, quoteIsGrounded } = require('../sources.cjs');
const { stableId } = require('../utils.cjs');
const { WEIGHTS, LABELS, SLAS } = require('./manual-profile.cjs');

const FACT_KEYS = ['category', 'productOneLiner', 'pricingModel', 'targetCompanySize'];
const LIST_FACT_KEYS = ['valueProps', 'credentials', 'targetIndustries'];
const SIGNAL_KEYS = Object.keys(WEIGHTS);
const MAX_SYNTHESIS_SOURCES = 20;
const MAX_EVIDENCE_PACKET_BYTES = 120000;
const MAX_SOURCE_EXCERPT_BYTES = 20000;
const MIN_SOURCE_EXCERPT_BYTES = 1500;
const EVIDENCE_PACKET_RESERVED_BYTES = 1024;
const MAX_RECEIPT_TEXT = 200;
const MIN_RECEIPT_TEXT = 24;
const PARTNER_PATH_PATTERN=/(?:^|\/)(?:partners?|marketplace|templates?|solution-partners?)(?:\/|$)/i;
const MEASURABLE_SIZE_PATTERN=/\b(?:employees?|employee count|headcount|engineering headcount|engineers?|engineering team size|team size|workforce|annual revenue|revenue|arr|annual recurring revenue)\b/i;
const NAVIGATION_PHRASES=['skip to content','copy wordmark','copy logo','download brand assets','brand guidelines','get a demo','log in','sign up','partner finder','all rights reserved','privacy policy','cookie settings','terms of service'];
const NAVIGATION_TERMS=new Set(['back','contact','cookie','copy','dashboard','doc','download','learn','logo','marketplace','menu','partner','passport','privacy','product','resource','security','signup','solution','term','wordmark']);
const STOP_TERMS=new Set(['a','an','and','are','as','at','be','by','for','from','in','into','is','it','its','of','on','or','our','that','the','their','this','to','with','you','your']);
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
function fact(value, name, valueKey='value', {required=false}={}) {
  exactKeys(value,[valueKey,'receiptId'],name);
  const content=string(value[valueKey],`${name}.${valueKey}`,2000),receipt=string(value.receiptId,`${name}.receiptId`,40);
  if(required&&(!content.trim()||!receipt))throw new SynthesisValidationError('INVALID_OUTPUT',`${name} needs a value and receipt.`);
  if(Boolean(content.trim())!==Boolean(receipt))throw new SynthesisValidationError('INVALID_OUTPUT',`${name} must pair its value with one receipt.`);
}
function stringList(value, name, min=0, max=30, itemMax=200) {
  array(value,name,min,max).forEach((item,index)=>string(item,`${name}[${index}]`,itemMax,{empty:false}));
}
function organization(value, name) {
  exactKeys(value,['name','domain','receiptId'],name);
  string(value.name,`${name}.name`,200,{empty:false});
  string(value.domain,`${name}.domain`,253);
  string(value.receiptId,`${name}.receiptId`,40,{empty:false});
}
function exampleTarget(value,name) { organization(value,name); }

function assertSynthesisOutput(value) {
  exactKeys(value,['sellerProfile','icpConfig'],'result');
  const profile=value.sellerProfile;
  exactKeys(profile,[...FACT_KEYS,...LIST_FACT_KEYS,'proofPoints','customers','competitors'],'sellerProfile');
  FACT_KEYS.forEach(key=>fact(profile[key],`sellerProfile.${key}`,'value',{required:['category','productOneLiner'].includes(key)}));
  LIST_FACT_KEYS.forEach(key=>array(profile[key],`sellerProfile.${key}`,key==='targetIndustries'?1:0,30).forEach((item,index)=>fact(item,`sellerProfile.${key}[${index}]`,'value',{required:true})));
  array(profile.proofPoints,'sellerProfile.proofPoints',0,30).forEach((item,index)=>fact(item,`sellerProfile.proofPoints[${index}]`,'claim',{required:true}));
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
function normalizedTerm(value) {
  let term=String(value||'').toLowerCase();
  if(term.length>5&&term.endsWith('ies'))term=`${term.slice(0,-3)}y`;
  else if(term.length>5&&term.endsWith('ing'))term=term.slice(0,-3);
  else if(term.length>4&&term.endsWith('ed'))term=term.slice(0,-2);
  else if(term.length>4&&term.endsWith('s')&&!term.endsWith('ss'))term=term.slice(0,-1);
  return term;
}
function meaningfulTerms(value) {
  return [...new Set(normalizeWhitespace(value).normalize('NFKC').toLowerCase().match(/[\p{L}\p{N}]+/gu)||[])]
    .map(normalizedTerm).filter(term=>term.length>=2&&!STOP_TERMS.has(term));
}
function isNavigationHeavy(value) {
  const text=normalizeWhitespace(value).toLowerCase();
  if(NAVIGATION_PHRASES.some(phrase=>text.includes(phrase)))return true;
  const terms=meaningfulTerms(text),navigation=terms.filter(term=>NAVIGATION_TERMS.has(term)).length;
  return navigation>=4&&navigation/Math.max(terms.length,1)>=0.25;
}
function sellerFactSourceAllowed(value) {
  try{return !PARTNER_PATH_PATTERN.test(new URL(value).pathname.toLowerCase());}catch{return false;}
}
function receiptQuality(claim,quote,sourceUrl='') {
  const text=normalizeWhitespace(quote);
  if(sourceUrl&&!sellerFactSourceAllowed(sourceUrl))return {ok:false,code:'PARTNER_SOURCE',reason:'Partner, marketplace and template pages cannot support facts about the seller.'};
  if(text.length<MIN_RECEIPT_TEXT)return {ok:false,code:'QUOTE_TOO_SHORT',reason:`The receipt quote must contain at least ${MIN_RECEIPT_TEXT} characters of supporting context.`};
  if(isNavigationHeavy(text))return {ok:false,code:'NAVIGATION_BOILERPLATE',reason:'The receipt is mostly navigation, header or footer text rather than supporting evidence.'};
  const claimTerms=meaningfulTerms(claim),quoteTerms=new Set(meaningfulTerms(text)),matched=claimTerms.filter(term=>quoteTerms.has(term));
  const needed=claimTerms.length>=4?2:1;
  if(claimTerms.length&&matched.length<needed)return {ok:false,code:'NO_CLAIM_OVERLAP',reason:'The receipt does not share enough meaningful terms with the claim it is meant to support.'};
  return {ok:true,code:'QUALITY_OK',reason:'The receipt has contextual text and meaningful claim overlap.'};
}
function receiptSnippetAllowed(quote) {
  const text=normalizeWhitespace(quote);
  return text.length>=MIN_RECEIPT_TEXT&&!isNavigationHeavy(text)&&meaningfulTerms(text).length>=3;
}
function sloganLike(value) {
  const text=normalizeWhitespace(value),lower=text.toLowerCase(),words=meaningfulTerms(text);
  if(!text||words.length>18)return false;
  if(/^(?:build|create|discover|grow|imagine|make|power|reimagine|ship|supercharge|transform|unlock)\b/i.test(text))return true;
  if(/\b(?:your dreams?|world'?s best|all[- ]in[- ]one|game[- ]chang|revolutionary|effortless|seamless|flexible|modern teams?)\b/i.test(lower))return true;
  return /\b(?:you|your)\b/i.test(text)&&words.length<=12;
}
function vendorSeekingQuery(value) {
  const text=normalizeWhitespace(value).toLowerCase();
  const vendor=/\b(?:best|affordable|alternatives?|platforms?|providers?|services?|software|solutions?|systems?|tools?|vendors?)\b/.test(text);
  const prospectSignal=/\b(?:adopting|careers?|companies hiring|expanding|funding|headcount|hiring|job openings?|migrating|outages?|raised|recruiting|teams hiring|using|with)\b/.test(text);
  return vendor&&!prospectSignal;
}
function killLooksLikePain(value) {
  return /\b(?:downtime|high costs?|inefficient|legacy|manual processes?|outdated|slow|complaints?|avoiding automation|resistance to change)\b/i.test(normalizeWhitespace(value));
}
function termOverlap(left,right) {
  const a=meaningfulTerms(left),b=new Set(meaningfulTerms(right)),matched=a.filter(term=>b.has(term));
  return matched.length>=2&&matched.length/Math.max(a.length,1)>=0.5;
}
function finding(code,path,field,message,severity='blocking') {return {schemaVersion:1,id:stableId(`${code}:${path}`),code,path,field,severity,message};}
function evidenceField(key) {return FACT_KEYS.includes(key)?key:key.includes('.')?`${key}.value`:key;}
function evidenceSeverity(key,qualityCode) {
  if(qualityCode==='PARTNER_SOURCE')return 'blocking';
  return /^(?:valueProps|proofPoints|credentials|targetIndustries)\./.test(key)?'advisory':'blocking';
}
function workspaceQualityFindings(value) {
  const profile=value?.sellerProfile||{},config=value?.icpConfig||{},findings=[];
  for(const [key,item] of Object.entries(profile.evidence||{})) {
    if(!item?.value||!item.sourceUrl&&!item.evidenceQuote)continue;
    const quality=receiptQuality(item.value,item.evidenceQuote,item.sourceUrl);
    if(!quality.ok)findings.push(finding(`RECEIPT_${quality.code}`,`sellerProfile.evidence.${key}`,evidenceField(key),quality.reason,evidenceSeverity(key,quality.code)));
  }
  if(!(profile.customers||[]).length)findings.push(finding('EMPTY_CUSTOMERS','sellerProfile.customers','customers','No verified customers are present. Add supported customers or explain why approval should proceed without them.'));
  if(!(profile.competitors||[]).length)findings.push(finding('EMPTY_COMPETITORS','sellerProfile.competitors','competitors','No verified competitors are present. Add supported competitors or explain why approval should proceed without them.'));
  for(const [index,item] of (profile.competitors||[]).entries())if(!item.domain)findings.push(finding('COMPETITOR_DOMAIN_MISSING',`sellerProfile.competitors.${index}.domain`,`competitors.${index}.domain`,`${item.name} is supported by a comparison receipt, but its domain is missing. Enter the verified domain before using domain-based exclusion.`));
  // Accept config-style identifiers without rewriting the reviewed/model output.
  const size=config.killPatterns?.sizeMetric||{},sizeLabel=normalizeWhitespace(String(size.label||'').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/[_-]+/g,' ')),targetSize=normalizeWhitespace(profile.targetCompanySize);
  if(!MEASURABLE_SIZE_PATTERN.test(sizeLabel))findings.push(finding('SIZE_METRIC_UNMEASURABLE','icpConfig.killPatterns.sizeMetric.label','sizeLabel','The minimum-size label must name a measurable unit such as employees, engineering headcount or revenue.'));
  const labelLower=sizeLabel.toLowerCase(),floor=Number(size.floor);
  if(/\benterprise\b/i.test(targetSize)&&!/\b(?:small|startup|all sizes?|any size)\b/i.test(targetSize)) {
    const minimum=/revenue|\barr\b/.test(labelLower)?50_000_000:/engineer/.test(labelLower)?50:250;
    if(Number.isFinite(floor)&&floor<minimum)findings.push(finding('SIZE_FLOOR_CONTRADICTS_TARGET','icpConfig.killPatterns.sizeMetric.floor','sizeFloor',`The proposed floor of ${floor} conflicts with an enterprise target for this measurement.`));
  }
  if(!(config.personas?.buyerTitles||[]).length)findings.push(finding('MISSING_BUYER_PERSONAS','icpConfig.personas.buyerTitles','buyerTitles','At least one buyer title is required before approval.'));
  if(!(config.personas?.championTitles||[]).length)findings.push(finding('MISSING_CHAMPION_PERSONAS','icpConfig.personas.championTitles','championTitles','At least one champion title is required before approval.'));
  for(const key of ['category','productOneLiner','pricingModel'])if(profile[key]&&sloganLike(profile[key]))findings.push(finding('SLOGAN_LIKE_FACT',`sellerProfile.${key}`,key,'This reads like a headline or marketing slogan rather than a precise seller fact.','advisory'));
  for(const [segmentIndex,segment] of (config.segments||[]).entries())for(const [queryIndex,query] of (segment.queryTemplates||[]).entries())if(vendorSeekingQuery(query))findings.push(finding('VENDOR_SEEKING_QUERY',`icpConfig.segments.${segmentIndex}.queryTemplates.${queryIndex}`,`segments.${segmentIndex}.queryTemplates`,'This search phrase describes a product/vendor category and is likely to return sellers or competitors instead of prospective buyers.'));
  const triggers=[...(config.triggerMapping?.pain_event||[]),...(config.triggerMapping?.buying_intent||[])];
  for(const group of ['solvingInHouse','buildCulture'])for(const [index,item] of (config.killPatterns?.[group]||[]).entries()) {
    const path=`icpConfig.killPatterns.${group}.${index}`,field=group;
    if(killLooksLikePain(item))findings.push(finding('KILL_LOOKS_LIKE_BUYING_PAIN',path,field,'This kill pattern describes pain or modernization need and may be a buying signal rather than a reason the company will not buy.'));
    if(triggers.some(trigger=>termOverlap(item,trigger)))findings.push(finding('KILL_DUPLICATES_TRIGGER',path,field,'This kill pattern substantially overlaps a pain or buying-intent trigger.'));
  }
  return findings.sort((a,b)=>a.path.localeCompare(b.path)||a.code.localeCompare(b.code));
}
function blockingQualityFindings(value) {return workspaceQualityFindings(value).filter(item=>item.severity==='blocking');}

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
function sourceEvidenceWeight(ref) {
  let pathname='';try{pathname=new URL(ref.source.url).pathname.toLowerCase();}catch{}
  if(ref.kind==='seller_customer_page'||/\/(?:customers?|case-stud(?:y|ies)|customer-stories|stories)(?:\/|$)/.test(pathname))return 6;
  if(/\/(?:compare|comparisons|alternatives?)(?:\/|$)|(?:^|[-/])vs(?:[-/]|$)/.test(pathname))return 6;
  if(/\/(?:pricing|plans?)(?:\/|$)/.test(pathname))return 4;
  if(/\/(?:about(?:-us)?|enterprise)(?:\/|$)/.test(pathname))return 3;
  return 1;
}
function allocateSourceExcerptBudgets(refs,availableBytes) {
  const minimum=Math.min(MIN_SOURCE_EXCERPT_BYTES,Math.floor(availableBytes/refs.length));
  const remaining=Math.max(0,availableBytes-(minimum*refs.length));
  const totalWeight=refs.reduce((sum,ref)=>sum+sourceEvidenceWeight(ref),0);
  return refs.map(ref=>Math.min(MAX_SOURCE_EXCERPT_BYTES,minimum+Math.floor(remaining*sourceEvidenceWeight(ref)/totalWeight)));
}
function receiptQuoteCandidates(value,max=MAX_RECEIPT_TEXT) {
  const text=normalizeWhitespace(value), sentences=text?text.split(/(?<=[.!?])\s+/):[], result=[];
  for(const sentence of sentences) {
    let remaining=sentence.trim();
    while(remaining) {
      if(remaining.length<=max) { result.push(remaining);break; }
      let end=remaining.lastIndexOf(' ',max);
      if(end<Math.floor(max/2))end=max;
      result.push(remaining.slice(0,end).trim());
      remaining=remaining.slice(end).trim();
    }
  }
  return [...new Set(result.filter(receiptSnippetAllowed))];
}
function evidenceQuoteScore(quote,ref) {
  const text=normalizeWhitespace(quote),lower=text.toLowerCase();
  let score=0;
  if(/\b(?:customer|customers|customer story|case study|trusted by|used by|brands?|companies)\b/.test(lower))score+=14;
  if(/\b(?:vs\.?|versus|alternative|alternatives|compare|comparison|competitor|competitors)\b/.test(lower))score+=14;
  if(/\b(?:price|prices|pricing|plan|plans|per month|per year|annual|contract|subscription|free|revenue|arr)\b/.test(lower))score+=9;
  if(/\b(?:employee|employees|headcount|engineer|engineers|engineering team|team of|workforce|enterprise|mid-market|small business|smb)\b/.test(lower))score+=9;
  if(/\b(?:saved|reduced|increased|improved|grew|growth|faster|hours?|minutes?|percent|%)\b/.test(lower))score+=4;
  if(/\b(?:[A-Z][A-Za-z0-9&.'’-]{2,}(?:\s+(?:[A-Z][A-Za-z0-9&.'’-]{2,}|of|the)){0,4}|[A-Z][A-Z0-9]{2,})\b/.test(text))score+=3;
  let urlTerms=[];try{urlTerms=decodeURIComponent(new URL(ref.source.url).pathname).toLowerCase().split(/[^a-z0-9]+/).filter(term=>term.length>=4&&!['about','blog','case','customers','customer','studies','study','compare','comparison','pricing','enterprise','vercel','shopify','resolve'].includes(term));}catch{}
  if(urlTerms.some(term=>lower.includes(term)))score+=12;
  return score;
}
function selectRelevantReceiptQuotes(ref,budgetBytes) {
  const candidates=receiptQuoteCandidates(ref.source.text).map((quote,index)=>({quote,index,score:evidenceQuoteScore(quote,ref)}));
  candidates.sort((left,right)=>right.score-left.score||left.index-right.index);
  const selected=[];let bytes=0;
  for(const candidate of candidates) {
    const addition=Buffer.byteLength(candidate.quote)+(selected.length?1:0);
    if(bytes+addition>budgetBytes)continue;
    selected.push(candidate.quote);bytes+=addition;
  }
  return selected;
}
function buildResearchEvidence(state,workspace) {
  const refs=[...researchSourceContext(state,workspace).values()].sort((a,b)=>sourceEvidenceWeight(b)-sourceEvidenceWeight(a)||a.sourceId.localeCompare(b.sourceId));
  if(!refs.length)throw new SynthesisValidationError('NO_SOURCES','Collect at least one public source before generating a profile.');
  if(refs.length>MAX_SYNTHESIS_SOURCES)throw new SynthesisValidationError('TOO_MANY_SOURCES',`Use no more than ${MAX_SYNTHESIS_SOURCES} sources for one synthesis request.`);
  const metadata=refs.map(ref=>({sourceId:ref.sourceId,url:clean(ref.source.url,1000),title:clean(ref.source.title,300),kind:clean(ref.kind,100),ownerDomain:ref.ownerDomain||'',text:''}));
  const baseBytes=Buffer.byteLength(JSON.stringify({sources:metadata}));
  if(baseBytes>=MAX_EVIDENCE_PACKET_BYTES)throw new SynthesisValidationError('INPUT_TOO_LARGE','Source metadata exceeds the synthesis input limit.');
  const available=MAX_EVIDENCE_PACKET_BYTES-baseBytes-EVIDENCE_PACKET_RESERVED_BYTES;
  const budgets=allocateSourceExcerptBudgets(refs,available);
  if(budgets.some(budget=>budget<200))throw new SynthesisValidationError('INPUT_TOO_LARGE','There is not enough room for bounded source excerpts.');
  return refs.map((ref,index)=>{
    const receiptCandidates=selectRelevantReceiptQuotes(ref,budgets[index]);
    return {...ref,excerpt:receiptCandidates.join('\n'),receiptCandidates,excerptBudgetBytes:budgets[index],packet:metadata[index]};
  });
}
function receiptIdFor(sourceId,quote) {
  return `r_${stableId(`${sourceId}\n${normalizeWhitespace(quote)}`)}`;
}
function receiptQuotes(value,max=MAX_RECEIPT_TEXT) {
  return receiptQuoteCandidates(value,max);
}
function buildReceiptEvidence(state,workspace) {
  const rows=buildResearchEvidence(state,workspace);
  const sources=rows.map(row=>{
    const {text:ignored,...metadata}=row.packet;
    return {...metadata,receipts:[]};
  });
  const queues=rows.map(row=>[...row.receiptCandidates]),receiptMap=new Map();
  let more=true;
  while(more) {
    more=false;
    for(let index=0;index<queues.length;index++) {
      const quote=queues[index].shift();
      if(!quote)continue;
      more=true;
      const receiptId=receiptIdFor(rows[index].sourceId,quote),entry={receiptId,text:quote};
      sources[index].receipts.push(entry);
      const serialized=JSON.stringify({schemaVersion:1,sources});
      if(Buffer.byteLength(serialized)>MAX_EVIDENCE_PACKET_BYTES) {
        sources[index].receipts.pop();more=false;
        for(const queue of queues)queue.length=0;
        break;
      }
      receiptMap.set(receiptId,{...rows[index],receiptId,evidenceQuote:quote});
    }
  }
  const serialized=JSON.stringify({schemaVersion:1,sources});
  if(!receiptMap.size)throw new SynthesisValidationError('NO_SOURCES','Collected pages did not contain usable receipt text.');
  return {schemaVersion:1,sources,serialized,sourceIds:rows.map(row=>row.sourceId),receiptIds:[...receiptMap.keys()],receiptMap};
}
function selectedCandidate(workspace) {
  const candidate=workspace.research?.selectedCandidate||workspace.onboarding?.selectedCandidate;
  const domain=normalizeDomain(candidate?.domain);
  if(!candidate||!clean(candidate.name,200)||!domain)throw new SynthesisValidationError('COMPANY_NOT_CONFIRMED','Confirm the seller company before generating its profile.');
  return {...structuredClone(candidate),name:clean(candidate.name,200),domain};
}

function evidenceFor(state,workspace,raw,value,context) {
  const receiptId=clean(raw?.receiptId,40),ref=context.get(receiptId),sourceId=ref?.sourceId||null,quote=ref?.evidenceQuote||'';
  const quality=ref?receiptQuality(value,quote,ref.source.url):{ok:false,code:'RECEIPT_NOT_FOUND',reason:receiptId?'The selected receipt was not included in this research run.':'No supporting receipt was selected.'};
  const grounded=Boolean(ref&&quote&&quality.ok&&quoteIsGrounded(state,sourceId,quote)&&normalizeWhitespace(ref.excerpt).includes(normalizeWhitespace(quote)));
  return {schemaVersion:1,value,sourceUrl:ref?.source.url||null,sourceId,evidenceQuote:quote,inferred:!grounded,
    verification:grounded?'matched_saved_quote':ref?quality.code.toLowerCase():receiptId?'receipt_not_in_research':'no_source',
    reason:grounded?'Quote matched saved source text and passed contextual quality checks.':quality.reason};
}
function customerSourceAllowed(item,ref,sellerDomain) {
  if(!ref)return false;
  if(hostMatches(ref.host,sellerDomain))return true;
  const customerDomain=normalizeDomain(item.domain);
  return Boolean(customerDomain&&CUSTOMER_SOURCE_KINDS.has(ref.kind)&&ref.ownerDomain===customerDomain&&hostMatches(ref.host,customerDomain));
}

function materializeGeneratedDraft(state,workspace,output,{organizationReview,now=()=>new Date().toISOString()}={}) {
  assertSynthesisOutput(output);
  const candidate=selectedCandidate(workspace), context=buildReceiptEvidence(state,workspace).receiptMap, evidence={}, warnings=[], droppedCustomers=[], droppedCompetitors=[];
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
    const item=evidenceFor(state,workspace,raw,name,context),ref=context.get(clean(raw.receiptId,40));
    if(!name||item.inferred||!customerSourceAllowed(raw,ref,candidate.domain)) { droppedCustomers.push({name,reason:item.inferred?item.reason:'Customer evidence was not from an allowed first-party source.'});continue; }
    const index=profile.customers.length;profile.customers.push({name,domain,...item});evidence[`customers.${index}`]=item;acceptedClaims++;receiptedClaims++;
  }
  profile.competitors=[];
  const seenCompetitors=new Set();
  for(const raw of output.sellerProfile.competitors) {
    const name=clean(raw.name,200),domain=normalizeDomain(raw.domain),dedupe=domain||name.toLowerCase();
    if(!name||seenCompetitors.has(dedupe))continue;seenCompetitors.add(dedupe);attemptedClaims++;
    const item=evidenceFor(state,workspace,raw,name,context);
    const confirmed=(organizationReview?.competitors||[]).some(row=>row.kept&&row.name===name&&row.receiptId===raw.receiptId&&require('./review-organizations.cjs').confirmedComparison(row,{seller:candidate}));
    if(!name||!domain&&!confirmed||item.inferred) { droppedCompetitors.push({name,reason:!domain?'Competitor domain was missing or invalid.':item.reason});continue; }
    const domainEvidence=(organizationReview?.competitors||[]).find(row=>row.kept&&row.name===name&&row.domain===domain)?.domainEvidence||null;
    const index=profile.competitors.length;profile.competitors.push({name,domain,domainStatus:domain?'verified':'domain_missing',domainEvidence,...item});evidence[`competitors.${index}`]=item;acceptedClaims++;receiptedClaims++;
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
  const report={schemaVersion:1,attemptedClaims,acceptedClaims,receiptedClaims,receiptCoverage:attemptedClaims?receiptedClaims/attemptedClaims:0,warnings,droppedCustomers,droppedCompetitors,
    qualityFindings:workspaceQualityFindings({sellerProfile:profile,icpConfig:config})};
  return {profile,config,report};
}

function saveGeneratedProfile(state,id,{output,organizationReview,expectedResearchRevision,expectedRunId,expectedSourceSetHash,expectedProfileRevision,model='unknown',promptVersion='unknown',now=()=>new Date().toISOString()}={}) {
  if(!Number.isInteger(expectedResearchRevision)||!Number.isInteger(expectedProfileRevision)||typeof expectedSourceSetHash!=='string')throw new SynthesisValidationError('INVALID_INPUT','Generation guards are required.');
  const workspace=getWorkspace(state,id);
  if(workspace.status==='archived')throw new SynthesisValidationError('ARCHIVED','Restore this workspace before saving generated research.');
  if(workspace.status==='active')throw new SynthesisValidationError('ACTIVE_PROFILE','Approved profiles require a reviewable refresh diff and cannot be overwritten.');
  if((workspace.research?.revision??0)!==expectedResearchRevision||String(workspace.profileRevision||0)!==String(expectedProfileRevision)||(expectedRunId&&workspace.research?.runId!==expectedRunId)||sourceSetHash(state,workspace)!==expectedSourceSetHash)throw new SynthesisValidationError('STALE_RESEARCH','Research changed while the profile was being generated. Run synthesis again.');
  const generatedAt=now(),{profile,config,report}=materializeGeneratedDraft(state,workspace,output,{organizationReview,now:()=>generatedAt});
  let next=updateWorkspace(state,id,w=>{
    const candidate=selectedCandidate(w);
    w.onboarding={...(w.onboarding||{schemaVersion:1}),status:'selected',selectedCandidate:candidate};
    w.sellerProfile=profile;w.icpConfig=config;w.status='needs_review';w.deliveryMode='demo';w.profileRevision=(w.profileRevision||0)+1;
    delete w.reviewAcknowledgments;
    const steps=(w.research.steps||[]).map(step=>({...step,status:step.key==='review'?'pending':'complete'}));
    w.research={...w.research,status:'review_required',revision:(w.research.revision||0)+1,steps,synthesis:{schemaVersion:1,promptVersion,model,generatedAt,sourceSetHash:expectedSourceSetHash,report,...(organizationReview?{organizationReview:structuredClone(organizationReview)}:{})}};
  });
  const revision=next.workspaces[id].profileRevision;
  next.auditLog.push({schemaVersion:1,id:stableId(`${id}:seller_profile_generated:${revision}:${generatedAt}`),workspaceId:id,type:'seller_profile_generated',occurredAt:generatedAt,profileRevision:revision,actor:'system',receiptedClaims:report.receiptedClaims,acceptedClaims:report.acceptedClaims,droppedClaims:report.droppedCustomers.length+report.droppedCompetitors.length});
  return next;
}

module.exports={FACT_KEYS,LIST_FACT_KEYS,SIGNAL_KEYS,DEFAULT_TIER_RULES,MAX_SYNTHESIS_SOURCES,MAX_EVIDENCE_PACKET_BYTES,MAX_SOURCE_EXCERPT_BYTES,MAX_RECEIPT_TEXT,MIN_RECEIPT_TEXT,
  SynthesisValidationError,assertSynthesisOutput,validateSynthesisOutput,researchSourceContext,buildResearchEvidence,buildReceiptEvidence,receiptIdFor,sourceSetHash,
  meaningfulTerms,isNavigationHeavy,sellerFactSourceAllowed,receiptQuality,receiptQuotes,sloganLike,vendorSeekingQuery,killLooksLikePain,workspaceQualityFindings,blockingQualityFindings,materializeGeneratedDraft,saveGeneratedProfile};
