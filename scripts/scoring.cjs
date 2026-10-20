'use strict';

const {SIGNAL_KEYS}=require('./signal-rubric.cjs');
const SCORING_VERSION='resolve-confidence-fit-v6';
const SCORING_CONFIG_VERSION='resolve-scoring-priority-v2';
const DEFAULT_WEIGHTS={techStack:1.3,activePain:1.2,revenueSensitivity:1.1,observabilityScale:1,aiCompatibility:0.9,competitiveWedge:0.8};

function finiteNumber(value,fallback,minimum,maximum) {
  const parsed=Number(value);
  return Number.isFinite(parsed)?Math.max(minimum,Math.min(maximum,parsed)):fallback;
}
function normalizeScoringConfig(input={}) {
  const config=input.scoring||input;
  const configuredWeights=config.weights||input.weights||{};
  return {
    version:SCORING_CONFIG_VERSION,
    weights:Object.fromEntries(SIGNAL_KEYS.map(key=>[key,finiteNumber(configuredWeights[key],DEFAULT_WEIGHTS[key],0.1,3)])),
    liveTriggerDays:Math.round(finiteNumber(config.liveTriggerDays??input.liveTriggerDays,90,1,365)),
  };
}
function ageDays(value,now=new Date()) {
  const timestamp=Date.parse(value||'');
  if(!Number.isFinite(timestamp))return undefined;
  return (now.getTime()-timestamp)/86400000;
}
function painRecencyFactor(value={},now=new Date()) {
  const days=ageDays(value.observedAt,now);
  if(days===undefined||days<=365)return 1;
  if(days<=730)return .5;
  return .25;
}
function sourceConfidence(value={},account={}) {
  const explicit=Number(value.confidence);
  if(!value.evidenceUrl)return Number.isFinite(explicit)?Math.min(.4,Math.max(.2,explicit)):value.inferred?.4:.2;
  if(Number.isFinite(explicit))return Math.max(.2,Math.min(1,explicit));
  if(value.inferred)return .4;
  let host='',accountHost='';
  try{host=new URL(value.evidenceUrl).hostname.toLowerCase().replace(/^www\./,'');}catch{}
  try{const raw=account.website||account.domain||'';accountHost=new URL(String(raw).startsWith('http')?raw:`https://${raw}`).hostname.toLowerCase().replace(/^www\./,'');}catch{}
  if(host&&accountHost&&(host===accountHost||host.endsWith(`.${accountHost}`)))return 1;
  if(/statuspage\.io$|greenhouse\.io$|lever\.co$|ashbyhq\.com$/.test(host))return .9;
  if(/reuters\.com$|bloomberg\.com$|techcrunch\.com$|businesswire\.com$|prnewswire\.com$|globenewswire\.com$/.test(host))return .8;
  return .7;
}
function liveTrigger(account={},now=new Date(),windowDays=90) {
  const candidates=[];
  for(const trigger of account.triggers||[]){
    const type=String(trigger.triggerType||trigger.type||'');
    if(!/incident|outage|downtime|degraded|reliability_hiring|reliability hiring|chaos|production pain/i.test(type)||!trigger.evidenceUrl)continue;
    const occurredAt=trigger.occurredAt||trigger.detectedAt,days=ageDays(occurredAt,now);
    if(days!==undefined&&days>=0&&days<=windowDays)candidates.push({occurredAt,evidenceUrl:trigger.evidenceUrl,type});
  }
  const pain=account.signals?.activePain;
  if(pain?.evidenceUrl&&!pain.inferred){const days=ageDays(pain.observedAt,now);if(days!==undefined&&days>=0&&days<=windowDays)candidates.push({occurredAt:pain.observedAt,evidenceUrl:pain.evidenceUrl,type:'activePain'});}
  return candidates.sort((a,b)=>Date.parse(b.occurredAt)-Date.parse(a.occurredAt))[0];
}
function scoreSignals(account={},configInput={},nowInput=new Date()) {
  const now=nowInput instanceof Date?nowInput:new Date(nowInput),config=normalizeScoringConfig(configInput),breakdown={};
  let weightedTotal=0,signalTotal=0,weightedConfidence=0;
  for(const key of SIGNAL_KEYS){
    const value=account.signals?.[key]||{score:1,evidenceUrl:'',evidenceText:'Signal not collected.',inferred:true};
    const rawScore=finiteNumber(value.score,1,1,5),weight=config.weights[key],confidence=sourceConfidence(value,account),receiptFactor=confidence,recencyFactor=key==='activePain'?painRecencyFactor(value,now):1,contribution=rawScore*weight*receiptFactor*recencyFactor;
    signalTotal+=rawScore;weightedTotal+=contribution;weightedConfidence+=weight*confidence;
    breakdown[key]={rawScore,weight,receiptFactor,confidence,recencyFactor,contribution:Number(contribution.toFixed(2)),evidenceUrl:value.evidenceUrl||'',observedAt:value.observedAt||''};
  }
  const weightedMax=SIGNAL_KEYS.reduce((total,key)=>total+(config.weights[key]*5),0),roundedTotal=Number(weightedTotal.toFixed(2)),roundedMax=Number(weightedMax.toFixed(2)),fitScore=Math.round((roundedTotal/roundedMax)*100);
  for(const item of Object.values(breakdown))item.fitPoints=Number(((item.contribution/roundedMax)*100).toFixed(2));
  const trigger=liveTrigger(account,now,config.liveTriggerDays),fitBand=fitScore>=70?'strong':fitScore>=40?'moderate':'weak',fitConfidence=Number((weightedConfidence/SIGNAL_KEYS.reduce((total,key)=>total+config.weights[key],0)).toFixed(2)),confidenceBand=fitConfidence>=.8?'high-confidence':fitConfidence>=.55?'mixed-confidence':'mostly-inferred',receiptedSignals=SIGNAL_KEYS.filter(key=>Boolean(account.signals?.[key]?.evidenceUrl)&&sourceConfidence(account.signals[key],account)>=.7).length;
  return {scoringVersion:SCORING_VERSION,signalTotal,signalMax:30,weightedTotal:roundedTotal,weightedMax:roundedMax,weightedPercent:fitScore,fitScore,totalScore:fitScore,fitBand,fitConfidence,confidenceBand,fitReason:`${fitScore}/100 at ${Math.round(fitConfidence*100)}% evidence confidence (${confidenceBand}); ${receiptedSignals} of 6 signals carry URL receipts.`,receiptedSignals,breakdown,weights:config.weights,liveTriggerDays:config.liveTriggerDays,liveTrigger:Boolean(trigger),liveTriggerAt:trigger?.occurredAt||'',liveTriggerUrl:trigger?.evidenceUrl||''};
}
module.exports={DEFAULT_WEIGHTS,SCORING_CONFIG_VERSION,SCORING_VERSION,ageDays,liveTrigger,normalizeScoringConfig,painRecencyFactor,scoreSignals,sourceConfidence};
