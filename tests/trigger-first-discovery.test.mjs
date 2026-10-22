import {createRequire} from 'node:module';
import {describe,expect,it} from 'vitest';
const require=createRequire(import.meta.url);
const trigger=require('../scripts/trigger-first-discovery.cjs');
const {defaultState}=require('../scripts/server/state.cjs');
const {loadResolveReferenceDemo}=require('../scripts/reference-demo.cjs');

describe('trigger-first discovery',()=>{
  it('builds nine bounded ATS searches and parses direct job links',()=>{
    const tasks=trigger.buildTriggerFirstTasks();expect(tasks).toHaveLength(12);expect(tasks.every(row=>/site:(?:job-boards\.greenhouse\.io|boards\.greenhouse\.io|jobs\.lever\.co|jobs\.ashbyhq\.com)/.test(row.query))).toBe(true);
    expect(trigger.atsDescriptor('https://job-boards.greenhouse.io/acme/jobs/123')).toMatchObject({provider:'greenhouse',slug:'acme',direct:true});
    expect(trigger.atsDescriptor('https://jobs.ashbyhq.com/acme')).toMatchObject({provider:'ashby',slug:'acme',direct:false});
  });
  it('keeps senior reliability roles and excludes early-career or unrelated jobs',()=>{
    expect(trigger.candidateFromJobResult({title:'Job Application for Senior Site Reliability Engineer at Acme Cloud',url:'https://job-boards.greenhouse.io/acme/jobs/123',snippet:'Production infrastructure'})).toMatchObject({name:'Acme Cloud',roleTitle:'Senior Site Reliability Engineer',provider:'greenhouse'});
    expect(trigger.candidateFromJobResult({title:'Job Application for Junior Site Reliability Engineer at Acme Cloud',url:'https://job-boards.greenhouse.io/acme/jobs/124'})).toBeNull();
    expect(trigger.candidateFromJobResult({title:'Job Application for Senior Content Designer at Acme Cloud',url:'https://job-boards.greenhouse.io/acme/jobs/125'})).toBeNull();
  });
  it('resolves a first-party identity and classifies it from workspace segment evidence',()=>{
    const workspace=loadResolveReferenceDemo(defaultState()).workspaces['reference-demo-resolve-ai'],candidate={name:'Shield Cloud',slug:'shieldcloud'},rows=[{title:'Shield Cloud | Cybersecurity platform',url:'https://shieldcloud.example/about',snippet:'Cloud security and cybersecurity platform for enterprises.'}],identity=trigger.identityFromResults(candidate,rows),classification=trigger.classifySegment(workspace,{...candidate,...identity},rows);
    expect(identity).toMatchObject({domain:'shieldcloud.example'});expect(classification).toMatchObject({segment:'cybersecurity',requiresReview:false});
  });
  it('matches a saved direct job by URL before falling back to its exact title',()=>{
    const jobs=[{title:'Senior Site Reliability Engineer',url:'https://jobs.lever.co/acme/one'},{title:'Director of Platform Engineering',url:'https://jobs.lever.co/acme/two'}];
    expect(trigger.matchVerifiedJob({sourceUrl:'https://jobs.lever.co/acme/two',roleTitle:'Wrong title'},jobs).title).toBe('Director of Platform Engineering');
    expect(trigger.matchVerifiedJob({sourceUrl:'https://jobs.lever.co/acme/missing',roleTitle:'Senior Site Reliability Engineer'},jobs).url).toContain('/one');
  });
});
