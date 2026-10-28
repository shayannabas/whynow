import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {displayDate}=require('../scripts/server/display-date.cjs');
const {dedupeTriggers}=require('../scripts/trigger-identity.cjs');
const {activeTriggers,signalStack}=require('../scripts/decisioning.cjs');
const {todayPage}=require('../scripts/server/phase-a-pages.cjs');
const {loadResolveReferenceDemo}=require('../scripts/reference-demo.cjs');
const {defaultState}=require('../scripts/server/state.cjs');
const {metricsPage}=require('../scripts/server/activity-pages.cjs');
it('separates unknown placeholders from genuine collected inferred signals in Metrics',()=>{
  const state=loadResolveReferenceDemo(defaultState()),w=state.workspaces[state.activeWorkspaceId];w.accounts=[{id:'a',signals:{techStack:{score:1,inferred:true,evidenceText:'Signal not collected.'},activePain:{score:2,inferred:true,evidenceText:'A collected but unverified report.'},aiCompatibility:{score:3,inferred:false,evidenceUrl:'https://example.com/evidence'}}}];
  const html=metricsPage(state);expect(html).toContain('Unknown — not yet collected</b><em>1');expect(html).toContain('Collected — inferred or unverified</b><em>1');expect(html).toContain('Collected signals</b><em>2');expect(html).not.toContain('Signals without verified receipts');
});
it('shows human dates and honest relative age, including invalid and future dates',()=>{
  const now=new Date('2026-10-27T20:00:00Z');expect(displayDate('2026-10-08T19:47:24-04:00',now)).toBe('Oct 8, 2026 · 19 days ago');expect(displayDate('',now)).toBe('Date unknown');expect(displayDate('invalid',now)).toBe('Date unknown');expect(displayDate('2026-10-28T20:00:00Z',now)).toContain('upcoming');
});
it('counts the real Okta job once across trigger types without merging distinct jobs or signals',()=>{
  const base={title:'Principal Site Reliability Engineer',sourceId:'greenhouse',evidenceUrl:'https://www.okta.com/company/careers/opportunity/8002576?gh_jid=8002576',occurredAt:'2026-10-20T00:00:00Z',metadata:{jobId:8002576}},rows=[{...base,id:'a',type:'ai_rca_hiring'},{...base,id:'b',type:'reliability_hiring'}],now=new Date('2026-10-27T00:00:00Z');
  expect(dedupeTriggers(rows)).toHaveLength(1);expect(activeTriggers({triggers:rows},now)).toHaveLength(1);expect(signalStack({triggers:rows},now)).toMatchObject({count:1,multiplier:1,hiringForWhatWeSell:true});
  expect(dedupeTriggers([...rows,{...base,type:'reliability_hiring',metadata:{jobId:123}}])).toHaveLength(2);
});
it('shows all five Act now preview accounts, full workspace name and one receipt arrow',()=>{
  const state=loadResolveReferenceDemo(defaultState()),w=state.workspaces[state.activeWorkspaceId],now=new Date().toISOString();w.accounts=Array.from({length:5},(_,i)=>({id:`account-${i}`,name:`Company ${i}`,tier:1,fitScore:50,icpSegment:'cybersecurity',triggers:[{type:'reliability_hiring',title:'Senior Site Reliability Engineer',evidenceUrl:`https://example.com/jobs/${i}`,occurredAt:now}],kills:[]}));
  const html=todayPage(state),preview=html.slice(html.indexOf('today-brief-card'),html.indexOf('Open Act now list'));
  for(let i=0;i<5;i++)expect(preview).toContain(`Company ${i}`);expect(html).not.toContain('Receipt ↗ ↗');expect(html).toContain('class="workspace-full-name">Resolve AI · Reference demo');
});
