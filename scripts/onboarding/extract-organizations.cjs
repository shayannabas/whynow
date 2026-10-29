const fs=require('node:fs');
const path=require('node:path');
const {stableId}=require('../utils.cjs');
const {researchSourceContext,buildReceiptEvidence}=require('./validate.cjs');

const SOCIAL_HOSTS=new Set(['facebook.com','instagram.com','linkedin.com','pinterest.com','tiktok.com','twitter.com','x.com','youtube.com']);
const GENERIC_HOSTS=new Set(['github.com','google.com']);
const GENERIC_LABEL=/^(?:app store|blog|careers?|changelog|community|contact|developer docs?|docs?|documentation|download|facebook|github|help|instagram|learn more|linkedin|privacy|read (?:more|story)|service status|shop|start|support|theme store|tiktok|twitter|x|youtube)$/i;
const GENERIC_ALT=/^(?:arrow|avatar|brand|copy|customer|hero|icon|image|logo|mark|menu|photo|screenshot|wordmark)$/i;
const CUSTOMER_PATH=/(?:^|\/)(?:customers?|case-stud(?:y|ies)|customer-stories|stories)(?:\/|$)|\/blog\/case-study-/i;
const COMPARISON_PATH=/(?:^|\/)(?:compare|comparisons|alternatives?)(?:\/|$)|(?:^|[-/])vs(?:[-/]|$)/i;

function decode(value) {
  return String(value||'').replace(/&(?:amp|#38);/gi,'&').replace(/&quot;|&#34;/gi,'"').replace(/&#39;|&apos;/gi,"'")
    .replace(/&nbsp;/gi,' ').replace(/&#x([\da-f]+);/gi,(_,hex)=>String.fromCodePoint(parseInt(hex,16)))
    .replace(/&#(\d+);/g,(_,number)=>String.fromCodePoint(Number(number)));
}
function text(value) {return decode(String(value||'').replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();}
function normalizeDomain(value) {
  try {return new URL(/^https?:\/\//i.test(String(value||''))?value:`https://${value}`).hostname.toLowerCase().replace(/^www\./,'');} catch {return '';}
}
function hostMatches(host,domain) {return Boolean(domain&&(host===domain||host.endsWith(`.${domain}`)));}
function rawPageMap(cacheDirs=[]) {
  const result=new Map();
  for(const directory of cacheDirs) {
    let files=[];try{files=fs.readdirSync(directory);}catch(error){if(error.code==='ENOENT')continue;throw error;}
    for(const file of files.filter(name=>name.endsWith('.json')).sort()) {
      let row;try{row=JSON.parse(fs.readFileSync(path.join(directory,file),'utf8'));}catch{continue;}
      if(typeof row?.url==='string'&&typeof row?.text==='string'&&/^\s*(?:<!doctype\s+html|<html\b)/i.test(row.text))result.set(row.url,row);
    }
  }
  return result;
}
function htmlTitle(html) {return text(String(html||'').match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'');}
function headings(html) {return [...String(html||'').matchAll(/<h[1-4]\b[^>]*>([\s\S]*?)<\/h[1-4]>/gi)].map(match=>text(match[1])).filter(Boolean);}
function anchors(html,baseUrl) {
  const result=[];
  for(const match of String(html||'').matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href=decode(match[1].match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i)?.slice(1).find(Boolean)||'');
    if(!href)continue;
    let url;try{url=new URL(href,baseUrl).href;}catch{continue;}
    const alts=[...match[2].matchAll(/<img\b[^>]*\balt\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)].map(item=>decode(item[1]??item[2]).replace(/\s+/g,' ').trim()).filter(Boolean);
    result.push({url,label:text(match[2]),alts,rawHtml:match[0]});
  }
  return result;
}
function meaningfulName(value) {
  const name=String(value||'').replace(/\s+/g,' ').replace(/^(?:How|Why)\s+/i,'').trim().replace(/\s+(?:customer story|case study)$/i,'').trim();
  return name.length>=2&&name.length<=100&&!GENERIC_ALT.test(name)&&!GENERIC_LABEL.test(name)?name:'';
}
function isCustomerStoryPath(value) {
  const pathname=String(value||'').toLowerCase();
  return /^\/customers\/case-studies\/[^/]+\/?$/.test(pathname)||/^\/customers\/(?!case-studies\/?$)[^/]+\/?$/.test(pathname)||/^\/case-studies\/[^/]+\/?$/.test(pathname)||/^\/blog\/case-study-[^/]+\/?$/.test(pathname);
}
function titleCaseSlug(value) {return decodeURIComponent(value).split('-').filter(Boolean).map(token=>token.length<=3&&token===token.toUpperCase()?token:`${token[0]?.toUpperCase()||''}${token.slice(1)}`).join(' ');}
function exactCasing(candidate,haystacks) {
  const escaped=candidate.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  for(const value of haystacks) {const match=String(value||'').match(new RegExp(`\\b${escaped.replace(/\\ /g,'\\s+')}\\b`,'i'));if(match)return match[0];}
  return candidate;
}
function customerNameFromPage(url,titleValue,html) {
  const parsed=new URL(url),segments=parsed.pathname.split('/').filter(Boolean);let slug='';
  if(segments[0]==='customers'&&segments[1]==='case-studies'&&segments.length>2)slug=segments[2];
  else if(segments[0]==='customers'&&segments.length>1)slug=segments[1];
  else if(segments[0]==='case-studies'&&segments.length>1)slug=segments[1];
  else if(segments[0]==='blog'&&segments[1]?.startsWith('case-study-'))slug=segments[1].slice('case-study-'.length);
  const title=text(titleValue||htmlTitle(html)),heading=headings(html)[0]||'';
  for(const value of [title,heading]) {
    const possessive=value.match(/^(?:How\s+)?(.+?)[’']s\s+/i)?.[1],uses=value.match(/^The future of [^:]+:\s*(.+?)\s+uses\b/i)?.[1];
    if(possessive||uses)return meaningfulName(possessive||uses);
    const team=value.match(/^How an? (.+?) (?:sales|revenue|marketing|support) team (?:got|saved|gained)\b/i)?.[1];if(team)return meaningfulName(team);
    const watched=value.match(/^Watch (.+?) use\b/i)?.[1];if(watched)return meaningfulName(watched);
    const benefited=value.match(/^.+?\bbrings\s+([A-Z][A-Za-z0-9&.-]+)\s+(?:a|an|the|\d)/)?.[1];if(benefited)return meaningfulName(benefited);
    let found=meaningfulName(value.match(/^(?:How )?(.+?) (?:ships|shipped|serves|went|uses|used|built|moved|scaled|grew|runs|powers|transformed|wins|unified|accelerates|sees|leaves)\b/i)?.[1]);
    if(found){if(/^the\s/.test(found))found=`T${found.slice(1)}`;return found;}
  }
  if(slug) {
    const teamSlug=slug.match(/^how-an?-(.+?)-(?:sales|revenue|marketing|support)-team-(?:got|saved|gained)-/i)?.[1];if(teamSlug)return meaningfulName(titleCaseSlug(teamSlug));
    let candidate=titleCaseSlug(slug.replace(/^how-/,'').replace(/-(?:ships|shipped|serves|went|uses|built|moved|scaled|grew|runs|powers|transformed|wins|turns|cut|kept|are)-.*$/,''));
    candidate=meaningfulName(exactCasing(candidate,[title,heading,text(html)]));
    if(candidate){if(/^the\s/.test(candidate))candidate=`T${candidate.slice(1)}`;return candidate;}
  }
  for(const value of [title,heading]) {
    const patterns=[
      /^(.+?) (?:Brings|Uses|Moves|Builds|Powers)\b/i,
      /^([^:|–—-]{2,80}):\s/
    ];
    for(const pattern of patterns){let found=meaningfulName(value.match(pattern)?.[1]);if(found){if(/^the\s/.test(found))found=`T${found.slice(1)}`;return found;}}
  }
  return '';
}
function comparisonNames(companyName,url,titleValue,html) {
  const values=[text(titleValue||htmlTitle(html)),...headings(html).slice(0,30)],names=[],seller=companyName.toLowerCase();
  for(const value of values)for(const match of value.matchAll(/(?:^|\b)([^|:]{2,80}?)\s+vs\.?\s+([^|:]{2,80}?)(?=$|[:|–—-])/gi)) {
    const sides=[meaningfulName(match[1]),meaningfulName(match[2])];let other='';
    if(sides[0]?.toLowerCase().startsWith(seller))other=sides[1];
    else if(sides[1]?.toLowerCase().startsWith(seller))other=sides[0];
    else continue;
    other=meaningfulName(other?.replace(/\s+(?:SRE Agent|WAF|Turnstile|Direct Upload|Blobs?|Drop|Cloud)$/i,''));
    if(/^(?:custom platform|investigation|orchestration)$/i.test(other))continue;
    if(other&&!names.some(item=>item.toLowerCase()===other.toLowerCase()))names.push(other);
  }
  return names;
}
function outboundDomain(page,name,sellerDomain) {
  const compact=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
  const normalizedName=compact(name),initials=name.split(/[^A-Za-z0-9]+/).filter(Boolean).map(part=>part[0]).join('').toLowerCase();
  const candidates=anchors(page.text,page.url).map(anchor=>{
    const host=normalizeDomain(anchor.url),label=compact(anchor.label),hostLabel=compact(host.split('.')[0]);
    return {host,label,hostLabel,url:anchor.url};
  }).filter(item=>item.host&&!hostMatches(item.host,sellerDomain)&&!SOCIAL_HOSTS.has(item.host)&&![...SOCIAL_HOSTS].some(host=>item.host.endsWith(`.${host}`))&&!GENERIC_HOSTS.has(item.host));
  const match=candidates.find(item=>item.label===normalizedName||item.label===initials&&initials.length>=2||item.label.includes(normalizedName)||normalizedName.includes(item.label)&&item.label.length>=4||item.hostLabel===normalizedName||item.hostLabel.includes(normalizedName)||normalizedName.includes(item.hostLabel)&&item.hostLabel.length>=4);
  return match?.host||'';
}
function receiptFor(receiptMap,sourceId,name) {
  const needle=name.toLowerCase();
  const rows=[...receiptMap.values()].filter(item=>item.sourceId===sourceId&&item.evidenceQuote.toLowerCase().includes(needle));
  rows.sort((a,b)=>a.evidenceQuote.length-b.evidenceQuote.length);
  return rows[0]||null;
}
function candidate({kind,name,domain='',sourceUrl,storyUrl='',quote,quoteOrigin,sourceId,receipt,status='confirmed_candidate',foundBy=[]}) {
  const normalizedDomain=normalizeDomain(domain);return {schemaVersion:1,id:`org_${stableId(`${kind}:${name.toLowerCase()}:${sourceUrl}`)}`,kind,name,domain:normalizedDomain,
    domainStatus:normalizedDomain?'verified':'domain_missing',status,sourceUrl,storyUrl:storyUrl||sourceUrl,sourceId,receiptId:receipt?.receiptId||'',evidenceQuote:receipt?.evidenceQuote||quote,
    quoteOrigin:receipt?'saved_source_receipt':quoteOrigin,foundBy:[...new Set(foundBy)]};
}
function extractOrganizationCandidates({state,workspace,rawPages}) {
  const company=workspace.research?.selectedCandidate||workspace.onboarding?.selectedCandidate||{},sellerDomain=normalizeDomain(company.domain),sellerName=String(workspace.name||company.name||'').trim();
  const refs=[...researchSourceContext(state,workspace).values()].filter(ref=>hostMatches(ref.host,sellerDomain));
  const raw=rawPages instanceof Map?rawPages:new Map(),receiptMap=buildReceiptEvidence(state,workspace).receiptMap,customers=[],competitors=[];
  const byUrl=new Map(refs.map(ref=>[ref.source.url,ref]));
  function add(target,row){if(!row.name)return;const existing=target.find(item=>item.name.toLowerCase()===row.name.toLowerCase());if(!existing)target.push(row);else if(!existing.domain&&row.domain){existing.domain=row.domain;existing.domainStatus='verified';existing.foundBy=[...new Set([...existing.foundBy,...row.foundBy])];}}
  for(const ref of refs) {
    const page=raw.get(ref.source.url),html=page?.text||'',pathname=new URL(ref.source.url).pathname,titleValue=ref.source.title||htmlTitle(html);
    const isStory=isCustomerStoryPath(pathname);
    if(isStory) {
      const name=customerNameFromPage(ref.source.url,titleValue,html||ref.source.text),receipt=receiptFor(receiptMap,ref.sourceId,name),domain=page?outboundDomain(page,name,sellerDomain):'';
      add(customers,candidate({kind:'customer',name,domain,sourceUrl:ref.source.url,quote:receipt?.evidenceQuote||titleValue,quoteOrigin:'saved_page_title',sourceId:ref.sourceId,receipt,
        status:receipt&&name.split(/\s+/).length<=5?'confirmed_candidate':'uncertain_candidate',foundBy:['customer_story_url','page_title',...(domain?['outbound_company_link']:[])]}));
    }
    if(page&&/^\/(?:customers?(?:\/case-studies)?|case-studies)\/?$/i.test(pathname)) {
      for(const anchor of anchors(page.text,page.url)) {
        const target=new URL(anchor.url),targetPath=target.pathname;
        if(!hostMatches(target.hostname.toLowerCase().replace(/^www\./,''),sellerDomain)||!isCustomerStoryPath(targetPath)||targetPath===pathname)continue;
        const linked=byUrl.get(target.href),linkedPage=raw.get(target.href),alts=anchor.alts.map(meaningfulName).filter(Boolean),label=meaningfulName(anchor.label);
        const derived=customerNameFromPage(target.href,linked?.source.title||anchor.alts[0]||anchor.label,linkedPage?.text||''),name=derived||alts[0]||label;if(!name)continue;
        const sourceRef=linked||ref,receipt=receiptFor(receiptMap,sourceRef.sourceId,name)||receiptFor(receiptMap,ref.sourceId,name),domain=linkedPage?outboundDomain(linkedPage,name,sellerDomain):'';
        add(customers,candidate({kind:'customer',name,domain,sourceUrl:sourceRef.source.url,storyUrl:target.href,quote:alts[0]||anchor.label,quoteOrigin:alts[0]?'raw_html_alt':'raw_html_anchor',sourceId:sourceRef.sourceId,receipt,
          status:receipt?'confirmed_candidate':'uncertain_candidate',foundBy:[alts[0]?'customer_logo_alt':'customer_index_link',...(domain?['outbound_company_link']:[])]}));
      }
    }
    if(COMPARISON_PATH.test(pathname)||/\bvs\.?\b|alternatives?|comparison/i.test(titleValue)) {
      const names=comparisonNames(sellerName,ref.source.url,titleValue,html||ref.source.text);
      for(const name of names){const receipt=receiptFor(receiptMap,ref.sourceId,name),domain=page?outboundDomain(page,name,sellerDomain):'';add(competitors,candidate({kind:'competitor',name,domain,sourceUrl:ref.source.url,quote:receipt?.evidenceQuote||titleValue,quoteOrigin:'comparison_title_or_heading',sourceId:ref.sourceId,receipt,
        status:receipt?'confirmed_candidate':'uncertain_candidate',foundBy:['comparison_url_or_title',...(domain?['outbound_company_link']:[])]}));}
    }
  }
  for(const item of [...customers,...competitors])if(item.domain){
    const page=raw.get(item.storyUrl)||raw.get(item.sourceUrl),anchor=page&&anchors(page.text,page.url).find(row=>normalizeDomain(row.url)===item.domain);
    if(anchor)item.domainEvidence={sourceUrl:page.url,officialUrl:anchor.url,anchorText:anchor.label,exactHtml:anchor.rawHtml,kind:'saved_outbound_company_link'};
  }
  const sort=(a,b)=>a.name.localeCompare(b.name);customers.sort(sort);competitors.sort(sort);
  return {schemaVersion:1,seller:{name:sellerName,domain:sellerDomain},rawHtml:{available:raw.size>0,pagesMatched:refs.filter(ref=>raw.has(ref.source.url)).length,sources:refs.length},customers,competitors};
}

module.exports={CUSTOMER_PATH,COMPARISON_PATH,rawPageMap,htmlTitle,headings,anchors,customerNameFromPage,extractOrganizationCandidates};
