'use strict';

const {applyKillEngine}=require('./kills.cjs');
const DECISION_SCHEMA_VERSION='priority-v5-playbook-signals';
const DEFAULT_TIER_WEIGHTS={1:3,2:2,3:1,parked:0};
const DEFAULT_MAX_PRIORITY_RAW=9.375;
function ageDays(value,now=new Date()){const timestamp=Date.parse(value||'');return Number.isFinite(timestamp)?(now.getTime()-timestamp)/86400000:Infinity;}
function activeTriggers(account={},now=new Date()){
  return (account.triggers||[]).filter(trigger=>{
    if(!trigger.evidenceUrl||trigger.weakEvidenceFlag===true||trigger.reviewState==='needs_more_research'||trigger.citable===false||trigger.metadata?.citable===false)return false;
    if(['serper','public_search','google_news_rss'].includes(trigger.sourceId)&&/incident|outage|news|exec|executive/.test(String(trigger.type||trigger.triggerType||''))&&trigger.metadata?.eventDateReported!==true)return false;
    const end=Date.parse(trigger.decaysAt||''),start=Date.parse(trigger.occurredAt||trigger.detectedAt||'');
    if(Number.isFinite(end))return now.getTime()<end;
    return Number.isFinite(start)&&ageDays(trigger.occurredAt||trigger.detectedAt,now)>=0&&ageDays(trigger.occurredAt||trigger.detectedAt,now)<90;
  });
}
function signalStack(account={},now=new Date()){
  const live=activeTriggers(account,now),types=Array.from(new Set(live.map(trigger=>String(trigger.triggerType||trigger.type||'').toLowerCase()).filter(Boolean))),count=types.length;
  return {count,liveTriggerTypes:types,multiplier:count>=2?1.5:1,namedBoost:count>=2?'two_signal_stack':'single_or_none',hiringForWhatWeSell:types.includes('ai_rca_hiring')||types.includes('internal_tool_maintenance')};
}
function hasFreshTrigger(account={},now=new Date()){
  if((account.triggers||[]).length)return activeTriggers(account,now).length>0;
  const days=ageDays(account.score?.liveTriggerAt,now);
  return Boolean(account.score?.liveTrigger&&days>=0&&days<90);
}
function priorityForAccount(account={},nowInput=new Date(),config={}){
  const now=nowInput instanceof Date?nowInput:new Date(nowInput),rules=config.decisionRules||{},tierWeights=rules.tierWeights||DEFAULT_TIER_WEIGHTS,maxPriorityRaw=Number(rules.maxPriorityRaw)||DEFAULT_MAX_PRIORITY_RAW,tierKey=[1,2,3].includes(Number(account.tier))?Number(account.tier):'parked',tierWeight=tierWeights[tierKey]||0,fitScore=Math.max(0,Math.min(100,Number(account.fitScore??account.score?.fitScore??0))),fitFactor=fitScore/100,stack=signalStack(account,now),freshnessBoost=hasFreshTrigger(account,now)?1.25:1,stackMultiplier=stack.multiplier,themeBBoost=config.themeBBoost||rules.themeBBoost||{enabled:true,multiplier:1.08},themeBQuote=(account.painQuotes||[]).find(quote=>(quote.themes||[]).includes('B')&&quote.usable!==false),themeBBoostApplied=Boolean(themeBBoost.enabled!==false&&themeBQuote),themeBBoostMultiplier=themeBBoostApplied?Number(themeBBoost.multiplier||1.08):1,killed=account.killStatus==='killed'||(account.kills||[]).length>0,tierConfidence=Math.max(0,Math.min(1,Number(account.tierConfidence||0))),confidenceDampener=account.tierProvisional&&[1,2,3].includes(Number(account.tier))?Number((.85+.15*tierConfidence).toFixed(4)):1,rawBeforeThemeB=killed?0:tierWeight*fitFactor*freshnessBoost*stackMultiplier*confidenceDampener,raw=rawBeforeThemeB*themeBBoostMultiplier,normalized=Number(Math.max(0,Math.min(1,raw/maxPriorityRaw)).toFixed(4));
  return {priority:normalized,priorityBreakdown:{tier:account.tier||'parked',tierWeight,fitScore,fitFactor:Number(fitFactor.toFixed(2)),freshnessBoost,liveTriggerUnder90Days:freshnessBoost>1,liveTriggerCount:stack.count,liveTriggerTypes:stack.liveTriggerTypes,stackMultiplier,stackNamedBoost:stack.namedBoost,hiringForWhatWeSell:stack.hiringForWhatWeSell,themeBBoostApplied,themeBBoostMultiplier,themeBBoostReason:themeBBoostApplied?`Usable repeat-incidents quote ${themeBQuote.id} supports the category's least-competed angle.`:themeBBoost.enabled!==false?'No usable Theme B quote.':'Theme B boost is disabled.',confidenceDampener,killed,rawBeforeThemeB:Number(rawBeforeThemeB.toFixed(4)),raw:Number(raw.toFixed(4)),normalized,formula:killed?'Killed → 0':`${tierWeight} × (${fitScore}/100) × ${freshnessBoost} × ${stackMultiplier}${confidenceDampener!==1?` × ${confidenceDampener}`:''}${themeBBoostMultiplier!==1?` × ${themeBBoostMultiplier} Theme B`:''} ÷ ${maxPriorityRaw}`},decisionSchemaVersion:DECISION_SCHEMA_VERSION};
}
function applyDecisioning(account={},config={},now=new Date()){
  const decorated={...account,triggers:account.triggers||[],stage3SchemaVersion:'leading-indicators-v4-seed-watch-promotion'},killed=applyKillEngine(decorated,config),primaryKill=killed.kills?.[0]||null,prioritized=priorityForAccount(killed,now,config);
  return {...killed,primaryKill,alsoKilledBy:(killed.kills||[]).slice(1),killReason:primaryKill?.reason||'',killEvidenceUrl:primaryKill?.evidenceUrl||'',hiringForWhatWeSell:prioritized.priorityBreakdown.hiringForWhatWeSell,...prioritized};
}
function decisionReport(accounts=[]){const killed=accounts.filter(account=>account.killStatus==='killed'),count=value=>accounts.filter(account=>account.tier===value).length,killCodes=killed.reduce((result,account)=>{const code=account.primaryKill?.code||'unknown';result[code]=(result[code]||0)+1;return result;},{});return {total:accounts.length,tier1:count(1),tier2:count(2),tier3:count(3),parked:count('parked'),killed:killed.length,prioritized:accounts.filter(account=>account.priority>0).length,maximumPriority:accounts.length?Math.max(...accounts.map(account=>Number(account.priority||0))):0,killCodes};}
module.exports={DECISION_SCHEMA_VERSION,DEFAULT_MAX_PRIORITY_RAW,DEFAULT_TIER_WEIGHTS,activeTriggers,applyDecisioning,decisionReport,hasFreshTrigger,priorityForAccount,signalStack};
