import {createRequire} from 'node:module';
import {describe,expect,it} from 'vitest';
const require=createRequire(import.meta.url),targeting=require('../scripts/message-targeting.cjs');
const now=new Date('2026-10-21T00:00:00.000Z');

describe('workspace-neutral message targeting',()=>{
  it('puts organization-shaping engineering roles above the line and hands-on roles below it',()=>{
    expect(targeting.derivePowerLine({title:'VP Engineering'}).value).toBe('above');
    expect(targeting.derivePowerLine({title:'Director of Platform Engineering'}).value).toBe('above');
    expect(targeting.derivePowerLine({title:'Staff Site Reliability Engineer'}).value).toBe('below');
  });
  it('lets an explicit operator override win without changing the title',()=>expect(targeting.derivePowerLine({title:'VP Engineering',powerLineOverride:'below'})).toMatchObject({value:'below',source:'operator_override'}));
  it('uses recent citable incidents before AI-forward language when diagnosing the message layer',()=>{
    const account={signals:{aiCompatibility:{score:5,evidenceText:'Agentic AI infrastructure.'}},triggers:[{type:'outage',evidenceUrl:'https://status.acme.example/incidents/1',evidenceText:'Acme API returned errors.',occurredAt:'2026-10-20T00:00:00Z',decaysAt:'2026-11-20T00:00:00Z',citable:true,metadata:{attribution:'internal'}}]};
    expect(targeting.diagnoseMaslowLayer(account,now).layer).toBe('systems_online');
    expect(targeting.framingFor({powerLine:'above',maslowLayer:'systems_online'}).targetLayer).toBe('stability');
  });
  it('keeps the least severe CTA when no prior seller or category awareness is proven',()=>{
    expect(targeting.deriveAwareness({},{}).value).toBe('unaware');
    expect(targeting.ctaForAwareness('unaware').severity).toBe('seed_question');
    expect(targeting.deriveAwareness({}, {signals:{techStack:{evidenceText:'Evaluating AI-assisted RCA tooling.'}}}).value).toBe('knows_space');
  });
});
