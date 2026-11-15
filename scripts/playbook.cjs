'use strict';
const crypto=require('node:crypto');
const SOURCES=['ats_jobs','news','apollo_firmographic','statuspage','sec','other'];
const STRENGTHS=['strong','medium','weak'];
const digest=p=>crypto.createHash('sha256').update(JSON.stringify({buyerRoles:p.buyerRoles,triggers:p.triggers,antiTriggers:p.antiTriggers,receipts:p.receipts})).digest('hex');
const list=value=>Array.isArray(value)&&value.every(x=>typeof x==='string'&&x.trim()&&x.length<=300);
function draftSchema(){
 const strings={type:'array',items:{type:'string',minLength:1,maxLength:300},maxItems:40};
 const object=properties=>({type:'object',additionalProperties:false,properties,required:Object.keys(properties)});
 const text={type:'string',minLength:1,maxLength:1000},ids={type:'array',items:{$ref:'#/$defs/receiptId'},minItems:1,maxItems:10};
 return object({buyerRoles:object({economicBuyer:strings,champion:strings,endUser:strings}),triggers:{type:'array',minItems:1,maxItems:20,items:object({id:{type:'string',pattern:'^[a-z][a-z0-9_-]{0,59}$'},label:text,whyItMatters:text,source:{type:'string',enum:SOURCES},keywords:{...strings,minItems:1},freshnessDays:{type:'integer',minimum:7,maximum:180},strength:{type:'string',enum:STRENGTHS},messageAngle:text,receiptIds:ids})},antiTriggers:{type:'array',maxItems:20,items:object({label:text,rule:text,receiptIds:ids})}});
}
function receiptsForWorkspace(state,workspace){
 if(workspace.referenceDemo?.loadOnly&&!workspace.research){const domain=workspace.sellerProfile?.domain;workspace={...workspace,research:{sourceIds:Object.values(state.sources||{}).filter(source=>{try{return new URL(source.url).hostname.replace(/^www\./,'')===domain;}catch{return false;}}).map(source=>source.id)}};}
 try{return Object.fromEntries([...require('./onboarding/validate.cjs').buildReceiptEvidence(state,workspace).receiptMap].map(([id,r])=>[id,{id,sourceId:r.sourceId,sourceUrl:r.source.url||r.url,evidenceQuote:r.evidenceQuote}]));}catch{return {};}
}
function validatePlaybook(p={},receipts=p.receipts||{}){
 const warnings=[],add=(path,code,message)=>warnings.push({path,code,message,severity:'blocking'});
 if(!p.buyerRoles||!['economicBuyer','champion','endUser'].every(k=>Array.isArray(p.buyerRoles[k])&&(p.buyerRoles[k].length===0||list(p.buyerRoles[k]))))add('buyerRoles','BUYER_ROLES','Enter buyer, champion and end-user title lists.');
 if(!p.buyerRoles?.economicBuyer?.length||!p.buyerRoles?.champion?.length)add('buyerRoles','MISSING_BUYERS','At least one economic buyer and champion title is required.');
 for(const title of Object.values(p.buyerRoles||{}).filter(Array.isArray).flat())if(!/\b(?:chief|CTO|CRO|CFO|CMO|CEO|VP|head|director|manager|lead|engineer|engineering|developer|operations|executive|sales|representative|analyst|specialist|architect|administrator|owner|SRE|RevOps|buyer|champion|user)\b/i.test(title))add('buyerRoles','ROLE_TITLE_REQUIRED','Use job titles, not named people or companies.');
 if(!Array.isArray(p.triggers)||!p.triggers.length||p.triggers.length>20)add('triggers','TRIGGERS_REQUIRED','Propose between one and twenty triggers.');
 const seen=new Set();
 for(const [i,t] of (Array.isArray(p.triggers)?p.triggers:[]).entries()){
  const path=`triggers.${i}`;
  if(!/^[a-z][a-z0-9_-]{0,59}$/.test(t.id||'')||seen.has(t.id))add(path+'.id','TRIGGER_ID','Use a unique trigger ID.');seen.add(t.id);
  for(const key of ['label','whyItMatters','messageAngle'])if(typeof t[key]!=='string'||!t[key].trim()||t[key].length>1000)add(path+'.'+key,'TRIGGER_TEXT','Explain the trigger, why it matters and its message angle.');
  if(!SOURCES.includes(t.source))add(path+'.source','TRIGGER_SOURCE','Choose a supported public source.');
  if(!list(t.keywords)||!t.keywords.length)add(path+'.keywords','TRIGGER_KEYWORDS','At least one specific keyword is required.');
  if(!Number.isInteger(t.freshnessDays)||t.freshnessDays<7||t.freshnessDays>180)add(path+'.freshnessDays','FRESHNESS_WINDOW','Choose a freshness window from 7 to 180 days.');
  if(!STRENGTHS.includes(t.strength))add(path+'.strength','TRIGGER_STRENGTH','Choose strong, medium or weak.');
 }
 if(!(Array.isArray(p.triggers)?p.triggers:[]).some(t=>t.strength==='strong'))add('triggers','STRONG_TRIGGER_REQUIRED','At least one strong trigger is required.');
 if(!Array.isArray(p.antiTriggers)||p.antiTriggers.length>20)add('antiTriggers','ANTI_TRIGGERS','Use an anti-trigger list of at most twenty rules.');
 for(const [i,t] of (Array.isArray(p.antiTriggers)?p.antiTriggers:[]).entries())if(!t.label?.trim()||!t.rule?.trim())add(`antiTriggers.${i}`,'ANTI_TRIGGER_TEXT','An anti-trigger needs a label and rule.');
 for(const [group,rows] of [['triggers',p.triggers],['antiTriggers',p.antiTriggers]])for(const [i,t] of (Array.isArray(rows)?rows:[]).entries()){
  if(!list(t.receiptIds)||!t.receiptIds.length)add(`${group}.${i}.receiptIds`,'RECEIPT_REQUIRED','Choose at least one saved seller receipt.');
  for(const id of t.receiptIds||[]){const r=receipts[id];if(!r?.sourceUrl||!r?.evidenceQuote||!r.sourceId)add(`${group}.${i}.receiptIds`,'UNKNOWN_RECEIPT','This receipt is not in the saved seller evidence.');}
  const prose=[t.label,t.whyItMatters,t.messageAngle,t.rule,...(Array.isArray(t.keywords)?t.keywords:[])].filter(Boolean).join(' ');
  // Targeting policies may not smuggle in metrics, contacts or named prospect facts.
  if(/\d|[%$€£@]|https?:\/\//.test(prose))add(`${group}.${i}`,'FACTUAL_PLAYBOOK_CLAIM','Keep policy explanations free of metrics, contact details and external claims; use saved receipts.');
  const allowed=(t.receiptIds||[]).map(id=>receipts[id]?.evidenceQuote||'').join(' ').toLowerCase();
  const roles=Object.values(p.buyerRoles||{}).flat().join(' ').toLowerCase();
  const names=prose.match(/\b[A-Z][a-z]+(?:\s+[A-Z][A-Za-z]+)+\b/g)||[];
  if(names.some(name=>!allowed.includes(name.toLowerCase())&&!roles.includes(name.toLowerCase())))add(`${group}.${i}`,'UNSUPPORTED_NAME','A named person or organization is absent from the selected receipts and approved role vocabulary.');
  const companies=prose.match(/\b[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*\s+(?:Inc|Labs|Corp|Corporation|Ltd)\b/g)||[];
  if(companies.some(name=>!allowed.includes(name.toLowerCase())))add(`${group}.${i}`,'UNSUPPORTED_ENTITY','A named organization is absent from the selected seller receipts.');
 }
 return warnings;
}
function draftPlaybook(raw,receipts={},now=new Date().toISOString(),revision=1){
 const p={schemaVersion:1,version:revision,status:'needs_review',approvedAt:null,updatedAt:now,buyerRoles:structuredClone(raw?.buyerRoles||{economicBuyer:[],champion:[],endUser:[]}),triggers:structuredClone(raw?.triggers||[]),antiTriggers:structuredClone(raw?.antiTriggers||[]),receipts:structuredClone(receipts)};
 p.warnings=validatePlaybook(p);return p;
}
function approvedPlaybook(workspace={}){const p=workspace.sellerProfile?.playbook;return p?.status==='approved'&&p.approvedAt&&p.approvedDigest===digest(p)&&!validatePlaybook(p).length?p:null;}
function legacyResolvePlaybook(workspace={},receipts={}){
 if(!workspace.referenceDemo?.loadOnly)return null;
 const c=workspace.icpConfig||{},roles=c.personas||{},mapping=c.triggerMapping||{},sla=c.slaDays||{};
 const definitions=[['reliability_hiring','Reliability hiring','ats_jobs',require('./collectors/hiring.cjs').configuredTargetingPhrases({buyerTitles:roles.buyerTitles,championTitles:roles.championTitles,triggerMapping:mapping}),90,'medium'],['public_incident','Public operational incident','statuspage',mapping.pain_event,30,'strong'],['engineering_leadership','Engineering leadership change','news',mapping.buying_intent,30,'medium']];
 const p=draftPlaybook({buyerRoles:{economicBuyer:roles.buyerTitles||[],champion:roles.championTitles||[],endUser:[]},triggers:definitions.map(([id,label,source,words,days,strength])=>({id,label,whyItMatters:'A timely change in the target engineering organization.',source,keywords:words?.length?words:[label],freshnessDays:Math.min(180,Math.max(7,Number(sla[id]||sla[source==='news'?'exec_change':source==='ats_jobs'?'reliability_hiring':'outage']||days))),strength,messageAngle:'Discuss the relevant change using its public receipt.',receiptIds:Object.entries(receipts).filter(([,r])=>(words||[]).some(word=>r.evidenceQuote.toLowerCase().includes(String(word).toLowerCase()))).slice(0,2).map(([id])=>id)})),antiTriggers:[]},receipts,'2026-11-14T00:00:00.000Z');
 // A deterministic configuration conversion is a proposal, not researched seller evidence or approval.
 p.origin='deterministic_legacy_configuration';return p;
}
function reviewPlaybook(state,id,{action,revision,profileRevision,raw,acknowledged,now=new Date().toISOString()}={}){
 const next=structuredClone(state),w=next.workspaces[id];if(!w||w.status==='archived')throw Error('Choose an active workspace.');
 if(Number(profileRevision)!==Number(w.profileRevision||0))throw Error('The seller profile changed. Refresh before reviewing its playbook.');
 const prior=w.sellerProfile.playbook;if(Number(revision)!==Number(prior?.version||0))throw Error('The playbook changed. Refresh and try again.');
 const receipts=receiptsForWorkspace(state,w);
 if(action==='save')w.sellerProfile.playbook=draftPlaybook(raw,receipts,now,(prior?.version||0)+1);
 else if(action==='approve'){
  if(!acknowledged)throw Error('Confirm that you reviewed this saved playbook and its receipts.');
  if(!prior)throw Error('Save the playbook before approving it.');
  const warnings=validatePlaybook(prior,receipts);if(warnings.length)throw Error('Fix the blocking playbook warnings before approval.');
  const selected=new Set([...(prior.triggers||[]),...(prior.antiTriggers||[])].flatMap(t=>t.receiptIds||[]));
  if([...selected].some(key=>JSON.stringify(prior.receipts?.[key])!==JSON.stringify(receipts[key])))throw Error('Seller receipts changed. Save and review the playbook again.');
  w.sellerProfile.playbook={...prior,status:'approved',approvedAt:now,approvedDigest:digest(prior)};
 }else throw Error('Unknown playbook action.');
 if(action==='approve'&&(w.status==='active'||w.referenceDemo?.loadOnly)){const config=require('./phase-a-config.cjs').phaseAConfigForWorkspace(w);w.accounts=w.accounts.map(a=>require('./score-account.cjs').scoreAccount(a,config,new Date(now)));}
 next.auditLog.push({schemaVersion:1,type:action==='save'?'playbook_saved':'playbook_approved',workspaceId:id,occurredAt:now,playbookVersion:w.sellerProfile.playbook.version,profileRevision:w.profileRevision||0,actor:'owner'});return next;
}
module.exports={SOURCES,STRENGTHS,digest,draftSchema,receiptsForWorkspace,validatePlaybook,draftPlaybook,approvedPlaybook,legacyResolvePlaybook,reviewPlaybook};
