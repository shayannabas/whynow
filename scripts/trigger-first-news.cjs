'use strict';

const {approvedPlaybook}=require('./playbook.cjs');
const {rootDomain,normalizedEntityName}=require('./entity-rules.cjs');
const {stripHtml,event}=require('./collectors/common.cjs');
const {parsedPublishedAt}=require('./collectors/active-pain.cjs');

const NEWS_KIND='trigger_first_news';
const NEWS_LISTING_LABEL='news listing (unverified article)';
const ALTERNATE_LIMIT=2;
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
  return {kind:NEWS_KIND,ruleId:rule.id,name,sourceUrl:url.href,sourceDate:date,title:stripHtml(row.title).slice(0,300),snippet:stripHtml(row.snippet).slice(0,1000)};
}

function attr(tag,name) {
  return tag.match(new RegExp('\\b'+name+'\\s*=\\s*["\']([^"\']*)["\']','i'))?.[1]||'';
}

function articlePublication(html) {
  const meta=[...html.matchAll(/<meta\b[^>]*>/gi)].find(([tag])=>/^(?:article:published_time|datePublished|citation_publication_date)$/i.test(attr(tag,'property')||attr(tag,'name')||attr(tag,'itemprop')));
  const raw=meta&&attr(meta[0],'content')||html.match(/"datePublished"\s*:\s*"([^"]+)"/i)?.[1]||'';
  return /^\d{4}-\d{2}-\d{2}\b|^\d{4}-\d{2}-\d{2}T/.test(raw)&&Number.isFinite(Date.parse(raw))?new Date(raw).toISOString():'';
}

function fundingFingerprint(title) {
  const text=String(title||'').toLowerCase();
  const round=text.match(/\bseries\s+([a-z])\b/)?.[0]||text.match(/\b(?:pre[- ]seed|seed)\b/)?.[0]||'';
  const money=text.match(/([$€£])\s*([\d,.]+)\s*(billion|million|thousand|bn|mm|[bmk])?\b/);
  const scale=money&&({billion:1e9,bn:1e9,b:1e9,million:1e6,mm:1e6,m:1e6,thousand:1e3,k:1e3}[money[3]]||1);
  return {round:round.replace('-', ' '),amount:money?money[1]+Number(money[2].replaceAll(',',''))*scale:''};
}

function sameNewsEvent(original,alternative) {
  if(normalizedEntityName(original.name)!==normalizedEntityName(alternative.name)||
    Math.abs(Date.parse(original.sourceDate)-Date.parse(alternative.sourceDate))>7*DAY_MS)return false;
  const a=fundingFingerprint(original.title),b=fundingFingerprint(alternative.title);
  if(a.round&&b.round&&a.round!==b.round||a.amount&&b.amount&&a.amount!==b.amount)return false;
  if(a.round&&a.round===b.round||a.amount&&a.amount===b.amount)return true;
  const subject=new Set(String(original.name).toLowerCase().match(/[a-z0-9]+/g)||[]);
  const common=new Set(['with','after','before','from','into','about','raises','raised','funding','announces','announced','secures','secured','lands','closed','closes','series','round','million','billion','expands','expansion']);
  const tokens=title=>new Set((String(title||'').toLowerCase().match(/[a-z][a-z0-9-]{2,}/g)||[]).filter(word=>!subject.has(word)&&!common.has(word)));
  const alternate=tokens(alternative.title);
  return [...tokens(original.title)].filter(word=>alternate.has(word)).length>=2;
}

function alternateNewsCandidates(candidate,rows,workspace,now) {
  const outlets=new Set([rootDomain(candidate.sourceUrl)]),selected=[];
  for(const row of rows) {
    const other=candidateFromNewsResult(row,{ruleId:candidate.ruleId},workspace,now);
    if(!other||!sameNewsEvent(candidate,other))continue;
    const outlet=rootDomain(other.sourceUrl);
    if(!outlet||[...outlets].some(host=>host===outlet||host.endsWith('.'+outlet)||outlet.endsWith('.'+host)))continue;
    outlets.add(outlet);
    selected.push(other);
    if(selected.length===ALTERNATE_LIMIT)break;
  }
  return selected;
}

function alternateNewsQuery(candidate,rule) {
  const quoted=value=>'"'+String(value).replace(/["\r\n]/g,' ').trim()+'"';
  const {round}=fundingFingerprint(candidate.title);
  const prefix=quoted(candidate.name)+' ';
  const terms=(round?[round,...rule.keywords]:rule.keywords).map(quoted);
  const included=[];
  for(const term of new Set(terms))if((prefix+'('+[...included,term].join(' OR ')+')').length<=500)included.push(term);
  return included.length?prefix+'('+included.join(' OR ')+')':prefix.trim();
}

async function verifyNewsArticle(candidate,context,rule,original=candidate) {
  const {runtime,workspace,now}=context;
  let response;
  try {
    response=await runtime.requestText(candidate.sourceUrl,'engineering_web',{allowedRedirectDomain:rootDomain(candidate.sourceUrl)});
  }catch(error){return {accepted:false,blocked:true,reason:'news_article_unavailable',error:{code:error.code||'FETCH_FAILED',status:error.status||null}};}
  const html=response.value||'',sourceUrl=response.url||candidate.sourceUrl;
  if(/"isAccessibleForFree"\s*:\s*(?:false|"false")|\b(?:subscribe|sign in|log in) to (?:continue reading|read the full article)\b/i.test(html)){
    context.onPaywall?.(candidate.sourceUrl);
    return {accepted:false,blocked:true,reason:'news_article_paywall',error:{code:'PAYWALL',status:null}};
  }
  const title=stripHtml(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'');
  const occurredAt=articlePublication(html),name=subjectFromHeadline(title);
  if(normalizedEntityName(name)!==normalizedEntityName(candidate.name))return {accepted:false,reason:'news_company_unverified'};
  const age=now.getTime()-Date.parse(occurredAt);
  if(!occurredAt||age<0||age>=rule.freshnessDays*DAY_MS)return {accepted:false,reason:'news_date_unverified_or_stale'};
  if(candidate!==original&&!sameNewsEvent(original,{name,title,sourceDate:occurredAt}))return {accepted:false,reason:'alternate_event_mismatch'};
  const article=stripHtml(html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1]||html.replace(/<(header|nav|footer)\b[^>]*>[\s\S]*?<\/\1>/gi,' '));
  const executive=/exec|leadership|leader|chief|\b(?:CRO|CTO|VP)\b/i.test(rule.id+' '+rule.label);
  const headline=title.toLowerCase();
  const excerpt=article.split(/(?<=[.!?])\s+/).find(line=>rule.keywords.some(term=>line.toLowerCase().includes(term.toLowerCase()))&&line.toLowerCase().includes(candidate.name.toLowerCase()));
  if(!excerpt&&!rule.keywords.some(term=>headline.includes(term.toLowerCase())))return {accepted:false,reason:'news_trigger_unverified'};
  const evidenceText=[title,excerpt].filter(Boolean).join('\n').slice(0,3000);
  const trigger=event({type:executive?'exec_change':'playbook_news',title,evidenceUrl:sourceUrl,evidenceText,
    occurredAt,sourceId:'serper',metadata:{eventDateReported:true,articlePublicationVerified:true}});
  if(!require('./playbook-timing.cjs').matchPlaybook({name:candidate.name,triggers:[trigger]},approvedPlaybook(workspace),now)
    .some(row=>row.metadata.playbookTriggerId===rule.id))return {accepted:false,reason:'news_trigger_unverified'};
  return {accepted:true,trigger,receipt:{url:sourceUrl,title,text:evidenceText,fetchedAt:response.fetchedAt||now.toISOString()}};
}

async function verifyNewsCandidate(candidate,context) {
  const {workspace,now,findAlternateNews}=context;
  const rule=newsRules(workspace).find(item=>item.id===candidate.ruleId);
  if(!rule)return {accepted:false,reason:'news_policy_changed'};
  const primary=await verifyNewsArticle(candidate,context,rule);
  let verified=primary.accepted?primary:null;
  // Only a failed fetch or paywall gets a listing fallback. A wrong company
  // or stale primary article must never be rescued by its search metadata.
  if(!verified&&(!primary.blocked||!findAlternateNews))return primary;
  const skipped=verified?[]:[{url:candidate.sourceUrl,reason:primary.error?.code||primary.reason,status:primary.error?.status||null}];
  if(!verified) {
    const rows=await findAlternateNews(alternateNewsQuery(candidate,rule));
    for(const alternate of alternateNewsCandidates(candidate,rows,workspace,now)) {
      const result=await verifyNewsArticle(alternate,context,rule,candidate);
      if(result.accepted){verified=result;break;}
      skipped.push({url:alternate.sourceUrl,reason:result.error?.code||result.reason,status:result.error?.status||null});
    }
  }
  const verifyOperating=require('./trigger-first-discovery.cjs').verifyOperatingCandidate;
  if(verified) {
    const result=await verifyOperating(candidate,{...context,event:verified.trigger,kind:NEWS_KIND,sourceUrl:verified.receipt.url});
    return result.accepted?{...result,newsReceipt:verified.receipt,newsAlternates:skipped}:result;
  }
  const listingText=[candidate.title,candidate.snippet].filter(Boolean).join('\n');
  if(!listingText||!rule.keywords.some(term=>listingText.toLowerCase().includes(term.toLowerCase())))return primary;
  const result=await verifyOperating(candidate,{...context,event:null,kind:NEWS_KIND,sourceUrl:candidate.sourceUrl});
  const {listing,receipt}=buildNewsListing(candidate,skipped,now.toISOString());
  return {...result,newsListing:listing,newsListingReceipt:receipt,
    ...(result.accepted?{account:{...result.account,newsListing:listing}}:{})};
}

function buildNewsListing(candidate,attempts,fetchedAt) {
  const listing={label:NEWS_LISTING_LABEL,title:candidate.title,snippet:candidate.snippet,listedAt:candidate.sourceDate,sourceUrl:candidate.sourceUrl,citable:false,attempts};
  const receipt={url:listing.sourceUrl,title:listing.label,
    text:'Serper News listing date: '+listing.listedAt+'\n'+[listing.title,listing.snippet].filter(Boolean).join('\n'),fetchedAt};
  return {listing,receipt};
}

module.exports={NEWS_KIND,NEWS_LISTING_LABEL,buildNewsTasks,candidateFromNewsResult,sameNewsEvent,alternateNewsCandidates,verifyNewsCandidate,buildNewsListing};
