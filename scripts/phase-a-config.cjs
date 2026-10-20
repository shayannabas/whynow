'use strict';

const {normalizedEntityName,rootDomain}=require('./entity-rules.cjs');
const SOURCE_KILL_PRECEDENCE=['KILL_EXISTING_CUSTOMER','KILL_UNSELLABLE_ORG','KILL_SOLVING_IN_HOUSE','KILL_BUILD_CULTURE','KILL_BELOW_ICP_SIZE'];

function organizationRows(values=[]){return (values||[]).map(value=>typeof value==='string'?{name:value}:value).filter(value=>value?.name);}
function scoringAllowed(workspace={}) {
  const reference=workspace.referenceDemo?.loadOnly===true;
  const approved=workspace.status==='active'&&Boolean(workspace.sellerProfile?.approvedAt);
  if(!reference&&!approved)throw new Error('Scoring requires an owner-approved profile or the frozen load-only reference demo.');
  return reference?'frozen_reference':'owner_approved';
}
function phaseAConfigForWorkspace(workspace={}) {
  const configSource=scoringAllowed(workspace),icpConfig=workspace.icpConfig||{},reference=workspace.referenceDemo||{},sellerProfile=workspace.sellerProfile||{};
  const referenceCustomers=organizationRows(reference.existingCustomers||icpConfig.exclusions?.existingCustomers||[]);
  const customers=referenceCustomers.length?referenceCustomers:organizationRows(sellerProfile.customers);
  const competitors=organizationRows(sellerProfile.competitors||icpConfig.exclusions?.competitors||[]);
  const sellerName=String(sellerProfile.sellerName||sellerProfile.name||reference.sellerName||workspace.name||'Seller').trim();
  return {
    configSource,
    seller:{name:sellerName,label:String(reference.sellerLabel||icpConfig.exclusions?.sellerLabel||sellerName),domain:rootDomain(sellerProfile.domain||reference.sellerDomain)},
    scoring:{version:icpConfig.scoring?.version||'resolve-scoring-priority-v2',weights:icpConfig.weights||icpConfig.scoring?.weights||{},liveTriggerDays:icpConfig.scoring?.liveTriggerDays||90},
    tierRules:icpConfig.tierRules||{},
    decisionRules:icpConfig.decisionRules||{},
    killPatterns:icpConfig.killPatterns||{},
    killPrecedence:Array.from(new Set([...(icpConfig.killRules?.precedence||SOURCE_KILL_PRECEDENCE),icpConfig.killRules?.whyNowExtension||'KILL_SELLER_OR_COMPETITOR'])),
    customers:customers.map(row=>({name:row.name,domain:rootDomain(row.domain),sourceUrl:row.sourceUrl||reference.customerSourceUrl||icpConfig.exclusions?.customerSourceUrl||''})),
    competitors:competitors.map(row=>({name:row.name,domain:rootDomain(row.domain),sourceUrl:row.sourceUrl||''})),
    entityRules:icpConfig.entityRules||[],
    signalDefinitions:icpConfig.signalDefinitions||{},
    personas:icpConfig.personas||{},
    segments:icpConfig.segments||[],
    slaDays:icpConfig.slaDays||{},
    themeBBoost:icpConfig.decisionRules?.themeBBoost||{enabled:true,multiplier:1.08},
  };
}
function organizationMatch(account={},row={}) {
  const accountName=normalizedEntityName(account.name),rowName=normalizedEntityName(row.name),accountDomain=rootDomain(account.domain||account.website),rowDomain=rootDomain(row.domain);
  return Boolean((accountName&&rowName&&accountName===rowName)||(accountDomain&&rowDomain&&accountDomain===rowDomain));
}
module.exports={SOURCE_KILL_PRECEDENCE,organizationMatch,phaseAConfigForWorkspace,scoringAllowed};
