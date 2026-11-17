'use strict';

const {esc,stableId}=require('../utils.cjs');
const personaKey=person=>stableId(JSON.stringify([person.name,person.title,person.linkedinUrl]));
const {contactReady,linkedinPeopleSearch,personaTitles,playbookTitles,savedPersonas}=require('../collectors/apollo-people.cjs');

function personaPanel(workspace,account){
  const approved=personaTitles(workspace,account),fallback=approved.length?approved:playbookTitles(workspace);
  const personas=savedPersonas(account),accountPath='/accounts/'+encodeURIComponent(account.id);
  const hidden=`<input type="hidden" name="workspaceId" value="${esc(workspace.id)}">`;
  const eligible=approved.length&&!account.kills?.length&&account.killStatus!=='killed'&&!account.identityReviewReason&&account.discoveryQuality?.isValidTargetAccount!==false;
  const form=eligible?`<form method="post" action="${accountPath}/personas">${hidden}<button class="ss-btn primary">Find personas</button></form>`:'';
  const cards=personas.map(person=>`<article class="work-persona"><h3>${esc(person.name)}</h3><p>${esc(person.title)}</p>${person.linkedinUrl?`<a href="${esc(person.linkedinUrl)}" target="_blank" rel="noopener noreferrer">Open LinkedIn ↗</a>`:'<p class="muted">LinkedIn unavailable</p>'}
    ${approved.includes(person.matchedRole)?`<form method="post" action="${accountPath}/drafts/persona" class="v2-persona-form">${hidden}<input type="hidden" name="personaKey" value="${personaKey(person)}"><label>Sender first name<input name="senderFirstName" pattern="[a-zA-Z]+" maxlength="60" required></label><button class="ss-btn">Create copy-only draft</button></form>`:''}</article>`).join('');
  const search=fallback.map(role=>`<li><span>${esc(role)}</span><a href="${esc(linkedinPeopleSearch(account.name,role))}" target="_blank" rel="noopener noreferrer">Search on LinkedIn ↗</a></li>`).join('');
  return `<div class="brief-single"><section class="panel v2-personas"><div class="work-section-head"><h2>Personas</h2><span class="ss-badge ${contactReady(account)?'ready':'review'}">${contactReady(account)?'Ready':'Missing'}</span></div>
    <div class="v2-actions">${form}</div>
    <p>${approved.length?'Apollo search uses the approved buyer roles for this ICP. It is disabled by default.':'Approve the matched ICP and playbook to enable Apollo persona search.'}</p>
    ${cards?`<div class="work-personas">${cards}</div>`:'<p class="ss-empty">No personas saved for this account.</p>'}
    ${search?`<h3>Buyer roles</h3><ul class="v2-role-list">${search}</ul>`:''}</section></div>`;
}

module.exports={personaPanel,personaKey};
