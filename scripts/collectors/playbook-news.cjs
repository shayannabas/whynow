'use strict';
const {event,evidenceBelongsToTarget}=require('./common.cjs');
const {parsedPublishedAt}=require('./active-pain.cjs');
function collectPlaybookNews(target,{searchResults=[],now=new Date()}={}){
 const rules=(target.playbook?.triggers||[]).filter(t=>t.source==='news'),events=[];
 for(const row of searchResults){const occurredAt=parsedPublishedAt(row.date,now);if(!occurredAt||!evidenceBelongsToTarget(target,row))continue;const text=`${row.title||''} ${row.snippet||''}`;
  const matched=rules.find(rule=>rule.keywords.some(k=>text.toLowerCase().includes(k.toLowerCase())));if(!matched)continue;
  events.push(event({type:/exec|leadership|leader|chief|CRO|CTO|\bVP\b/i.test(matched.id+' '+matched.label)?'exec_change':'playbook_news',title:row.title,evidenceUrl:row.url||row.link,evidenceText:text,occurredAt,sourceId:row.sourceId||'serper',metadata:{eventDateReported:true}}));
 }
 return {signals:[],events,itemsFound:events.length};
}
module.exports={collectPlaybookNews};
