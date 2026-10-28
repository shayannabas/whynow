'use strict';

const {randomUUID}=require('node:crypto');
const {rootDomain,normalizedEntityName}=require('./entity-rules.cjs');
const {blockedHost,exclusionReason}=require('./company-discovery.cjs');
const {blankSignals}=require('./accounts.cjs');
const {phaseAConfigForWorkspace}=require('./phase-a-config.cjs');
const {collectorConfigForWorkspace,collectorTargetForAccount}=require('./phase-b-config.cjs');
const {EARLY_CAREER_ROLE,RELIABILITY_ROLE,SENIOR_ROLE,jobSignals,normalizeJobs,providerEndpoints}=require('./collectors/hiring.cjs');
const {collectFirmographics}=require('./collectors/firmographics.cjs');
const {scoreAccount}=require('./score-account.cjs');
const {activeTriggers}=require('./decisioning.cjs');

const TRIGGER_FIRST_QUERY_CAP=40;
const ROLE_QUERIES=[
  '"Senior Site Reliability Engineer" OR "Staff Site Reliability Engineer" OR "Principal Site Reliability Engineer"',
  '"Head of SRE" OR "Director of Site Reliability" OR "Incident Management Lead"',
  '"Head of Platform Engineering" OR "Director of Platform Engineering" OR "Platform Engineering Lead"',
];
const ATS_HOSTS={
  'boards.greenhouse.io':'greenhouse','job-boards.greenhouse.io':'greenhouse',
  'jobs.lever.co':'lever','jobs.ashbyhq.com':'ashby',
};
const ATS_SEARCH_HOSTS=[{provider:'greenhouse',host:'job-boards.greenhouse.io'},{provider:'greenhouse',host:'boards.greenhouse.io'},{provider:'lever',host:'jobs.lever.co'},{provider:'ashby',host:'jobs.ashbyhq.com'}];
const SEGMENT_STOP=new Set(['and','company','enterprise','hiring','incident','management','platform','platforms','reliability','site','software','the']);

function clean(value='',max=300){const text=String(value).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();return text.length<=max?text:text.slice(0,max).trim();}
function buildTriggerFirstTasks(){const tasks=[];for(const {provider,host} of ATS_SEARCH_HOSTS)for(const roles of ROLE_QUERIES)tasks.push({provider,query:`site:${host} (${roles})`,kind:'trigger_first_hiring'});return tasks;}
function atsDescriptor(value=''){
  let url;try{url=new URL(value);}catch{return null;}const provider=ATS_HOSTS[url.hostname.toLowerCase()];if(!provider)return null;
  const parts=url.pathname.split('/').filter(Boolean),slug=parts[0]||'';if(!slug)return null;
  const direct=provider==='greenhouse'?parts.includes('jobs')&&parts.length>=3:parts.length>=2;
  return {provider,slug,url:url.href,direct};
}
function roleAndCompany(title=''){
  const value=clean(title).replace(/\s+[|·]\s+(LinkedIn|Glassdoor|Indeed).*$/i,'');let match;
  if((match=value.match(/^Job Application for\s+(.+?)\s+at\s+(.+)$/i)))return {role:clean(match[1]),company:clean(match[2])};
  if((match=value.match(/^(.+?)\s+at\s+(.+)$/i))&&RELIABILITY_ROLE.test(match[1]))return {role:clean(match[1]),company:clean(match[2])};
  const parts=value.split(/\s+[|·—–]\s+/).map(clean).filter(Boolean),role=parts.find(part=>RELIABILITY_ROLE.test(part))||value,company=parts.find(part=>part!==role&&!/jobs?|careers?/i.test(part))||'';
  return {role,company};
}
function candidateFromJobResult(result={}){
  const sourceUrl=String(result.url||result.link||''),ats=atsDescriptor(sourceUrl);if(!ats)return null;
  const parsed=roleAndCompany(result.title||'');if(!RELIABILITY_ROLE.test(parsed.role)||!SENIOR_ROLE.test(parsed.role)||EARLY_CAREER_ROLE.test(`${parsed.role} ${result.snippet||''}`))return null;
  const name=parsed.company||clean(ats.slug.replace(/[-_]+/g,' ').replace(/\b\w/g,char=>char.toUpperCase()));
  return {schemaVersion:1,name,roleTitle:parsed.role,sourceUrl,sourceSnippet:clean(result.snippet||'',1000),sourceDate:String(result.date||''),...ats};
}
function dedupeJobCandidates(rows=[]){const seen=new Set();return rows.filter(row=>{if(!row)return false;const key=`${row.provider}:${row.slug}:${row.sourceUrl.replace(/[?#].*$/,'')}`;if(seen.has(key))return false;seen.add(key);return true;});}
function identityFromResults(candidate={},results=[]){
  const wanted=normalizedEntityName(candidate.name),slug=normalizedEntityName(candidate.slug),rows=[];
  for(const result of results){const sourceUrl=String(result.url||result.link||''),domain=rootDomain(sourceUrl),text=normalizedEntityName(`${result.title||''} ${result.snippet||''}`);if(!domain||blockedHost(domain)||ATS_HOSTS[new URL(sourceUrl).hostname.toLowerCase()])continue;const score=(wanted&&text.includes(wanted)?3:0)+(slug&&text.includes(slug)?2:0)+(wanted&&normalizedEntityName(domain).includes(wanted.replace(/\s/g,''))?2:0);if(score)rows.push({score,domain,sourceUrl,title:clean(result.title),snippet:clean(result.snippet,1000)});}
  rows.sort((a,b)=>b.score-a.score);const best=rows[0];return best?{name:candidate.name,domain:best.domain,website:`https://${best.domain}`,sourceUrl:best.sourceUrl,identityReceipt:best}:null;
}
function segmentTerms(segment={}){
  // Query-template terms describe how to search, not what an organization is.
  const generic=new Set(['service','services','platform','platforms','enterprise','enterprises','software','system','systems','cloud','engineering','engineer','hiring','technology','vertical']);
  return [...new Set(`${segment.key||''} ${segment.label||''} ${(segment.subIndustries||[]).join(' ')}`.toLowerCase().match(/[a-z][a-z0-9]+/g)?.filter(term=>term.length>=4&&!SEGMENT_STOP.has(term)&&!generic.has(term))||[])];
}
function classifySegment(workspace={},candidate={},identityResults=[]){
  const config=phaseAConfigForWorkspace(workspace),seed=(workspace.universeSeeds||[]).find(row=>normalizedEntityName(row.name)===normalizedEntityName(candidate.name)||rootDomain(row.domain)===rootDomain(candidate.domain));if(seed)return {segment:seed.segment,confidence:1,requiresReview:false,reason:'workspace_curated_seed'};
  const haystack=`${candidate.name} ${identityResults.map(row=>`${row.title||''} ${row.snippet||row.text||''}`).join(' ')}`.toLowerCase(),words=new Set(haystack.match(/[a-z][a-z0-9]+/g)||[]),ranked=config.segments.filter(row=>row.enabled!==false).map(segment=>{const matched=segmentTerms(segment).filter(term=>words.has(term));return {segment:segment.key,matched};}).sort((a,b)=>b.matched.length-a.matched.length);
  const best=ranked[0];if(!best||!best.matched.length||best.matched.length===1&&!/^(?:cybersecurity|insurance|ticketing|hospitality|fintech|crypto|igaming|restaurant)$/.test(best.matched[0]))return {segment:'unclassified',confidence:0,requiresReview:true,reason:'no_unambiguous_segment_evidence'};
  return {segment:best.segment,confidence:Math.min(.92,.62+best.matched.length*.1),requiresReview:false,reason:'workspace_segment_terms',matchedTerms:best.matched.slice(0,8)};
}
function matchVerifiedJob(candidate={},jobs=[]){
  const sourcePath=(()=>{try{return new URL(candidate.sourceUrl).pathname.replace(/\/$/,'');}catch{return '';}})(),direct=jobs.find(job=>{try{return new URL(job.url).pathname.replace(/\/$/,'')===sourcePath;}catch{return false;}}),byTitle=jobs.find(job=>clean(job.title).toLowerCase()===clean(candidate.roleTitle).toLowerCase());return direct||byTitle||null;
}
function mergeSignals(base={},rows=[]){const next={...base};for(const row of rows||[]){if(!row?.key)continue;const current=next[row.key];if(!current||current.inferred===true||Number(row.score||0)>Number(current.score||0))next[row.key]=row;}return next;}
async function verifyCandidate(candidate,{runtime,workspace,identityResults=[],now=new Date()}={}){
  const endpoint=providerEndpoints(candidate.slug).find(row=>row.provider===candidate.provider);if(!endpoint)return {accepted:false,reason:'unsupported_ats'};
  let payload;try{payload=(await runtime.requestJson(endpoint.url,candidate.provider)).value;}catch(error){return {accepted:false,reason:'ats_unavailable',error:{code:error.code||'ATS_FAILED',message:error.message}};}
  const job=matchVerifiedJob(candidate,normalizeJobs(candidate.provider,payload));if(!job)return {accepted:false,reason:'job_not_found'};
  if(EARLY_CAREER_ROLE.test(`${job.title||''} ${job.text||''}`)||!RELIABILITY_ROLE.test(job.title||'')||!SENIOR_ROLE.test(job.title||''))return {accepted:false,reason:'role_not_targeted'};
  const identity=identityFromResults(candidate,identityResults);if(!identity)return {accepted:false,reason:'identity_unresolved'};
  const segmentClassification=classifySegment(workspace,{...candidate,...identity},identityResults);if(segmentClassification.requiresReview)return {accepted:false,reason:'unclassified',identity,job};const config=phaseAConfigForWorkspace(workspace),collectorConfig=collectorConfigForWorkspace(workspace),createdAt=now.toISOString(),base={schemaVersion:1,id:randomUUID(),name:identity.name,domain:identity.domain,website:identity.website,icpSegment:segmentClassification.segment,segmentClassification,sourceUrl:job.url,discoveryQuality:{sourceUrl:job.url,isValidTargetAccount:true,targetAccountName:identity.name,targetDomain:identity.domain,sourceKind:'trigger_first_hiring'},signals:blankSignals(),triggers:[],createdAt,updatedAt:createdAt,status:'new',statusReason:'',discovery:{kind:'trigger_first_hiring',queryReceipt:candidate.sourceUrl,identityReceipt:identity.sourceUrl,provider:candidate.provider,slug:candidate.slug}};
  const excluded=exclusionReason(base,workspace,config);if(excluded)return {accepted:false,reason:excluded,identity,job};
  const target=collectorTargetForAccount(base,collectorConfig),hiring=jobSignals(target,candidate.provider,[job],now,collectorConfig.painThemeConfig,collectorConfig.slaDays),firmographics=await collectFirmographics(target,{runtime,searchResults:identityResults.map(row=>({...row,kind:'firmographics_identity'})),now}),account=scoreAccount({...base,signals:mergeSignals(base.signals,hiring.signals),triggers:hiring.events,...firmographics.targetPatch},config,now),live=activeTriggers(account,now);
  let receiptSurface='generic_javascript_careers_page';try{const page=await runtime.requestText(job.url,'engineering_web');if(String(page.value||page.text||'').toLowerCase().includes(String(job.title||'').toLowerCase()))receiptSurface='direct_job_text';}catch{}
  return {accepted:true,account,job,identity,receiptSurface,activeTriggerCount:live.length,actNowEligible:live.length>0&&!account.kills?.length&&[1,2,3].includes(Number(account.tier))};
}

module.exports={ATS_HOSTS,ROLE_QUERIES,TRIGGER_FIRST_QUERY_CAP,atsDescriptor,buildTriggerFirstTasks,candidateFromJobResult,classifySegment,dedupeJobCandidates,identityFromResults,matchVerifiedJob,segmentTerms,verifyCandidate};
