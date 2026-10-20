'use strict';

const {signal,withinDays}=require('./common.cjs');

function seasonalContext(segment,now=new Date()){
  const month=now.getUTCMonth()+1;
  if(segment==='sports_betting'&&(month>=9||month<=2))return {boost:1,text:'In-season sports calendar increases event-driven production and revenue sensitivity.'};
  if(segment==='ticketing_live_events'&&[3,4,5,9,10].includes(month))return {boost:1,text:'Major tour and event on-sale periods increase concentrated ticketing demand.'};
  if(segment==='travel_hospitality'&&[5,6,7,11,12].includes(month))return {boost:1,text:'Peak travel-booking periods increase production revenue sensitivity.'};
  return {boost:0,text:'No unverified seasonal boost applied.'};
}
function segmentLabel(key,config={}){return config.segments?.[key]?.label||key||'Unclassified';}
function evidenceText(target={}){return [target.name,target.description,target.hypothesis?.text,...(target.triggers||[]).map(row=>row.evidenceText),...Object.values(target.signals||{}).map(row=>row.evidenceText)].filter(Boolean).join(' ');}
function includesKeyword(text,keywords=[]){const normalized=String(text).toLowerCase().replace(/[–—_-]/g,' ').replace(/\s+/g,' ');return keywords.find(keyword=>normalized.includes(String(keyword).toLowerCase().replace(/[–—_-]/g,' ').replace(/\s+/g,' ')));}
function classifyTransactionalUrgency(target={},config={}){
  const rules=config.transactionalUrgency||{},segment=target.segment||target.icpSegment,override=String(target.transactionalUrgencyOverride||'').trim().toLowerCase();
  if(['transaction_gone','customer_returns','non_transactional'].includes(override))return {classification:override,rationale:'Operator override.',source:'operator_override'};
  if((rules.transactionGoneSegments||[]).includes(segment))return {classification:'transaction_gone',rationale:`${segmentLabel(segment,config)} has time-bound transactions that can disappear or move to a competitor when production fails.`,source:'segment_model'};
  if((rules.customerReturnsSegments||[]).includes(segment))return {classification:'customer_returns',rationale:`${segmentLabel(segment,config)} usually retains a later customer purchase opportunity after a temporary production failure.`,source:'segment_model'};
  const text=evidenceText(target),gone=includesKeyword(text,rules.transactionGoneKeywords),returns=includesKeyword(text,rules.customerReturnsKeywords);
  if(gone)return {classification:'transaction_gone',rationale:`Public evidence contains the time-bound transaction cue “${gone}.”`,source:'public_evidence'};
  if(returns)return {classification:'customer_returns',rationale:`Public evidence contains the returnable-customer cue “${returns}.”`,source:'public_evidence'};
  return {classification:'non_transactional',rationale:'No configured time-bound or returnable transaction pattern was verified.',source:'conservative_default'};
}
function classifyRevenueSensitivity(target,context={}){
  const collectorConfig=context.collectorConfig||context.resolveConfig||{},segment=target.segment||target.icpSegment,config=target.segmentConfig||target.resolveSegmentConfig||collectorConfig.segments?.[segment],base=config?.revenueSensitivityBase||1,urgency=classifyTransactionalUrgency(target,collectorConfig),adjusted=score=>urgency.classification==='customer_returns'?Math.min(score,Math.max(1,base-1)):urgency.classification==='transaction_gone'?Math.max(base,score):score,urgencyMetadata={transactionalUrgency:urgency.classification,transactionalUrgencyReason:urgency.rationale,transactionalUrgencySource:urgency.source},now=context.now||new Date(),publicEvent=(context.eventCalendar||[]).find(item=>item.url&&withinDays(item.date||item.observedAt,45,now));
  if(publicEvent)return signal({key:'revenueSensitivity',score:adjusted(Math.min(5,base+1)),evidenceUrl:publicEvent.url,evidenceText:`${publicEvent.title||'Public event'}. ${publicEvent.text||'Time-bound demand event.'} ${urgency.rationale}`,observedAt:publicEvent.date||publicEvent.observedAt,sourceId:publicEvent.sourceId||'event_calendar',metadata:{baseScore:base,eventBoost:1,...urgencyMetadata}});
  const seasonal=seasonalContext(segment,now);return signal({key:'revenueSensitivity',score:adjusted(Math.min(5,base+seasonal.boost)),evidenceUrl:'',evidenceText:`${config?.label||'Unclassified'} base score. ${seasonal.text} ${urgency.rationale}`,observedAt:now.toISOString(),sourceId:'segment_model',inferred:true,metadata:{baseScore:base,seasonalBoost:seasonal.boost,...urgencyMetadata}});
}
async function collectRevenueSensitivity(target,context){const value=classifyRevenueSensitivity(target,context);return {collectorId:'revenue_sensitivity',signals:[value],events:[],killHints:[],targetPatch:{},itemsFound:value.inferred?0:1};}
module.exports={classifyRevenueSensitivity,classifyTransactionalUrgency,collectRevenueSensitivity,seasonalContext};
