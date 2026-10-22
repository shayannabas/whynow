'use strict';

const {phaseAConfigForWorkspace}=require('./phase-a-config.cjs');
const {parentRuleForNamesAndDomains,rootDomain}=require('./entity-rules.cjs');

function mapSegments(rows=[]){
  return Object.fromEntries((rows||[]).filter(row=>row?.key).map(row=>[row.key,structuredClone(row)]));
}

function collectorConfigForWorkspace(workspace={}){
  const phaseA=phaseAConfigForWorkspace(workspace),icp=workspace.icpConfig||{},rules=icp.collectorRules||{};
  return {
    configSource:phaseA.configSource,
    sellerLabel:phaseA.seller.label,
    sellerDomain:phaseA.seller.domain,
    segments:mapSegments(phaseA.segments),
    enabledSegments:phaseA.segments.filter(row=>row.enabled!==false).map(row=>row.key),
    personas:structuredClone(phaseA.personas),
    signalDefinitions:structuredClone(icp.signalDefinitions||{}),
    triggerMapping:structuredClone(icp.triggerMapping||{}),
    painThemeConfig:structuredClone(rules.painThemes||{}),
    slaDays:structuredClone(phaseA.slaDays||{}),
    competitors:structuredClone(phaseA.competitors),
    entityRules:structuredClone(phaseA.entityRules||[]),
    customerNames:phaseA.customers.map(row=>row.name),
    customerSourceUrl:String(rules.customerSourceUrl||icp.exclusions?.customerSourceUrl||phaseA.customers.find(row=>row.sourceUrl)?.sourceUrl||''),
    customerSourceId:String(rules.customerSourceId||'seller_customers'),
    transactionalUrgency:structuredClone(rules.transactionalUrgency||{}),
    edgarSegmentQueries:structuredClone(rules.edgarSegmentQueries||{}),
  };
}

function collectorTargetForAccount(account={},collectorConfig={}){
  const segment=String(account.icpSegment||account.segment||'');
  const parent=parentRuleForNamesAndDomains([account.name],[account.domain||account.website],collectorConfig.entityRules||[]);
  const firmographicTarget=parent?{
    name:String(parent.canonicalName||account.name),
    domain:rootDomain(parent.domains?.[0]||account.domain||account.website),
    parentOf:String(account.name||''),
  }:{name:String(account.name||''),domain:rootDomain(account.domain||account.website),parentOf:''};
  return {
    ...structuredClone(account),
    segment,
    icpSegment:segment,
    segmentConfig:structuredClone(collectorConfig.segments?.[segment]||{}),
    buyerTitles:structuredClone(collectorConfig.personas?.buyerTitles||[]),
    championTitles:structuredClone(collectorConfig.personas?.championTitles||[]),
    triggerMapping:structuredClone(collectorConfig.triggerMapping||{}),
    competitors:structuredClone(collectorConfig.competitors||[]),
    aliases:Array.from(new Set([...(account.aliases||[]),...(parent?.aliases||[]),parent?.canonicalName].filter(Boolean))),
    firmographicTarget,
  };
}

module.exports={collectorConfigForWorkspace,collectorTargetForAccount,mapSegments};
