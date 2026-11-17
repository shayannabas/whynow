'use strict';
const {validatePlaybook,receiptsForWorkspace}=require('./playbook.cjs');
const {sourceNotes}=require('./playbook-sources.cjs');
function revalidateSavedPlaybook(state,id,{expectedVersion,now=new Date().toISOString()}={}){
 const w=state.workspaces[id],p=w?.sellerProfile?.playbook;if(!p||p.status!=='needs_review'||p.approvedAt)throw Error('Choose an existing unapproved playbook.');
 if(p.version!==expectedVersion)throw Error('The playbook version changed.');
 const warnings=validatePlaybook(p,receiptsForWorkspace(state,w),w),notes=sourceNotes(p),next=structuredClone(state),saved=next.workspaces[id].sellerProfile.playbook;
 saved.warnings=warnings;saved.notes=notes;saved.validationVersion='playbook-allowed-names-v2';saved.validatedAt=now;
 next.auditLog.push({schemaVersion:1,type:'playbook_revalidated_offline',workspaceId:id,occurredAt:now,actor:'system',playbookVersion:p.version,previousBlockingWarnings:p.warnings?.length||0,blockingWarnings:warnings.length,advisories:notes.length});return next;
}
module.exports={revalidateSavedPlaybook};
