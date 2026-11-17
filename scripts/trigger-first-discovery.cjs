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
const ATS_HOSTS={
  'boards.greenhouse.io':'greenhouse','job-boards.greenhouse.io':'greenhouse',
  'jobs.lever.co':'lever','jobs.ashbyhq.com':'ashby',
};
const ATS_SEARCH_HOSTS=[{provider:'greenhouse',host:'job-boards.greenhouse.io'},{provider:'greenhouse',host:'boards.greenhouse.io'},{provider:'lever',host:'jobs.lever.co'},{provider:'ashby',host:'jobs.ashbyhq.com'}];
const SEGMENT_STOP=new Set(['and','company','enterprise','hiring','incident','management','platform','platforms','reliability','site','software','the']);

function clean(value='',max=300){const text=String(value).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();return text.length<=max?text:text.slice(0,max).trim();}
function buildTriggerFirstTasks(workspace){
  return [...require('./trigger-first-news.cjs').buildNewsTasks(workspace),...require('./workspace-hiring.cjs').buildWorkspaceHiringTasks(workspace)];
}
function atsDescriptor(value=''){
  let url;try{url=new URL(value);}catch{return null;}const provider=ATS_HOSTS[url.hostname.toLowerCase()];if(!provider||url.protocol!=='https:'||url.username||url.password)return null;
  const parts=url.pathname.split('/').filter(Boolean),slug=parts[0]||'';if(!/^[a-z0-9_-]+$/i.test(slug))return null;
  const direct=provider==='greenhouse'?parts.includes('jobs')&&parts.length>=3:parts.length>=2;
  return {provider,slug,url:url.href,direct};
}
function roleAndCompany(title=''){
  const value=clean(title).replace(/\s+[|·]\s+(LinkedIn|Glassdoor|Indeed).*$/i,'');let match;
  if((match=value.match(/^Job Application for\s+(.+?)\s+at\s+(.+)$/i)))return {role:clean(match[1]),company:clean(match[2])};
  if((match=value.match(/^(.+?)\s+at\s+(.+)$/i)))return {role:clean(match[1]),company:clean(match[2])};
  const parts=value.split(/\s+[|·—–-]\s+/).map(value=>clean(value)).filter(Boolean),role=parts.find(part=>/\b(?:engineer(?:ing)?|manager|director|head|chief|vp|lead|operations)\b/i.test(part))||value,company=parts.find(part=>part!==role&&!/jobs?|careers?/i.test(part))||'';
  return {role,company};
}
function candidateFromJobResult(result={},workspace){
  const sourceUrl=String(result.url||result.link||''),ats=atsDescriptor(sourceUrl);if(!ats)return null;
  const parsed=roleAndCompany(result.title||'');const targeting=workspace?require('./workspace-hiring.cjs').matchingWorkspaceRole({title:parsed.role,text:result.snippet||''},require('./workspace-hiring.cjs').targetForWorkspace(workspace)):{relevant:RELIABILITY_ROLE.test(parsed.role)&&SENIOR_ROLE.test(parsed.role)};if(!targeting.relevant||EARLY_CAREER_ROLE.test(parsed.role))return null;
  const name=parsed.company||clean(ats.slug.replace(/[-_]+/g,' ').replace(/\b\w/g,char=>char.toUpperCase()));
  return {schemaVersion:1,name,nameIsInferred:!parsed.company,roleTitle:parsed.role,sourceUrl,sourceSnippet:clean(result.snippet||'',1000),sourceDate:String(result.date||''),...ats};
}
function dedupeJobCandidates(rows=[]){const seen=new Set();return rows.filter(row=>{if(!row)return false;const key=`${row.provider||row.kind}:${row.slug||row.ruleId}:${row.sourceUrl.replace(/[?#].*$/,'')}`;if(seen.has(key))return false;seen.add(key);return true;});}
function identityFromResults(candidate={},results=[]){
  const wanted=normalizedEntityName(candidate.name).replace(/\s/g,''),rows=[];
  for(const result of results){const sourceUrl=String(result.url||result.link||'');let url;try{url=new URL(sourceUrl);}catch{continue;}const domain=rootDomain(sourceUrl),title=clean(result.title||''),nameText=normalizedEntityName(title).replace(/\s/g,'');if(url.protocol!=='https:'||!domain||blockedHost(domain)||ATS_HOSTS[url.hostname.toLowerCase()]||require('./company-identity.cjs').NON_COMPANY_PATH.test(url.pathname)||require('./company-identity.cjs').NON_COMPANY_HOST.test(domain))continue;if(wanted.length>=4&&nameText.includes(wanted))rows.push({domain,sourceUrl,title,snippet:clean(result.snippet,1000)});}
  const unique=[...new Map(rows.map(row=>[row.domain,row])).values()];if(unique.length!==1)return null;const best=unique[0];return {name:candidate.name,domain:best.domain,website:'https://'+best.domain,sourceUrl:best.sourceUrl,identityReceipt:best};
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
  const sourcePath=(()=>{try{return new URL(candidate.sourceUrl).pathname.replace(/\/$/,'');}catch{return '';}})(),direct=jobs.find(job=>{try{return new URL(job.url).pathname.replace(/\/$/,'')===sourcePath;}catch{return false;}}),byTitle=jobs.find(job=>clean(job.title).toLowerCase()===clean(candidate.roleTitle).toLowerCase());return direct||(atsDescriptor(candidate.sourceUrl)?.direct?null:byTitle)||null;
}
function mergeSignals(base={},rows=[]){const next={...base};for(const row of rows||[]){if(!row?.key)continue;const current=next[row.key];if(!current||current.inferred===true||Number(row.score||0)>Number(current.score||0))next[row.key]=row;}return next;}
async function verifyCandidate(candidate,{runtime,workspace,identityResults=[],now=new Date(),firmographicsCollector=collectFirmographics,resolveIdentity}={}){
  const endpoint=providerEndpoints(candidate.slug).find(row=>row.provider===candidate.provider);if(!endpoint)return {accepted:false,reason:'unsupported_ats'};
  let response;try{response=await runtime.requestJson(endpoint.url,candidate.provider);}catch(error){return {accepted:false,reason:'ats_unavailable',error:{code:error.code||'ATS_FAILED',status:error.status||null}};}
  const jobs=normalizeJobs(candidate.provider,response.value).map(job=>require('./collectors/ats-receipts.cjs').normalizeJobReceipt(candidate.provider,candidate.slug,{...job,text:require('./collectors/ats-receipts.cjs').readableAtsText(job.text)})),job=matchVerifiedJob(candidate,jobs);
  if(!job)return {accepted:false,reason:'job_not_found'};
  const config=phaseAConfigForWorkspace(workspace),targeting=require('./workspace-hiring.cjs').matchingWorkspaceRole(job,require('./workspace-hiring.cjs').targetForWorkspace(workspace));
  if(!targeting.relevant)return {accepted:false,reason:targeting.reason||'role_not_targeted',job};
  if(!job.publishedAt||!Number.isFinite(Date.parse(job.publishedAt))||Date.parse(job.publishedAt)>now.getTime())return {accepted:false,reason:'job_date_missing_or_future',job};
  const playbook=workspace.referenceDemo?.loadOnly?null:config.playbook;
  const playbookEvent=playbook?{
    type:'function_hiring',title:job.title,evidenceUrl:job.url,evidenceText:job.title+'\n'+job.text,
    occurredAt:job.publishedAt,sourceId:candidate.provider,
    metadata:{provider:candidate.provider,jobId:job.id,jobTitle:job.title,department:job.department,publicationDateSource:job.publicationDateSource}
  }:null;
  const window=Number(config.slaDays?.reliability_hiring||config.slaDays?.default)||90;
  const fresh=playbook?require('./playbook-timing.cjs').matchPlaybook({triggers:[playbookEvent]},playbook,now).length>0:now.getTime()-Date.parse(job.publishedAt)<=window*86400000;
  if(!fresh)return {accepted:false,reason:'job_outside_window',job};
  const ats={provider:candidate.provider,slug:candidate.slug,endpoint:endpoint.url};
  const result=await verifyOperatingCandidate(candidate,{runtime,workspace,identityResults,resolveIdentity,now,firmographicsCollector,ats,job,
    event:playbookEvent,kind:'trigger_first_hiring',sourceUrl:job.url});
  if(!result.accepted)return result;
  return {...result,atsReceipt:{url:endpoint.url,title:job.title,text:job.title+'\n'+job.text,fetchedAt:response.fetchedAt||now.toISOString()},receiptSurface:'verified_ats_api'};
}

async function verifyOperatingCandidate(candidate,{runtime,workspace,identityResults,resolveIdentity,now,firmographicsCollector,ats,job,event,kind,sourceUrl}) {
  const config=phaseAConfigForWorkspace(workspace),collectorConfig=collectorConfigForWorkspace(workspace);
  const identity=resolveIdentity?await resolveIdentity(candidate,identityResults):identityFromResults(candidate,identityResults);
  if(!identity||candidate.nameIsInferred)return {accepted:false,reason:'identity_unresolved',job};
  let page;
  try {
    const result=await runtime.requestText(identity.sourceUrl,'engineering_web',{allowedRedirectDomain:identity.domain});
    page={url:result.url||identity.sourceUrl,text:result.value,title:identity.identityReceipt.title,sourceKind:'first_party_page',fetchedAt:result.fetchedAt||now.toISOString()};
  } catch(error) {
    return {accepted:false,reason:'official_page_unavailable',error:{code:error.code||'FETCH_FAILED'},job,identity};
  }
  const gate=require('./company-identity.cjs').assessOperatingCompany(identity,config,page);
  const segmentClassification=classifySegment(workspace,identity,[{title:identity.name,text:gate.evidenceText||page.text}]);
  const createdAt=now.toISOString();
  const base={
    schemaVersion:1,id:randomUUID(),name:identity.name,domain:identity.domain,website:identity.website,...(ats?{ats}:{}),
    icpSegment:segmentClassification.segment,segmentClassification,sourceUrl,
    discoveryQuality:{sourceUrl,isValidTargetAccount:gate.accepted,targetAccountName:identity.name,targetDomain:identity.domain,sourceKind:kind,quality:gate.reason,reason:gate.reason},
    signals:blankSignals(),triggers:[],createdAt,updatedAt:createdAt,status:'new',statusReason:'',
    discovery:{kind,queryReceipt:candidate.sourceUrl,identityReceipt:page.url,identityEvidence:gate.evidenceText,...(ats?{provider:ats.provider,slug:ats.slug}:{})}
  };
  if(!gate.accepted) {
    if(gate.reason==='adjacent_vendor')return {accepted:false,reason:gate.reason,vendorAccount:scoreAccount({...base,discoveryVendorEvidence:gate},config,now),identity,job,page};
    return {accepted:false,reason:gate.reason,identity,job};
  }
  const excluded=exclusionReason(base,workspace,config);
  if(excluded) {
    if(['seller','competitor'].includes(excluded))return {accepted:false,reason:excluded,vendorAccount:scoreAccount(base,config,now),identity,job,page};
    return {accepted:false,reason:excluded,identity,job};
  }
  const target=collectorTargetForAccount(base,collectorConfig);
  const hiring=job?jobSignals(target,candidate.provider,[job],now,collectorConfig.painThemeConfig,collectorConfig.slaDays):{signals:[],events:[]};
  const firmographics=await firmographicsCollector(target,{runtime,searchResults:identityResults.map(row=>({...row,kind:'firmographics_identity'})),sourcePage:page,verifiedEvent:event,identity,now});
  const account=scoreAccount({...base,signals:mergeSignals(base.signals,hiring.signals),triggers:event?[event]:hiring.events,...firmographics.targetPatch},config,now);
  const live=activeTriggers(account,now);
  const actNowEligible=!segmentClassification.requiresReview&&!require('./account-lifecycle.cjs').needsReviewReason(account,now)&&live.length>0&&!account.kills?.length&&[1,2,3].includes(Number(account.tier));
  return {accepted:true,account,job,identity,page,activeTriggerCount:live.length,actNowEligible};
}

module.exports={ATS_HOSTS,TRIGGER_FIRST_QUERY_CAP,atsDescriptor,buildTriggerFirstTasks,candidateFromJobResult,classifySegment,dedupeJobCandidates,identityFromResults,matchVerifiedJob,segmentTerms,verifyCandidate,verifyOperatingCandidate};
