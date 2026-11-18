'use strict';

const {displayDate}=require('./display-date.cjs');

const SOURCES={serper:'Serper',serper_news:'Serper News',google_news_rss:'Google News',gdelt:'GDELT',greenhouse:'Greenhouse',lever:'Lever',ashby:'Ashby',statuspage:'Statuspage',hn:'Hacker News',edgar_filing:'SEC EDGAR',edgar_search:'SEC EDGAR'};
function triggerDisplay(trigger,now=new Date()){
  if(!trigger)return null;
  const when=displayDate(trigger.occurredAt||trigger.detectedAt,now);
  let domain='';
  try{domain=new URL(trigger.evidenceUrl).hostname.replace(/^www\./,'');}catch{}
  const sourceId=trigger.metadata?.provider||trigger.sourceId;
  return {date:when,age:when.split(' · ')[1]||'',source:SOURCES[sourceId]||domain||'Saved receipt'};
}
module.exports={triggerDisplay};
