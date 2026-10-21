'use strict';

const {activeTriggers}=require('./decisioning.cjs');

const POWER_LINES=['above','below'];
const AWARENESS_LEVELS=['unaware','knows_space','knows_seller'];
const MASLOW_LAYERS=['systems_online','stability','deploying_on_time','performance_at_scale','innovation'];
const ORG_SHAPING=/\b(?:chief|cto|cio|svp|senior vice president|vp|vice president|head of|director)\b[\s\S]{0,70}\b(?:engineering|platform|infrastructure|site reliability|sre|incident|production|observability|performance|reliability|technology)\b/i;
const BELOW_LINE=/\b(?:manager|staff|principal|lead|engineer|developer|architect|analyst|specialist|administrator|individual contributor|ic)\b/i;
const SPACE_AWARE=/\b(?:ai[-\s]?(?:sre|rca|root[-\s]?cause)|automated root[-\s]?cause|ai[-\s]assisted (?:investigation|incident)|rca tooling|investigation tooling)\b/i;
const DEPLOYING=/\b(?:release engineering|deployment|deploy velocity|developer velocity|ci\/cd|continuous delivery|shipping velocity|developer productivity)\b/i;
const PERFORMANCE=/\b(?:performance engineering|scalability|capacity planning|traffic spike|event[-\s]driven|latency|load testing|high[-\s]volume|real[-\s]time)\b/i;
const AI_FORWARD=/\b(?:artificial intelligence|machine learning|generative ai|llm|agentic|ai platform|ai infrastructure|model inference)\b/i;
const INCIDENT=/^(?:production_incident|production_reliability_evidence|outage|outage_news|incident|downtime|degradation|public_postmortem)$/i;

function valid(value,allowed){const normalized=String(value||'').trim().toLowerCase();return allowed.includes(normalized)?normalized:'';}
function allAccountText(account={}){return [account.description,account.industry,...Object.values(account.signals||{}).flatMap(signal=>[signal?.evidenceText,...(signal?.metadata?.keywords||[])]),...(account.triggers||[]).flatMap(trigger=>[trigger.type,trigger.triggerType,trigger.title,trigger.evidenceText])].filter(Boolean).join(' ');}
function derivePowerLine(contact={}){
  const override=valid(contact.powerLineOverride||contact.powerLine,POWER_LINES);if(override)return {value:override,source:contact.powerLineOverride?'operator_override':'stored'};
  const title=String(contact.title||'');
  if(ORG_SHAPING.test(title))return {value:'above',source:'title_seniority',reason:'The title has organization-shaping engineering scope.'};
  if(BELOW_LINE.test(title))return {value:'below',source:'title_seniority',reason:'The title is a hands-on or manager-level engineering role.'};
  return {value:'below',source:'conservative_default',reason:'No organization-shaping seniority was verified.'};
}
function recentInternalIncidents(account={},now=new Date()){
  return activeTriggers(account,now).filter(trigger=>INCIDENT.test(trigger.type||trigger.triggerType||'')&&trigger.citable!==false&&trigger.attribution!=='external'&&trigger.metadata?.attribution!=='external');
}
function diagnoseMaslowLayer(account={},now=new Date()){
  const override=valid(account.maslowLayerOverride||account.maslowLayer,MASLOW_LAYERS);if(account.maslowLayerOverride&&override)return {layer:override,driver:account.maslowDriverOverride||'Operator override.',source:'operator_override'};
  const incidents=recentInternalIncidents(account,now);if(incidents.length>=3)return {layer:'stability',driver:`Diagnosed from ${incidents.length} recent citable incidents.`,source:'incident_history'};if(incidents.length)return {layer:'systems_online',driver:`Diagnosed from ${incidents.length} recent citable incident${incidents.length===1?'':'s'}.`,source:'incident_history'};
  const text=allAccountText(account);if(DEPLOYING.test(text))return {layer:'deploying_on_time',driver:'Public evidence points to deploy or delivery-velocity work.',source:'public_signal'};if(PERFORMANCE.test(text))return {layer:'performance_at_scale',driver:'Public evidence points to scale or performance work.',source:'public_signal'};if(Number(account.signals?.aiCompatibility?.score||0)>=4||AI_FORWARD.test(text))return {layer:'innovation',driver:'Public evidence shows an AI-forward engineering environment.',source:'public_signal'};
  return {layer:'stability',driver:'Conservative default until stronger operating evidence is available.',source:'conservative_default'};
}
function hasSellerHistory(account={}){return Boolean((account.touches||[]).length||(account.outcomeHistory||[]).length||['working','meeting_held','opportunity'].includes(String(account.status||account.state||'').toLowerCase()));}
function deriveAwareness(contact={},account={}){const override=valid(contact.awarenessOverride||contact.awareness,AWARENESS_LEVELS);if(contact.awarenessOverride&&override)return {value:override,source:'operator_override'};if(hasSellerHistory(account))return {value:'knows_seller',source:'account_history',reason:'Prior account activity establishes seller awareness.'};if(SPACE_AWARE.test(allAccountText(account)))return {value:'knows_space',source:'public_category_evidence',reason:'Public evidence mentions AI-assisted investigation tooling.'};if(override)return {value:override,source:'stored'};return {value:'unaware',source:'conservative_default',reason:'No seller or category awareness was verified.'};}
function ctaForAwareness(value='unaware'){return ({unaware:{severity:'seed_question',instruction:'Ask a low-friction question; do not ask for a meeting.'},knows_space:{severity:'qualification',instruction:'Ask whether this is the right owner or whether evaluation is active.'},knows_seller:{severity:'direct_meeting',instruction:'Ask directly for a short conversation or routing.'}})[valid(value,AWARENESS_LEVELS)||'unaware'];}
function nextMaslowLayer(layer='stability'){return ({systems_online:'stability',stability:'deploying_on_time',deploying_on_time:'performance_at_scale',performance_at_scale:'innovation',innovation:'innovation'})[layer]||'stability';}
function framingFor({powerLine='below',maslowLayer='stability'}={}){return powerLine==='above'?{mode:'strategic_future_state',targetLayer:nextMaslowLayer(maslowLayer),instruction:`Frame the next operating state from ${maslowLayer} toward ${nextMaslowLayer(maslowLayer)}.`}:{mode:'operational_relief',targetLayer:maslowLayer,instruction:`Frame practical relief at ${maslowLayer}: less manual investigation for the people doing the work.`};}
function decorateContact(contact={},account={}){const power=derivePowerLine(contact),awareness=deriveAwareness(contact,account);return {...contact,powerLine:power.value,powerLineReason:power.reason||'',awareness:awareness.value,awarenessReason:awareness.reason||''};}

module.exports={AWARENESS_LEVELS,MASLOW_LAYERS,POWER_LINES,ctaForAwareness,decorateContact,deriveAwareness,derivePowerLine,diagnoseMaslowLayer,framingFor,nextMaslowLayer,recentInternalIncidents};
