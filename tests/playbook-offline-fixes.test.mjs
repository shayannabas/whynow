import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {fixture} from './fixtures/pipeline/fictional.mjs';
const require=createRequire(import.meta.url),p=require('../scripts/playbook.cjs'),{sourceNotes}=require('../scripts/playbook-sources.cjs'),{matchPlaybook}=require('../scripts/playbook-timing.cjs');
it('allows only the seller, approved products/competitors and named compliance standards while retaining metric/person/receipt rules',()=>{
 const f=fixture(),w=structuredClone(f.workspace);w.sellerProfile.productNames=['Lumen Console','Workbench v2'];w.sellerProfile.competitors=[{name:'Moss Ledger'}];
 const raw=structuredClone(f.raw);raw.triggers[0].messageAngle='Position Copper Vale with Lumen Console and Workbench v2 against Moss Ledger using SOC 2, ISO 27001, PCI DSS, HIPAA and GDPR.';
 expect(p.validatePlaybook(raw,f.receipts,w)).toEqual([]);
 for(const bad of [' Claims a 72% improvement.',' Mention Alexandra Winters.',' Use Unseen Corp.',' ISO 27001 achieves 40% savings.',' SOC 200 compliance.']){const test=structuredClone(raw);test.triggers[0].messageAngle+=bad;expect(p.validatePlaybook(test,f.receipts,w).length).toBeGreaterThan(0);}
 raw.triggers[0].receiptIds=['unknown'];expect(p.validatePlaybook(raw,f.receipts,w).some(x=>x.code==='UNKNOWN_RECEIPT')).toBe(true);
});
it('does not treat unapproved competitor names as an approved vocabulary',()=>{const f=fixture(),w=structuredClone(f.workspace);w.sellerProfile.approvedAt=null;w.sellerProfile.competitors=[{name:'Unknown Ridge'}];const raw=structuredClone(f.raw);raw.triggers[0].messageAngle='Compare Unknown Ridge.';expect(p.validatePlaybook(raw,f.receipts,w).some(x=>x.code==='UNSUPPORTED_NAME')).toBe(true);});
it('shows unsupported sources as advisory and never counts their saved receipts as timing evidence',()=>{
 const f=fixture(),raw=structuredClone(f.raw);raw.triggers[0].source='other';let state=p.reviewPlaybook(f.state,f.id,{action:'save',raw,revision:0,profileRevision:4});const w=state.workspaces[f.id],notes=sourceNotes(w.sellerProfile.playbook);expect(notes[0]).toMatchObject({severity:'advisory',code:'NO_DATA_SOURCE_YET'});expect(w.sellerProfile.playbook.warnings).toEqual([]);
 const html=require('../scripts/onboarding/playbook-page.cjs').playbookSection(state,w);expect(html).toContain('No data source yet');expect(html).toContain('<button>Approve saved playbook</button>');expect(html).not.toContain('name="acknowledged" checked');
 const event={type:'manual',sourceId:'manual',title:'Senior Account Executive',evidenceText:'Senior Account Executive hiring at Harbor Loom.',evidenceUrl:'https://harborloom.example/news',occurredAt:'2026-11-15'};expect(matchPlaybook({triggers:[event]},w.sellerProfile.playbook,new Date('2026-11-16'))).toEqual([]);
 raw.triggers[0].source='apollo_firmographic';expect(sourceNotes(raw)).toHaveLength(1);expect(matchPlaybook({triggers:[{...event,sourceId:'apollo'}]},raw,new Date('2026-11-16'))).toEqual([]);
});
