'use strict';

const {rootDomain}=require('../entity-rules.cjs');
const {approvedPlaybook}=require('../playbook.cjs');
const {approvedIcps}=require('../icps.cjs');
const ENDPOINT='https://api.apollo.io/api/v1/mixed_people/api_search';
const MAX_PERSONAS=10;
const tidy=value=>typeof value==='string'?value.replace(/[\s\u0000-\u001f]+/g,' ').trim().slice(0,160):'';
const canonical=value=>tidy(value).toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();

function linkedinProfile(value){
  let url;
  try{url=new URL(value);}catch{return '';}
  if(url.protocol!=='https:'||!['www.linkedin.com','linkedin.com'].includes(url.host)||url.username||url.password||!/^\/in\/[a-z0-9_%.-]+\/?$/i.test(url.pathname))return '';
  return 'https://www.linkedin.com'+url.pathname.replace(/\/$/,'');
}
function linkedinPeopleSearch(company,title){
  return 'https://www.linkedin.com/search/results/people/?'+new URLSearchParams({keywords:tidy(title)+' '+tidy(company)});
}
function playbookTitles(workspace){
  const roles=approvedPlaybook(workspace)?.buyerRoles;
  if(roles)return [...new Set([...roles.economicBuyer,...roles.champion,...roles.endUser])];
  const legacy=workspace.icpConfig?.personas||{};
  return workspace.status==='active'||workspace.referenceDemo?.loadOnly?[...new Set([...(legacy.buyerTitles||[]),...(legacy.championTitles||[])])]:[];
}
function personaTitles(workspace,account){
  if(!approvedPlaybook(workspace))return [];
  const id=account.matchedIcpId||account.icpSegment;
  const icp=approvedIcps(workspace).find(row=>row.id===id);
  const allowed=new Set((icp?.buyerPersonas||[]).map(canonical));
  return playbookTitles(workspace).filter(title=>allowed.has(canonical(title)));
}
function matchTitle(title,roles){
  const actual=' '+canonical(title)+' ';
  return roles.find(role=>canonical(role)&&actual.includes(' '+canonical(role)+' '))||'';
}
function sanitizePersonas(payload,roles,domain){
  const rows=Array.isArray(payload?.people)?payload.people:[],seen=new Set(),result=[];
  for(const row of rows){
    const name=tidy(row?.name||[row?.first_name,row?.last_name].filter(Boolean).join(' '));
    const title=tidy(row?.title),matchedRole=matchTitle(title,roles),linkedinUrl=linkedinProfile(row?.linkedin_url);
    const employer=rootDomain(row?.organization?.primary_domain||row?.organization?.website_url||'');
    if(!name||!matchedRole||employer&&employer!==domain)continue;
    const key=linkedinUrl||canonical(name)+'|'+canonical(title);
    if(seen.has(key))continue;
    seen.add(key);
    result.push({name,title,matchedRole,linkedinUrl});
    if(result.length===MAX_PERSONAS)break;
  }
  return result;
}
function savedPersonas(account={}){
  return (account.personas||[]).slice(0,MAX_PERSONAS).map(row=>({
    name:tidy(row.name),title:tidy(row.title),matchedRole:tidy(row.matchedRole),linkedinUrl:linkedinProfile(row.linkedinUrl)
  })).filter(row=>row.name&&row.title);
}
function contactReady(account){return savedPersonas(account).some(row=>row.linkedinUrl);}
function peopleSettings(env={}){
  const cap=Number(env.APOLLO_PEOPLE_MONTHLY_CALL_LIMIT);
  return {enabled:env.APOLLO_PEOPLE_ENABLED==='true',cap:Number.isSafeInteger(cap)&&cap>0?Math.min(cap,100):0};
}
function accountForSearch(state,workspaceId,accountId){
  const workspace=state.workspaces[workspaceId],account=workspace?.accounts.find(row=>row.id===accountId),domain=rootDomain(account?.domain);
  if(!account||!domain||workspace.status!=='active'||account.killStatus==='killed'||account.kills?.length||account.identityReviewReason||account.discoveryQuality?.isValidTargetAccount===false)throw Error('Choose an approved workspace and a verified, unblocked company.');
  const roles=personaTitles(workspace,account).slice(0,40);
  if(!roles.length)throw Error('Approve the matching ICP and playbook with buyer roles before finding personas.');
  return {workspace,account,domain,roles};
}
async function findPersonas({read,mutate,runtime,env,workspaceId,accountId,now=()=>new Date()}){
  const {enabled,cap}=peopleSettings(env);
  if(!enabled||!cap||!env.APOLLO_API_KEY)throw Error('Apollo persona search is disabled.');
  const target=accountForSearch(read(),workspaceId,accountId),month=now().toISOString().slice(0,7);
  const scope=JSON.stringify([target.domain,target.roles,target.workspace.profileRevision,target.workspace.sellerProfile.playbook?.approvedDigest]);
  const checkScope=state=>{
    const fresh=accountForSearch(state,workspaceId,accountId);
    if(JSON.stringify([fresh.domain,fresh.roles,fresh.workspace.profileRevision,fresh.workspace.sellerProfile.playbook?.approvedDigest])!==scope)throw Error('Company or approved targeting changed. Refresh and try again.');
    return fresh;
  };
  await mutate(state=>{
    const {workspace}=checkScope(state),prior=workspace.budgets.apolloPeople;
    const calls=prior?.month===month?prior.calls:0;
    if(calls>=cap)throw Error('The workspace persona-search cap is exhausted.');
    workspace.budgets.apolloPeople={month,calls:calls+1};
    return state;
  });
  const {domain,roles}=target;
  const response=await runtime.requestJsonPost(ENDPOINT,'apollo_people',{
    q_organization_domains_list:[domain],person_titles:roles,include_similar_titles:false,page:1,per_page:MAX_PERSONAS
  },{headers:{'X-Api-Key':env.APOLLO_API_KEY},transformValue:payload=>({usable:Array.isArray(payload?.people),personas:sanitizePersonas(payload,roles,domain)})});
  if(!response.value.usable)throw Error('Apollo returned no usable persona response.');
  const personas=savedPersonas({personas:response.value.personas||[]});
  await mutate(state=>{
    const {account}=checkScope(state);
    account.personas=personas;
    return state;
  });
}

module.exports={ENDPOINT,MAX_PERSONAS,linkedinProfile,linkedinPeopleSearch,playbookTitles,personaTitles,sanitizePersonas,savedPersonas,contactReady,peopleSettings,accountForSearch,findPersonas};
