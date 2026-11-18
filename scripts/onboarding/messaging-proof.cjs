'use strict';

const {stableId,esc}=require('../utils.cjs');
const {rootDomain}=require('../entity-rules.cjs');

const text=value=>String(value||'').replace(/\s+/g,' ').trim();
const normalize=value=>text(value).normalize('NFKC').toLowerCase();
const words=value=>text(value).split(/\s+/).length;

function firstParty(source,domain){
  try{const url=new URL(source?.url);return url.protocol==='https:'&&!url.username&&!url.password&&rootDomain(url.href)===domain;}catch{return false;}
}
function candidates(state,workspace){
  const p=workspace.sellerProfile||{},domain=rootDomain(p.domain||workspace.onboarding?.selectedCandidate?.domain||'');
  if(!domain)return [];
  const out=[];
  const add=(kind,value,customer,evidence)=>{
    const source=state.sources[evidence?.sourceId],quote=text(value);
    if(evidence?.inferred!==false||!firstParty(source,domain)||quote.length<18||quote.length>240||!normalize(source.text).includes(normalize(quote)))return;
    const sourceId=source.id||evidence.sourceId,sourceUrl=source.url;
    out.push({id:stableId(JSON.stringify([kind,quote,sourceId,customer])),kind,value:quote,quote,customer,sourceId,sourceUrl,
      status:'needs_review',profileRevision:workspace.profileRevision});
  };
  const product=p.evidence?.productOneLiner||p.evidence?.oneLiner;
  if(product?.evidenceQuote&&/[.!?]$/.test(text(product.evidenceQuote)))add('product',product.evidenceQuote,'',product);
  for(const [index,evidence] of Object.entries(p.evidence||{})){
    if(!/^proofPoints\.\d+$/.test(index))continue;
    const source=state.sources[evidence.sourceId],title=text(source?.title);
    if(!firstParty(source,domain)||!new URL(source.url).pathname.startsWith('/customers/')||words(title)>15||!/[0-9]/.test(title))continue;
    const customer=p.customers?.find(row=>row.name&&normalize(title).replace(/^how /,'').startsWith(normalize(row.name)+' '))?.name;
    if(customer)add('customer_proof',title,customer,evidence);
  }
  return [...new Map(out.map(row=>[row.id,row])).values()];
}
function approvedMessaging(workspace){
  return (workspace.messagingProofs||[]).filter(row=>row.status==='approved'&&row.approvedAt&&row.profileRevision===workspace.profileRevision);
}
function approveMessaging(state,workspaceId,form,now=new Date().toISOString()){
  const workspace=state.workspaces[workspaceId];
  if(workspace?.status!=='active'||!workspace.sellerProfile?.approvedAt||String(workspace.profileRevision)!==form.get('profileRevision'))throw Error('Approve the current seller profile before reviewing messaging receipts.');
  const selected=new Set(form.getAll('proofId'));
  const proofs=candidates(state,workspace).filter(row=>selected.has(row.id));
  if(!form.has('acknowledged')||!selected.size||proofs.length!==selected.size)throw Error('Select the saved statements you reviewed and confirm their receipts.');
  workspace.messagingProofs=[...approvedMessaging(workspace).filter(row=>!selected.has(row.id)),...proofs.map(row=>({...row,status:'approved',approvedAt:now}))];
  state.auditLog.push({schemaVersion:1,type:'messaging_proof_approved',workspaceId,occurredAt:now,proofIds:[...selected],profileRevision:workspace.profileRevision});
  return state;
}
function messagingProofPanel(state,w){
  const rows=candidates(state,w);
  if(!rows.length)return '';
  const reviewed=new Set(approvedMessaging(w).map(row=>row.id));
  const item=row=>`<li><div><b>${esc(row.kind==='product'?'Product wording':row.customer)}</b> · ${reviewed.has(row.id)?'Approved':'Needs review'}<blockquote>${esc(row.quote)}</blockquote><a href="/sources/${encodeURIComponent(row.sourceId)}">Open saved receipt</a>
    ${!reviewed.has(row.id)&&w.status==='active'?`<label><input type="checkbox" name="proofId" value="${esc(row.id)}"> Approve this wording</label>`:''}</div></li>`;
  const hidden=`<input type="hidden" name="workspaceId" value="${esc(w.id)}"><input type="hidden" name="profileRevision" value="${esc(w.profileRevision)}">`;
  const canReview=w.status==='active'&&rows.some(row=>!reviewed.has(row.id));
  const list=`<ul class="v21-step-items">${rows.map(item).join('')}</ul>`;
  return `<section class="card panel" id="messaging-proof"><h2>Messaging proof points</h2><p>Review the saved wording before it can appear in email drafts.</p>
    ${canReview?`<form method="post" action="/onboarding/messaging/approve" class="v21-guide-form">${hidden}${list}<label><input type="checkbox" name="acknowledged" required> I checked the selected statements against their receipts.</label><button class="ss-btn primary">Approve selected wording</button></form>`:list}
    ${rows.some(row=>row.kind==='product'&&reviewed.has(row.id))?`<form class="v21-guide-form" method="post" action="/onboarding/messaging/templates">${hidden}<button class="ss-btn">Create Act now templates</button></form>`:''}</section>`;
}


function createActNowTemplates(state,workspaceId,profileRevision,now=new Date()){
  const w=state.workspaces[workspaceId];
  if(w?.status!=='active'||String(w.profileRevision)!==profileRevision||!approvedMessaging(w).some(row=>row.kind==='product'))throw Error('Approve the saved product wording before drafting.');
  const {todaySections}=require('../account-lifecycle.cjs');
  const {createTemplateDraft}=require('../outreach-drafts.cjs');
  const {senderFirstName}=require('../server/sender-settings.cjs');
  const accounts=todaySections(w,now).actNow,created=[],blocked=[];
  let next=state;
  for(const account of accounts){
    try{
      next=createTemplateDraft(next,workspaceId,account.id,{senderFirstName:senderFirstName(state),demoMergeField:'true'},{now:()=>now.toISOString()});
      created.push({name:account.name,id:account.id});
    }catch(error){
      if(error.code!=='DRAFT_BLOCKED')throw error;
      blocked.push({name:account.name,reason:error.message});
    }
  }
  return {state:next,created,blocked};
}

module.exports={createActNowTemplates,candidates,approvedMessaging,approveMessaging,messagingProofPanel};
