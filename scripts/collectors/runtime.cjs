const fs = require('node:fs');
const path = require('node:path');
const dns = require('node:dns').promises;
const https = require('node:https');
const net = require('node:net');
const robotsParser = require('robots-parser');
const {stableId} = require('../utils.cjs');
const {atomicWrite} = require('../server/state.cjs');

const minute=60000,hour=60*minute,day=24*hour;
const DEFAULT_BUDGETS=Object.freeze(Object.fromEntries([
  ['statuspage',30,350,15*minute,10000],['greenhouse',20,500,6*hour,12000,16*1024*1024],['lever',20,500,6*hour,12000,16*1024*1024],['ashby',20,500,6*hour,12000,16*1024*1024],
  ['hn',40,400,hour,10000],['google_news_rss',20,750,30*minute,12000],['serper',150,500,6*hour,15000],
  ['wikidata',60,250,7*day,12000],['gdelt',20,5500,15*minute,20000],
  ['edgar_index',4,400,6*hour,15000],['edgar_search',12,400,6*hour,15000],['edgar_filing',8,400,30*day,15000],
  ['engineering_web',20,1500,12*hour,12000],
  ['seller_site',25,1000,day,12000],['seller_customers',2,2000,30*day,12000],['robots',30,500,day,8000]
].map(([key,limit,minIntervalMs,ttlMs,timeoutMs,maxBytes])=>[key,Object.freeze({limit,minIntervalMs,ttlMs,timeoutMs,...(maxBytes?{maxBytes}:{})})])));

class CollectorHttpError extends Error {
  constructor(code,message,status=null) {super(message);this.name='CollectorHttpError';this.code=code;this.status=status;}
}
function isPublicAddress(address) {
  if (net.isIP(address) === 4) {
    const [a,b,c]=address.split('.').map(Number);
    return !(a===0 || a===10 || a===127 || a>=224 || (a===100 && b>=64 && b<=127) ||
      (a===169 && b===254) || (a===172 && b>=16 && b<=31) || (a===192 && (b===168 || b===0 || (b===88 && c===99))) ||
      (a===198 && (b===18 || b===19 || (b===51 && c===100))) || (a===203 && b===0 && c===113));
  }
  // Permit global unicast IPv6 only, excluding documentation/transition blocks.
  if (net.isIP(address) === 6) {
    const value=address.toLowerCase();
    return /^[23][0-9a-f]{3}:/.test(value) && !/^2001:(?:0:|db8:|[012]?[0-9a-f]:)/.test(value) && !value.startsWith('2002:') && !value.includes('.');
  }
  return false;
}
async function assertPublicHttpsUrl(value, {lookup=dns.lookup.bind(dns)}={}) {
  let url;
  try {url=new URL(value);} catch {throw new CollectorHttpError('UNSAFE_URL','Enter a valid public HTTPS URL');}
  const host=url.hostname.replace(/^\[|\]$/g,'').toLowerCase();
  if (url.protocol!=='https:' || url.username || url.password || (url.port && url.port!=='443') || !host.includes('.') && !net.isIP(host) || /(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(host)) throw new CollectorHttpError('UNSAFE_URL','Only public HTTPS URLs on port 443 are allowed');
  let addresses, timer;
  try {addresses=net.isIP(host)?[{address:host,family:net.isIP(host)}]:await Promise.race([
    lookup(host,{all:true,verbatim:true}),
    new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('DNS timeout')),5000);})
  ]);}
  catch {throw new CollectorHttpError('DNS_FAILED','The hostname could not be resolved');}
  finally {clearTimeout(timer);}
  if (!addresses.length || addresses.some(item=>!isPublicAddress(item.address))) throw new CollectorHttpError('UNSAFE_URL','Private or reserved network addresses are blocked');
  url.hash='';
  return {url,addresses};
}

// Built-in HTTPS pins the checked DNS answer to the actual connection. A fetch-like
// adapter is injectable in tests; a second unguarded DNS lookup is never used.
function publicFetch(url,{addresses,method='GET',headers={},body,signal,maxBytes=2*1024*1024}) {
  return new Promise((resolve,reject)=>{
    const req=https.request(url,{method,headers,signal,agent:false,lookup:(_host,options,callback)=>{
      if (options.all) callback(null,addresses); else callback(null,addresses[0].address,addresses[0].family);
    }},res=>{
      const chunks=[];let size=0;
      res.on('data',chunk=>{size+=chunk.length;if(size>maxBytes)res.destroy(new CollectorHttpError('TOO_LARGE',`Page exceeds the ${Math.round(maxBytes/1024/1024)} MB limit`));else chunks.push(chunk);});
      res.on('error',reject);
      res.on('end',()=>resolve({status:res.statusCode,headers:new Headers(res.headers),text:async()=>Buffer.concat(chunks).toString('utf8')}));
    });
    req.on('error',reject);if(body)req.write(body);req.end();
  });
}
function redirectStaysInDomain(value,domain) {
  const allowed=String(domain||'').trim().toLowerCase().replace(/^www\./,'').replace(/\.$/,'');
  if(!allowed||!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/.test(allowed))return false;
  let host;try{host=new URL(value).hostname.toLowerCase().replace(/^www\./,'').replace(/\.$/,'');}catch{return false;}
  return host===allowed||host.endsWith(`.${allowed}`);
}

// The SEC publishes these as documented data endpoints. Its robots.txt can
// reject automated clients even when the data endpoint itself accepts the
// SEC-required name + contact identity. Skip only that preflight; URL/DNS,
// pacing, response-size, content-type, and request-budget guards still apply.
function officialSecDataEndpoint(value) {
  let url;
  try {url=new URL(value);} catch {return false;}
  if(url.protocol!=='https:')return false;
  if(url.hostname==='efts.sec.gov')return url.pathname==='/LATEST/search-index';
  if(url.hostname==='data.sec.gov')return /^\/submissions\/CIK\d{10}\.json$/i.test(url.pathname);
  if(url.hostname!=='www.sec.gov')return false;
  return /^\/files\/company_tickers(?:_exchange)?\.json$/i.test(url.pathname)
    || /^\/Archives\/edgar\/(?:daily-index|data)\//i.test(url.pathname);
}

class CollectorRuntime {
  constructor({env=process.env,now=Date.now,fetch=publicFetch,lookup=dns.lookup.bind(dns),sleep=ms=>new Promise(r=>setTimeout(r,ms)),cacheDir=path.resolve(__dirname,'../../.whynow/collector-cache'),budgets=DEFAULT_BUDGETS,timeoutMs}={}) {
    Object.assign(this,{env,now,fetch,lookup,sleep,cacheDir,budgets,timeoutMs});
    this.queues=new Map();this.hostLast=new Map();this.usage={};this.health={};
    for(const key of Object.keys(budgets))this.usage[key]={requests:0,cacheHits:0,lastAt:null};
  }
  identity(source='') {
    const email=this.env.CRAWLER_CONTACT_EMAIL;
    if(typeof email!=='string' || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email))throw new CollectorHttpError('CONTACT_REQUIRED','Set CRAWLER_CONTACT_EMAIL before fetching public pages');
    if(String(source).startsWith('edgar_'))return `${String(this.env.CRAWLER_NAME||'WhyNow').trim()||'WhyNow'} ${email}`;
    return `WhyNow/0.1 (+mailto:${email})`;
  }
  snapshot() {return structuredClone({schemaVersion:1,usage:this.usage,health:this.health});}
  async request(source,value,options={}) {
    this.identity();
    if(!Object.hasOwn(this.budgets,source))throw new CollectorHttpError('UNKNOWN_SOURCE','Unknown collector source');
    if(source==='serper' && !['https://google.serper.dev/search','https://google.serper.dev/news'].includes(new URL(value).href))throw new CollectorHttpError('UNSAFE_URL','Search API destination is fixed');
    const execute=async()=>{
      try {
        const result=await this.perform(source,value,options,0);
        this.health[source]={status:'ok',checkedAt:new Date(this.now()).toISOString(),httpStatus:result.status};return result;
      } catch(error) {
        const safe=error instanceof CollectorHttpError?error:new CollectorHttpError('FETCH_FAILED','The public page request failed');
        this.health[source]={status:'error',checkedAt:new Date(this.now()).toISOString(),code:safe.code,message:safe.message,httpStatus:Number.isInteger(safe.status)?safe.status:null};throw safe;
      }
    };
    const work=(this.queues.get(source)||Promise.resolve()).then(execute);
    this.queues.set(source,work.catch(()=>{}));return work;
  }
  async requestText(url,source,options={}){const result=await this.request(source,url,options);return {...result,value:result.text};}
  async requestPublicText(url,source,options={}){return this.requestText(url,source,options);}
  async requestJson(url,source,options={}){
    const result=await this.request(source,url,options);let value;
    try{value=JSON.parse(result.text);}catch{throw new CollectorHttpError('INVALID_JSON',`${source} returned unreadable JSON`,result.status);}
    return {...result,value};
  }
  async requestJsonPost(url,source,payload,options={}){return this.requestJson(url,source,{...options,method:'POST',body:JSON.stringify(payload),headers:{'Content-Type':'application/json',...(options.headers||{})}});}
  async perform(source,value,options,depth) {
    if(depth>3)throw new CollectorHttpError('REDIRECT_LIMIT','Too many redirects');
    const checked=await assertPublicHttpsUrl(value,{lookup:this.lookup});
    const {url}=checked;
    if(options.allowedRedirectDomain&&!redirectStaysInDomain(url.href,options.allowedRedirectDomain))throw new CollectorHttpError('REDIRECT_BLOCKED','The request left the approved company domain');
    let crawlDelay=0;
    const secDataRequest=String(source).startsWith('edgar_')&&officialSecDataEndpoint(url.href);
    if(source!=='robots' && source!=='serper' && !secDataRequest) {
      const robotsUrl=new URL('/robots.txt',url).href;
      const response=await this.request('robots',robotsUrl,{...(options.allowedRedirectDomain?{allowedRedirectDomain:options.allowedRedirectDomain}:{}),userAgent:this.identity(source)});
      const rules=robotsParser(robotsUrl,response.status===404?'':response.text);
      if(rules.isAllowed(url.href,this.identity(source))===false)throw new CollectorHttpError('ROBOTS_DISALLOWED','This site disallows crawling this page');
      crawlDelay=(rules.getCrawlDelay(this.identity(source))||0)*1000;
    }
    const budget=this.budgets[source], usage=this.usage[source];
    const cacheFile=path.join(this.cacheDir,`${stableId(JSON.stringify([source,url.href,options.method||'GET',options.body||'']))}.json`),ttlMs=Number(options.cacheTtlMs)||budget.ttlMs;
    try {
      const cached=JSON.parse(fs.readFileSync(cacheFile,'utf8'));
      if(cached.schemaVersion===1 && cached.url===url.href && typeof cached.text==='string' && this.now()>=cached.savedAt && this.now()-cached.savedAt<ttlMs) {usage.cacheHits++;return {...cached,fromCache:true};}
    } catch(error) {if(error.code!=='ENOENT' && !(error instanceof SyntaxError))throw error;}
    if(usage.requests>=budget.limit)throw new CollectorHttpError('BUDGET_EXHAUSTED',`The ${source} request budget is exhausted`);
    const last=Math.max(usage.lastAt??-Infinity,this.hostLast.get(url.host)??-Infinity);
    const wait=Math.max(budget.minIntervalMs,crawlDelay)-(this.now()-last);
    if(wait>30000)throw new CollectorHttpError('CRAWL_DELAY','This site requests a longer delay; try later');
    if(wait>0)await this.sleep(wait);
    usage.requests++;usage.lastAt=this.now();this.hostLast.set(url.host,this.now());
    const controller=new AbortController();
    let timer;
    try {
      const response=await Promise.race([
        (async()=>{
          const method=options.method||(source==='serper'?'POST':'GET');
          const maxBytes=Number(options.maxBytes)||Number(budget.maxBytes)||2*1024*1024,sec=String(source).startsWith('edgar_');
          const response=await this.fetch(url.href,{...checked,method,body:options.body,maxBytes,headers:{...(options.headers||{}),'User-Agent':options.userAgent||this.identity(source),'Accept':sec?'application/json, text/plain, application/octet-stream, application/x-gzip;q=0.9':'text/html, application/json, text/plain, application/xml;q=0.9','Accept-Encoding':'identity'},signal:controller.signal});
          let text=await response.text();
          if(typeof options.transformValue==='function'){
            try{text=JSON.stringify(options.transformValue(JSON.parse(text)));}catch{throw new CollectorHttpError('INVALID_JSON',`${source} returned unreadable JSON`,response.status);}
          }
          return {status:response.status,headers:response.headers,text};
        })(),
        new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new CollectorHttpError('TIMEOUT','The page request timed out'));},Number(options.timeoutMs)||Number(this.timeoutMs)||budget.timeoutMs||8000);})
      ]);
      if([301,302,303,307,308].includes(response.status)) {
        if(source==='serper')throw new CollectorHttpError('REDIRECT_BLOCKED','Search API redirects are not allowed');
        const location=response.headers.get('location');
        if(!location)throw new CollectorHttpError('BAD_REDIRECT','Redirect has no destination');
        const destination=new URL(location,url).href;
        if(options.allowedRedirectDomain&&!redirectStaysInDomain(destination,options.allowedRedirectDomain))throw new CollectorHttpError('REDIRECT_BLOCKED','The request tried to redirect away from the approved company domain');
        return this.perform(source,destination,options,depth+1);
      }
      if(!(response.status>=200 && response.status<300) && !(source==='robots' && response.status===404)){const error=new CollectorHttpError('HTTP_ERROR',`Public source returned HTTP ${response.status}`,response.status);if(response.status===429){const raw=response.headers.get('retry-after'),seconds=Number(raw);error.retryAfterMs=Number.isFinite(seconds)&&seconds>0?seconds*1000:Math.max(0,Date.parse(raw||'')-this.now())||60000;}throw error;}
      const maxBytes=Number(options.maxBytes)||Number(budget.maxBytes)||2*1024*1024;
      if(Buffer.byteLength(response.text)>maxBytes)throw new CollectorHttpError('TOO_LARGE',`Page exceeds the ${Math.round(maxBytes/1024/1024)} MB limit`);
      const contentType=response.headers.get('content-type')||'';
      const secPlainText=String(source).startsWith('edgar_')&&url.hostname==='www.sec.gov'&&/application\/(?:octet-stream|x-gzip)/i.test(contentType);
      if(contentType && !/text\/|json|xml/i.test(contentType)&&!secPlainText)throw new CollectorHttpError('CONTENT_TYPE','Only text pages are supported');
      const result={schemaVersion:1,url:url.href,status:response.status,text:response.text,contentType,savedAt:this.now(),fetchedAt:new Date(this.now()).toISOString()};
      atomicWrite(cacheFile,JSON.stringify(result));return {...result,fromCache:false};
    } finally {clearTimeout(timer);}
  }
}
module.exports={CollectorRuntime,CollectorHttpError,DEFAULT_BUDGETS,assertPublicHttpsUrl,isPublicAddress,officialSecDataEndpoint,redirectStaysInDomain};
