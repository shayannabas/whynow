'use strict';
const {rootDomain}=require('./entity-rules.cjs');
const escape=value=>String(value||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function ownSource(account,row){
  let url;try{url=new URL(row.evidenceUrl||row.url);}catch{return false;}
  const domain=rootDomain(account.domain||account.website),host=url.hostname.replace(/^www\./,'');
  return url.protocol==='https:'&&Boolean(domain&&(host===domain||host.endsWith(`.${domain}`)))&&!/^(?:docs?|support|help)\./i.test(host)&&!/(?:^|\/)(?:docs?|documentation|products?|solutions?|events?|conference|dataaisummit|certification|videos?|watch)(?:\/|$)/i.test(url.pathname);
}
function internalToolEvidence(account,row={}){
  if(!ownSource(account,row))return false;
  const text=String(row.evidenceText||row.text||''),name=escape(account.name);
  // The same receipt must establish ownership and internal operation. Never
  // join a generated hypothesis to an unrelated citation or keyword hit.
  const actor=`(?:we|our (?:team|engineers)|${name})`;
  const owned=new RegExp(`\\b${actor}\\b[^.!?]{0,45}\\b(?:built|developed|created|operate|maintain)\\b[^.!?]{0,100}\\b(?:our|own|internal|in-house|homegrown)\\b`,'i').test(text);
  return owned&&/\b(?:observability|monitoring|tracing|incident|on-call|debugging|production investigation|root[- ]cause)\b/i.test(text)&&!/\b(?:for (?:our )?customers|available to customers|our product offers)\b/i.test(text);
}
function evidenceRows(account={}){
  return [...(account.killHints||[]),...(account.triggers||[]),...(account.hypothesis?.citations||[]).map(row=>({evidenceUrl:row.url,evidenceText:row.text})),...Object.values(account.signals||{})].filter(row=>row?.evidenceUrl&&row.evidenceText);
}
function adjacentVendorEvidence(account,config){
  const categories=config.adjacentVendorCategories||[];if(!categories.length)return null;
  const reviewed=account.adjacentVendorEvidence;
  if(reviewed?.ownerConfirmed&&reviewed.evidenceUrl&&reviewed.evidenceText&&categories.includes(reviewed.category))return reviewed;
  for(const row of evidenceRows(account)){
    const text=row.evidenceText,category=categories.find(value=>text.toLowerCase().includes(value.toLowerCase()));
    const explicitVendor=/\b(?:company behind|provider of|provides|sells|our products|our platform)\b/i.test(text);
    let firstParty=false;try{const host=new URL(row.evidenceUrl).hostname.replace(/^www\./,''),domain=rootDomain(account.domain||account.website);firstParty=Boolean(domain&&(host===domain||host.endsWith(`.${domain}`)));}catch{}
    // Product pages can establish vendor status, but never internal-tool ownership.
    if(category&&explicitVendor&&new RegExp(`\\b${escape(account.name)}\\b`,'i').test(text)&&(firstParty||['greenhouse','lever','ashby'].includes(row.sourceId)))return {...row,category};
  }
  return null;
}
module.exports={ownSource,internalToolEvidence,evidenceRows,adjacentVendorEvidence};
