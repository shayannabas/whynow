import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const require=createRequire(import.meta.url);
const {receiptQuality,receiptQuotes,sloganLike,vendorSeekingQuery,killLooksLikePain,workspaceQualityFindings}=require('../scripts/onboarding/validate.cjs');
const fixtureDir=path.join(path.dirname(fileURLToPath(import.meta.url)),'fixtures','onboarding');
const load=slug=>JSON.parse(fs.readFileSync(path.join(fixtureDir,`${slug}-live-icp.json`),'utf8'));
// Preserved verbatim from the owner-reviewed Vercel revision 1 snapshot. The
// live snapshot file now holds the final rerun, so this focused fixture keeps
// the real navigation, partner, size and targeting failures in regression tests.
const vercelRevision1={
  sellerProfile:{category:'Multi-tenant SaaS',productOneLiner:'Build the platform of your dreams.',pricingModel:'Flexible Pro plan for modern teams.',targetCompanySize:'Enterprise',
    valueProps:['Supercharge developer velocity.'],credentials:['Recognized by industry leaders for high-quality solutions.'],targetIndustries:['Ecommerce'],customers:[],competitors:[],evidence:{
      category:{value:'Multi-tenant SaaS',sourceUrl:'https://vercel.com/solutions/multi-tenant-saas',evidenceQuote:'Multi-tenant SaaS Skip to content Copy Wordmark Copy Logo Download Brand Assets Brand Guidelines Products Agent Stack AI SDK AI Gateway Sandbox Passport Connect eve Core Platform Security Content'},
      productOneLiner:{value:'Build the platform of your dreams.',sourceUrl:'https://vercel.com/solutions/multi-tenant-saas',evidenceQuote:'Infinite domains.'},
      pricingModel:{value:'Flexible Pro plan for modern teams.',sourceUrl:'https://vercel.com/blog/new-pro-pricing-plan',evidenceQuote:'Enterprise Pricing Get a Demo Log In Sign Up A more flexible Pro plan for modern teams Tom Occhino Chief Product Officer Blog Company News 9 Sep 2025 3 min read Copy We’re updating Vercel’s Pro plan'},
      targetCompanySize:{value:'Enterprise',sourceUrl:'https://vercel.com/solutions/turborepo',evidenceQuote:'Enterprise scale.'},
      'valueProps.0':{value:'Supercharge developer velocity.',sourceUrl:'https://vercel.com/solutions/platform-engineering',evidenceQuote:'Sandbox Passport Connect eve Core Platform Security Content Delivery Fluid Compute Observability Workflows CI/CD Tools Next.js Vercel Agent Vercel Plugin Open Source Domains ↗ v0 ↗ Resources Learn'},
      'credentials.0':{value:'Recognized by industry leaders for high-quality solutions.',sourceUrl:'https://vercel.com/partners/solution-partners/unlikely',evidenceQuote:'Using modern technologies, its experienced team delivers high-quality solutions across industries, from fashion ecommerce to startup websites.'},
      'targetIndustries.0':{value:'Ecommerce',sourceUrl:'https://vercel.com/partners/solution-partners/unlikely',evidenceQuote:'Using modern technologies, its experienced team delivers high-quality solutions across industries, from fashion ecommerce to startup websites.'}
    }},
  icpConfig:{segments:[{label:'Development Tools',queryTemplates:['developer velocity tools','CI/CD platforms','automated deployment solutions','observability tools']}],
    personas:{buyerTitles:['Product Manager'],championTitles:['UX Designer'],wrongOrgTitles:[]},
    triggerMapping:{pain_event:['slow deployment times'],buying_intent:['seeking to improve developer productivity']},
    killPatterns:{solvingInHouse:['building custom solutions','relying on legacy systems'],buildCulture:['favoring manual processes','avoiding automation'],sizeMetric:{label:'Small to Medium Enterprises',floor:10}}}
};

function goodWorkspace() {
  return {
    sellerProfile:{
      category:'Cloud deployment platform',
      productOneLiner:'Deploys web applications with managed infrastructure and automated releases.',
      pricingModel:'Usage-based pricing',
      targetCompanySize:'Enterprise engineering organizations',
      customers:[{name:'Customer One',domain:'customer-one.example'}],
      competitors:[{name:'Competitor One',domain:'competitor-one.example'}],
      evidence:{
        category:{value:'Cloud deployment platform',sourceUrl:'https://seller.example/product',evidenceQuote:'Seller provides a cloud deployment platform for enterprise web applications.'},
        productOneLiner:{value:'Deploys web applications with managed infrastructure and automated releases.',sourceUrl:'https://seller.example/product',evidenceQuote:'Teams deploy web applications with managed infrastructure and automated releases.'},
        pricingModel:{value:'Usage-based pricing',sourceUrl:'https://seller.example/pricing',evidenceQuote:'Usage-based pricing is calculated from monthly compute and bandwidth consumption.'}
      }
    },
    icpConfig:{
      segments:[{label:'Enterprise software teams',queryTemplates:['software companies hiring platform engineers','enterprise teams expanding web engineering','companies recruiting deployment engineers','funded software businesses with reliability roles']}],
      personas:{buyerTitles:['VP Engineering'],championTitles:['Platform Engineering Lead'],wrongOrgTitles:[]},
      triggerMapping:{pain_event:['slow release cycles'],buying_intent:['hiring platform engineers']},
      killPatterns:{solvingInHouse:['formal mandate to build and operate all deployment infrastructure internally'],buildCulture:['requires self-hosting under a binding procurement policy'],sizeMetric:{label:'engineering headcount',floor:200}}
    }
  };
}

describe('receipt quality guards',()=>{
  it('accepts a contextual first-party quote that directly supports a factual claim',()=>{
    expect(receiptQuality('Usage-based pricing','Usage-based pricing is calculated from monthly compute and bandwidth consumption.','https://seller.example/pricing')).toMatchObject({ok:true,code:'QUALITY_OK'});
  });

  it('removes header and footer chunks before constructing receipt choices while retaining substantive text',()=>{
    const quotes=receiptQuotes('Skip to content Copy Wordmark Copy Logo Products Resources Sign Up. Seller provides incident automation for enterprise operations teams. Privacy Policy Terms of Service All rights reserved.');
    expect(quotes).toEqual(['Seller provides incident automation for enterprise operations teams.']);
  });

  it('rejects the real Vercel navigation, short, irrelevant and partner-page receipts',()=>{
    const evidence=vercelRevision1.sellerProfile.evidence;
    expect(receiptQuality(evidence.category.value,evidence.category.evidenceQuote,evidence.category.sourceUrl)).toMatchObject({ok:false,code:'NAVIGATION_BOILERPLATE'});
    expect(receiptQuality(evidence.productOneLiner.value,evidence.productOneLiner.evidenceQuote,evidence.productOneLiner.sourceUrl)).toMatchObject({ok:false,code:'QUOTE_TOO_SHORT'});
    expect(receiptQuality(evidence['valueProps.0'].value,evidence['valueProps.0'].evidenceQuote,evidence['valueProps.0'].sourceUrl)).toMatchObject({ok:false,code:'NO_CLAIM_OVERLAP'});
    expect(receiptQuality(evidence['credentials.0'].value,evidence['credentials.0'].evidenceQuote,evidence['credentials.0'].sourceUrl)).toMatchObject({ok:false,code:'PARTNER_SOURCE'});
  });
});

describe('ICP quality guards',()=>{
  it('allows a measurable, buyer-oriented, factual synthetic profile',()=>{
    const good=goodWorkspace();
    expect(sloganLike(good.sellerProfile.productOneLiner)).toBe(false);
    expect(vendorSeekingQuery(good.icpConfig.segments[0].queryTemplates[0])).toBe(false);
    expect(killLooksLikePain(good.icpConfig.killPatterns.solvingInHouse[0])).toBe(false);
    expect(workspaceQualityFindings(good)).toEqual([]);
  });

  it('flags the real Vercel revision 1 failures without rewriting the fixture',()=>{
    const vercel=vercelRevision1,before=JSON.stringify(vercel),findings=workspaceQualityFindings(vercel),codes=new Set(findings.map(item=>item.code));
    for(const code of ['EMPTY_CUSTOMERS','EMPTY_COMPETITORS','RECEIPT_NAVIGATION_BOILERPLATE','RECEIPT_QUOTE_TOO_SHORT','RECEIPT_NO_CLAIM_OVERLAP','RECEIPT_PARTNER_SOURCE','SIZE_METRIC_UNMEASURABLE','SIZE_FLOOR_CONTRADICTS_TARGET','SLOGAN_LIKE_FACT','VENDOR_SEEKING_QUERY','KILL_LOOKS_LIKE_BUYING_PAIN'])expect(codes.has(code),code).toBe(true);
    expect(Object.values(vercel.sellerProfile.evidence).some(item=>item.sourceUrl?.includes('/customers'))).toBe(false);
    expect(JSON.stringify(vercel)).toBe(before);
  });

  it('keeps field-level evidence and slogan concerns advisory while core and partner failures block',()=>{
    const vercel=workspaceQualityFindings(vercelRevision1);
    expect(vercel.find(item=>item.path==='sellerProfile.evidence.valueProps.0')).toMatchObject({severity:'advisory',code:'RECEIPT_NO_CLAIM_OVERLAP'});
    expect(vercel.find(item=>item.path==='sellerProfile.productOneLiner')).toMatchObject({severity:'advisory',code:'SLOGAN_LIKE_FACT'});
    expect(vercel.find(item=>item.path==='sellerProfile.evidence.credentials.0')).toMatchObject({severity:'blocking',code:'RECEIPT_PARTNER_SOURCE'});
    expect(vercel.find(item=>item.path==='sellerProfile.evidence.productOneLiner')).toMatchObject({severity:'blocking',code:'RECEIPT_QUOTE_TOO_SHORT'});
  });

  it('treats missing buyer and champion personas as blocking',()=>{
    const missing=goodWorkspace();missing.icpConfig.personas={buyerTitles:[],championTitles:[],wrongOrgTitles:[]};
    expect(workspaceQualityFindings(missing).filter(item=>item.code.startsWith('MISSING_'))).toEqual([
      expect.objectContaining({code:'MISSING_BUYER_PERSONAS',severity:'blocking'}),
      expect.objectContaining({code:'MISSING_CHAMPION_PERSONAS',severity:'blocking'})
    ]);
  });

  it('reports every saved snapshot, including conservative flags on Resolve AI and Shopify',()=>{
    const report=Object.fromEntries(['resolve-ai','shopify','vercel'].map(slug=>[slug,workspaceQualityFindings(load(slug))]));
    expect(Object.keys(report)).toEqual(['resolve-ai','shopify','vercel']);
    expect(report['resolve-ai'].length).toBeGreaterThan(0);
    expect(report.shopify.length).toBeGreaterThan(0);
    expect(report.vercel.length).toBeGreaterThan(0);
    expect(report.shopify.some(item=>item.code==='EMPTY_CUSTOMERS')).toBe(true);
    expect(report['resolve-ai'].some(item=>item.code==='RECEIPT_NO_CLAIM_OVERLAP')).toBe(true);
    expect(report['resolve-ai'].filter(item=>item.severity==='blocking')).toHaveLength(11);
    expect(report['resolve-ai'].filter(item=>item.severity==='advisory')).toHaveLength(2);
    expect(report.shopify.filter(item=>item.severity==='blocking')).toHaveLength(13);
    expect(report.shopify.filter(item=>item.severity==='advisory')).toHaveLength(0);
    expect(report.vercel.filter(item=>item.severity==='blocking')).toHaveLength(8);
    expect(report.vercel.filter(item=>item.severity==='advisory')).toHaveLength(4);
  });
});
