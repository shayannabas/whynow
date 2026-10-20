import {createRequire} from 'node:module';
import {describe,expect,it} from 'vitest';
const require=createRequire(import.meta.url);
const lifecycle=require('../scripts/account-lifecycle.cjs');

describe('simple account lifecycle and Today queue',()=>{
  it('ranks working accounts, keeps only active why-now evidence and excludes killed/skipped rows',()=>{
    const now=new Date('2026-10-20T12:00:00.000Z'),base={fitScore:40,priority:.2,signals:{},triggers:[],kills:[]};
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
});
