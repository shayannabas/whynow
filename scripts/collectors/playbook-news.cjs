'use strict';
const {event,evidenceBelongsToTarget}=require('./common.cjs');
const {parsedPublishedAt}=require('./active-pain.cjs');
function collectPlaybookNews(target,{searchResults=[],now=new Date()}={}){
 const rules=(target.playbook?.triggers||[]).filter(t=>t.source==='news'),events=[];
 for(const row of searchResults){const occurredAt=parsedPublishedAt(row.date,now);if(!occurredAt||!evidenceBelongsToTarget(target,row))continue;const text=`${row.title||''} ${row.snippet||''}`;
  if(!rules.some(rule=>rule.keywords.some(k=>text.toLowerCase().includes(k.toLowerCase()))))continue;
  events.push(event({type:'playbook_news',title:row.title,evidenceUrl:row.url||row.link,evidenceText:text,occurredAt,sourceId:row.sourceId||'serper',metadata:{eventDateReported:true}}));
 }
 return {signals:[],events,itemsFound:events.length};
}
module.exports={collectPlaybookNews};
