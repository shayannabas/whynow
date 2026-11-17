'use strict';

const {stableId}=require('./utils.cjs');
const {legacyResolvePlaybook,SOURCES,approvedPlaybook}=require('./playbook.cjs');
const lines=value=>[...new Set((Array.isArray(value)?value:String(value||'').split(/\r?\n/)).map(row=>String(row).trim().slice(0,160)).filter(Boolean))].slice(0,40);
const bounds=value=>value!==''&&value!=null&&Number.isSafeInteger(Number(value))&&Number(value)>=0?Number(value):null;

function playbookFor(workspace){
  return workspace.sellerProfile?.playbook||(workspace.referenceDemo?.loadOnly?legacyResolvePlaybook(workspace):null);
}
function deriveIcps(workspace={}){
  const {icpConfig:config={},sellerProfile:profile={}}=workspace;
  const playbook=playbookFor(workspace),roles=playbook?.buyerRoles||config.personas||{};
  const triggers=playbook?.triggers||[],metric=config.killPatterns?.sizeMetric||{};
  const exclusions=lines([...(profile.customers||[]),...(profile.competitors||[])].map(row=>row.domain||row.name).concat((playbook?.antiTriggers||[]).map(row=>row.rule)));
  return (config.segments||[]).filter(segment=>segment.enabled!==false).map(segment=>{
    const linked=triggers.filter(rule=>!segment.triggerIds||segment.triggerIds.includes(rule.id));
    const receipts=[...linked.flatMap(rule=>(rule.receiptIds||[]).map(id=>playbook?.receipts?.[id])),
      ...(segment.exampleTargets||[])].filter(row=>row?.sourceUrl&&row.evidenceQuote);
    return {
      id:segment.key||stableId(segment.label||''),name:segment.label||segment.key,description:segment.description||'',
      version:1,status:'needs_review',derived:true,
      firmographics:{industries:lines(segment.subIndustries?.length?segment.subIndustries:profile.targetIndustries),
        employeeMin:bounds(segment.employeeMin??(/^(?:min[ _-]*)?(?:employees|employee count|headcount)$/i.test(metric.label||'')?metric.floor:null)),
        employeeMax:bounds(segment.employeeMax),geographies:lines(segment.geographies),
        fundingStages:lines(segment.fundingStages),technologies:lines(segment.technologies||config.triggerMapping?.tech_adoption)},
      buyerPersonas:lines([...(roles.economicBuyer||roles.buyerTitles||[]),...(roles.champion||roles.championTitles||[]),...(roles.endUser||[])]),
      triggerIds:linked.map(rule=>rule.id),exclusions,
      queryRules:linked.map(({id,source,freshnessDays})=>({triggerId:id,source,freshnessDays})),
      receipts:[...new Map(receipts.map(row=>[row.sourceUrl+'|'+row.evidenceQuote,{sourceUrl:row.sourceUrl,sourceId:row.sourceId||'',quote:row.evidenceQuote}])).values()]
    };
  });
}
function workspaceIcps(workspace={}){
  if(workspace.icps?.length)return workspace.icps;
  return deriveIcps(workspace);
}
function reseedIcps(workspace){
  const prior=workspace.icps||[],derived=deriveIcps(workspace);
  workspace.icps=[...derived.map(row=>{
    const saved=prior.find(item=>item.id===row.id);
    if(saved&&!saved.derived)return saved;
    if(saved&&editableDigest(saved)===editableDigest(row))return {...row,version:saved.version,status:saved.status,approvedAt:saved.approvedAt};
    return {...row,version:(saved?.version||0)+1};
  }),...prior.filter(row=>!row.derived&&!derived.some(item=>item.id===row.id))];
}
function editableDigest({id,name,description,firmographics,buyerPersonas,triggerIds,exclusions,queryRules}){
  return JSON.stringify({id,name,description,firmographics,buyerPersonas,triggerIds,exclusions,queryRules});
}
function approvedIcps(workspace={}){
  if(workspace.status!=='active'&&!workspace.referenceDemo?.loadOnly)return [];
  const history=workspace.icpHistory||[];
  return workspaceIcps(workspace).map(row=>row.status==='approved'?row:history.findLast(item=>item.id===row.id&&item.status==='approved')).filter(Boolean);
}
function discoveryIcps(workspace){
  const approved=approvedIcps(workspace);
  // Saved profiles predating ICP Studio retain access to their existing targeting.
  return approved.length?approved:deriveIcps(workspace);
}
function matchedIcp(workspace,account={}){
  const id=account.matchedIcpId||account.icpSegment;
  return workspaceIcps(workspace).find(icp=>icp.id===id)||null;
}
function approveIcps(workspace,now){
  workspace.icps=workspaceIcps(workspace).map(row=>row.status==='approved'?row:{...row,status:'approved',approvedAt:now});
}
function editIcp(workspace,form){
  const id=form.get('id'),rows=workspaceIcps(workspace),prior=rows.find(row=>row.id===id);
  if(!prior||String(prior.version)!==form.get('version'))throw Error('ICP changed. Refresh and try again.');
  const name=String(form.get('name')||'').trim().slice(0,120);
  if(!name)throw Error('Enter the ICP name.');
  const employeeMin=bounds(form.get('employeeMin')),employeeMax=bounds(form.get('employeeMax'));
  if(['employeeMin','employeeMax'].some(key=>form.get(key)&&bounds(form.get(key))===null)||employeeMin!=null&&employeeMax!=null&&employeeMin>employeeMax)throw Error('Enter a valid employee range.');
  const triggerIds=lines(form.getAll('triggerId'));
  const rules=playbookFor(workspace)?.triggers||[];
  if(triggerIds.some(id=>!rules.some(rule=>rule.id===id)))throw Error('Choose triggers from the saved playbook.');
  const queryRules=triggerIds.map(id=>{
    const rule=rules.find(item=>item.id===id);
    const freshnessDays=Number(form.get('days.'+id)||rule.freshnessDays);
    if(!Number.isInteger(freshnessDays)||freshnessDays<7||freshnessDays>180||!SOURCES.includes(rule.source))throw Error('Use a freshness window from 7 to 180 days.');
    return {triggerId:id,source:rule.source,freshnessDays};
  });
  const changed={...prior,name,description:String(form.get('description')||'').trim().slice(0,600),derived:false,
    firmographics:{employeeMin,employeeMax,...Object.fromEntries(['industries','geographies','fundingStages','technologies'].map(key=>[key,lines(form.get(key))]))},
    buyerPersonas:lines(form.get('buyerPersonas')),exclusions:lines(form.get('exclusions')),triggerIds,queryRules};
  if(editableDigest(prior)===editableDigest(changed))return;
  workspace.icpHistory=[...(workspace.icpHistory||[]),prior];
  workspace.icps=rows.map(row=>row.id!==id?row:{...changed,version:prior.version+1,status:'needs_review',approvedAt:null});
}
function updateIcpApproval(workspace,form,now){
  const rows=workspaceIcps(workspace),row=rows.find(item=>item.id===form.get('id'));
  if(!row||String(row.version)!==form.get('version'))throw Error('ICP changed. Refresh and try again.');
  if(workspace.status!=='active'||form.get('acknowledged')!=='on')throw Error('Review the seller profile and confirm this ICP before approval.');
  workspace.icps=rows.map(item=>item.id!==row.id?item:{...item,status:'approved',approvedAt:now});
}

function buildIcpDiscoveryTasks(workspace,now=new Date()){
  const playbook=approvedPlaybook(workspace);
  if(!playbook||workspace.referenceDemo?.loadOnly)return null;
  const quote=value=>'"'+String(value).replace(/["\r\n]/g,' ').slice(0,90)+'"';
  const icps=discoveryIcps(workspace);
  if(!icps.length)return null;
  const pairs=playbook.triggers.flatMap(rule=>icps.filter(icp=>icp.triggerIds.includes(rule.id)&&rule.keywords?.length).map(icp=>({rule,icp})));
  const hosts=[['greenhouse','(site:job-boards.greenhouse.io OR site:boards.greenhouse.io)'],['lever','site:jobs.lever.co'],['ashby','site:jobs.ashbyhq.com']];
  const tasks=[];
  for(const {rule,icp} of pairs){
    if(!['ats_jobs','news'].includes(rule.source))continue;
    const days=Math.min(rule.freshnessDays,icp.queryRules.find(row=>row.triggerId===rule.id)?.freshnessDays||rule.freshnessDays);
    const terms=rule.keywords.slice(0,4);
    const audience=lines(icp.firmographics.industries).slice(0,2);
    if(!audience.length)audience.push(icp.name);
    const match={ruleId:rule.id,icpId:icp.id,icpLabel:icp.name,tbs:require('./trigger-first-news.cjs').newsDateFilter(days,now)};
    const topic='('+audience.map(quote).join(' OR ')+') ('+terms.map(quote).join(' OR ')+')';
    if(rule.source==='news')tasks.push({...match,id:`news-${icp.id}-${rule.id}`,kind:'trigger_first_news',terms,query:topic});
    else for(const [provider,site] of hosts)tasks.push({...match,id:`${provider}-${icp.id}-${rule.id}`,kind:'trigger_first_hiring',provider,rolePhrases:terms,query:site+' '+topic+' -intern -graduate -junior'});
  }
  // Keep sources interleaved so budget truncation can reach both.
  const news=tasks.filter(task=>task.kind==='trigger_first_news'),ats=tasks.filter(task=>task.kind==='trigger_first_hiring');
  return Array.from({length:Math.max(news.length,ats.length)},(_,index)=>[news[index],ats[index]]).flat().filter(Boolean);
}

module.exports={deriveIcps,workspaceIcps,reseedIcps,approvedIcps,discoveryIcps,matchedIcp,approveIcps,editIcp,updateIcpApproval,buildIcpDiscoveryTasks,playbookFor};
