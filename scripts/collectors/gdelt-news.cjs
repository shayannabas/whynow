'use strict';
const {searchPainItems}=require('./active-pain.cjs'),{collectExecutiveChange}=require('./executive-change.cjs'),{stripHtml,withinDays}=require('./common.cjs');
const ENDPOINT='https://api.gdeltproject.org/api/v2/doc/doc';
const MAX_REQUESTS_PER_CHECK=5;
function createIndexRequester({clock=()=>Date.now(),sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),baseDelayMs=5500}={}){
 let queue=Promise.resolve(),lastRequest=0,blockedUntil=0;const counts=new WeakMap();
 const unavailable=(reason,status=429)=>Object.assign(Error(`GDELT temporarily unavailable: ${reason}. Other news sources remain available.`),{code:'GDELT_TEMPORARILY_UNAVAILABLE',status,sourceStatus:'temporarily_unavailable'});
 return function requestIndex(runtime,url){const op=queue.then(async()=>{
   if(clock()<blockedUntil)throw unavailable('rate-limit backoff is active');
   for(let attempt=0;attempt<2;attempt++){
     if((counts.get(runtime)||0)>=MAX_REQUESTS_PER_CHECK)throw unavailable('five-request check limit reached',null);
     const pace=Math.max(0,baseDelayMs-(clock()-lastRequest));if(pace)await sleep(pace);
     counts.set(runtime,(counts.get(runtime)||0)+1);lastRequest=clock();
     try{return await runtime.requestJson(url,'gdelt');}catch(error){if(error.status!==429)throw error;
       const delay=Math.max(baseDelayMs*2**attempt,Number(error.retryAfterMs)||0);blockedUntil=clock()+delay;
       if(attempt===1)throw unavailable('still rate-limited after one retry');
       await sleep(delay);blockedUntil=0;
     }
   }
 });queue=op.catch(()=>{});return op;};
}
const requestIndex=createIndexRequester();
function queryUrl(target,windowDays=30){const name=String(target.name||'').replace(/["\r\n]/g,' ').trim();if(!name)throw Error('A company name is required.');return `${ENDPOINT}?${new URLSearchParams({query:`"${name}"`,mode:'ArtList',format:'json',sort:'DateDesc',maxrecords:'10',timespan:`${Math.min(90,Math.max(1,Number(windowDays)||30))}d`})}`;}
function articleRows(payload){return (payload?.articles||[]).filter(row=>row.title&&/^https:\/\//.test(row.url||'')).map(row=>({title:row.title,url:row.url,observedByIndexAt:row.seendate||'',sourceId:'gdelt',providerAttribution:'GDELT Project — https://www.gdeltproject.org/'}));}
function publicationDate(html){for(const tag of String(html).matchAll(/<meta\b[^>]*>/gi)){const attrs=Object.fromEntries([...tag[0].matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)].map(m=>[m[1].toLowerCase(),m[2]]));if(/^(?:article:published_time|datepublished|pubdate|publishdate)$/i.test(attrs.property||attrs.name||'')&&Number.isFinite(Date.parse(attrs.content)))return new Date(attrs.content).toISOString();}const value=String(html).match(/"datePublished"\s*:\s*"([^"]+)"/i)?.[1];return value&&Number.isFinite(Date.parse(value))?new Date(value).toISOString():'';}
async function collectGdeltNews(target,{runtime,now=new Date(),windowDays=30,painThemeConfig={},slaConfig={},maxArticles=3}={}){
 const errors=[],rows=[],response=await requestIndex(runtime,queryUrl(target,windowDays)),articles=articleRows(response.value);
 for(const row of articles.slice(0,maxArticles)){try{const page=await runtime.requestText(row.url,'engineering_web'),date=publicationDate(page.value);if(!date||!withinDays(date,windowDays,now)){errors.push({sourceUrl:row.url,code:date?'OUTSIDE_WINDOW':'PUBLICATION_DATE_MISSING',message:'Index seendate is not publication evidence.'});continue;}const full=stripHtml(page.value),name=String(target.name||'').toLowerCase(),at=full.toLowerCase().indexOf(name),snippet=full.slice(Math.max(0,at-80),Math.max(0,at-80)+900);rows.push({...row,date,snippet,sourceReceipt:{url:page.url,date,text:snippet}});}catch(e){errors.push({sourceUrl:row.url,code:e.code||'ARTICLE_FAILED',status:e.status||null,message:String(e.message).slice(0,200)});}}
 const pain=searchPainItems(target,rows,now,painThemeConfig,{strictFreshness:true,windowDays,slaConfig}),exec=await collectExecutiveChange(target,{now,searchResults:rows,slaConfig}),events=[...pain.events,...exec.events];for(const item of [...events,...pain.signals])item.metadata={...item.metadata,providerAttribution:'GDELT Project',providerUrl:'https://www.gdeltproject.org/',indexDateIsNotEventDate:true};
 return {collectorId:'gdelt_news',signals:pain.signals,events,killHints:[],itemsFound:events.length,targetPatch:{},collectorErrors:errors,indexArticles:articles.length,datedArticles:rows,recordedResponse:response.value};
}
module.exports={ENDPOINT,MAX_REQUESTS_PER_CHECK,queryUrl,articleRows,publicationDate,createIndexRequester,requestIndex,collectGdeltNews};
