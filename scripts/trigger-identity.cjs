'use strict';
function canonicalUrl(value){try{const url=new URL(value);url.hash='';for(const key of [...url.searchParams.keys()])if(/^(?:utm_|ref$|source$)/i.test(key))url.searchParams.delete(key);return url.href;}catch{return String(value||'');}}
function triggerIdentity(row={}){
  const type=String(row.type||row.triggerType||'').toLowerCase(),jobId=row.metadata?.jobId;
  if(jobId||/hiring|hire|internal_tool_maintenance/.test(type)&&!/surge/.test(type))return `job:${row.sourceId||row.metadata?.provider||''}:${jobId||canonicalUrl(row.evidenceUrl)+':'+String(row.title||'').toLowerCase()}`;
  return `${type}:${canonicalUrl(row.evidenceUrl)}`;
}
function dedupeTriggers(rows=[]){
  const result=new Map(),rank=row=>/ai_rca|buying_intent|internal_tool/.test(row.type||row.triggerType||'')?2:1;
  for(const row of rows.filter(Boolean)){const key=triggerIdentity(row),previous=result.get(key);if(!previous||rank(row)>=rank(previous))result.set(key,row);}
  return [...result.values()];
}
module.exports={canonicalUrl,triggerIdentity,dedupeTriggers};
