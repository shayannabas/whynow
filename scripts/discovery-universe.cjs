'use strict';

const fs=require('node:fs');
const path=require('node:path');
const {rootDomain}=require('./entity-rules.cjs');

const RESOLVE_DISCOVERY_FILE=path.resolve(__dirname,'../config/reference-profiles/resolve-ai-discovery.json');

function validateDiscoveryReference(value={}){
  if(value.schemaVersion!==1||value.kind!=='load_only_discovery_reference'||value.sourceProject!=='flowfire'||!/^[a-f0-9]{40}$/.test(value.sourceCommit||'')||value.sourceFile!=='scripts/icp-universe.cjs')throw new Error('Invalid Resolve discovery reference header.');
  if(!value.segments||Array.isArray(value.segments))throw new Error('Invalid Resolve discovery segments.');
  for(const [segment,rows] of Object.entries(value.segments)){
    if(!segment||!Array.isArray(rows)||!rows.length)throw new Error('Invalid Resolve discovery segment.');
    for(const row of rows){
      if(!row?.name||!rootDomain(row.domain)||!row.subIndustry)throw new Error('Invalid Resolve discovery seed.');
    }
  }
  return true;
}

function loadResolveDiscoveryReference(file=RESOLVE_DISCOVERY_FILE){
  const value=JSON.parse(fs.readFileSync(file,'utf8'));validateDiscoveryReference(value);return structuredClone(value);
}

function seedsFromReference(reference=loadResolveDiscoveryReference()){
  return Object.entries(reference.segments).flatMap(([segment,rows])=>rows.map(row=>({
    schemaVersion:1,
    name:row.name,
    domain:rootDomain(row.domain),
    segment,
    subIndustry:row.subIndustry,
    sourceUrl:`https://${rootDomain(row.domain)}`,
    provenance:{kind:'signalscout_curated_seed',sourceFile:reference.sourceFile,sourceLines:reference.sourceLines,sourceCommit:reference.sourceCommit},
  })));
}

module.exports={RESOLVE_DISCOVERY_FILE,loadResolveDiscoveryReference,seedsFromReference,validateDiscoveryReference};
