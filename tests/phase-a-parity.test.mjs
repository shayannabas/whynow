import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import fs from 'node:fs';
const require=createRequire(import.meta.url);
const {defaultState}=require('../scripts/server/state.cjs');
const {loadResolveReferenceDemo,REFERENCE_WORKSPACE_ID}=require('../scripts/reference-demo.cjs');
const {phaseAConfigForWorkspace}=require('../scripts/phase-a-config.cjs');
const scoring=require('../scripts/scoring.cjs');
const kills=require('../scripts/kills.cjs');
const tiering=require('../scripts/tiering.cjs');
const decisioning=require('../scripts/decisioning.cjs');

const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/parity/signalscout-phase-a.json',import.meta.url),'utf8'));
const state=loadResolveReferenceDemo(defaultState(),{now:()=>fixture.capturedAt});
const config=phaseAConfigForWorkspace(state.workspaces[REFERENCE_WORKSPACE_ID]);
const now=new Date(fixture.now);

describe('SignalScout Phase A immutable parity fixture',()=>{
  it('records the exact read-only source commit and four captured functions',()=>{
    expect(fixture.source).toMatchObject({product:'SignalScout',commit:'130789f1bac1d5e11f5f5154f269155dc17f2d21'});
    expect(fixture.source.functions).toHaveLength(4);
    expect(fixture.cases.map(row=>row.id)).toEqual(expect.arrayContaining(['databricks-like-solving-in-house','uber-eats-like-build-culture','binance-like-unsellable','replicate-like-below-size','draftkings-like-clean-winner']));
  });
  for(const row of fixture.cases){
    it(`matches scoring, kills, tiering and decisioning for ${row.id}`,()=>{
      const score=scoring.scoreSignals(row.input,config.scoring,now);
      const tier=tiering.tierCompany(row.input,config.tierRules);
      const staged={...row.input,...tier,fitScore:score.fitScore,fitConfidence:score.fitConfidence,score};
      expect(score).toEqual(row.output.score);
      expect(tier).toEqual(row.output.tier);
      expect(kills.evaluateKills(staged,config)).toEqual(row.output.kills);
      expect(decisioning.applyDecisioning(staged,config,now)).toEqual(row.output.decision);
    });
  }
});
