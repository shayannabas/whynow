import {describe,it,expect,vi} from 'vitest';
import {mkdtempSync,rmSync,readdirSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import results from '../scripts/server/results.cjs';
import people from '../scripts/collectors/apollo-people.cjs';
import runtimeModule from '../scripts/collectors/runtime.cjs';
import playbooks from '../scripts/playbook.cjs';
import icps from '../scripts/icps.cjs';
import drafts from '../scripts/outreach-drafts.cjs';

const now=()=>new Date('2026-11-17T12:00:00Z');
function scenario(){
  const playbook=playbooks.draftPlaybook({
    buyerRoles:{economicBuyer:['VP Operations'],champion:['Platform Lead'],endUser:[]},
    triggers:[{id:'funding',label:'Recent funding',source:'news',keywords:['funding'],strength:'strong',freshnessDays:60,whyItMatters:'Funds a new project.',messageAngle:'Discuss project timing.',receiptIds:['relevant']}],
    antiTriggers:[]
  },{relevant:{sourceUrl:'https://studio.example/playbook',sourceId:'saved',evidenceQuote:'Recent funding makes room for a new project.'}});
  const w={id:'studio',name:'Fictional Studio',status:'active',profileRevision:1,deliveryMode:'demo',budgets:{},
    icpConfig:{segments:[{key:'op',label:'Operations teams',technologies:['Data mesh']}]},
    sellerProfile:{approvedAt:'2026-11-10',playbook:{...playbook,status:'approved',approvedAt:'2026-11-10',approvedDigest:playbooks.digest(playbook)}},
    accounts:[
      {id:'hay',name:'Haylift Works',domain:'haylift.example',icpSegment:'op',tier:1,fitScore:72,
        firmographics:{country:'Canada',technologies:['Data mesh']},
        triggers:[{title:'Haylift Works funding',occurredAt:'2026-11-12',evidenceUrl:'https://haylift.example/news',sourceId:'first-party',metadata:{playbookTriggerId:'funding'}}]},
      {id:'fir',name:'Firpath Products',domain:'firpath.example',icpSegment:'op',tier:2,fitScore:61,killStatus:'killed',kills:[{code:'KILL_EXISTING_CUSTOMER'}]}
    ],runs:[{id:'run-one',type:'company_discovery',startedAt:'2026-11-12',newAccountIds:['hay'],plannedQueries:[{id:'news-op-funding',icpId:'op',ruleId:'funding',query:'operations funding'}]}]};
  icps.approveIcps(w,'2026-11-10');
  const state={activeWorkspaceId:w.id,workspaces:{studio:w}};
  return {state,w};
}
const param=value=>results.resultsFilters(new URLSearchParams(value));
describe('Results',()=>{
  it('combines session, matched ICP, playbook signal, technology, geography, source, age and tier filters',()=>{
    const {w}=scenario();
    expect(results.filterAccounts(w,param('session=latest&icp=op&signal=funding&tech=Data+mesh&geo=Canada&source=first-party&freshness=7&status=tier1'),now()).map(row=>row.id)).toEqual(['hay']);
    expect(results.filterAccounts(w,param('signal=generic-hiring'),now())).toEqual([]);
    expect(results.filterAccounts(w,param('status=blocked'),now()).map(row=>row.id)).toEqual(['fir']);
    expect(results.filterOptions(w).signal.values).toEqual([['funding','News · Recent funding']]);
  });
  it('stores named searches on the workspace and exports selected company-only rows',()=>{
    const {w}=scenario(),other=scenario().w;
    results.saveSearch(w,new URLSearchParams('name=Funding+list&signal=funding&contact=missing&arbitrary=unused'),now().toISOString(),'s1');
    expect(w.savedSearches[0]).toMatchObject({name:'Funding list',filters:{signal:'funding',contact:'missing'}});
    expect(w.savedSearches[0].filters).not.toHaveProperty('arbitrary');
    expect(other).not.toHaveProperty('savedSearches');
    w.accounts[0].name='=A1';
    w.accounts[0].personas=[{name:'Mira Fiction',title:'Platform Lead',linkedinUrl:'https://www.linkedin.com/in/fictional-role'}];
    const csv=results.exportCompanies(w,param(''),['hay'],now());
    expect(csv).toContain('"\'=A1"');
    expect(csv).toContain('"Ready"');
    expect(csv).not.toMatch(/Firpath|Mira Fiction|linkedin\.com/);
  });
  it('shows unspent planned queries and links evaluated sessions',()=>{
    const {state}=scenario();
    const html=results.resultsPageV2(state,new URLSearchParams('tab=queries'));
    expect(html).toContain('operations funding');
    expect(html).toContain('Not run');
    expect(html).toContain('All sessions · 2');
    expect(html).toContain('Operations teams');
    expect(html).toContain('Find missing contacts');
  });
});

describe('Company-scoped persona search',()=>{
  const fictionalPayload={
    people:[
      {name:'Mira Fiction',title:'Platform Lead',linkedin_url:'https://linkedin.com/in/fictional-mira/?tracking=test',
        email:'disallowed-field@example.test',phone_number:'+1-555-0000',organization:{primary_domain:'haylift.example'}},
      {name:'Gale Fiction',title:'VP Operations',linkedin_url:'https://linkedin.com/in/fictional-gale',organization:{primary_domain:'different.example'}},
      {name:'Ash Fiction',title:'Office Manager',linkedin_url:'https://linkedin.com/in/fictional-ash'}
    ]
  };
  it('produces valid external LinkedIn search and profile links without a fetch',()=>{
    const url=new URL(people.linkedinPeopleSearch('Haylift & Works','VP Operations'));
    expect(url.origin+url.pathname).toBe('https://www.linkedin.com/search/results/people/');
    expect(url.searchParams.get('keywords')).toBe('VP Operations Haylift & Works');
    expect(people.linkedinProfile('https://linkedin.com.bad.example/in/fake')).toBe('');
    expect(people.linkedinProfile('javascript:alert(1)')).toBe('');
    expect(people.contactReady({personas:[{name:'Mira Fiction',title:'Platform Lead',linkedinUrl:'https://www.linkedin.com/company/test'}]})).toBe(false);
  });
  it('limits a response to ten matching people, one page and approved fields with no API cache',async()=>{
    const {state,w}=scenario(),cacheDir=mkdtempSync(join(tmpdir(),'whynow-personas-'));
    const env={APOLLO_PEOPLE_ENABLED:'true',APOLLO_PEOPLE_MONTHLY_CALL_LIMIT:'1',APOLLO_API_KEY:'fake-test-key',CRAWLER_CONTACT_EMAIL:'crawler@example.test'};
    const payload={people:[...fictionalPayload.people,...Array.from({length:12},(_,i)=>({name:'Fictional Person '+i,title:'VP Operations',linkedin_url:'https://www.linkedin.com/in/example-'+i,email:'never-store@example.test'}))]};
    const fetch=vi.fn(async url=>url.endsWith('robots.txt')?new Response('User-agent: *\nAllow: /'):new Response(JSON.stringify(payload),{headers:{'Content-Type':'application/json'}}));
    const runtime=new runtimeModule.CollectorRuntime({env,cacheDir,fetch,lookup:async()=>[{address:'93.184.216.34',family:4}],sleep:async()=>{}});
    const input={read:()=>state,mutate:async fn=>fn(state),runtime,env,workspaceId:w.id,accountId:'hay',now};
    try{
      await people.findPersonas(input);
      expect(fetch.mock.calls.map(([url])=>url)).toEqual(['https://api.apollo.io/robots.txt',people.ENDPOINT]);
      expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({q_organization_domains_list:['haylift.example'],person_titles:['VP Operations','Platform Lead'],include_similar_titles:false,page:1,per_page:10});
      expect(w.accounts[0].personas).toHaveLength(10);
      expect(w.accounts[0].personas[0]).toEqual({name:'Mira Fiction',title:'Platform Lead',matchedRole:'Platform Lead',linkedinUrl:'https://www.linkedin.com/in/fictional-mira'});
      expect(JSON.stringify(state)).not.toMatch(/never-store|disallowed-field|555-0000|fake-test-key|Gale Fiction|Ash Fiction/);
      const files=readdirSync(cacheDir);
      expect(files).toHaveLength(1);
      expect(readFileSync(join(cacheDir,files[0]),'utf8')).not.toMatch(/people|Mira Fiction|fake-test-key/);
      expect(w.budgets.apolloPeople).toEqual({month:'2026-11',calls:1});
      await expect(people.findPersonas(input)).rejects.toThrow(/cap is exhausted/);
      await expect(people.findPersonas({...input,env:{}})).rejects.toThrow(/disabled/);
      expect(fetch).toHaveBeenCalledTimes(2);
    }finally{rmSync(cacheDir,{recursive:true,force:true});}
  });
  it('creates a merge-field draft using the approved role and a seller receipt without customer proof',()=>{
    const {state,w}=scenario(),a=w.accounts[0];
    const claim='Fictional Studio helps platform teams plan infrastructure work and keep shared requests visible as the team decides which projects can move forward.';
    Object.assign(w.sellerProfile,{name:'Fictional Studio',oneLiner:claim,evidence:{oneLiner:{sourceUrl:'https://studio.example/product',evidenceQuote:claim}}});
    w.icpConfig.outreach={framingLibrary:['Teams planning infrastructure often start by comparing how they handle demand and project intake when several different teams expect support.'],closingQuestions:['Worth a quick look at the workflow?','Would you be open to comparing notes?','Could we discuss where your team starts?']};
    Object.assign(a.triggers[0],{type:'funding',title:'Haylift Works announces Series A funding',evidenceText:'Haylift Works announces Series A funding'});
    a.triggers[0].metadata.matchedKeywords=['Series A funding'];
    a.personas=[{name:'Mira Fiction',title:'VP Operations',matchedRole:'VP Operations',linkedinUrl:'https://www.linkedin.com/in/fictional-mira'}];
    w.drafts=[];
    const next=drafts.createTemplateDraft({...state,auditLog:[]},w.id,a.id,{
      title:'VP Operations',demoMergeField:'true',senderFirstName:'Avery'
    },{now:()=>now().toISOString(),approvedRole:'VP Operations'});
    const draft=next.workspaces[w.id].drafts[0];
    expect(draft.validation.ok).toBe(true);
    expect(draft.body).toMatch(/^Hi \{\{first_name\}\},/);
    expect(draft.contact.title).toBe('VP Operations');
    expect(draft.evidenceRefs).toContain('https://studio.example/product');
    expect(JSON.stringify(draft)).not.toMatch(/Mira Fiction|linkedin\.com/);
  });
  it('does not query an unapproved ICP, another workspace, unverified identity or blocked company',async()=>{
    const {state,w}=scenario(),runtime={requestJsonPost:vi.fn()};
    const env={APOLLO_PEOPLE_ENABLED:'true',APOLLO_PEOPLE_MONTHLY_CALL_LIMIT:'2',APOLLO_API_KEY:'fake-test-key'};
    const input={read:()=>state,mutate:async fn=>fn(state),runtime,env,workspaceId:w.id,accountId:'hay',now};
    w.icps[0].status='needs_review';
    await expect(people.findPersonas(input)).rejects.toThrow(/approve the matching ICP/i);
    await expect(people.findPersonas({...input,workspaceId:'other'})).rejects.toThrow(/verified, unblocked/);
    await expect(people.findPersonas({...input,accountId:'fir'})).rejects.toThrow(/verified, unblocked/);
    expect(runtime.requestJsonPost).not.toHaveBeenCalled();
    expect(w.budgets).toEqual({});
  });
});
