'use strict';
// Pure preparation only: this module has no provider client or execution command.
const proposal=require('../config/vercel-final-verification-proposal.json');
const {approvedPlaybook,validatePlaybook}=require('./playbook.cjs');
const {sourceNotes}=require('./playbook-sources.cjs');
function prepareFinalVerification(state,{proposal:settings=proposal}={}){
 const w=Object.values(state.workspaces).find(row=>row.sellerProfile?.domain===settings.sellerDomain);if(!w)throw Error('Seller workspace not found.');
 const blockers=[];if(w.status!=='active'||!w.sellerProfile.approvedAt)blockers.push('Seller profile requires owner approval.');
 if(!approvedPlaybook(w))blockers.push('Playbook requires owner approval; this batch must not use the legacy fallback.');
 const seeds=settings.customerOrder.map(seed=>{const row=w.sellerProfile.customers?.find(c=>c.name.toLowerCase()===seed.name.toLowerCase()),confirmed=!!row&&row.domain===seed.domain;if(!confirmed&&!seed.optional)blockers.push(`Owner must confirm ${seed.name} → ${seed.domain} in the approved profile.`);return {...seed,approvedCustomer:!!row,confirmedDomain:confirmed,currentDomain:row?.domain||null};});
 const p=w.sellerProfile.playbook,news=(p?.triggers||[]).filter(t=>t.source==='news'),terms=[...new Set(news.flatMap(t=>t.keywords.slice(0,6)))];
 const queryTemplate='"<account name>" ('+terms.map(term=>'"'+String(term).replace(/["\r\n]/g,' ')+'"').join(' OR ')+')';
 return {...structuredClone(settings),workspaceId:w.id,profileRevision:w.profileRevision,playbookVersion:p?.version||0,authorizationRequired:true,readyToRun:false,prerequisitesSatisfied:blockers.length===0,blockers,seeds,firstCustomer:seeds[0],playbookWarnings:p?validatePlaybook(p,p.receipts,w):[],sourceNotes:p?sourceNotes(p):[],queryTemplate,execution:{reuseStepA:true,recordEachLookup:true,continueNotFound:true,stopAllHttpErrors:true,autoConfirmDomains:false,autoApprove:false,retainKillsAndRejections:true,noNewFitGate:true,templatesOnly:true},freeSourceMaxRequests:Object.values(settings.freeSourceCaps).reduce((n,v)=>n+v,0)};
}
function assertFinalReady(prepared,{ownerAuthorized=false}={}){if(!ownerAuthorized)throw Error('A new explicit owner OK is required; the previous batch is exhausted.');if(prepared.blockers.length)throw Error(prepared.blockers.join(' '));return true;}
if(require.main===module){const {loadState}=require('./server/state.cjs');if(process.argv[2]!=='--prepare')throw Error('Preparation only. No live execution command is authorized.');console.log(JSON.stringify(prepareFinalVerification(loadState()),null,2));}
module.exports={prepareFinalVerification,assertFinalReady};
