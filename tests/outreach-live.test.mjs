import {createRequire} from 'node:module';
import {describe,expect,it} from 'vitest';
const require=createRequire(import.meta.url);
const {defaultState}=require('../scripts/server/state.cjs');
const {loadResolveReferenceDemo}=require('../scripts/reference-demo.cjs');
const outreach=require('../scripts/outreach-drafts.cjs');
const live=require('../scripts/outreach-live.cjs');

const NOW='2026-10-21T00:00:00.000Z';
function context(){
  const state=loadResolveReferenceDemo(defaultState(),{now:()=>NOW}),workspace=state.workspaces[state.activeWorkspaceId],account={schemaVersion:1,id:'acct-acme',name:'Acme Cloud',domain:'acme.example',icpSegment:'data_ai_infrastructure',status:'new',signals:{},kills:[],triggers:[{id:'trigger-1',type:'reliability_hiring',title:'Acme Cloud is hiring a Senior Site Reliability Engineer',evidenceText:'Acme Cloud is hiring a Senior Site Reliability Engineer to improve production incident response and distributed systems reliability.',evidenceUrl:'https://acme.example/jobs/sre',occurredAt:'2026-10-20T00:00:00.000Z',decaysAt:'2026-12-20T00:00:00.000Z',citable:true}]};
  workspace.accounts.push(account);return outreach.buildDraftContext(workspace,account,{demoMergeField:true,senderFirstName:'Shayan'},new Date(NOW));
}
function payload(ctx,id='resp_1'){
  const draft=outreach.templateDraft(ctx);return {id,status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({subject:draft.subject,body:draft.body})}]}],usage:{input_tokens:1000,input_tokens_details:{cached_tokens:200},output_tokens:100}};
}
const env={OPENAI_ENABLED:'true',OPENAI_MONTHLY_LIMIT_USD:'.25',OPENAI_OUTREACH_CALL_LIMIT:'3',OPENAI_OUTREACH_MODEL:'gpt-5.5',OPENAI_API_KEY:'test-key'};

describe('bounded live outreach client',()=>{
  it('prices cached and uncached tokens from provider usage',()=>expect(live.actualCost({input_tokens:1000,input_tokens_details:{cached_tokens:200},output_tokens:100})).toBe(.0071));
  it('makes one Responses call and applies the local receipt and merge-field validator',async()=>{
    const ctx=context(),calls=[],generator=live.createOutreachGenerator({env,fetchImpl:async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify(payload(ctx)),{status:200,headers:{'content-type':'application/json'}});}}),result=await generator.generate(ctx);
    expect(calls).toHaveLength(1);expect(calls[0].url).toBe(live.RESPONSES_ENDPOINT);expect(calls[0].options.headers.Authorization).toBe('Bearer test-key');expect(JSON.parse(calls[0].options.body)).toMatchObject({model:'gpt-5.5',store:false});
    expect(result.draft).toMatchObject({generatedBy:'openai',model:'gpt-5.5',validation:{ok:true}});expect(result.draft.body).toContain('Hi {{first_name}},');expect(result.costUsd).toBe(.0071);expect(generator.snapshot()).toMatchObject({logicalCalls:1,attempts:1,actualUsd:.0071,processCapUsd:.25});
  });
  it('uses only one retry for a transient status and never retries validator failures',async()=>{
    const ctx=context();let calls=0;const retried=live.createOutreachGenerator({env,sleep:async()=>{},fetchImpl:async()=>{calls++;return calls===1?new Response('',{status:429}):new Response(JSON.stringify(payload(ctx,'resp_2')),{status:200,headers:{'content-type':'application/json'}});}});expect((await retried.generate(ctx)).draft.validation.ok).toBe(true);expect(calls).toBe(2);expect(retried.snapshot()).toMatchObject({logicalCalls:1,attempts:2});
    const invalid=live.createOutreachGenerator({env,fetchImpl:async()=>new Response(JSON.stringify({...payload(ctx),output:[{content:[{type:'output_text',text:JSON.stringify({subject:'Quick question',body:'Hi there'})}]}]}),{status:200,headers:{'content-type':'application/json'}})});await expect(invalid.generate(ctx)).rejects.toMatchObject({code:'DRAFT_BLOCKED'});expect(invalid.snapshot()).toMatchObject({logicalCalls:1,attempts:1});
  });
  it('requires the exact configured model, process cap and three-call limit',()=>{
    expect(()=>live.createOutreachGenerator({env:{...env,OPENAI_ENABLED:'false'}})).toThrow('disabled');
    expect(()=>live.createOutreachGenerator({env:{...env,OPENAI_OUTREACH_MODEL:'gpt-5.4'}})).toThrow('gpt-5.5');
    expect(()=>live.createOutreachGenerator({env:{...env,OPENAI_MONTHLY_LIMIT_USD:'.30'}})).toThrow('$0.25');
    expect(()=>live.createOutreachGenerator({env:{...env,OPENAI_OUTREACH_CALL_LIMIT:'4'}})).toThrow('three logical calls');
  });
});
