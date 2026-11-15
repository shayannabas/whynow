'use strict';
const {randomUUID}=require('node:crypto');
const apollo=require('./collectors/apollo.cjs');
const {phaseAConfigForWorkspace}=require('./phase-a-config.cjs');
const {blankSignals}=require('./accounts.cjs');
const {scoreAccount}=require('./score-account.cjs');
const {sameEntity}=require('./entity-rules.cjs');
function derivePattern(customers=[]){
 if(!customers.length)throw Error('No approved customer could be enriched; no lookalike search was made.');
 const common=key=>{const counts=new Map();for(const row of customers)for(const value of new Set(Array.isArray(row[key])?row[key]:[row[key]])){if(value)counts.set(value,(counts.get(value)||0)+1);}const floor=customers.length===1?1:Math.ceil(customers.length/2);return [...counts].filter(([,n])=>n>=floor).sort((a,b)=>b[1]-a[1]).map(([v])=>v).slice(0,8);};
 const employeeBands=[[1,10],[11,20],[21,50],[51,100],[101,200],[201,500],[501,1000],[1001,2000],[2001,5000],[5001,10000],[10001,1000000]];
 const sizes=customers.map(r=>r.employeeCount).filter(n=>Number.isFinite(n)&&n>0);
 const pattern={industries:common('industry'),countries:common('country'),technologies:common('technologies'),employeeRange:sizes.length?[(employeeBands.find(b=>Math.min(...sizes)<=b[1])||employeeBands.at(-1))[0],(employeeBands.find(b=>Math.max(...sizes)<=b[1])||employeeBands.at(-1))[1]]:null,receipts:customers.map(c=>({customer:c.name,domain:c.domain,...c.receipt})),inferred:true,label:'Apollo customer comparison pattern — estimates'};
 if(!pattern.industries.length&&!pattern.countries.length&&!pattern.technologies.length&&!pattern.employeeRange)throw Error('Customer enrichment returned no usable pattern.');return pattern;
}
function classify(row,config){const text=[row.industry,...row.technologies].join(' ').toLowerCase(),ranked=config.segments.filter(s=>s.enabled!==false).map(s=>({key:s.key,count:[s.label,...s.subIndustries||[]].filter(x=>String(x).split(/\s+/).some(t=>t.length>=4&&text.includes(t.toLowerCase()))).length})).sort((a,b)=>b.count-a.count);return ranked[0]?.count&&ranked[0].count>(ranked[1]?.count||0)?{segment:ranked[0].key,confidence:.7,requiresReview:false,reason:'apollo_pattern_estimate'}:{segment:'unclassified',confidence:0,requiresReview:true,reason:'review_apollo_segment_estimate'};}
async function runLookalike({read,mutate,workspaceId,runId,client,env={},now=()=>new Date(),id=()=>randomUUID()}){
 const initial=read().workspaces[workspaceId],config=phaseAConfigForWorkspace(initial),revision=initial.profileRevision,limits=apollo.settings(env),customers=config.customers.filter(c=>apollo.publicDomain(c.domain)).slice(0,limits.customerLimit);
 if(!customers.length)throw Error('Lookalike discovery needs approved customers with confirmed domains.');
 const enriched=[];for(const c of customers){const row=await client.enrich(workspaceId,runId,c.domain);if(row)enriched.push(row);}
 const pattern=derivePattern(enriched);
 await mutate(s=>{const run=s.workspaces[workspaceId].runs.find(r=>r.id===runId);run.pattern=pattern;return s;});
 const found=await client.search(workspaceId,runId,pattern);
 await mutate(state=>{
  for(const receipt of [...pattern.receipts,...found.map(row=>row.receipt)]){const saved=require('./sources.cjs').recordSource(state,{url:receipt.sourceUrl,text:'Apollo organization estimates retrieved '+receipt.retrievedAt+'\n'+JSON.stringify(receipt.values),title:'Apollo company estimates',fetchedAt:receipt.retrievedAt});state=saved.state;receipt.savedSourceId=saved.source.id;}
  const w=state.workspaces[workspaceId];if(w.profileRevision!==revision||!w.sellerProfile.approvedAt)throw Error('Seller approval changed during discovery.');
  const run=w.runs.find(r=>r.id===runId),seen=new Set(w.accounts.map(a=>a.domain)),rejected=[],added=[];
  for(const row of found){const domain=apollo.publicDomain(row.domain),reason=!domain?'invalid_domain':sameEntity(row,config.seller,config.entityRules)?'seller':config.customers.some(c=>sameEntity(row,c,config.entityRules))?'customer':config.competitors.some(c=>sameEntity(row,c,config.entityRules))?'competitor':w.accounts.some(a=>a.kills?.length&&sameEntity(row,a,config.entityRules))?'existing_kill':seen.has(domain)?'duplicate':require('./company-discovery.cjs').blockedHost(domain)||require('./company-identity.cjs').NON_COMPANY_HOST.test(domain)?'non_company_page':!require('./company-discovery.cjs').cleanCompanyName(row.name)?'non_company_name':'';
   if(reason){rejected.push({...row,rejectionReason:reason,sourceUrl:row.receipt.sourceUrl,rejectedAt:now().toISOString()});continue;}
   seen.add(domain);const segment=classify(row,config),date=now().toISOString(),sourceUrl=row.receipt.sourceUrl,firmographics={employeeCount:row.employeeCount,confidence:.6,source:'apollo',sourceUrl,fields:{employeeCount:{value:row.employeeCount,sourceUrl,provider:'apollo',confidence:.6,estimated:true,retrievedAt:row.receipt.retrievedAt}}};
   const account=scoreAccount({schemaVersion:1,id:id(),name:row.name,domain,website:'https://'+domain,icpSegment:segment.segment,segmentClassification:segment,sourceUrl,signals:blankSignals(),triggers:[],firmographics,createdAt:date,updatedAt:date,status:'new',statusReason:'',discoveryQuality:{sourceKind:'apollo_lookalike',isValidTargetAccount:true,sourceUrl,quality:'apollo_organization_estimate'},discovery:{kind:'lookalike',provider:'Apollo',matchedPattern:pattern,receipt:row.receipt}},config,now());w.accounts.push(account);added.push(account.id);
  }
  w.rejectedDiscovery=[...(w.rejectedDiscovery||[]),...rejected];Object.assign(run,{status:'complete',finishedAt:now().toISOString(),newAccountIds:added,newAccounts:added.length,rawFound:found.length,passedNoiseGate:added.length,rejectedCount:rejected.length,pattern});state.auditLog.push({schemaVersion:1,type:'lookalike_discovery_complete',workspaceId,occurredAt:now().toISOString(),runId,newAccounts:added.length,rejected:rejected.length});return state;
 });
 return read().workspaces[workspaceId].runs.find(r=>r.id===runId);
}
module.exports={derivePattern,classify,runLookalike};
