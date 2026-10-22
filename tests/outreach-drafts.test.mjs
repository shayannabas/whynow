import {createRequire} from 'node:module';
import {describe,expect,it} from 'vitest';
const require=createRequire(import.meta.url);
const {defaultState}=require('../scripts/server/state.cjs');
const {loadResolveReferenceDemo}=require('../scripts/reference-demo.cjs');
const outreach=require('../scripts/outreach-drafts.cjs');
const model=require('../scripts/outreach-model.cjs');
const NOW='2026-10-21T00:00:00.000Z';
function fixture(){const state=loadResolveReferenceDemo(defaultState(),{now:()=>NOW}),workspace=state.workspaces[state.activeWorkspaceId],account={schemaVersion:1,id:'acct-acme',name:'Acme Cloud',domain:'acme.example',icpSegment:'data_ai_infrastructure',status:'new',signals:{},kills:[],triggers:[{id:'trigger-1',type:'reliability_hiring',title:'Acme Cloud is hiring a Senior Site Reliability Engineer',evidenceText:'Acme Cloud is hiring a Senior Site Reliability Engineer to improve production incident response and distributed systems reliability.',evidenceUrl:'https://acme.example/jobs/sre',occurredAt:'2026-10-20T00:00:00.000Z',decaysAt:'2026-12-20T00:00:00.000Z',citable:true}]};workspace.accounts.push(account);return {state,workspace,account};}
const fields={firstName:'Ava',title:'VP Engineering',senderFirstName:'Shayan'};

describe('receipt-backed deterministic outreach',()=>{
  it('uses only an account-relevant active trigger and rejects the real Circle-style false positive',()=>{
    const {account}=fixture(),falsePositive={id:'bad',type:'outage_news',title:'Clarksville reports Mann Circle Water Outage',evidenceText:'Water service on Mann Circle was turned off for repair.',evidenceUrl:'https://clarksville.example/water-outage',occurredAt:'2026-10-20T00:00:00.000Z',decaysAt:'2026-11-20T00:00:00.000Z',citable:false};
    expect(outreach.triggerRelevantToAccount(account.triggers[0],account)).toBe(true);
    expect(outreach.triggerRelevantToAccount(falsePositive,{...account,name:'Circle',domain:'circle.com'})).toBe(false);
    expect(outreach.triggerRelevantToAccount({...falsePositive,citable:true,title:'CrowdStrike CTO departs',evidenceText:'CrowdStrike CTO departs after 13 years.',evidenceUrl:'https://news.example/crowdstrike'},{...account,name:'CrowdStrike',domain:'crowdstrike.com'})).toBe(true);
  });
  it('creates a 60–110 word five-block template from frozen claims and public receipts without a model',()=>{
    const {workspace,account}=fixture(),context=outreach.buildDraftContext(workspace,account,fields,new Date(NOW)),draft=outreach.templateDraft(context);
    expect(draft).toMatchObject({blocked:false,generatedBy:'deterministic_template',model:null,validation:{ok:true}});
    expect(draft.wordCount).toBeGreaterThanOrEqual(60);expect(draft.wordCount).toBeLessThanOrEqual(110);
    expect(draft.body.split(/\n\s*\n/)).toHaveLength(5);
    expect(draft.body).toContain(workspace.icpConfig.outreach.claims.product.value);
    expect(draft.evidenceRefs).toEqual(expect.arrayContaining(['https://acme.example/jobs/sre','https://resolve.ai/product/ai-sre']));
  });
  it('uses the exact Demo merge token and chooses an approved trigger-matched persona without inventing a person',()=>{
    const {workspace,account}=fixture(),context=outreach.buildDraftContext(workspace,account,{demoMergeField:true,senderFirstName:'Shayan'},new Date(NOW)),draft=outreach.templateDraft(context);
    expect(context.persona).toMatchObject({firstName:'{{first_name}}',title:'Head of SRE',role:'champion',recipientMode:'merge_field',templateLabel:'Template with merge fields — recipient filled at send time',contactSource:'deferred (Apollo planned)'});
    expect(context.persona.selectionReason).toContain('reliability');
    expect(draft.validation.ok).toBe(true);expect(draft.body).toMatch(/^Hi \{\{first_name\}\},\n\n/);
    const generic={...draft,body:draft.body.replace('Hi {{first_name}},','Hi there,')};expect(outreach.validateOutreachDraft(generic,context).reasons).toEqual(expect.arrayContaining([expect.objectContaining({code:'GENERIC_GREETING'}),expect.objectContaining({code:'MERGE_GREETING'})]));
    const invented={...draft,body:draft.body.replace('Hi {{first_name}},','Hi Jordan,')};expect(outreach.validateOutreachDraft(invented,context).reasons).toContainEqual(expect.objectContaining({code:'MERGE_GREETING'}));
    const nonDemo=outreach.buildDraftContext({...workspace,deliveryMode:'live'},account,{demoMergeField:true,senderFirstName:'Shayan'},new Date(NOW));expect(nonDemo.blockers).toContainEqual(expect.objectContaining({code:'MERGE_FIELD_DEMO_ONLY'}));
  });
  it('chooses an engineering buyer for executive change while real named recipients still work',()=>{
    const {workspace,account}=fixture(),executive={...account,triggers:[{...account.triggers[0],type:'executive_change',title:'Acme Cloud CTO departs',evidenceText:'Acme Cloud CTO departs after five years.'}]},merge=outreach.buildDraftContext(workspace,executive,{demoMergeField:true,senderFirstName:'Shayan'},new Date(NOW)),named=outreach.buildDraftContext(workspace,account,fields,new Date(NOW));
    expect(merge.persona).toMatchObject({title:'VP Engineering',role:'buyer',recipientMode:'merge_field'});expect(merge.persona.selectionReason).toContain('budget owner');
    expect(merge.trigger.corroboration).toMatchObject({sourceCount:1,label:'single source — verify before outreach'});
    expect(outreach.templateDraft(merge)).toMatchObject({blocked:false,validation:{ok:true}});
    expect(named.persona).toMatchObject({firstName:'Ava',title:'VP Engineering',recipientMode:'named',contactSource:'manual local entry'});expect(outreach.templateDraft(named).validation.ok).toBe(true);
  });
  it('blocks killed accounts, stale evidence, mismatched personas and unapproved seller claims',()=>{
    const {workspace,account}=fixture();
    const killed=outreach.buildDraftContext(workspace,{...account,killStatus:'killed',kills:[{code:'KILL_EXISTING_CUSTOMER'}]},fields,new Date(NOW));expect(killed.blockers).toContainEqual(expect.objectContaining({code:'ACCOUNT_KILLED'}));
    const stale=outreach.buildDraftContext(workspace,{...account,triggers:account.triggers.map(row=>({...row,decaysAt:'2026-10-20T00:00:00.000Z'}))},fields,new Date(NOW));expect(stale.blockers).toContainEqual(expect.objectContaining({code:'NO_LIVE_RECEIPT'}));
    const wrong=outreach.buildDraftContext(workspace,account,{...fields,title:'Chief Financial Officer'},new Date(NOW));expect(wrong.blockers).toContainEqual(expect.objectContaining({code:'PERSONA_MISMATCH'}));
    const ordinary={...workspace,status:'active',referenceDemo:undefined,icpConfig:{...workspace.icpConfig,outreach:undefined},sellerProfile:{name:'Seller',domain:'seller.example',approvedAt:'2026-10-20T00:00:00.000Z',customers:[],competitors:[],evidence:{}}};expect(outreach.buildDraftContext(ordinary,account,fields,new Date(NOW)).blockers).toContainEqual(expect.objectContaining({code:'NO_APPROVED_SELLER_CLAIM'}));
  });
  it('rejects changed or unreceipted seller wording and first-touch links',()=>{
    const {workspace,account}=fixture(),context=outreach.buildDraftContext(workspace,account,fields,new Date(NOW)),draft=outreach.templateDraft(context),changed={...draft,body:draft.body.replace('Agents that investigate','Tools that investigate')};
    expect(outreach.validateOutreachDraft(changed,context).reasons).toContainEqual(expect.objectContaining({code:'SELLER_CLAIM_CHANGED'}));
    expect(outreach.validateOutreachDraft({...draft,usedClaims:draft.usedClaims.map((row,index)=>index?row:{...row,quote:'Different wording.'})},context).reasons).toContainEqual(expect.objectContaining({code:'SELLER_CLAIM_NOT_VERBATIM'}));
    expect(outreach.validateOutreachDraft({...draft,body:`${draft.body} https://example.com`},context).reasons).toContainEqual(expect.objectContaining({code:'FIRST_TOUCH_LINK'}));
  });

  it('accepts Coalition details only because title, location, Kubernetes and AWS are in the saved receipt',()=>{
    const {workspace,account}=fixture(),coalition={...account,id:'coalition',name:'Coalition',domain:'coalitioninc.com',triggers:[{...account.triggers[0],title:'Senior Site Reliability Engineer',evidenceText:"Senior Site Reliability Engineer. Location: Any location, Canada. Named stack: Kubernetes, AWS. About us Coalition is the world's first Active Insurance provider.",evidenceUrl:'https://www.coalitioninc.com/job-posting?gh_jid=4742193005'}]},context=outreach.buildDraftContext(workspace,coalition,{demoMergeField:true,senderFirstName:'Shayan'},new Date(NOW)),base=outreach.templateDraft(context),body=base.body.replace(/I saw[^\n]+/, 'I saw the “Senior Site Reliability Engineer” posting in Any location, Canada naming Kubernetes and AWS.');
    expect(outreach.validateOutreachDraft({...base,body},context).reasons).not.toContainEqual(expect.objectContaining({code:'UNGROUNDED_PROSPECT_DETAIL'}));
    expect(outreach.validateOutreachDraft({...base,body:body.replace('AWS','GCP')},context).reasons).toContainEqual(expect.objectContaining({code:'UNGROUNDED_PROSPECT_DETAIL'}));
  });

  it('rejects a shortened Binance title and invented production-reliability detail',()=>{
    const {workspace,account}=fixture(),baseContext=outreach.buildDraftContext(workspace,account,{demoMergeField:true,senderFirstName:'Shayan'},new Date(NOW)),context={...baseContext,account:{...baseContext.account,id:'binance',name:'Binance',domain:'binance.com'},trigger:{...baseContext.trigger,title:'Binance Accelerator Program - System Performance Engineer (AI)',text:'Binance Accelerator Program - System Performance Engineer (AI). Location: Singapore. Work on system performance.',sourceUrl:'https://jobs.example/binance/performance'}},base=outreach.templateDraft(context),body=base.body.replace(/I saw[^\n]+/, 'I saw the “System Performance Engineer” posting in Singapore, focused on production reliability.');
    expect(outreach.validateOutreachDraft({...base,body},context).reasons).toContainEqual(expect.objectContaining({code:'UNGROUNDED_PROSPECT_DETAIL'}));
  });

  it('uses neutral, corroborated executive-change framing and blocks departure details, amounts and the banned phrase',()=>{
    const {workspace,account}=fixture(),triggers=[{...account.triggers[0],id:'exec-1',type:'executive_departure',title:'Acme Cloud CTO departs',evidenceText:'Acme Cloud CTO departs after five years.',evidenceUrl:'https://news-one.example/acme',occurredAt:'2026-10-20T00:00:00.000Z'},{...account.triggers[0],id:'exec-2',type:'executive_departure',title:'Acme Cloud technology leader steps down',evidenceText:'A second publisher reports the Acme Cloud leadership change.',evidenceUrl:'https://news-two.example/acme',occurredAt:'2026-10-19T00:00:00.000Z'}],context=outreach.buildDraftContext(workspace,{...account,triggers},{demoMergeField:true,senderFirstName:'Shayan'},new Date(NOW)),draft=outreach.templateDraft(context);
    expect(context.trigger.corroboration).toMatchObject({sourceCount:2,label:'corroborated by 2 saved sources'});expect(draft.validation.ok).toBe(true);expect(draft.evidenceRefs).toEqual(expect.arrayContaining(['https://news-one.example/acme','https://news-two.example/acme']));
    const neutral={...draft,body:draft.body.replace(/I noticed[^\n]+/,'I noticed the recent engineering leadership change. It may be a useful moment to review how investigation work is supported.')};const neutralValidation=outreach.validateOutreachDraft(neutral,context);expect(neutralValidation.reasons).not.toContainEqual(expect.objectContaining({code:'TRIGGER_NOT_GROUNDED'}));expect(neutralValidation.reasons).not.toContainEqual(expect.objectContaining({code:'UNGROUNDED_PROSPECT_DETAIL'}));
    const unsafe=draft.body.replace(/I noticed[^\n]+/, 'I saw the CTO depart after 13 years to launch a $170 million fund and revisit the next operating state.');
    expect(outreach.validateOutreachDraft({...draft,body:unsafe},context).reasons).toEqual(expect.arrayContaining([expect.objectContaining({code:'EXECUTIVE_OPENER'}),expect.objectContaining({code:'EXECUTIVE_DETAIL_TONE'}),expect.objectContaining({code:'BANNED_TONE'})]));
  });
  it('persists a Demo-only copy draft and an audit record without approving or sending anything',()=>{
    const {state,workspace}=fixture(),next=outreach.createTemplateDraft(state,workspace.id,'acct-acme',fields,{now:()=>NOW,id:()=> 'draft-1'}),saved=next.workspaces[workspace.id].drafts[0];
    expect(saved).toMatchObject({id:'draft-1',deliveryMode:'demo',watermark:'Demo · copy only · no send path',generatedBy:'deterministic_template',model:null,validation:{ok:true}});
    expect(next.auditLog.at(-1)).toMatchObject({type:'outreach_template_created',draftId:'draft-1'});
    expect(next.workspaces[workspace.id].sellerProfile.approvedAt).toBeNull();
  });
  it('keeps the outreach model separate from Stage 2 drafting and defaults to the requested model',()=>{
    expect(outreach.outreachModel({})).toBe('gpt-5.5');
    expect(outreach.outreachModel({OPENAI_MODEL:'gpt-4o-mini'})).toBe('gpt-5.5');
    expect(outreach.outreachModel({OPENAI_OUTREACH_MODEL:'gpt-test'})).toBe('gpt-test');
  });
  it('builds but does not execute a Responses structured-output request and prices its upper bound',()=>{
    const {workspace,account}=fixture(),context=outreach.buildDraftContext(workspace,account,fields,new Date(NOW)),request=model.buildOutreachRequest(context,{OPENAI_OUTREACH_MODEL:'gpt-5.5'}),estimate=model.estimateOutreachRequest(request);
    expect(request).toMatchObject({model:'gpt-5.5',store:false,reasoning:{effort:'medium'},max_output_tokens:4000,text:{format:{type:'json_schema',strict:true}}});expect(estimate).toMatchObject({model:'gpt-5.5',maxOutputTokens:4000,plannedOutputTokens:1200});expect(estimate.plannedTotalCostUsd).toBeLessThan(.05);expect(estimate.maximumTotalCostUsd).toBeGreaterThan(.12);expect(()=>model.assertRecordedModel({model:'gpt-5.4'},{OPENAI_OUTREACH_MODEL:'gpt-5.5'})).toThrow('gpt-5.5');
    expect(model.maxOutputTokens('gpt-5.5')).toBe(4000);expect(model.maxOutputTokens('gpt-4o-mini')).toBe(600);
  });
  it('pins the model prompt to the exact Demo merge greeting',()=>{
    const {workspace,account}=fixture(),context=outreach.buildDraftContext(workspace,account,{demoMergeField:true,senderFirstName:'Shayan'},new Date(NOW)),request=model.buildOutreachRequest(context,{OPENAI_OUTREACH_MODEL:'gpt-5.5'});
    expect(request.instructions).toContain('Hi {{first_name}},');expect(request.instructions).toContain('allowedFacts list is exhaustive');expect(request.instructions).toContain('invented people');expect(request.instructions).toContain('next operating state');expect(request.instructions).toContain('complete supplied job title');expect(request.input).toContain('allowedFacts');expect(request.input).toContain('merge_field');
  });
});
