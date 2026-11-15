'use strict';
const {isEarlyCareerPosting}=require('./collectors/hiring.cjs');
const {dedupeTriggers}=require('./trigger-identity.cjs');
const {rolePattern}=require('./workspace-hiring.cjs');
const normalize=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
function sourceFor(t){const id=String(t.sourceId||''),type=String(t.type||t.triggerType||'');if(/greenhouse|lever|ashby/.test(id)||/hiring|first_infra_hire|internal_tool_maintenance/.test(type))return 'ats_jobs';if(/statuspage/.test(id))return 'statuspage';if(/edgar|sec/.test(id)||type==='form_d_filing')return 'sec';if(id==='apollo')return 'apollo_firmographic';if(/serper|news|hn|gdelt|executive/.test(id+' '+type))return 'news';return 'other';}
function dateFor(t,source){if(source==='apollo_firmographic')return t.occurredAt||t.metadata?.eventDate; if(source==='ats_jobs')return t.metadata?.originalPublishedAt||t.publishedAt||t.occurredAt;return t.occurredAt||t.metadata?.eventDate;}
function matchPlaybook(account={},playbook,now=new Date()){
 if(!playbook)return [];
 const candidates=dedupeTriggers([...(account.triggers||[]),...(account.triggerHistory||[])]),pain=account.signals?.activePain;
 if(pain?.evidenceUrl&&!pain.inferred&&!candidates.some(t=>t.evidenceUrl===pain.evidenceUrl))candidates.push({...pain,type:'pain_event',occurredAt:pain.observedAt,title:pain.evidenceText});
 const matches=[];
 for(const t of candidates){
  const source=sourceFor(t),date=dateFor(t,source),time=Date.parse(date||'');
  if(!t.evidenceUrl||!t.evidenceText||t.citable===false||t.metadata?.citable===false||!Number.isFinite(time)||time>now.getTime())continue;
  if(source==='ats_jobs'&&(isEarlyCareerPosting(t)||t.metadata?.publicationDateSource==='missing'))continue;
  if(t.metadata?.eventDateReported===false)continue;
  if(/incident|outage|downtime|degraded/.test(String(t.type||t.triggerType||''))&&!require('./collectors/active-pain.cjs').operationalPainEvidence(account,{url:t.evidenceUrl,title:t.evidenceText||t.title,date}))continue;
  const title=String(t.metadata?.jobTitle||t.title||''),department=String(t.metadata?.department||'');
  const text=source==='ats_jobs'?`${title} ${department}`:`${t.title||''} ${t.evidenceText||''}`;
  for(const rule of playbook.triggers){
   if(rule.source!==source||now.getTime()-time>=rule.freshnessDays*86400000)continue;
   const keywords=rule.keywords.filter(word=>source==='ats_jobs'?rolePattern(word)?.test(text):normalize(text).includes(normalize(word)));
   if(!keywords.length)continue;
   const executive=/exec|leadership/.test(String(t.type||t.triggerType)+' '+rule.id+' '+rule.label),peers=candidates.filter(other=>/exec|leadership/.test(String(other.type||other.triggerType))&&Math.abs(Date.parse(other.occurredAt||'')-time)<7*86400000&&rule.keywords.some(k=>normalize(`${other.title} ${other.evidenceText}`).includes(normalize(k)))),domains=new Set(peers.map(row=>{try{return new URL(row.evidenceUrl).hostname.replace(/^www\./,'');}catch{return '';}}).filter(Boolean));
   matches.push({...t,occurredAt:date,detectedAt:date,decaysAt:new Date(time+rule.freshnessDays*86400000).toISOString(),slaDays:rule.freshnessDays,slaKey:executive?'exec_change':t.slaKey,metadata:{...t.metadata,playbookTriggerId:rule.id,playbookVersion:playbook.version,playbookSource:source,playbookStrength:rule.strength,messageAngle:rule.messageAngle,policyReceiptIds:rule.receiptIds,matchedKeywords:keywords,...(source==='ats_jobs'?{originalPublishedAt:date}:{}),...(executive?{executiveVerification:domains.size>=2?'corroborated':'single source — verify before outreach'}:{})}});
  }
 }
 const weights={strong:5,medium:3,weak:1},seen=new Set();return matches.sort((a,b)=>weights[b.metadata.playbookStrength]-weights[a.metadata.playbookStrength]||Date.parse(b.occurredAt)-Date.parse(a.occurredAt)).filter(row=>{const key=row.id||row.evidenceUrl;if(seen.has(key))return false;seen.add(key);return true;});
}
function projectPlaybookAccount(account,config,now=new Date()){
 if(!config.playbook)return account;
 const matches=matchPlaybook(account,config.playbook,now),signals={...account.signals};delete signals.activePain;
 const best=matches[0];if(best)signals.activePain={key:'activePain',score:{strong:5,medium:3,weak:1}[best.metadata.playbookStrength],inferred:false,evidenceUrl:best.evidenceUrl,evidenceText:best.evidenceText,observedAt:best.occurredAt,sourceId:best.sourceId,metadata:best.metadata};
 return {...account,signals,triggers:matches,triggerHistory:dedupeTriggers([...(account.triggerHistory||[]),...(account.triggers||[])]),playbookVersion:config.playbook.version};
}
module.exports={sourceFor,dateFor,matchPlaybook,projectPlaybookAccount};
