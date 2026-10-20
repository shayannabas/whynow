import {describe,expect,it} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),firmographics=require('../scripts/firmographics.cjs');
const company={id:'acct-acme',name:'Acme',domain:'acme.example'};

describe('free firmographics',()=>{
  it('parses public receipts without inventing missing fields',()=>{
    const profile=firmographics.parseSearchResults(company,[
      {title:'Acme company profile',url:'https://example.org/acme',snippet:'Acme has 1,250 employees and annual revenue of $100M-$500M. Founded in 2014 and headquartered in Austin, Texas.'},
      {title:'Acme funding',url:'https://news.example.org/acme',snippet:'Acme raised $80 million in a Series C and was valued at $1.2 billion.'},
    ],'2026-10-20T00:00:00.000Z');
    expect(profile).toMatchObject({employeeCount:1250,revenueEstimate:300_000_000,fundingStage:'Series C',totalRaised:80_000_000,valuation:1_200_000_000,foundedYear:2014,isPublic:null});
    expect(profile.fields.employeeCount).toMatchObject({sourceUrl:'https://example.org/acme',provider:'free',confidence:.72});
  });

  it('rejects unrelated snippets and Nasdaq Private Market as a public-company claim',()=>{
    const profile=firmographics.parseSearchResults(company,[
      {title:'Other company',url:'https://other.example/profile',snippet:'Other has 9,000 employees.'},
      {title:'Acme | Nasdaq Private Market',url:'https://www.nasdaqprivatemarket.com/company/acme',snippet:'Acme private-company liquidity.'},
    ],'2026-10-20T00:00:00.000Z');
    expect(profile.employeeCount).toBeNull();expect(profile.isPublic).toBeNull();
  });

  it('requires target-local context and explicit listing language for high-impact fields',()=>{
    const profile=firmographics.parseSearchResults(company,[
      {title:'Acme and peers',url:'https://example.org/peers',snippet:'Acme competes with OtherCo. OtherCo raised $535 million and has 8,000 employees.'},
      {title:'Acme listing',url:'https://acme.example/investors',snippet:'Acme is publicly traded on NASDAQ: ACME and has 2,500 employees.'},
      {title:'Acme report',url:'https://acme.example/results',snippet:'Acme revenue of $1 was shown in a truncated preview.'},
    ],'2026-10-20T00:00:00.000Z');
    expect(profile).toMatchObject({isPublic:true,employeeCount:2500,totalRaised:null,revenueEstimate:null});expect(profile.fields.isPublic.evidenceText).toMatch(/publicly traded|NASDAQ/);
  });

  it('removes legacy boilerplate public/IPO claims during offline re-sanitization',()=>{
    const profile=firmographics.emptyProfile(company,'2026-10-20T00:00:00.000Z');profile.fields.isPublic=firmographics.sourceField(true,.82,'https://profiles.example/acme',profile.asOf,'Public-company marker');profile.fields.fundingStage=firmographics.sourceField('Ipo',.78,'https://profiles.example/acme',profile.asOf,'ipo');profile.fields.revenueEstimate=firmographics.sourceField(1,.68,'https://profiles.example/acme',profile.asOf,'revenue of $1');profile.fields.revenueBand=firmographics.sourceField('$1',.68,'https://profiles.example/acme',profile.asOf,'revenue of $1');
    expect(firmographics.finalizeProfile(profile)).toMatchObject({isPublic:null,fundingStage:'',revenueEstimate:null,revenueBand:''});
  });

  it('drops saved free fields whose receipt names another company',()=>{
    const profile=firmographics.emptyProfile(company,'2026-10-20T00:00:00.000Z');profile.fields.employeeCount=firmographics.sourceField(2500,.72,'https://profiles.example/acme',profile.asOf,'2,500 employees');profile.fields.totalRaised=firmographics.sourceField(535_000_000,.8,'https://news.example/doordash-raises',profile.asOf,'raised $535M');firmographics.finalizeProfile(profile);
    expect(firmographics.pruneUnattributedFields(profile,company)).toMatchObject({employeeCount:2500,totalRaised:null});
  });

  it('merges the strongest free and Wikidata fields while retaining receipts',()=>{
    const free=firmographics.parseSearchResults(company,[{title:'Acme funding',url:'https://news.example/acme',snippet:'Acme raised $40 million in a Series B.'}],'2026-10-20T00:00:00.000Z');
    const wikidata=firmographics.emptyProfile(company,'2026-10-20T00:00:00.000Z');wikidata.source='wikidata';wikidata.sources=['https://www.wikidata.org/entity/Q1'];wikidata.fields.employeeCount=firmographics.sourceField(2500,.7,wikidata.sources[0],wikidata.asOf,'Wikidata P1128 employee count','wikidata');firmographics.finalizeProfile(wikidata);
    const merged=firmographics.mergeProfiles(free,wikidata);
    expect(merged).toMatchObject({employeeCount:2500,fundingStage:'Series B',source:'wikidata'});expect(merged.sources).toHaveLength(2);
  });
});
