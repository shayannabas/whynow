'use strict';
// Only diagnostic vocabulary is retained from free-form provider messages.
// Unknown text can contain contacts or credentials and is redacted completely.
const WORDS=new Set(('a an the this that your you we is are was be been to for of on in and or not no with without from as by at it its please must can cannot may does do has have need needs required requires requirement only provided invalid valid missing unknown unsupported unavailable accessible access denied forbidden unauthorized authentication authenticated authorization api key token credential credentials endpoint endpoints request requests response responses organization organizations company companies customer customers found find domain data empty result results error errors message code status success failed failure plan free paid premium upgrade subscription work email verified verification connect connected account billing credit credits rate limit limited exceeded remaining reset resets retry after second seconds minute minutes hour day daily month monthly maximum insufficient exhausted enabled disabled search enrichment enrich contact administrator support permission permissions available redacted non diagnostic text value company domain').split(/\s+/));
function safeText(value,key=''){
 if(typeof value==='number'&&Number.isFinite(value)||typeof value==='boolean')return value;
 if(typeof value!=='string')return '[redacted non-diagnostic value]';
 let text=value.slice(0,1000);if(key)text=text.split(key).join('[redacted]');
 text=text.replace(/\b(?:sk-[\w-]+|gh[pousr]_[\w]+)\b/gi,'[redacted]').replace(/Bearer\s+\S+/gi,'[redacted]').replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g,'[redacted]').replace(/\+?\d[\d ().-]{7,}\d/g,'[redacted]').replace(/https?:\/\/\S+/g,'[redacted]');
 if((text.toLowerCase().match(/[a-z]+/g)||[]).some(word=>!WORDS.has(word)))return '[redacted non-diagnostic text]';
 return text.replace(/[\r\n\t]+/g,' ').slice(0,400);
}
function errorFields(payload,key,depth=0){
 if(depth>3||!payload||typeof payload!=='object')return {};
 const result={};for(const [name,value]of Object.entries(payload).slice(0,100)){
  if(!/error|message|^(?:code|reason|description)$/i.test(name)||! /^[A-Za-z_][A-Za-z0-9_]{0,79}$/.test(name)||(key&&name.includes(key)))continue;
  if(Array.isArray(value))result[name]=value.slice(0,5).map(v=>v&&typeof v==='object'?errorFields(v,key,depth+1):safeText(v,key));
  else result[name]=value&&typeof value==='object'?errorFields(value,key,depth+1):safeText(value,key);
 }return result;
}
function responseDiagnostics(payload,{headers,status,key=''}={}){
 const keptHeaders={};for(const [name,value]of headers||[]){
  if(!/(?:rate[-_]?limit|credit|^retry-after$)/i.test(name)||/key|authorization|cookie|person|contact|email|phone/i.test(name)||(key&&name.includes(key)))continue;
  if(Object.keys(keptHeaders).length>=30)break;keptHeaders[name]=(!key||!value.includes(key))&&/^[0-9.,;:= +\-]+$/.test(value)?value.slice(0,400):safeText(value,key);
 }
 const fields=errorFields(payload,key),rawText=[];
 const collect=(obj,depth=0)=>{if(!obj||typeof obj!=='object'||depth>3)return;for(const[name,value]of Object.entries(obj).slice(0,100)){if(!/error|message|^(?:code|reason|description)$/i.test(name))continue;if(typeof value==='string')rawText.push(value);else if(value&&typeof value==='object')collect(value,depth+1);}};collect(payload);
 const text=rawText.join(' ').toLowerCase(),notFound=/not[ _-]?found|no (?:matching )?organization|could not find/.test(text);
 const hasError=!!(payload?.error||payload?.error_code||(Array.isArray(payload?.errors)&&payload.errors.length)||payload?.status==='error');
 const refusal=/access.*denied|not.*accessible|forbidden|unauthorized|invalid.*key|work.*email|upgrade|insufficient|permission.*required/.test(text)||Boolean((text.trim()||hasError)&&!notFound);
 const creditUsage={};for(const field of ['credits_used','credits_consumed','paid_credits_used','cost_usd']){const value=payload?.[field]??payload?.usage?.[field];if(typeof value==='number'&&Number.isFinite(value)&&value>=0)creditUsage[field]=value;}
 return {httpStatus:Number.isInteger(status)?status:null,topLevelKeys:payload&&typeof payload==='object'&&!Array.isArray(payload)?Object.keys(payload).slice(0,100).map(name=>(!key||!name.includes(key))&&/^[A-Za-z_][A-Za-z0-9_]{0,79}$/.test(name)?name:'[redacted key]'):[],errorFields:fields,headers:keptHeaders,refusal,notFound,creditUsage};
}
function companyOnly(raw={},key=''){
 const safe=value=>typeof value==='string'&&(!key||!value.includes(key))&&!/@|\bsk-[\w-]+|\+?\d[\d ().-]{7,}\d/.test(value)?value.slice(0,300):'';
 const row={};for(const name of ['name','primary_domain','website_url','industry','country'])if(raw&&typeof raw[name]==='string')row[name]=safe(raw[name]);
 if(Number.isFinite(raw?.estimated_num_employees)&&raw.estimated_num_employees>=0)row.estimated_num_employees=raw.estimated_num_employees;
 const technologies=raw?.technology_names||raw?.current_technologies?.map(t=>t.name);if(Array.isArray(technologies))row.technology_names=technologies.map(safe).filter(Boolean).slice(0,30);
 return row;
}
function companyResponse(payload,key=''){return {...(payload?.organization?{organization:companyOnly(payload.organization,key)}:{}),...(Array.isArray(payload?.organizations)?{organizations:payload.organizations.map(row=>companyOnly(row,key))}:{})};}
module.exports={responseDiagnostics,companyResponse,safeText};
