import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const {defaultState,createWorkspace,updateWorkspace}=require('../scripts/server/state.cjs');
const {recordSource}=require('../scripts/sources.cjs');
const {buildResearchEvidence,buildReceiptEvidence,MAX_EVIDENCE_PACKET_BYTES}=require('../scripts/onboarding/validate.cjs');

const NAV='Skip to content Copy Wordmark Copy Logo Download Brand Assets Brand Guidelines Get a Demo Log In Sign Up. ';
const SAVED_PAGE_EXCERPTS=[
  {
    url:'https://resolve.ai/customers',title:'Customer | ResolveAI',kind:'seller_customer_page',
    text:'Customer stories Powering Uninterrupted Ads for DoorDash Advertisers. Angelo Marletta, Software Engineer at Coinbase, said ResolveAI identified dependencies and surfaced accurate root causes 72% faster.'
  },
  {
    url:'https://resolve.ai/glossary/pagerduty-sre-agent-vs-resolve-ai',title:'PagerDuty SRE Agent vs. Resolve AI: Which Do You Need?',kind:'seller_site',
    text:'PagerDuty is an AI ops platform for incident management, built to run the process around failures. It turns alert storms into routed incidents and runs the fixes you have already automated.'
  },
  {
    url:'https://www.shopify.com/case-studies',title:'Shopify Case Studies | Why the Best Brands Choose Shopify',kind:'seller_customer_page',
    text:'Showing all 615 case studies. Yoggies migrated around 500,000 historical orders to Shopify with no data loss, while also switching ERP and moving warehouses.'
  },
  {
    url:'https://www.shopify.com/compare/shopify-vs-bigcommerce',title:'Shopify vs. BigCommerce: Commerce is bigger with Shopify',kind:'seller_site',
    text:'Shopify vs. BigCommerce compares enterprise commerce features, pricing, checkout, and international selling for growing brands.'
  },
  {
    url:'https://vercel.com/customers',title:'Customers | Vercel',kind:'seller_customer_page',
    text:'Customer stories include how Rogo ships agent-written code to production in 5 minutes and how Sensay went from zero to product in six weeks.'
  },
  {
    url:'https://domains.vercel.com/kb/comparisons',title:'Comparisons | Vercel Knowledge Base',kind:'seller_site',
    text:'Side-by-side comparisons cover Vercel vs Cloudflare, Vercel vs Netlify, Vercel vs Webflow Cloud, Vercel vs Kubernetes, and running Docker on Vercel vs Render.'
  }
];

function preparedState(rows=SAVED_PAGE_EXCERPTS) {
  let state=createWorkspace(defaultState(),{name:'Evidence packet test'}),id=state.activeWorkspaceId;
  const refs=[];
  for(const [index,row] of rows.entries()) {
    const saved=recordSource(state,{url:row.url,title:row.title,text:`${NAV.repeat(80)} ${row.text}`,fetchedAt:'2026-10-19T12:00:00.000Z'});
    state=saved.state;
    refs.push({schemaVersion:1,sourceId:saved.source.id,url:row.url,title:row.title,kind:row.kind,ownerDomain:new URL(row.url).hostname.replace(/^www\./,''),chars:saved.source.text.length,bytes:Buffer.byteLength(saved.source.text),order:index});
  }
  state=updateWorkspace(state,id,workspace=>{
    workspace.research={schemaVersion:1,status:'evidence_ready',sources:refs,selectedCandidate:{name:'Evidence packet test',domain:'example.com'}};
  });
  return {state,workspace:state.workspaces[id]};
}

function receiptText(evidence,url) {
  return evidence.sources.find(source=>source.url===url)?.receipts.map(receipt=>receipt.text).join(' ')||'';
}

describe('priority-weighted evidence packet',()=>{
  it('brings customer and competitor names from saved final-run page excerpts into the receipt menu',()=>{
    const {state,workspace}=preparedState(),evidence=buildReceiptEvidence(state,workspace);
    const expected=new Map([
      ['https://resolve.ai/customers',['DoorDash','Coinbase']],
      ['https://resolve.ai/glossary/pagerduty-sre-agent-vs-resolve-ai',['PagerDuty']],
      ['https://www.shopify.com/case-studies',['Yoggies']],
      ['https://www.shopify.com/compare/shopify-vs-bigcommerce',['BigCommerce']],
      ['https://vercel.com/customers',['Rogo','Sensay']],
      ['https://domains.vercel.com/kb/comparisons',['Cloudflare','Netlify','Webflow Cloud','Kubernetes','Render']]
    ]);

    for(const [url,names] of expected) {
      const text=receiptText(evidence,url).toLowerCase();
      for(const name of names)expect(text,`${name} should be in receipts for ${url}`).toContain(name.toLowerCase());
    }
    expect(evidence.serialized.toLowerCase()).not.toContain('copy wordmark');
    expect(Buffer.byteLength(evidence.serialized)).toBeLessThanOrEqual(MAX_EVIDENCE_PACKET_BYTES);
    expect(MAX_EVIDENCE_PACKET_BYTES).toBe(120000);
  });

  it('assigns a larger excerpt budget to customer and comparison pages than generic pages',()=>{
    const rows=[
      {url:'https://example.com/customers/acme',title:'Acme customer story',kind:'seller_customer_page',text:'Acme is a customer. '.repeat(2000)},
      {url:'https://example.com/compare/example-vs-rival',title:'Example vs Rival',kind:'seller_site',text:'Example vs Rival comparison. '.repeat(2000)},
      {url:'https://example.com/pricing',title:'Pricing',kind:'seller_site',text:'The annual enterprise plan is priced per employee. '.repeat(2000)},
      {url:'https://example.com/about',title:'About',kind:'seller_site',text:'The company employs a global engineering team. '.repeat(2000)},
      {url:'https://example.com/blog/update',title:'Product update',kind:'seller_site',text:'The product update explains a feature. '.repeat(2000)}
    ];
    const {state,workspace}=preparedState(rows),byUrl=new Map(buildResearchEvidence(state,workspace).map(row=>[row.source.url,row.excerptBudgetBytes]));
    expect(byUrl.get(rows[0].url)).toBeGreaterThan(byUrl.get(rows[4].url));
    expect(byUrl.get(rows[1].url)).toBeGreaterThan(byUrl.get(rows[4].url));
    expect(byUrl.get(rows[2].url)).toBeGreaterThan(byUrl.get(rows[4].url));
    expect(byUrl.get(rows[3].url)).toBeGreaterThan(byUrl.get(rows[4].url));
  });

  it('never serializes more than the 120 KB packet ceiling under a 20-source stress case',()=>{
    const rows=Array.from({length:20},(_,sourceIndex)=>({
      url:`https://example.com/customers/company-${sourceIndex}`,
      title:`Company ${sourceIndex} customer story`,
      kind:'seller_customer_page',
      text:Array.from({length:250},(_,quoteIndex)=>`Customer Company ${sourceIndex} evidence item ${quoteIndex} reports improved revenue, pricing clarity, and engineering team productivity for enterprise buyers.`).join(' ')
    }));
    const {state,workspace}=preparedState(rows),evidence=buildReceiptEvidence(state,workspace),bytes=Buffer.byteLength(evidence.serialized);
    expect(bytes).toBeGreaterThan(100000);
    expect(bytes).toBeLessThanOrEqual(MAX_EVIDENCE_PACKET_BYTES);
  });
});
