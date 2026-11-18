'use strict';

const {esc,stableId}=require('../utils.cjs');
const {contactReady,personaTitles,personaRole,searchPaths,savedPersonas}=require('../collectors/apollo-people.cjs');
const {matchedIcp}=require('../icps.cjs');
const {draftsForAccount}=require('../outreach-drafts.cjs');
const {link}=require('./results.cjs');

const personaKey=person=>stableId(JSON.stringify([person.name,person.title,person.linkedinUrl]));
function inlineDraft(draft){
  if(!draft)return '';
  return `<section class="v21-persona-draft"><div class="v2-actions"><b>${esc(draft.subject)}</b><span class="ss-badge evidence">No send path</span></div><p class="v21-draft-body">${esc(draft.body)}</p><button class="ss-btn" type="button" data-copy="${esc('Subject: '+draft.subject+'\n\n'+draft.body)}">Copy</button><ul>${draft.evidenceRefs.map((url,index)=>`<li>${link(url,index===0?'Trigger receipt':'Seller receipt')}</li>`).join('')}</ul></section>`;
}

function personaPanel(workspace,account){
  const approved=personaTitles(workspace,account),icp=matchedIcp(workspace,account);
  const personas=savedPersonas(account),accountPath='/accounts/'+encodeURIComponent(account.id),drafts=draftsForAccount(workspace,account.id);
  const hidden=`<input type="hidden" name="workspaceId" value="${esc(workspace.id)}">`;
  const eligible=approved.length&&!account.kills?.length&&account.killStatus!=='killed'&&!account.identityReviewReason&&account.discoveryQuality?.isValidTargetAccount!==false;
  const form=eligible?`<form method="post" action="${accountPath}/personas">${hidden}<button class="ss-btn primary">Find personas</button></form>`:'';
  const cards=personas.map(person=>{
    const key=personaKey(person),role=personaRole(workspace,person.matchedRole);
    const draft=drafts.find(item=>item.personaKey===key&&item.validation?.ok);
    return `<article class="work-persona v21-person"><div class="v21-person-head"><div><h3>${esc(person.name)}</h3><p>${esc(person.title)}</p></div>${link(person.linkedinUrl,'Open LinkedIn ↗')}</div>
      <span class="ss-badge evidence">${esc(role)}</span><p class="muted">Matches ${esc(person.matchedRole||'a buyer role')}${icp?' for '+esc(icp.name):''}.</p>
      ${eligible&&approved.includes(person.matchedRole)?`<form method="post" action="${accountPath}/drafts/persona" class="v2-persona-form">${hidden}<input type="hidden" name="personaKey" value="${key}"><button class="ss-btn">Create draft</button></form>`:''}
      ${inlineDraft(draft)}</article>`;
  }).join('');
  const search=searchPaths(workspace,account).map(path=>`<li><span>${esc(path.title)}</span>${link(path.url,'Search on LinkedIn ↗')}</li>`).join('');
  return `<div class="brief-single"><section class="panel v2-personas"><div class="v21-person-head"><h2>Personas</h2><div class="v2-actions"><span class="ss-badge ${contactReady(account)?'ready':'review'}">${contactReady(account)?'Ready':'Search path'}</span>${form}</div></div>
    ${cards?`<div class="work-personas v21-person-list">${cards}</div>`:''}
    <h3>Buyer roles</h3><ul class="v2-role-list">${search}</ul></section></div>`;
}

module.exports={personaPanel,personaKey};
