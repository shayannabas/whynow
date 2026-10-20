'use strict';

const {loadReferenceProfile}=require('./onboarding/reference-profile.cjs');
const REFERENCE_WORKSPACE_ID='reference-demo-resolve-ai';
function loadResolveReferenceDemo(state,{now=()=>new Date().toISOString()}={}) {
  const next=structuredClone(state),reference=loadReferenceProfile();
  if(!next.workspaces[REFERENCE_WORKSPACE_ID]){
    next.workspaces[REFERENCE_WORKSPACE_ID]={schemaVersion:1,id:REFERENCE_WORKSPACE_ID,name:'Resolve AI · Reference demo',createdAt:now(),status:'reference_demo',deliveryMode:'demo',sellerProfile:{schemaVersion:1,name:reference.seller.name,domain:reference.seller.domain,website:reference.seller.website,approvedAt:null,deliveryAllowed:false,customers:[],competitors:[]},icpConfig:structuredClone(reference.icpConfig),referenceDemo:{loadOnly:true,referenceId:reference.id,referenceProfileVersion:reference.referenceProfileVersion,sellerName:reference.seller.name,sellerLabel:reference.icpConfig.exclusions.sellerLabel,sellerDomain:reference.seller.domain,existingCustomers:structuredClone(reference.icpConfig.exclusions.existingCustomers),customerSourceUrl:reference.icpConfig.exclusions.customerSourceUrl,sourceCommit:reference.provenance.sourceCommit},accounts:[],universeSeeds:[],runs:[],suppression:[],drafts:[],outcomes:[],budgets:{}};
    next.auditLog.push({schemaVersion:1,type:'reference_demo_loaded',workspaceId:REFERENCE_WORKSPACE_ID,occurredAt:now(),referenceProfileVersion:reference.referenceProfileVersion,sourceCommit:reference.provenance.sourceCommit});
  }
  next.activeWorkspaceId=REFERENCE_WORKSPACE_ID;
  return next;
}
module.exports={REFERENCE_WORKSPACE_ID,loadResolveReferenceDemo};
