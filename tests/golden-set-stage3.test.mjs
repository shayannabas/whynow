import {describe,expect,it} from 'vitest';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const require=createRequire(import.meta.url);
const fixturePath=path.join(path.dirname(fileURLToPath(import.meta.url)),'fixtures','golden-set','vercel.json');

function loadGoldenSet() {
  return JSON.parse(fs.readFileSync(fixturePath,'utf8'));
}

function entries(data) {
  return [...data.confirmed,...data.proposed];
}

function isExpectedOutcome(value) {
  return value==='keep'||/^KILL_[A-Z][A-Z0-9_]*$/.test(value);
}

it('keeps the Vercel golden-set scaffold explicit and free of invented labels',()=>{
  const data=loadGoldenSet();
  expect(data).toMatchObject({
    schemaVersion:1,
    seller:{name:'Vercel',domain:'vercel.com'},
    confirmed:[],
    proposed:[]
  });

  for(const entry of entries(data)) {
    expect(Object.keys(entry).sort()).toEqual([
      'domain','expectedOutcome','labeledBy','name','reason','sourceUrls'
    ]);
    expect(entry.name.trim()).not.toBe('');
    expect(entry.domain).toMatch(/^[a-z0-9.-]+\.[a-z]{2,}$/);
    expect(isExpectedOutcome(entry.expectedOutcome)).toBe(true);
    expect(entry.reason.trim()).not.toBe('');
    expect(entry.sourceUrls.length).toBeGreaterThan(0);
    expect(entry.sourceUrls.every(url=>URL.canParse(url)&&new URL(url).protocol==='https:')).toBe(true);
  }

  expect(data.confirmed.every(entry=>entry.labeledBy!=='unconfirmed')).toBe(true);
  expect(data.proposed.every(entry=>entry.labeledBy==='unconfirmed')).toBe(true);
});

describe.skip('Stage 3 Vercel golden-set outcomes',()=>{
  it('loads confirmed entries, ignores unconfirmed proposals, and matches kill-engine outcomes',()=>{
    const data=loadGoldenSet();
    const confirmed=entries(data).filter(entry=>entry.labeledBy!=='unconfirmed');
    const {evaluateKills}=require('../scripts/kills.cjs');
    const workspace={
      sellerProfile:{sellerName:data.seller.name,domain:data.seller.domain},
      icpConfig:{},
      goldenSetMode:true
    };

    expect(confirmed.length).toBeGreaterThan(0);
    for(const entry of confirmed) {
      const result=evaluateKills({
        name:entry.name,
        domain:entry.domain,
        sourceUrls:entry.sourceUrls,
        goldenSetReason:entry.reason
      },workspace);
      const actual=result.primary?.code||'keep';
      expect(actual,`${entry.name}: ${entry.reason}`).toBe(entry.expectedOutcome);
    }
  });
});
