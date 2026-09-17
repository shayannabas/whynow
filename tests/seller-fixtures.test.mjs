import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {defaultState}=require('../scripts/server/state.cjs');
const {recordSource,quoteIsGrounded}=require('../scripts/sources.cjs');

const directory=path.join(path.dirname(fileURLToPath(import.meta.url)),'fixtures','seller-research');
const fixtures=fs.readdirSync(directory).filter(file=>file.endsWith('.json')).sort().map(file=>JSON.parse(fs.readFileSync(path.join(directory,file),'utf8')));

it('keeps three genuine, unrelated official-page receipts for deterministic offline tests',()=>{
  expect(fixtures.map(item=>item.seller.name)).toEqual(['Resolve AI','Shopify','Vercel']);
  expect(new Set(fixtures.map(item=>item.seller.domain)).size).toBe(3);
  let state=defaultState();
  for(const fixture of fixtures){
    expect(fixture).toMatchObject({schemaVersion:1,capturedOn:'2026-09-17'});
    const url=new URL(fixture.source.url),host=url.hostname.replace(/^www\./,'');
    expect(host===fixture.seller.domain||host.endsWith(`.${fixture.seller.domain}`)).toBe(true);
    expect(fixture.source.text).toContain(fixture.receipt);
    const saved=recordSource(state,{...fixture.source,fetchedAt:`${fixture.capturedOn}T12:00:00.000Z`});state=saved.state;
    expect(quoteIsGrounded(state,saved.source.id,fixture.receipt)).toBe(true);
    expect(quoteIsGrounded(state,saved.source.id,`${fixture.receipt} invented ending`)).toBe(false);
  }
  expect(Object.keys(state.sources)).toHaveLength(3);
});
