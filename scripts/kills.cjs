'use strict';

const {SIGNAL_KEYS}=require('./signal-rubric.cjs');
const {organizationMatch,SOURCE_KILL_PRECEDENCE}=require('./phase-a-config.cjs');
const {internalToolEvidence,evidenceRows,adjacentVendorEvidence}=require('./kill-evidence.cjs');

function accountEvidence(account={}) {
  const triggers=Array.isArray(account.triggers)?account.triggers:[],citations=Array.isArray(account.hypothesis?.citations)?account.hypothesis.citations:[];
  const evidenceText=[account.name,account.industry,account.description,account.hypothesis?.text,account.hypothesis?.whyNow,...triggers.flatMap(trigger=>[trigger.triggerType,trigger.evidenceText]),...citations.map(citation=>citation.text)].filter(Boolean).join(' ');
  const evidenceUrls=[...triggers.map(trigger=>trigger.evidenceUrl),...citations.map(citation=>citation.url),account.discoveryQuality?.sourceUrl].filter(Boolean);
  return {evidenceText,evidenceUrls:Array.from(new Set(evidenceUrls))};
}
function matchesAny(text,patterns=[]){return patterns.some(pattern=>{try{return new RegExp(pattern,'i').test(text);}catch{return String(text).toLowerCase().includes(String(pattern).toLowerCase());}});}
function evaluateKills(account={},config={}) {
  const kills=[],{evidenceText,evidenceUrls}=accountEvidence(account),signalUrls=SIGNAL_KEYS.map(key=>account.signals?.[key]?.evidenceUrl).filter(Boolean),evidenceUrl=evidenceUrls[0]||signalUrls[0]||'',precedence=config.killPrecedence||SOURCE_KILL_PRECEDENCE;
  const add=(code,reason,url,text)=>kills.push({code,reason,evidenceUrl:url,evidenceText:text});
  for(const hint of account.killHints||[]){
    if(!precedence.includes(hint.code)||!hint.evidenceUrl)continue;
    if(['KILL_BUILD_CULTURE','KILL_SOLVING_IN_HOUSE'].includes(hint.code))continue; // Re-evaluate the actual receipt below.
    const reasons={KILL_BUILD_CULTURE:'Public evidence shows a strong build-in-house observability culture.',KILL_SOLVING_IN_HOUSE:'Public evidence indicates the account is already solving AI production investigation in-house.',KILL_BELOW_ICP_SIZE:`Verified ${config.killPatterns?.sizeMetric?.label||'company size'} is below the configured ICP floor.`,KILL_UNSELLABLE_ORG:'Verified prospecting constraints make this organization unsuitable for the current motion.',KILL_EXISTING_CUSTOMER:`${account.name} is verified as an existing ${config.seller?.label||config.seller?.name||'seller'} customer.`,KILL_SELLER_OR_COMPETITOR:`${account.name} is the seller or a configured competitor.`};
    add(hint.code,reasons[hint.code],hint.evidenceUrl,hint.evidenceText);
  }
  const customer=(config.customers||[]).find(row=>organizationMatch(account,row));
  if(customer)add('KILL_EXISTING_CUSTOMER',`${account.name} is listed as an existing ${config.seller?.label||config.seller?.name||'seller'} customer.`,customer.sourceUrl,`${config.seller?.label||config.seller?.name||'Seller'} customer list.`);
  const sellerMatch=organizationMatch(account,{name:config.seller?.name,domain:config.seller?.domain});
  const competitor=(config.competitors||[]).find(row=>organizationMatch(account,row));
  if((sellerMatch||competitor)&&(sellerMatch?config.seller?.domain:competitor?.sourceUrl||competitor?.domain))add('KILL_SELLER_OR_COMPETITOR',sellerMatch?`${account.name} is the seller, not a prospect.`:`${account.name} is a configured competitor, not a prospect.`,sellerMatch?`https://${config.seller.domain}`:(competitor.sourceUrl||`https://${competitor.domain}`),sellerMatch?'Seller identity from the active workspace.':'Competitor identity from the active workspace.');
  const vendor=adjacentVendorEvidence(account,config);
  if(vendor)add('KILL_SELLER_OR_COMPETITOR',`${account.name} is an adjacent ${vendor.category} vendor, not a buyer prospect for ${config.seller?.label||config.seller?.name||'this seller'}. Saved evidence: ${vendor.evidenceText}`,vendor.evidenceUrl,vendor.evidenceText);
  if(!vendor)for(const row of evidenceRows(account).filter(row=>internalToolEvidence(account,row))){
    for(const [code,patterns,label] of [
      ['KILL_BUILD_CULTURE',config.killPatterns?.buildCulturePatterns||config.killPatterns?.buildCulture||[],'builds or operates its own internal observability tooling'],
      ['KILL_SOLVING_IN_HOUSE',config.killPatterns?.solvingInHousePatterns||config.killPatterns?.solvingInHouse||[],'already solves production investigation with its own internal tooling']
    ])if(matchesAny(row.evidenceText,patterns)||row.code===code)add(code,`${account.name} ${label}. Its own engineering receipt says: ${row.evidenceText}`,row.evidenceUrl,row.evidenceText);
  }
  const label=config.killPatterns?.sizeMetric?.label||'minEngineeringHeadcount',floor=Number(config.killPatterns?.sizeMetric?.floor)||0,value=Number(account[label]||account.engineeringHeadcount||account.engineeringEmployeeEstimate||0),sizeUrl=account[`${label}SourceUrl`]||account.engineeringHeadcountSourceUrl||account.employeeEstimateSourceUrl||'';
  if(value>0&&floor>0&&value<floor&&sizeUrl)add('KILL_BELOW_ICP_SIZE',`Verified engineering headcount (${value}) is below the configured ${floor}-engineer ICP floor.`,sizeUrl,'Engineering headcount evidence.');
  if((account.prospectingSurface==='unavailable'||account.unsellable===true)&&account.prospectingSurfaceEvidenceUrl)add('KILL_UNSELLABLE_ORG','Verified prospecting constraints make this organization unsuitable for the current motion.',account.prospectingSurfaceEvidenceUrl,account.prospectingSurfaceEvidenceText||'Prospecting-surface evidence.');
  return Array.from(new Map(kills.map(kill=>[`${kill.code}:${kill.evidenceUrl}`,kill])).values()).sort((a,b)=>precedence.indexOf(a.code)-precedence.indexOf(b.code));
}
function assertValidKill(kill={},config={}){const precedence=config.killPrecedence||SOURCE_KILL_PRECEDENCE;if(!precedence.includes(kill.code))throw new Error(`Kill engine produced an invalid kill code: ${JSON.stringify(kill.code)}`);if(!String(kill.reason||'').trim())throw new Error(`Kill ${kill.code} is missing a human-readable reason.`);if(!String(kill.evidenceUrl||'').trim())throw new Error(`Kill ${kill.code} is missing evidence.`);return kill;}
function applyKillEngine(account={},config={}){const kills=evaluateKills(account,config).map(kill=>assertValidKill(kill,config));return {...account,kills,killStatus:kills.length?'killed':null,score:{...(account.score||{})}};}
module.exports={accountEvidence,applyKillEngine,assertValidKill,evaluateKills};
