const fs = require('node:fs');
const path = require('node:path');

const REFERENCE_PROFILE_FILE = path.resolve(__dirname, '../../config/reference-profiles/resolve-ai.json');
const SIGNAL_KEYS = ['techStack','revenueSensitivity','observabilityScale','activePain','aiCompatibility','competitiveWedge'];
const FORBIDDEN_RUNTIME_KEYS = ['status','workspaceId','sellerProfile','accounts','approvedAt','generatedAt','deliveryAllowed'];

function plainObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
function nonEmptyStrings(value) {
  return Array.isArray(value) && value.length > 0 && value.every(item => typeof item === 'string' && item.trim());
}
function unique(values) {
  return new Set(values).size === values.length;
}
function publicHttps(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && (!url.port || url.port === '443');
  } catch {
    return false;
  }
}
function validateReferenceProfile(value) {
  if (!plainObject(value) || value.schemaVersion !== 1 || value.referenceProfileVersion !== 'resolve-ai-v7-outreach-polish-2026-10-21' || value.id !== 'resolve-ai' || value.kind !== 'load_only_reference' || value.loadOnly !== true) throw new Error('Invalid Resolve reference profile header.');
  if (FORBIDDEN_RUNTIME_KEYS.some(key => Object.hasOwn(value,key))) throw new Error('Reference profiles cannot contain runtime workspace state.');
  if (!plainObject(value.seller) || value.seller.name !== 'Resolve AI' || value.seller.domain !== 'resolve.ai' || value.seller.website !== 'https://resolve.ai') throw new Error('Invalid Resolve reference identity.');
  const provenance=value.provenance;
  if (!plainObject(provenance) || provenance.sourceProject !== 'flowfire' || !/^[a-f0-9]{40}$/.test(provenance.sourceCommit||'') || !nonEmptyStrings(provenance.sourceModules) || !publicHttps(provenance.customerSourceUrl) || provenance.customerEvidenceStatus !== 'requires_live_research' || !nonEmptyStrings(provenance.referenceCustomerNames) || !unique(provenance.referenceCustomerNames) || !Array.isArray(provenance.movedRuntimeConstants) || provenance.movedRuntimeConstants.some(row=>!row.target||!row.sourceFile||!row.sourceLines) || provenance.sellerClaimRefresh?.changedOn!=='2026-10-21' || !Array.isArray(provenance.sellerClaimRefresh?.pages) || provenance.sellerClaimRefresh.pages.some(row=>!publicHttps(row.url)||!Number.isFinite(Date.parse(row.fetchedAt))) || provenance.outreachQualityRefresh?.changedOn!=='2026-10-21' || provenance.outreachPolish?.changedOn!=='2026-10-21') throw new Error('Invalid Resolve reference provenance.');
  const config=value.icpConfig;
  if (!plainObject(config) || config.schemaVersion !== 1 || !Array.isArray(config.segments) || config.segments.length < 3 || config.segments.length > 10) throw new Error('Invalid Resolve reference ICP config.');
  const customerNames=new Set(provenance.referenceCustomerNames);
  const segmentKeys=[];
  for (const segment of config.segments) {
    if (!plainObject(segment) || typeof segment.key !== 'string' || !segment.key || typeof segment.label !== 'string' || !segment.label || segment.enabled !== true || !nonEmptyStrings(segment.queryTemplates) || segment.queryTemplates.length < 4 || segment.queryTemplates.length > 8 || !Array.isArray(segment.subIndustries) || !Array.isArray(segment.exampleTargets) || !nonEmptyStrings(segment.wedgeCustomers) || !segment.wedgeCustomers.every(name=>customerNames.has(name)) || !Number.isInteger(segment.revenueSensitivityBase) || segment.revenueSensitivityBase < 1 || segment.revenueSensitivityBase > 5) throw new Error('Invalid Resolve reference segment.');
    segmentKeys.push(segment.key);
  }
  if (!unique(segmentKeys)) throw new Error('Resolve reference segment keys must be unique.');
  if (!plainObject(config.personas) || !nonEmptyStrings(config.personas.buyerTitles) || !nonEmptyStrings(config.personas.championTitles) || !Array.isArray(config.personas.wrongOrgTitles)) throw new Error('Invalid Resolve reference personas.');
  if (!plainObject(config.signalDefinitions) || SIGNAL_KEYS.some(key=>!plainObject(config.signalDefinitions[key]) || typeof config.signalDefinitions[key].label !== 'string')) throw new Error('Invalid Resolve reference signals.');
  if (!plainObject(config.weights) || SIGNAL_KEYS.some(key=>!Number.isFinite(config.weights[key]) || config.weights[key] <= 0)) throw new Error('Invalid Resolve reference weights.');
  if (!plainObject(config.slaDays) || Object.values(config.slaDays).some(days=>!Number.isInteger(days) || days < 1)) throw new Error('Invalid Resolve reference SLAs.');
  const collectorRules=config.collectorRules;
  if (!plainObject(collectorRules) || !publicHttps(collectorRules.customerSourceUrl) || typeof collectorRules.customerSourceId!=='string' || !collectorRules.customerSourceId || !plainObject(collectorRules.transactionalUrgency) || !nonEmptyStrings(collectorRules.transactionalUrgency.transactionGoneSegments) || !nonEmptyStrings(collectorRules.transactionalUrgency.customerReturnsSegments) || !nonEmptyStrings(collectorRules.transactionalUrgency.transactionGoneKeywords) || !nonEmptyStrings(collectorRules.transactionalUrgency.customerReturnsKeywords) || !plainObject(collectorRules.edgarSegmentQueries) || !segmentKeys.every(key=>typeof collectorRules.edgarSegmentQueries[key]==='string'&&collectorRules.edgarSegmentQueries[key].trim())) throw new Error('Invalid Resolve reference collector rules.');
  if (!plainObject(config.tierRules) || !plainObject(config.triggerMapping) || !plainObject(config.killPatterns) || !nonEmptyStrings(config.killPatterns.solvingInHousePatterns) || !nonEmptyStrings(config.killPatterns.buildCulturePatterns) || !plainObject(config.scoring) || config.scoring.liveTriggerDays!==90 || !plainObject(config.decisionRules) || !Array.isArray(config.killRules?.precedence) || !Array.isArray(config.entityRules) || !plainObject(config.exclusions) || !nonEmptyStrings(config.exclusions.existingCustomers) || !publicHttps(config.exclusions.customerSourceUrl)) throw new Error('Invalid Resolve reference rules.');
  const outreach=config.outreach,claims=outreach?.claims;
  const verbatim=row=>plainObject(row)&&typeof row.value==='string'&&row.value.trim()&&typeof row.quote==='string'&&row.quote.includes(row.value)&&publicHttps(row.sourceUrl)&&Number.isFinite(Date.parse(row.fetchedAt));
  if (!plainObject(outreach) || !nonEmptyStrings(outreach.framingLibrary) || outreach.framingLibrary.some(row=>!/[.!?]$/.test(row)) || outreach.closingQuestions?.length!==3 || !nonEmptyStrings(outreach.closingQuestions) || !unique(outreach.closingQuestions.map(row=>row.toLowerCase())) || outreach.closingQuestions.some(row=>!row.endsWith('?')) || claims?.status!=='frozen_reference' || !verbatim(claims.product) || (claims.credential!==undefined&&!verbatim(claims.credential)) || !Array.isArray(claims.customerProofs) || claims.customerProofs.length<1 || claims.customerProofs.some(row=>!row.customer||!row.claim||typeof row.quote!=='string'||!row.quote.includes(row.claim)||!publicHttps(row.sourceUrl)||!Number.isFinite(Date.parse(row.fetchedAt))||!nonEmptyStrings(row.segments)||row.segments.some(key=>!segmentKeys.includes(key))) || !plainObject(outreach.rules) || outreach.rules.quoteMaxWords!==15 || outreach.rules.maxFramingSentences!==1 || outreach.rules.closingQuestionCount!==3 || !plainObject(outreach.targeting)) throw new Error('Invalid Resolve reference outreach config.');
  return true;
}
function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}
function loadReferenceProfile(file=REFERENCE_PROFILE_FILE) {
  let value;
  try { value=JSON.parse(fs.readFileSync(file,'utf8')); }
  catch (error) { throw new Error('Resolve reference profile could not be read.',{cause:error}); }
  validateReferenceProfile(value);
  return deepFreeze(structuredClone(value));
}

module.exports={REFERENCE_PROFILE_FILE,SIGNAL_KEYS,loadReferenceProfile,validateReferenceProfile};
