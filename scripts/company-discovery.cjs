'use strict';

const crypto=require('node:crypto');
const {phaseAConfigForWorkspace}=require('./phase-a-config.cjs');
const {normalizedEntityName,rootDomain,sameEntity}=require('./entity-rules.cjs');
const {blankSignals}=require('./accounts.cjs');
const {scoreAccount}=require('./score-account.cjs');

const MAX_DISCOVERY_QUERIES=60;
const BLOCKED_HOSTS=['google.com','bing.com','linkedin.com','facebook.com','x.com','twitter.com','youtube.com','crunchbase.com','pitchbook.com','techcrunch.com','reuters.com','bloomberg.com','forbes.com','businessinsider.com','prnewswire.com','globenewswire.com','wikipedia.org','g2.com','capterra.com','boards.greenhouse.io','job-boards.greenhouse.io','jobs.lever.co','jobs.ashbyhq.com'];
const GENERIC_NAME=/^(?:home|about(?: us)?|companies?|jobs?|careers?|news|research|top|best|directory|platform|software|technology|solutions|official site)$/i;
const STOP_TERMS=new Set(['and','the','platform','platforms','software','saas','enterprise','real','time','live','company','companies','official','website','outage','incident','down','site','reliability','engineer','engineering','hiring','management','technology']);

function blockedHost(domain=''){return BLOCKED_HOSTS.some(host=>domain===host||domain.endsWith(`.${host}`));}
function cleanCompanyName(title=''){
  const candidate=String(title).replace(/\s+[|·—–-]\s+.*$/,'').replace(/^(welcome to|about)\s+/i,'').replace(/\s+(official site|homepage)$/i,'').trim();
  if(candidate.length<2||candidate.length>90||GENERIC_NAME.test(candidate)||/\b(top|best)\s+\d+\b|\b(list|directory|guide|report|news)\b/i.test(candidate)||candidate.split(/\s+/).length>8)return '';
  if(/\b(raises?|raised|announces?|announced|hires?|hired|acquires?|acquired)\b/i.test(candidate)||(candidate.match(/[A-Za-z]/g)||[]).length<2)return '';
  return candidate;
}
function domainMatchesName(domain,name){const label=String(domain).split('.')[0].replace(/[^a-z0-9]/g,''),tokens=String(name).toLowerCase().split(/[^a-z0-9]+/).filter(token=>token.length>=3);return Boolean(label&&tokens.some(token=>label.includes(token)||token.includes(label)));}
function termsForSegment(segment={}){
  return [...new Set(`${segment.key||''} ${segment.label||''} ${(segment.subIndustries||[]).join(' ')}`.toLowerCase().split(/[^a-z0-9]+/).filter(term=>term.length>=4&&!STOP_TERMS.has(term)))];
}
function taskId(segment,kind,query){return `discovery_${crypto.createHash('sha256').update(`${segment}:${kind}:${query}`).digest('hex').slice(0,12)}`;}
function buildDiscoveryTasks(workspace={},options={}){
  const config=phaseAConfigForWorkspace(workspace),limit=Math.min(MAX_DISCOVERY_QUERIES,Math.max(1,Number(options.maxQueries)||MAX_DISCOVERY_QUERIES));
  if(!(workspace.universeSeeds||[]).length&&options.strategy!=='icp_queries')return require('./workspace-hiring.cjs').buildWorkspaceHiringTasks(workspace).slice(0,limit).map(task=>({...task,id:taskId('',task.kind,task.query),segment:'',terms:[]}));
  const enabled=config.segments.filter(segment=>segment.enabled!==false),tasks=[],add=(segment,kind,query)=>{if(tasks.length>=limit||!query)return;tasks.push({id:taskId(segment.key,kind,query),segment:segment.key,segmentLabel:segment.label,kind,query,terms:termsForSegment(segment)});};
  const templateDepth=Math.max(0,...enabled.map(segment=>(segment.queryTemplates||segment.searchQueryTemplates||[]).length));for(let index=0;index<templateDepth;index++)for(const segment of enabled)add(segment,'icp_query_template',String((segment.queryTemplates||segment.searchQueryTemplates||[])[index]||''));
  const personaTitles=[...(config.personas?.buyerTitles||[]),...(config.personas?.championTitles||[])].slice(0,8);for(const title of personaTitles)for(const segment of enabled)add(segment,'persona_hiring',`"${title}" hiring "${segment.label}"`);
  for(const competitor of config.competitors||[])for(const segment of enabled)add(segment,'competitor_customer',`"${competitor.name}" customer case study "${segment.label}"`);
  const variants=[
    segment=>`"${segment.label}" companies official website`,
    segment=>`"${segment.label}" platform company`,
    segment=>`"${segment.label}" startup official`,
    segment=>`best "${segment.label}" companies`,
    segment=>`"${segment.label}" engineering careers`,
    segment=>`"${segment.label}" funding company`,
  ];
  for(let variant=0;variant<variants.length;variant++)for(const segment of enabled)add(segment,`matrix_${variant+1}`,variants[variant](segment));return tasks.slice(0,limit);
}
function candidateFromResult(task={},result={}){
  const sourceUrl=String(result.url||result.link||'').trim(),domain=rootDomain(sourceUrl);if(!sourceUrl||!domain||blockedHost(domain))return null;
  const name=cleanCompanyName(result.title||result.name||'');if(!name||!domainMatchesName(domain,name))return null;
  const text=`${name} ${result.snippet||result.text||''}`.toLowerCase(),matchedTerms=(task.terms||[]).filter(term=>text.includes(term));if(!matchedTerms.length)return null;
  return {schemaVersion:1,name,domain,segment:task.segment,segmentLabel:task.segmentLabel,subIndustry:matchedTerms[0],sourceUrl,sourceKind:'serper_discovery',segmentClassification:{segment:task.segment,confidence:matchedTerms.length>=2?.86:.72,requiresReview:false,reason:'query_and_company_evidence',matchedTerms:matchedTerms.slice(0,8)},provenance:{kind:'serper_discovery',url:sourceUrl,query:task.query,title:String(result.title||'').slice(0,300),snippet:String(result.snippet||'').slice(0,1000)}};
}
function seedCandidates(workspace={}){return (workspace.universeSeeds||[]).map(seed=>({...structuredClone(seed),segmentLabel:(workspace.icpConfig?.segments||[]).find(row=>row.key===seed.segment)?.label||seed.segment,sourceKind:seed.provenance?.kind||'curated_seed',segmentClassification:{segment:seed.segment,confidence:1,requiresReview:false,reason:'workspace_curated_seed'}}));}
function fuzzySameOrganization(left={},right={}){
  if(sameEntity(left,right,[]))return true;const a=normalizedEntityName(left.name),b=normalizedEntityName(right.name);if(!a||!b)return false;
  const suffix=/\s+(?:ai|labs?|group|holdings?)$/;return a.length>=5&&b.length>=5&&(a.replace(suffix,'')===b.replace(suffix,''));
}
function exclusionReason(candidate,workspace={},config=phaseAConfigForWorkspace(workspace)){
  if(fuzzySameOrganization(candidate,config.seller))return 'seller';
  if(config.customers.some(row=>fuzzySameOrganization(candidate,row)))return 'customer';
  if(config.competitors.some(row=>fuzzySameOrganization(candidate,row)))return 'competitor';
  if((workspace.accounts||[]).some(row=>sameEntity(candidate,row,config.entityRules)))return 'existing_account';
  return '';
}
function selectBalancedCandidates(workspace={},incoming=[],options={}){
  const config=phaseAConfigForWorkspace(workspace),limit=Math.max(1,Math.min(30,Number(options.limit)||25)),seen=new Set(),rejected=[];
  const candidates=[];
  for(const candidate of incoming){const domain=rootDomain(candidate.domain||candidate.sourceUrl),reason=exclusionReason(candidate,workspace,config);if(reason){rejected.push({...candidate,rejectionReason:reason});continue;}if(!domain||seen.has(domain)||!candidate.sourceUrl){rejected.push({...candidate,rejectionReason:!domain?'invalid_domain':seen.has(domain)?'duplicate':'missing_source'});continue;}seen.add(domain);candidates.push({...candidate,domain});}
  const buckets=new Map(config.segments.filter(row=>row.enabled!==false).map(row=>[row.key,[]]));for(const candidate of candidates)if(buckets.has(candidate.segment))buckets.get(candidate.segment).push(candidate);else rejected.push({...candidate,rejectionReason:'unconfigured_segment'});
  for(const rows of buckets.values())rows.sort((a,b)=>(b.segmentClassification?.confidence||0)-(a.segmentClassification?.confidence||0)||a.name.localeCompare(b.name));
  const selected=[];while(selected.length<limit){let moved=false;for(const rows of buckets.values()){if(rows.length&&selected.length<limit){selected.push(rows.shift());moved=true;}}if(!moved)break;}
  return {selected,rejected:[...rejected,...[...buckets.values()].flat().map(row=>({...row,rejectionReason:'selection_limit'}))]};
}
function promoteDiscoveryCandidates(state,workspaceId,candidates=[],options={}){
  const next=structuredClone(state),workspace=next.workspaces[workspaceId];if(!workspace)throw new Error('Unknown workspace.');const config=phaseAConfigForWorkspace(workspace),now=options.now||(()=>new Date().toISOString()),id=options.id||(()=>crypto.randomUUID()),added=[];
  for(const candidate of candidates){if(exclusionReason(candidate,workspace,config))continue;const createdAt=now(),account=scoreAccount({schemaVersion:1,id:id(),name:candidate.name,domain:rootDomain(candidate.domain),website:`https://${rootDomain(candidate.domain)}`,icpSegment:candidate.segment,segmentClassification:structuredClone(candidate.segmentClassification),sourceUrl:candidate.sourceUrl,discoveryQuality:{sourceUrl:candidate.sourceUrl,isValidTargetAccount:true,targetAccountName:candidate.name,targetDomain:rootDomain(candidate.domain),sourceKind:candidate.sourceKind},signals:blankSignals(),triggers:[],createdAt,updatedAt:createdAt,status:'new',statusReason:'',matchedIcpId:candidate.segment,matchedIcpReason:'Matched the segment’s saved discovery query or seed.',discovery:{...structuredClone(candidate.provenance||{}),runId:candidate.runId||''}},config,new Date(createdAt));workspace.accounts.push(account);added.push(account);next.auditLog.push({schemaVersion:1,type:'discovery_account_added',workspaceId,accountId:account.id,occurredAt:createdAt,sourceUrl:candidate.sourceUrl,segment:candidate.segment});}
  return {state:next,added};
}

module.exports={BLOCKED_HOSTS,MAX_DISCOVERY_QUERIES,blockedHost,buildDiscoveryTasks,candidateFromResult,cleanCompanyName,exclusionReason,promoteDiscoveryCandidates,seedCandidates,selectBalancedCandidates,termsForSegment};
