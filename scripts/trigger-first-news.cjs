'use strict';

const {approvedPlaybook}=require('./playbook.cjs');
const {rootDomain,normalizedEntityName}=require('./entity-rules.cjs');
const {stripHtml,event}=require('./collectors/common.cjs');
const {parsedPublishedAt}=require('./collectors/active-pain.cjs');

const NEWS_KIND='trigger_first_news';
const DAY_MS=86400000;

function newsRules(workspace) {
  return approvedPlaybook(workspace)?.triggers.filter(rule=>rule.source==='news')||[];
}

function buildNewsTasks(workspace) {
  if(workspace.referenceDemo?.loadOnly)return [];
  const strength={strong:3,medium:2,weak:1};
  return newsRules(workspace).sort((a,b)=>strength[b.strength]-strength[a.strength]).map(rule=>{
    const terms=[...new Set(rule.keywords.map(keyword=>String(keyword).replace(/["\r\n]/g,' ').trim()).filter(Boolean))].slice(0,8);
    return {kind:NEWS_KIND,id:'news-'+rule.id,terms,ruleId:rule.id,query:terms.map(word=>'"'+word+'"').join(' OR ')};
  }).filter(task=>task.query&&task.query.length<=500).slice(0,6);
}

function subjectFromHeadline(title='') {
  // Promote clear subject-first company announcements. Ambiguous headlines
  // (investor-first lists, analysis and multi-company roundups) stay out.
  const match=stripHtml(title).trim().match(/^([\p{L}\d][\p{L}\d &'’.,+-]{1,75}?)\s+(?:raises?|raised|secures?|secured|lands?|closes?|closed|announces?|announced|appoints?|appointed|names?|named|launches?|launched|expands?|expanded|opens?|opened|hires?|hired)\b/iu);
  const name=match?.[1]?.trim()||'';
  return /^(?:how|why|the best|here|this|a new)\b/i.test(name)?'':name;
}

function candidateFromNewsResult(row,task,workspace,now) {
  const rule=newsRules(workspace).find(item=>item.id===task.ruleId);
  const name=subjectFromHeadline(row.title),date=parsedPublishedAt(row.date,now),age=now.getTime()-Date.parse(date);
  let url;
  try{url=new URL(row.url||row.link);}catch{return null;}
  if(!rule||!name||!date||age<0||age>=rule.freshnessDays*DAY_MS||url.protocol!=='https:'||url.username||url.password||url.pathname==='/')return null;
  url.hash='';
  return {kind:NEWS_KIND,ruleId:rule.id,name,sourceUrl:url.href,sourceDate:date};
}

function attr(tag,name) {
  return tag.match(new RegExp('\\b'+name+'\\s*=\\s*["\']([^"\']*)["\']','i'))?.[1]||'';
}

function articlePublication(html) {
  const meta=[...html.matchAll(/<meta\b[^>]*>/gi)].find(([tag])=>/^(?:article:published_time|datePublished|citation_publication_date)$/i.test(attr(tag,'property')||attr(tag,'name')||attr(tag,'itemprop')));
  const raw=meta&&attr(meta[0],'content')||html.match(/"datePublished"\s*:\s*"([^"]+)"/i)?.[1]||'';
  return /^\d{4}-\d{2}-\d{2}\b|^\d{4}-\d{2}-\d{2}T/.test(raw)&&Number.isFinite(Date.parse(raw))?new Date(raw).toISOString():'';
}

async function verifyNewsCandidate(candidate,context) {
  const {runtime,workspace,now}=context;
  const rule=newsRules(workspace).find(item=>item.id===candidate.ruleId);
  if(!rule)return {accepted:false,reason:'news_policy_changed'};
  let response;
  try {
    response=await runtime.requestText(candidate.sourceUrl,'engineering_web',{allowedRedirectDomain:rootDomain(candidate.sourceUrl)});
  }catch(error){return {accepted:false,reason:'news_article_unavailable',error:{code:error.code||'FETCH_FAILED',status:error.status||null}};}
  const html=response.value||'',sourceUrl=response.url||candidate.sourceUrl;
  const title=stripHtml(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'');
  const occurredAt=articlePublication(html);
  if(normalizedEntityName(subjectFromHeadline(title))!==normalizedEntityName(candidate.name))return {accepted:false,reason:'news_company_unverified'};
  const age=now.getTime()-Date.parse(occurredAt);
  if(!occurredAt||age<0||age>=rule.freshnessDays*DAY_MS)return {accepted:false,reason:'news_date_unverified_or_stale'};
  const article=stripHtml(html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1]||html.replace(/<(header|nav|footer)\b[^>]*>[\s\S]*?<\/\1>/gi,' '));
  const executive=/exec|leadership|leader|chief|\b(?:CRO|CTO|VP)\b/i.test(rule.id+' '+rule.label);
  const headline=title.toLowerCase();
  const excerpt=article.split(/(?<=[.!?])\s+/).find(line=>rule.keywords.some(term=>line.toLowerCase().includes(term.toLowerCase()))&&line.toLowerCase().includes(candidate.name.toLowerCase()));
  if(!excerpt&&!rule.keywords.some(term=>headline.includes(term.toLowerCase())))return {accepted:false,reason:'news_trigger_unverified'};
  const evidenceText=[title,excerpt].filter(Boolean).join('\n').slice(0,3000);
  const newsEvent=event({type:executive?'exec_change':'playbook_news',title,evidenceUrl:sourceUrl,evidenceText,
    occurredAt,sourceId:'serper',metadata:{eventDateReported:true,articlePublicationVerified:true}});
  if(!require('./playbook-timing.cjs').matchPlaybook({name:candidate.name,triggers:[newsEvent]},approvedPlaybook(workspace),now)
    .some(row=>row.metadata.playbookTriggerId===rule.id))return {accepted:false,reason:'news_trigger_unverified'};
  const result=await require('./trigger-first-discovery.cjs').verifyOperatingCandidate(candidate,{...context,event:newsEvent,kind:NEWS_KIND,sourceUrl});
  return result.accepted?{...result,newsReceipt:{url:sourceUrl,title,text:evidenceText,fetchedAt:response.fetchedAt||now.toISOString()}}:result;
}

module.exports={NEWS_KIND,buildNewsTasks,candidateFromNewsResult,verifyNewsCandidate};
