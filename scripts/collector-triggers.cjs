'use strict';

const DAY_MS=86400000;
const DEFAULT_TRIGGER_SLA_DAYS=Object.freeze({default:90,form_d_filing:14,outage:30,exec_change:30,hiring_surge:45,first_infra_hire:45,headcount_surge:45,otel_adoption:90,otel_contributor:180,risk_factor_added:120,conference_talk:120,public_postmortem:30,reliability_hiring:90,ai_rca_hiring:60,funding:30});
function boundedDays(value,fallback){const number=Number(value);return Number.isFinite(number)?Math.max(1,Math.min(365,Math.round(number))):fallback;}
function normalizeSlaConfig(input={}){return Object.fromEntries(Object.entries(DEFAULT_TRIGGER_SLA_DAYS).map(([key,fallback])=>[key,boundedDays(input?.[key],fallback)]));}
function triggerType(trigger={}){return String(trigger.triggerType||trigger.type||'signal').trim().toLowerCase().replace(/[\s-]+/g,'_');}
function slaKeyForType(value=''){
  const type=String(value).toLowerCase().replace(/[\s-]+/g,'_');
  if(type==='form_d_filing')return 'form_d_filing';if(/outage|incident|downtime|degraded/.test(type))return 'outage';
  if(type==='exec_change')return type;if(type==='hiring_surge'||type==='first_infra_hire'||type==='headcount_surge'||type==='otel_adoption'||type==='otel_contributor'||type==='risk_factor_added'||type==='conference_talk'||type==='public_postmortem'||type==='ai_rca_hiring')return type;
  if(/reliability_hiring|site_reliability|sre_hiring/.test(type))return 'reliability_hiring';if(/funding|raised|financing|series_[a-z]/.test(type))return 'funding';return 'default';
}
function decorateTrigger(trigger={},slaInput={}){
  const canonicalType=triggerType(trigger),slaKey=slaKeyForType(canonicalType),normalized=normalizeSlaConfig(slaInput),hasConfigured=Object.hasOwn(slaInput||{},slaKey),slaDays=hasConfigured?normalized[slaKey]:boundedDays(trigger.slaDays,normalized[slaKey]),timestamp=Date.parse(trigger.detectedAt||trigger.occurredAt||trigger.observedAt||''),decaysAt=Number.isFinite(timestamp)?new Date(timestamp+slaDays*DAY_MS).toISOString():'';
  return {...trigger,type:trigger.type||canonicalType,triggerType:trigger.triggerType||canonicalType,...(trigger.detectedAt?{}:trigger.occurredAt?{detectedAt:trigger.occurredAt}:{}),decaysAt,slaDays,slaKey};
}
module.exports={DAY_MS,DEFAULT_TRIGGER_SLA_DAYS,decorateTrigger,normalizeSlaConfig,slaKeyForType,triggerType};
