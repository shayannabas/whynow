const {workspaceQualityFindings}=require('./validate.cjs');

function normalize(value) {
  return String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
}
function domain(value) {return String(value||'').toLowerCase().replace(/^https?:\/\//,'').replace(/^www\./,'').split('/')[0].replace(/\.$/,'');}
function expectedRows(fixture,key,{includeUnconfirmed=false}={}) {
  const rows=key==='sizeMetric'?[fixture[key]]:fixture[key]||[];
  return rows.filter(Boolean).filter(item=>includeUnconfirmed||item.labeledBy!=='unconfirmed');
}
function organizationMatches(actual,expected) {
  const actualDomain=domain(actual.domain),expectedDomain=domain(expected.domain);
  if(actualDomain&&expectedDomain&&actualDomain===expectedDomain)return true;
  return normalize(actual.name)===normalize(expected.name);
}
function titleMatches(actual,expected) {
  const left=normalize(typeof actual==='string'?actual:actual?.value),right=normalize(typeof expected==='string'?expected:expected?.value);
  return Boolean(left&&right&&(left===right||left.includes(right)||right.includes(left)));
}
function recall(actual,expected,match) {
  const matched=expected.filter(item=>actual.some(candidate=>match(candidate,item)));
  return {matched:matched.length,total:expected.length,ratio:expected.length?matched.length/expected.length:null,matchedValues:matched.map(item=>item.name||item.value),missingValues:expected.filter(item=>!matched.includes(item)).map(item=>item.name||item.value)};
}
function scoreOrganizationCandidates(candidates,fixture,options={}) {
  const customers=expectedRows(fixture,'customers',options),competitors=expectedRows(fixture,'competitors',options);
  return {schemaVersion:1,mode:options.includeUnconfirmed?'provisional_unconfirmed':'confirmed_only',
    customerRecall:recall(candidates.customers||[],customers,organizationMatches),
    competitorRecall:recall(candidates.competitors||[],competitors,organizationMatches),
    customerDomains:{present:(candidates.customers||[]).filter(item=>Boolean(domain(item.domain))).length,total:(candidates.customers||[]).length}};
}
function scoreDraft(draft,fixture,options={}) {
  const profile=draft?.sellerProfile||{},config=draft?.icpConfig||{},customers=expectedRows(fixture,'customers',options),competitors=expectedRows(fixture,'competitors',options),buyers=expectedRows(fixture,'buyerTitles',options),champions=expectedRows(fixture,'championTitles',options),expectedSize=expectedRows(fixture,'sizeMetric',options)[0]||null;
  const actualSize=config.killPatterns?.sizeMetric||{},measurable=/\b(?:employees?|headcount|engineering headcount|engineers?|annual revenue|revenue|arr|workforce|team size)\b/i.test(actualSize.label||'');
  const sizeMatch=expectedSize?normalize(actualSize.label)===normalize(expectedSize.label)&&Number(actualSize.floor)===Number(expectedSize.floor):null;
  const findings=workspaceQualityFindings(draft),blocking=findings.filter(item=>item.severity==='blocking');
  return {schemaVersion:1,mode:options.includeUnconfirmed?'provisional_unconfirmed':'confirmed_only',
    customerRecall:recall(profile.customers||[],customers,organizationMatches),competitorRecall:recall(profile.competitors||[],competitors,organizationMatches),
    buyerPersonaMatch:recall(config.personas?.buyerTitles||[],buyers,titleMatches),championPersonaMatch:recall(config.personas?.championTitles||[],champions,titleMatches),
    sizeSanity:{measurable,nonNegativeInteger:Number.isInteger(actualSize.floor)&&actualSize.floor>=0,expectedMatch:sizeMatch,actual:{label:actualSize.label||'',floor:actualSize.floor??null},expected:expectedSize?{label:expectedSize.label,floor:expectedSize.floor}:null},
    blockingWarningCount:blocking.length,blockingWarnings:blocking.map(item=>({code:item.code,path:item.path,message:item.message}))};
}

module.exports={normalize,organizationMatches,titleMatches,scoreOrganizationCandidates,scoreDraft};
