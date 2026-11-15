'use strict';
const {draftSchema,draftPlaybook,receiptsForWorkspace}=require('../playbook.cjs');
const {buildEvidencePacket,validateKnownReceiptIds,expandRunLocalReceiptIds}=require('./synthesize.cjs');
const {sourceSetHash}=require('./validate.cjs');
const {modelForPurpose,serializeRequestBody,estimatedUsage}=require('../llm.cjs');
function buildPlaybookResearchRequest(state,workspaceId,env={}){
 const w=state.workspaces[workspaceId];if(!w||w.status==='archived')throw Error('Choose an active seller workspace.');
 const evidence=buildEvidencePacket(state,w),schema={...draftSchema(),$defs:{receiptId:{type:'string',enum:evidence.receiptIds}}};require('../openai-schema.cjs').assertStructuredOutputSchemaWithinLimits(schema);
 const request={workspaceId,model:modelForPurpose(env,'icp_targeting'),name:'whynow_seller_playbook',promptVersion:'seller-playbook-grounded-v1',maxOutputTokens:8000,reasoningEffort:'low',schema,messages:[{role:'system',content:'Produce only a seller timing playbook from the supplied saved seller evidence. Propose economic-buyer, champion and end-user job titles, source-specific triggers with keywords, windows of 7–180 days, strength and a non-factual message angle. Each trigger and anti-trigger requires supplied receiptIds. Include at least one strong trigger. No invented companies, people, metrics or contact data. These policies are editable proposals, never approvals. Do not alter fit gates, tiering or Act now eligibility.'},{role:'user',content:JSON.stringify({seller:{name:w.sellerProfile.sellerName||w.sellerProfile.name||w.name,domain:w.sellerProfile.domain},evidence:JSON.parse(evidence.serialized)})}],validate:value=>validateKnownReceiptIds(value,evidence.receiptIds)};
 const serialized=serializeRequestBody({model:request.model,messages:request.messages,schema,name:request.name,maxOutputTokens:8000,reasoningEffort:'low'}),usage=estimatedUsage({bodyBytes:Buffer.byteLength(serialized),maxOutputTokens:8000,model:request.model});
 return {request,receiptIdMap:evidence.receiptIdMap,guard:{profileRevision:w.profileRevision||0,playbookVersion:w.sellerProfile.playbook?.version||0,sourceSetHash:sourceSetHash(state,w)},estimate:{model:request.model,inputTokens:usage.inputTokens,maxOutputTokens:8000,maximumCostUsd:usage.reserveMicros/1e6}};
}
function saveGeneratedPlaybook(state,workspaceId,value,built,now=new Date().toISOString()){
 const w=state.workspaces[workspaceId],g=built.guard;if(!w||w.status==='archived'||Number(w.profileRevision||0)!==g.profileRevision||Number(w.sellerProfile.playbook?.version||0)!==g.playbookVersion||sourceSetHash(state,w)!==g.sourceSetHash)throw Error('The seller, receipts or playbook changed during generation.');
 const raw=expandRunLocalReceiptIds(value,built.receiptIdMap),next=structuredClone(state),playbook=draftPlaybook(raw,receiptsForWorkspace(state,w),now,g.playbookVersion+1);next.workspaces[workspaceId].sellerProfile.playbook=playbook;next.auditLog.push({schemaVersion:1,type:'playbook_generated',workspaceId,occurredAt:now,playbookVersion:playbook.version,model:built.request.model,promptVersion:built.request.promptVersion});return next;
}
module.exports={buildPlaybookResearchRequest,saveGeneratedPlaybook};
