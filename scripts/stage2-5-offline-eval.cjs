#!/usr/bin/env node
const fs=require('node:fs');
const path=require('node:path');
const {extractOrganizationCandidates,rawPageMap}=require('./onboarding/extract-organizations.cjs');
const {scoreOrganizationCandidates}=require('./onboarding/research-quality-eval.cjs');

const ROOT=path.resolve(__dirname,'..');
const STATE_FILE=path.join(ROOT,'.whynow','stage2-final-state.json');
const CACHE_DIR=path.join(ROOT,'.whynow','stage2-final-live-cache');
const FIXTURES=new Map([
  ['resolve.ai','resolve-ai-expected.json'],['shopify.com','shopify-expected.json'],['vercel.com','vercel-expected.json']
]);
function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function main(){
  const state=readJson(STATE_FILE),rawPages=rawPageMap([CACHE_DIR]),results=[];
  for(const workspace of Object.values(state.workspaces)) {
    const sellerDomain=workspace.research?.selectedCandidate?.domain,fixtureName=FIXTURES.get(sellerDomain);if(!fixtureName)continue;
    const fixture=readJson(path.join(ROOT,'tests','fixtures','eval',fixtureName));
    const candidates=extractOrganizationCandidates({state,workspace,rawPages});
    const provisional=scoreOrganizationCandidates(candidates,fixture,{includeUnconfirmed:true});
    const confirmed=scoreOrganizationCandidates(candidates,fixture);
    results.push({seller:fixture.seller,rawHtml:candidates.rawHtml,customers:candidates.customers,competitors:candidates.competitors,provisional,confirmed});
  }
  process.stdout.write(`${JSON.stringify({schemaVersion:1,generatedOffline:true,pageFetches:0,providerCalls:0,results},null,2)}\n`);
}
if(require.main===module)main();
module.exports={main};
