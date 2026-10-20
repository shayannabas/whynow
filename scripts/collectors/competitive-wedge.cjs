'use strict';

const {signal,stripHtml,unique}=require('./common.cjs');

function extractVerifiedCustomers(html='',customerNames=[]){const text=stripHtml(html).toLowerCase();return (customerNames||[]).filter(name=>text.includes(String(name).toLowerCase()));}
function customerDiff(previous=[],current=[]){const before=new Set(previous.map(name=>name.toLowerCase())),after=new Set(current.map(name=>name.toLowerCase()));return {added:current.filter(name=>!before.has(name.toLowerCase())),removed:previous.filter(name=>!after.has(name.toLowerCase()))};}
function mapWedge(target,verifiedCustomers,observedAt,config={}){
  const segment=target.segment||target.icpSegment,segmentConfig=target.segmentConfig||target.resolveSegmentConfig||config.segments?.[segment]||{},configured=segmentConfig.wedgeCustomers||[],verified=configured.filter(name=>verifiedCustomers.some(customer=>customer.toLowerCase()===name.toLowerCase()));
  if(!verified.length||!config.customerSourceUrl)return undefined;
  const relationship=segment==='sports_betting'?'category twin: real-time, regulated, money-moving':'direct rival or category peer';
  return signal({key:'competitiveWedge',score:relationship.startsWith('direct')?5:4,evidenceUrl:config.customerSourceUrl,evidenceText:`${verified.join(' / ')} ${verified.length===1?'is':'are'} verified on ${config.sellerLabel||'the seller'}'s customer page. Nearest relationship for ${target.name}: ${relationship}.`,observedAt,sourceId:config.customerSourceId||'seller_customers',inferred:relationship.startsWith('category twin'),metadata:{wedgeCustomers:verified,relationship}});
}
async function collectCompetitiveWedge(target,context={}){
  const config=context.collectorConfig||{},url=config.customerSourceUrl;
  if(!url)return {collectorId:'competitive_wedge',signals:[],events:[],killHints:[],targetPatch:{},verifiedCustomers:[],customerDiff:{added:[],removed:[]},itemsFound:0,status:'no_customer_source'};
  const {value}=await context.runtime.requestPublicText(url,'seller_customers',{allowedRedirectDomain:new URL(url).hostname.replace(/^www\./,'')});
  const verified=extractVerifiedCustomers(value,config.customerNames||[]),observedAt=(context.now||new Date()).toISOString(),wedge=mapWedge(target,verified,observedAt,config),normalized=String(target.name||'').toLowerCase(),existing=verified.find(name=>name.toLowerCase()===normalized),killHints=existing?[{code:'KILL_EXISTING_CUSTOMER',evidenceUrl:url,evidenceText:`${existing} is verified on ${config.sellerLabel||'the seller'}'s customer page.`}]:[];
  return {collectorId:'competitive_wedge',signals:wedge?[wedge]:[],events:[],killHints,targetPatch:{sellerCustomersVerifiedAt:observedAt},verifiedCustomers:unique(verified),customerDiff:customerDiff(context.previousCustomers||[],verified),itemsFound:(wedge?1:0)+killHints.length};
}
module.exports={collectCompetitiveWedge,customerDiff,extractVerifiedCustomers,mapWedge};
