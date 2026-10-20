'use strict';

const TIER_SCHEMA_VERSION='firmographic-tier-v3-evidence-only';
const DEFAULT_TIER_RULES={tier1:{revenue:500000000,employees:2000,valuation:5000000000},tier2:{revenue:25000000,employees:150,fundingStages:['series a','series b','series c','series d','growth','private equity']},tier3:{maxEmployees:149,minimumRaised:2000000}};
function finite(value,fallback,minimum=0){const number=Number(value);return Number.isFinite(number)&&number>=minimum?number:fallback;}
function normalizeTierRules(input={}){
  const rules=input.tierRules||input;
  return {tier1:{revenue:finite(rules.tier1?.revenue,DEFAULT_TIER_RULES.tier1.revenue),employees:finite(rules.tier1?.employees,DEFAULT_TIER_RULES.tier1.employees,1),valuation:finite(rules.tier1?.valuation,DEFAULT_TIER_RULES.tier1.valuation)},tier2:{revenue:finite(rules.tier2?.revenue,DEFAULT_TIER_RULES.tier2.revenue),employees:finite(rules.tier2?.employees,DEFAULT_TIER_RULES.tier2.employees,1),fundingStages:Array.isArray(rules.tier2?.fundingStages)&&rules.tier2.fundingStages.length?Array.from(new Set(rules.tier2.fundingStages.map(stage=>String(stage).toLowerCase()))):[...DEFAULT_TIER_RULES.tier2.fundingStages]},tier3:{maxEmployees:finite(rules.tier3?.maxEmployees,DEFAULT_TIER_RULES.tier3.maxEmployees,1),minimumRaised:finite(rules.tier3?.minimumRaised,DEFAULT_TIER_RULES.tier3.minimumRaised)}};
}
function midpointFromBand(value=''){
  const raw=String(value).replace(/,/g,'').toLowerCase(),numbers=[...raw.matchAll(/([0-9]+(?:\.[0-9]+)?)\s*([kmb])?/g)].map(match=>Number(match[1])*({k:1e3,m:1e6,b:1e9}[match[2]]||1));
  if(!numbers.length)return 0;return numbers.length>1?(numbers[0]+numbers[1])/2:numbers[0];
}
function knownFieldCount(profile={}){return [profile.revenueEstimate||profile.revenueBand,profile.employeeCount,profile.fundingStage||profile.totalRaised,profile.valuation,profile.isPublic].filter(value=>value!==null&&value!==''&&value!==undefined).length;}
function tierConfidenceValue(profile={},account={}){const numeric=Number(profile.confidence);if(Number.isFinite(numeric))return Math.max(0,Math.min(1,numeric));const label=String(profile.confidenceLabel||account.firmographicsConfidence||'').toLowerCase();return {high:.9,medium:.7,low:.3,pending:.2}[label]??0;}
function formatMoney(value){const amount=Number(value)||0;if(amount>=1e9)return `$${Number((amount/1e9).toFixed(1))}B`;if(amount>=1e6)return `$${Number((amount/1e6).toFixed(1))}M`;if(amount>=1e3)return `$${Number((amount/1e3).toFixed(1))}k`;return `$${amount}`;}
function firmographicEvidence(profile={},driverField=''){
  const field=profile.fields?.[driverField]||(driverField==='revenueEstimate'?profile.fields?.revenueBand:null)||{},source=String(field.provider||profile.source||'firmographics').toLowerCase(),receipt=String(field.sourceUrl||profile.sourceUrl||profile.sources?.[0]||''),labels={wikidata:'Wikidata structured company profile',apollo:'Apollo organization enrichment',pdl:'People Data Labs firmographics',free:'public-web firmographics'};
  return {source,receipt,label:labels[source]||`${source||'firmographic'} evidence`};
}
function productionComplexity(account={}){
  const text=[account.industry,account.description,account.hypothesis?.text,...(account.triggers||[]).flatMap(trigger=>[trigger.triggerType,trigger.evidenceText]),...Object.values(account.signals||{}).map(signal=>signal.evidenceText)].filter(Boolean).join(' '),matches=text.match(/kubernetes|microservices?|gpu|distributed systems?|site reliability|\bsre\b|observability|datadog|grafana|opentelemetry|production incident|outage/gi)||[];
  return {verified:matches.length>=2,evidence:Array.from(new Set(matches.map(value=>value.toLowerCase()))).slice(0,5)};
}
function tierCompany(account={},input=DEFAULT_TIER_RULES){
  const config=normalizeTierRules(input),profile=account.firmographics||{},revenue=Number(profile.revenueEstimate)||midpointFromBand(profile.revenueBand)||0,employees=Number(profile.employeeCount)||0,valuation=Number(profile.valuation)||0,totalRaised=Number(profile.totalRaised)||0,stage=String(profile.fundingStage||'').toLowerCase().replaceAll('_',' '),known=knownFieldCount(profile);
  let tier='parked',tierReason='Firmographics missing — parked pending verification.',driverField='';
  const assignedSegment=account.icpSegment||account.segment||'',unsupportedSegment=assignedSegment==='unclassified'||account.segmentClassification?.requiresReview===true,confidence=tierConfidenceValue(profile,account);
  if(unsupportedSegment)return {tier:'parked',tierReason:'Parked: company segment is unclassified or below the evidence threshold.',tierProvisional:true,tierConfidence:confidence,tierSchemaVersion:TIER_SCHEMA_VERSION};
  if(profile.isPublic===true){tier=1;driverField='isPublic';tierReason='Tier 1: verified public company.';}
  else if(revenue>=config.tier1.revenue){tier=1;driverField='revenueEstimate';tierReason=`Tier 1: estimated revenue ${profile.revenueBand||formatMoney(revenue)} meets the ${formatMoney(config.tier1.revenue)} threshold.`;}
  else if(employees>=config.tier1.employees){tier=1;driverField='employeeCount';tierReason=`Tier 1: ${employees.toLocaleString('en-US')} employees meets the ${config.tier1.employees.toLocaleString('en-US')}-employee threshold.`;}
  else if(valuation>=config.tier1.valuation){tier=1;driverField='valuation';tierReason=`Tier 1: valuation meets the ${formatMoney(config.tier1.valuation)} threshold.`;}
  else if(revenue>=config.tier2.revenue){tier=2;driverField='revenueEstimate';tierReason=`Tier 2: estimated revenue ${profile.revenueBand||formatMoney(revenue)} meets the ${formatMoney(config.tier2.revenue)} growth threshold.`;}
  else if(employees>=config.tier2.employees){tier=2;driverField='employeeCount';tierReason=`Tier 2: ${employees.toLocaleString('en-US')} employees meets the ${config.tier2.employees.toLocaleString('en-US')}-person growth threshold.`;}
  else if(config.tier2.fundingStages.includes(stage)){tier=2;driverField='fundingStage';tierReason=`Tier 2: ${profile.fundingStage} funding indicates a growth-stage sales motion.`;}
  else if(known){const complexity=productionComplexity(account),earlyStage=!stage||['pre seed','pre-seed','seed','pre series a','pre-series-a'].includes(stage);if(employees<=config.tier3.maxEmployees&&earlyStage&&(totalRaised>=config.tier3.minimumRaised||complexity.verified)){tier=3;driverField=totalRaised>=config.tier3.minimumRaised?'totalRaised':'productionComplexity';const driver=totalRaised>=config.tier3.minimumRaised?'meaningful seed funding':`verified production complexity (${complexity.evidence.join(', ')})`;tierReason=`Tier 3: no more than ${config.tier3.maxEmployees.toLocaleString('en-US')} employees with ${driver}; retain for nurture and verification.`;}else tierReason='Parked: below growth thresholds with insufficient verified production evidence for outreach.';}
  const evidence=firmographicEvidence(profile,driverField);
  if([1,2,3].includes(tier)&&evidence.receipt)tierReason=`${tierReason} Evidence: ${evidence.label} (receipt: ${evidence.receipt}).`;
  const provisional=tier==='parked'?true:evidence.source==='wikidata'||account.seedFirmographicTierProvisional===true||confidence<.7||known<3;
  if([1,2,3].includes(tier)&&provisional)tierReason=`${tierReason} Provisional — firmographic confidence ${Math.round(confidence*100)}%; verification pending.`;
  return {tier,tierReason,tierProvisional:provisional,tierConfidence:confidence,tierEvidenceSource:[1,2,3].includes(tier)?evidence.source:'',tierEvidenceReceipt:[1,2,3].includes(tier)?evidence.receipt:'',firmographicVerificationRequired:[1,2,3].includes(tier)&&provisional,tierSchemaVersion:TIER_SCHEMA_VERSION};
}
module.exports={DEFAULT_TIER_RULES,TIER_SCHEMA_VERSION,normalizeTierRules,productionComplexity,tierCompany,tierConfidenceValue};
