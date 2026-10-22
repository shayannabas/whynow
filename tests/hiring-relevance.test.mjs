import {createRequire} from 'node:module';
import {describe,expect,it} from 'vitest';
const require=createRequire(import.meta.url),hiring=require('../scripts/collectors/hiring.cjs'),{sanitizeWhyNow}=require('../scripts/phase-b-runner.cjs'),{loadReferenceProfile}=require('../scripts/onboarding/reference-profile.cjs');
const reference=loadReferenceProfile().icpConfig,target={buyerTitles:reference.personas.buyerTitles,championTitles:reference.personas.championTitles,triggerMapping:reference.triggerMapping};
const trigger=(title,type='internal_tool_maintenance',text='')=>({id:title,type,title,evidenceText:`${title}. ${text}`,evidenceUrl:`https://jobs.example/${encodeURIComponent(title)}`,occurredAt:'2026-10-20T00:00:00.000Z',decaysAt:'2026-12-20T00:00:00.000Z',sourceId:'greenhouse',metadata:{jobTitle:title}});

describe('workspace-targeted hiring relevance',()=>{
  it.each([
    ['Senior Manager, Content & Knowledge Architecture'],
    ['Engineering Manager – Server-Driven UI (Codeless)'],
    ['Techical Support Engineer'],
  ])('keeps the real unrelated %s posting out of why-now triggers',(title)=>{
    expect(hiring.hiringTriggerRelevance(trigger(title),target)).toMatchObject({relevant:false,source:'outside_workspace_targeting'});
  });

  it.each([
    ['Senior Site Reliability Engineer','reliability_hiring'],
    ['AI System Performance Engineer','reliability_hiring'],
    ['Director of Incident Management','function_hiring'],
  ])('accepts the targeted %s role',(title,type)=>expect(hiring.hiringTriggerRelevance(trigger(title,type),target).relevant).toBe(true));

  it.each([
    ['Binance Accelerator Program - System Performance Engineer (AI)','reliability_hiring'],
    ['Site Reliability Engineering Intern','reliability_hiring'],
    ['Graduate Platform Engineer','function_hiring'],
    ['New Grad Observability Engineer','reliability_hiring'],
    ['Junior SRE','reliability_hiring'],
  ])('never promotes the real early-career pattern in %s to why-now',(title,type)=>{
    expect(hiring.hiringTriggerRelevance(trigger(title,type),target)).toMatchObject({relevant:false,source:'early_career'});
  });

  it('does not emit trigger events or count velocity for an early-career reliability posting',()=>{
    const job={id:'early-1',title:'Binance Accelerator Program - System Performance Engineer (AI)',text:'Work on system performance.',url:'https://jobs.example/binance/early-1',location:'Singapore',updatedAt:'2026-10-20T00:00:00.000Z'};
    expect(hiring.jobSignals(target,'greenhouse',[job],new Date('2026-10-21T00:00:00.000Z')).events).toEqual([]);
    expect(hiring.matchingInfraJobs([job])).toEqual([]);
  });

  it('accepts a generic title only when the description contains explicit workspace buying intent',()=>{
    const row=trigger('Senior Software Engineer','ai_rca_hiring','Build AI-assisted production investigation and root cause analysis for on-call engineers.');
    expect(hiring.hiringTriggerRelevance(row,target)).toMatchObject({relevant:true,source:'buying_intent'});
  });

  it('removes unrelated saved hiring triggers without deleting them from audit history',()=>{
    const unrelated=trigger('Techical Support Engineer'),relevant=trigger('Senior Site Reliability Engineer','reliability_hiring');
    const clean=sanitizeWhyNow({name:'Acme',domain:'acme.example',triggers:[unrelated,relevant],triggerHistory:[],signals:{}},{personas:reference.personas,triggerMapping:reference.triggerMapping,slaDays:reference.slaDays},new Date('2026-10-21T00:00:00.000Z'));
    expect(clean.triggers.map(row=>row.title)).toEqual(['Senior Site Reliability Engineer']);
    expect(clean.triggerHistory.map(row=>row.title)).toEqual(expect.arrayContaining(['Techical Support Engineer','Senior Site Reliability Engineer']));
  });
});
