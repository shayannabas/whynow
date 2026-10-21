'use strict';

const crypto=require('node:crypto');

function stripHtml(value='') {
  return String(value)
    .replace(/<script\b[\s\S]*?<\/script>/gi,' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'")
    .replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
}
function stableId(prefix,value) {
  if(value===undefined)return crypto.createHash('sha256').update(String(prefix)).digest('hex').slice(0,24);
  return `${prefix}_${crypto.createHash('sha256').update(String(value)).digest('hex').slice(0,16)}`;
}
function clampScore(value){return Math.max(1,Math.min(5,Math.round(Number(value)||1)));}
function signal({key,score,evidenceUrl,evidenceText,observedAt,sourceId,inferred=false,metadata={},confidence}={}) {
  const url=String(evidenceUrl||'').trim();
  return {id:stableId('sig',`${key}:${url}:${evidenceText}:${observedAt||''}`),key,score:clampScore(score),evidenceUrl:url,evidenceText:stripHtml(evidenceText),observedAt:observedAt||new Date().toISOString(),sourceId,inferred:Boolean(inferred||!url),...(Number.isFinite(Number(confidence))?{confidence:Math.max(.2,Math.min(1,Number(confidence)))}:{}),metadata};
}
function event({type,title,evidenceUrl,evidenceText,occurredAt,sourceId,metadata={},painThemes=[],strength}={}) {
  return {id:stableId('evt',`${type}:${evidenceUrl}:${title}:${occurredAt||''}`),type,title:stripHtml(title),evidenceUrl:String(evidenceUrl||''),evidenceText:stripHtml(evidenceText),occurredAt:occurredAt||new Date().toISOString(),sourceId,painThemes:Array.isArray(painThemes)?painThemes:[],...(Number.isFinite(Number(strength))?{strength:Math.max(1,Math.min(3,Math.round(Number(strength))))}:{}),metadata};
}
function unique(values=[]){return Array.from(new Set(values.filter(Boolean)));}
function withinDays(value,days,now=new Date()) {const time=Date.parse(value||'');return Number.isFinite(time)&&now.getTime()-time<=days*86400000&&time<=now.getTime()+86400000;}
function domainForTarget(target={}) {if(target.domain)return String(target.domain).replace(/^www\./,'').toLowerCase();try{return new URL(target.website).hostname.replace(/^www\./,'').toLowerCase();}catch{return '';}}
function normalizeEntityText(value=''){return stripHtml(value).toLowerCase().replace(/\b(inc|incorporated|llc|ltd|limited|corp|corporation|company|technologies|technology)\b/g,' ').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
function evidenceBelongsToTarget(target={},evidenceOrUrl={},fallbackText='') {
  const evidence=typeof evidenceOrUrl==='string'?{url:evidenceOrUrl,text:fallbackText}:evidenceOrUrl||{};
  const evidenceUrl=String(evidence.url||evidence.link||evidence.evidenceUrl||''),targetDomains=Array.from(new Set([domainForTarget(target),domainForTarget(target.firmographicTarget||{})].filter(Boolean)));
  if(evidenceUrl){try{const host=new URL(evidenceUrl).hostname.replace(/^www\./,'').toLowerCase();if(targetDomains.some(domain=>host===domain||host.endsWith(`.${domain}`)))return true;}catch{}}
  const targetNames=Array.from(new Set([target.discoveryQuality?.targetAccountName,target.name,target.firmographicTarget?.name,...(target.aliases||[])].map(value=>String(value||'').trim()).filter(Boolean)));
  const rawText=stripHtml(`${evidence.title||''} ${evidence.snippet||evidence.text||evidence.evidenceText||''}`),text=normalizeEntityText(rawText);
  if(!text)return false;
  return targetNames.some(targetNameRaw=>{
    const targetName=normalizeEntityText(targetNameRaw);if(targetName.length<4)return false;
    if(!targetName.includes(' ')){
    const escapedRaw=targetNameRaw.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),urlText=normalizeEntityText(evidenceUrl);
    return new RegExp(`(?:^|\\s)${targetName.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?:$|\\s)`).test(urlText)||new RegExp(`(?:^|[^A-Za-z0-9])${escapedRaw}(?:$|[^A-Za-z0-9])`).test(rawText);
    }
    if(` ${text} `.includes(` ${targetName} `))return true;
    const compactTarget=targetName.replace(/\s+/g,''),compactText=text.replace(/\s+/g,'');
    return compactTarget.length>=7&&compactText.includes(compactTarget);
  });
}
module.exports={clampScore,domainForTarget,evidenceBelongsToTarget,event,normalizeEntityText,signal,stableId,stripHtml,unique,withinDays};
