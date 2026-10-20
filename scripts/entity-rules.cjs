'use strict';

function normalizedEntityName(value='') {
  return String(value).toLowerCase().replace(/\b(inc|incorporated|llc|ltd|limited|corp|corporation|company|technologies|technology)\b/g,' ').replace(/[^a-z0-9]+/g,' ').trim();
}

function rootDomain(value='') {
  try {
    return new URL(String(value).startsWith('http')?value:`https://${value}`).hostname.toLowerCase().replace(/^www\./,'');
  } catch { return ''; }
}

function parentRuleForNamesAndDomains(names=[],domains=[],rules=[]) {
  const normalizedNames=names.filter(Boolean).map(normalizedEntityName);
  const cleanDomains=domains.filter(Boolean).map(rootDomain).filter(Boolean);
  return rules.find(rule=>{
    const allowedNames=[rule.canonicalName,...(rule.aliases||[])].map(normalizedEntityName);
    const allowedDomains=(rule.domains||[]).map(rootDomain);
    return normalizedNames.some(name=>allowedNames.includes(name))||cleanDomains.some(domain=>allowedDomains.includes(domain));
  });
}

function sameEntity(left={},right={},rules=[]) {
  const leftDomain=rootDomain(left.domain||left.website);
  const rightDomain=rootDomain(right.domain||right.website);
  if(leftDomain&&rightDomain&&leftDomain===rightDomain)return true;
  const leftName=normalizedEntityName(left.name);
  const rightName=normalizedEntityName(right.name);
  if(leftName&&rightName&&leftName===rightName)return true;
  const leftRule=parentRuleForNamesAndDomains([left.name],[leftDomain],rules);
  const rightRule=parentRuleForNamesAndDomains([right.name],[rightDomain],rules);
  return Boolean(leftRule&&rightRule&&normalizedEntityName(leftRule.canonicalName)===normalizedEntityName(rightRule.canonicalName));
}

module.exports={normalizedEntityName,parentRuleForNamesAndDomains,rootDomain,sameEntity};
