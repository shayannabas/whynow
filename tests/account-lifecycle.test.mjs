import {createRequire} from 'node:module';
import {describe,expect,it} from 'vitest';
const require=createRequire(import.meta.url);
const lifecycle=require('../scripts/account-lifecycle.cjs');

describe('simple account lifecycle and Today queue',()=>{
  it('ranks working accounts, keeps only active why-now evidence and excludes killed/skipped rows',()=>{
    const now=new Date('2026-10-20T12:00:00.000Z'),base={fitScore:40,priority:.2,tier:1,signals:{},triggers:[],kills:[]};
    const accounts=[
      {...base,id:'new',name:'New',status:'new',sourceUrl:'https://new.example'},
      {...base,id:'working',name:'Working',status:'working',priority:.1,triggers:[{type:'reliability_hiring',title:'Hiring SREs now',evidenceUrl:'https://working.example/jobs',occurredAt:'2026-10-19T12:00:00.000Z',decaysAt:'2026-11-19T12:00:00.000Z'}]},
      {...base,id:'stale',name:'Stale',status:'new',triggers:[{type:'outage',title:'Old outage',evidenceUrl:'https://stale.example',occurredAt:'2025-01-01T00:00:00.000Z',decaysAt:'2025-02-01T00:00:00.000Z'}]},
      {...base,id:'skipped',name:'Skipped',status:'skipped'},
      {...base,id:'killed',name:'Killed',status:'new',kills:[{code:'KILL_BUILD_CULTURE'}]},
    ];
    const queue=lifecycle.todayQueue({accounts},now);expect(queue.map(row=>row.id)).toEqual(['working','new','stale']);
    expect(queue[0].whyNow).toMatchObject({line:'Hiring SREs now',receipt:'https://working.example/jobs'});expect(queue[2].whyNow.line).toContain('No active why-now');
  });

  it('requires a typed skip reason, records it and clears it after status changes',()=>{
    const state={workspaces:{w:{accounts:[{id:'a',status:'new',updatedAt:'v1'}]}},auditLog:[]};
    expect(()=>lifecycle.updateAccountStatus(state,'w','a',{status:'skipped',expectedUpdatedAt:'v1'})).toThrow(/reason/);
    const skipped=lifecycle.updateAccountStatus(state,'w','a',{status:'skipped',reason:'No current timing',expectedUpdatedAt:'v1'},{now:()=> '2026-10-20T12:00:00.000Z'});
    expect(skipped.workspaces.w.accounts[0]).toMatchObject({status:'skipped',statusReason:'No current timing'});expect(skipped.auditLog[0]).toMatchObject({type:'account_status_changed',reason:'No current timing'});
    const working=lifecycle.updateAccountStatus(skipped,'w','a',{status:'working',expectedUpdatedAt:'2026-10-20T12:00:00.000Z'},{now:()=> '2026-10-20T13:00:00.000Z'});expect(working.workspaces.w.accounts[0]).toMatchObject({status:'working',statusReason:''});
  });

  it('splits Act now, Worth researching and Needs review without ranking wrong-entity evidence',()=>{
    const now=new Date('2026-10-21T12:00:00.000Z'),base={status:'new',signals:{},kills:[],tier:1,priority:.1};
    const workspace={accounts:[
      {...base,id:'act',name:'Act',fitScore:35,triggers:[{type:'reliability_hiring',title:'Senior SRE',evidenceUrl:'https://act.example/jobs/sre',occurredAt:'2026-10-20T00:00:00.000Z',decaysAt:'2026-12-20T00:00:00.000Z'}]},
      {...base,id:'research',name:'Research',fitScore:48,triggers:[]},
      {...base,id:'thin',name:'Thin',fitScore:20,triggers:[]},
      {...base,id:'circle',name:'Circle',fitScore:55,triggers:[],triggerHistory:[{type:'outage_news',title:'Mann Circle Water Outage',evidenceUrl:'https://news.example/mann-circle',occurredAt:'2026-10-20T00:00:00.000Z',decaysAt:'2026-11-20T00:00:00.000Z',metadata:{citable:false,notCitableReason:'The receipt describes a different entity.'}}]},
      {...base,id:'axs',name:'AXS',tier:'parked',fitScore:24,triggers:[{type:'reliability_hiring',title:'Site Reliability Engineer II',evidenceUrl:'https://jobs.example/axs/sre',occurredAt:'2026-10-20T00:00:00.000Z',decaysAt:'2026-12-20T00:00:00.000Z'}]},
    ]};
    const sections=lifecycle.todaySections(workspace,now);
    expect(sections.actNow.map(row=>row.id)).toEqual(['act']);
    expect(sections.worthResearching.map(row=>row.id)).toEqual(['research']);
    expect(sections.needsReview.map(row=>row.id)).toEqual(['circle','axs']);
    expect(sections.needsReview[0].reviewReason).toContain('different entity');
    expect(sections.needsReview[1].reviewReason).toContain('Tier unknown');
    expect(lifecycle.todayQueue(workspace,now).map(row=>row.id)).toEqual(['act','research']);
  });

  it('does not place an early-career hiring post in Act now even when the role is technically relevant',()=>{
    const now=new Date('2026-10-21T12:00:00.000Z'),account={id:'binance',name:'Binance',domain:'binance.com',status:'new',signals:{},kills:[],tier:1,fitScore:49,priority:.2,triggers:[{type:'reliability_hiring',title:'Binance Accelerator Program - System Performance Engineer (AI)',evidenceText:'Binance Accelerator Program - System Performance Engineer (AI). Location: Singapore.',evidenceUrl:'https://jobs.example/binance/accelerator',occurredAt:'2026-10-20T00:00:00.000Z',decaysAt:'2026-12-20T00:00:00.000Z'}]};
    const sections=lifecycle.todaySections({accounts:[account]},now);
    expect(sections.actNow).toEqual([]);
    expect(sections.worthResearching.map(row=>row.name)).toEqual(['Binance']);
  });
});
