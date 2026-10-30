'use strict';
const {rootDomain,normalizedEntityName}=require('./entity-rules.cjs');
const {stripHtml}=require('./collectors/common.cjs');
const key=v=>normalizedEntityName(v).replace(/\s/g,'');
const NON_COMPANY_HOST=/^(?:docs?|developer|developers|blog|news|jobs|careers)\./i;
const NON_COMPANY_PATH=/(?:^|\/)(?:docs?|documentation|blog|articles?|resources|guides?|jobs|careers|open-source)(?:\/|$)/i;
function sellerCapabilities(config={}){const description=String(config.seller?.category||''),core=description.split(/\bfor\b/i)[0].split(/\band\b|,/i).map(s=>s.trim()),infrastructure=/\binfrastructure|hosting|deployment|developer platform\b/i.test(description+' '+String(config.seller?.productOneLiner||'')),components=infrastructure?[...(config.triggerMapping?.tech_adoption||[]),...(config.signalDefinitions?.competitiveWedge?.evidenceKeywords||[])].filter(s=>/\bdomains?|deployments?|hosting|infrastructure|certificates?|CI\/CD\b/i.test(s)):[];return [...new Set([...(config.adjacentVendorCategories||[]),...core,...components].map(s=>String(s).replace(/\s+(adoption|modernization)$/i,'').trim()).filter(s=>s.split(/\s+/).length>=2&&s.length>=8))];}
function adjacentOffering(text='',config={}){const selling=/\b(?:we (?:provide|sell|offer)|our (?:API|platform|product|service) (?:provides|offers|lets|helps|enables)|one (?:easy|simple) API|set up custom domains for your customers)\b/i;for(const sentence of String(text).match(/[^.!?]+(?:[.!?]|$)/g)||[]){if(!selling.test(sentence))continue;const category=sellerCapabilities(config).find(s=>sentence.toLowerCase().includes(s.toLowerCase()));if(category)return category;}return '';}
function assessOperatingCompany(candidate={},config={},page={}){
 const urlValue=page.url||candidate.sourceUrl||candidate.website;let url;try{url=new URL(urlValue);}catch{return {accepted:false,reason:'invalid_official_domain'};}
 const domain=rootDomain(url.href),name=String(candidate.name||''),text=stripHtml(String(page.text||page.value||candidate.savedText||candidate.provenance?.snippet||'').replace(/<(header|nav|footer)\b[\s\S]*?<\/\1>/gi,' ')),title=String(page.title||candidate.sourceTitle||name),seller=config.seller||{},owned=config.sellerOwnedDomains||[];
 if(domain===rootDomain(seller.domain)||domain.endsWith('.'+rootDomain(seller.domain))&&seller.domain||owned.some(v=>domain===rootDomain(v.domain||v)))return {accepted:false,reason:'seller_property'};
 const sellerNames=[seller.name,seller.label].filter(Boolean).map(v=>(String(v).match(/[a-z0-9]+/gi)||[]).join('\\W+'));
 if(sellerNames.some(name=>new RegExp('\\b(?:part of|(?:framework|product|project) (?:created |built |maintained )?by)\\s+'+name+'\\b','i').test(text)))return {accepted:false,reason:'seller_property'};
 if(NON_COMPANY_HOST.test(domain)||NON_COMPANY_PATH.test(url.pathname))return {accepted:false,reason:'non_company_page'};
 if(/\b(?:jobs|job board|career opportunities)\b/i.test(name)||/\bfind a.{0,35}job\b/i.test(text.slice(0,300)))return {accepted:false,reason:'job_board'};
 if(/\b(?:framework|open[- ]source project|documentation|in your framework)\b/i.test(name+' '+title)||/\bis (?:an? |the )?(?:[a-z-]+ ){0,3}(?:framework|open[- ]source project)\b/i.test(text.slice(0,300)))return {accepted:false,reason:'framework_or_project'};
 const category=adjacentOffering(text,config);
 if(category){const verified=page.sourceKind==='first_party_page'&&rootDomain(page.url)===rootDomain(candidate.domain);return {accepted:false,reason:verified?'adjacent_vendor':'adjacent_vendor_candidate',category,evidenceUrl:url.href,evidenceText:text,verifiedFirstParty:verified};}
 if(/^(?:how\b|the best\b|organic growth for\b|custom domains and\b)|\b(?:blog|guide|documentation)\b/i.test(name))return {accepted:false,reason:'headline_not_company'};
 if(!candidate.domain||NON_COMPANY_HOST.test(rootDomain(candidate.domain))||rootDomain(candidate.domain)!==domain)return {accepted:false,reason:'identity_domain_mismatch'};
 // A matching search title alone never establishes an operating company.
 const named=key(text).includes(key(name))&&key(name).length>=4,commercial=/\b(?:company|business|customers|our product|our platform|we (?:build|provide|help|offer)|we are|employees)\b/i.test(text);
 if(page.sourceKind!=='first_party_page'||!named||!commercial)return {accepted:false,reason:'company_identity_unverified'};
 if(!key(title).includes(key(name))&&!key(domain.split('.')[0]).includes(key(name)))return {accepted:false,reason:'company_name_unverified'};
 return {accepted:true,reason:'first_party_operating_company',domain,evidenceUrl:url.href,evidenceText:text};
}
function quarantineLegacyCandidates(workspace,config){const changed=[];for(const account of workspace.accounts||[]){if(account.discoveryQuality?.sourceKind!=='serper_discovery'||account.discoveryQuality.quality==='first_party_operating_company')continue;const gate=assessOperatingCompany({...account,sourceUrl:account.sourceUrl,provenance:account.discovery},config,{sourceKind:'saved_search_snippet'});if(!gate.accepted){account.discoveryQuality={...account.discoveryQuality,isValidTargetAccount:false,reason:gate.reason};changed.push({id:account.id,name:account.name,reason:gate.reason});}}return changed;}
module.exports={adjacentOffering,assessOperatingCompany,sellerCapabilities,quarantineLegacyCandidates,NON_COMPANY_HOST,NON_COMPANY_PATH};
