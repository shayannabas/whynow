import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {defaultState,createWorkspace,updateWorkspace}=require('../scripts/server/state.cjs');
const {recordSource}=require('../scripts/sources.cjs');
const {extractOrganizationCandidates}=require('../scripts/onboarding/extract-organizations.cjs');

const NOW='2026-10-20T00:00:00.000Z';
function fixture(){
  let state=createWorkspace(defaultState(),{name:'Example Seller'}),id=state.activeWorkspaceId;const sources=[],raw=new Map();
  const pages=[
    {url:'https://example.com/customers',title:'Customers',kind:'seller_customer_page',text:'Customer stories Acme Corp',html:'<html><title>Customers</title><a href="/customers/acme"><img alt="Acme Corp"></a><a href="/customers/logo-only"><img alt="Logo-only Customer"></a></html>'},
    {url:'https://example.com/customers/acme',title:'How Acme Corp uses Example Seller',kind:'seller_customer_page',text:'How Acme Corp uses Example Seller. Acme Corp improved its workflow.',html:'<html><title>How Acme Corp uses Example Seller</title><h1>How Acme Corp uses Example Seller</h1><p>Acme Corp improved its workflow.</p><a href="https://acme.com/">Acme Corp</a></html>'},
    {url:'https://example.com/customers/beta',title:'Beta customer story',kind:'seller_customer_page',text:'Beta uses Example Seller for production work.',html:'<html><title>Beta customer story</title><h1>Beta uses Example Seller for production work</h1></html>'},
    {url:'https://example.com/compare/example-seller-vs-rivalco',title:'Example Seller vs RivalCo',kind:'seller_site',text:'Example Seller vs RivalCo. Compare Example Seller with RivalCo.',html:'<html><title>Example Seller vs RivalCo</title><h1>Example Seller vs RivalCo</h1><a href="https://rivalco.com/">RivalCo</a></html>'}
  ];
  for(const page of pages){const saved=recordSource(state,{url:page.url,title:page.title,text:page.text,fetchedAt:NOW});state=saved.state;sources.push({schemaVersion:1,sourceId:saved.source.id,url:page.url,title:page.title,fetchedAt:NOW,kind:page.kind,ownerDomain:'example.com',chars:page.text.length});raw.set(page.url,{url:page.url,text:page.html});}
  state=updateWorkspace(state,id,w=>{w.research={schemaVersion:1,status:'evidence_ready',revision:1,runId:'run',selectedCandidate:{name:'Example Seller',domain:'example.com',website:'https://example.com'},sources};});
  return {state,id,raw};
}

it('extracts first-party customers and competitors, preserves evidence, and never guesses missing domains',()=>{
  const f=fixture(),result=extractOrganizationCandidates({state:f.state,workspace:f.state.workspaces[f.id],rawPages:f.raw});
  expect(result.rawHtml).toEqual({available:true,pagesMatched:4,sources:4});
  expect(result.customers).toContainEqual(expect.objectContaining({name:'Acme Corp',domain:'acme.com',domainStatus:'verified',status:'confirmed_candidate',sourceUrl:'https://example.com/customers/acme'}));
  expect(result.customers).toContainEqual(expect.objectContaining({name:'Beta',domain:'',domainStatus:'domain_missing'}));
  expect(result.customers).toContainEqual(expect.objectContaining({name:'Logo Only',domain:'',domainStatus:'domain_missing',status:'uncertain_candidate',quoteOrigin:'raw_html_alt'}));
  expect(result.competitors).toContainEqual(expect.objectContaining({name:'RivalCo',domain:'rivalco.com',domainStatus:'verified',sourceUrl:'https://example.com/compare/example-seller-vs-rivalco'}));
  expect(result.customers.every(item=>item.sourceUrl.startsWith('https://example.com/'))).toBe(true);
});

it('skips logo-alt extraction when raw HTML is unavailable while retaining URL/title extraction',()=>{
  const f=fixture(),result=extractOrganizationCandidates({state:f.state,workspace:f.state.workspaces[f.id],rawPages:new Map()});
  expect(result.rawHtml).toEqual({available:false,pagesMatched:0,sources:4});
  expect(result.customers.some(item=>item.name==='Logo Only')).toBe(false);
  expect(result.customers.some(item=>item.name==='Acme Corp')).toBe(true);
  expect(result.customers.find(item=>item.name==='Acme Corp').domainStatus).toBe('domain_missing');
});

it('uses a matching outbound host when a generic link label does not repeat the organization name',()=>{
  const f=fixture();
  const url='https://example.com/compare/example-seller-vs-rivalco';
  f.raw.set(url,{url,text:'<html><title>Example Seller vs RivalCo</title><h1>Example Seller vs RivalCo</h1><a href="https://rivalco.com/">Visit website</a></html>'});
  const result=extractOrganizationCandidates({state:f.state,workspace:f.state.workspaces[f.id],rawPages:f.raw});
  expect(result.competitors).toContainEqual(expect.objectContaining({name:'RivalCo',domain:'rivalco.com',domainStatus:'verified'}));
});
