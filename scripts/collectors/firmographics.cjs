'use strict';

const free=require('../firmographics.cjs');
const wikidata=require('../wikidata-universe.cjs');
async function collectFirmographics(target,context={}){
  const now=context.now||new Date(),asOf=now instanceof Date?now.toISOString():new Date(now).toISOString(),searchRows=(context.searchResults||[]).filter(row=>String(row.kind||'').startsWith('firmographics')),sizingTarget={...target,...(target.firmographicTarget||{}),id:target.id};
  const searchProfile=free.parseSearchResults(sizingTarget,searchRows,asOf),report=await wikidata.collectSeedFirmographics({seeds:[sizingTarget],runtime:context.runtime,now}),wikidataProfile=report.profiles[0]?.profile||null,profile=free.mergeProfiles(searchProfile,wikidataProfile);
  return {collectorId:'firmographics',signals:[],events:[],killHints:[],targetPatch:{firmographics:profile,firmographicsConfidence:profile.confidenceLabel,firmographicEntity:{name:sizingTarget.name,domain:sizingTarget.domain,parentOf:target.firmographicTarget?.parentOf||'',receipt:profile.fields?.employeeCount?.sourceUrl||profile.fields?.revenueEstimate?.sourceUrl||profile.sources?.[0]||''}},itemsFound:Object.keys(profile.fields||{}).length,collectorErrors:report.errors};
}
module.exports={collectFirmographics};
