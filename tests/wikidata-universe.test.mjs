import {describe,expect,it} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),wikidata=require('../scripts/wikidata-universe.cjs');

describe('guarded Wikidata firmographics',()=>{
  it('builds bounded official API requests',()=>{
    const search=new URL(wikidata.searchEntityRequestUrl('Acme',99)),entities=new URL(wikidata.entityRequestUrl(['Q1','bad','Q2']));
    expect(search.hostname).toBe('www.wikidata.org');expect(search.searchParams.get('limit')).toBe('10');expect(entities.searchParams.get('ids')).toBe('Q1|Q2');
  });

  it('maps structured employee and public-company claims to exact receipts',()=>{
    const entity={labels:{en:{value:'Acme'}},claims:{P1128:[{rank:'preferred',mainsnak:{datavalue:{value:{amount:'+2500',unit:'1'}}}}],P414:[{mainsnak:{datavalue:{value:{id:'Q13677'}}}}],P856:[{mainsnak:{datavalue:{value:'https://acme.example'}}}]}};
    const profile=wikidata.wikidataFirmographicProfile('Q1',entity,{Q13677:{labels:{en:{value:'New York Stock Exchange'}}}},new Date('2026-10-20T00:00:00.000Z'));
    expect(profile).toMatchObject({employeeCount:2500,isPublic:true,confidence:.7,confidenceLabel:'medium',source:'wikidata'});expect(profile.fields.employeeCount.sourceUrl).toBe('https://www.wikidata.org/entity/Q1');
  });

  it('matches a seed by official website through the guarded runtime',async()=>{
    const runtime={requestJson:async url=>{const action=new URL(url).searchParams.get('action');if(action==='wbsearchentities')return {value:{search:[{id:'Q1',label:'Acme',description:'software company'}]}};const props=new URL(url).searchParams.get('props');if(props==='labels')return {value:{entities:{Q13677:{labels:{en:{value:'New York Stock Exchange'}}}}}};return {value:{entities:{Q1:{labels:{en:{value:'Acme'}},claims:{P856:[{mainsnak:{datavalue:{value:'https://acme.example'}}}],P1128:[{mainsnak:{datavalue:{value:{amount:'+3000',unit:'1'}}}}],P414:[{mainsnak:{datavalue:{value:{id:'Q13677'}}}}]}}}}};}};
    const report=await wikidata.collectSeedFirmographics({seeds:[{id:'acct-acme',name:'Acme',domain:'acme.example'}],runtime,now:new Date('2026-10-20T00:00:00.000Z')});
    expect(report).toMatchObject({status:'ok',matched:1,requested:1,queriesAttempted:3});expect(report.profiles[0]).toMatchObject({matchedBy:'official_website',profile:{employeeCount:3000,isPublic:true}});
  });
});
