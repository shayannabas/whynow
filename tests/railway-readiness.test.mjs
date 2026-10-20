import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {statePath}=require('../scripts/server/state.cjs');
it('places the atomic state document under STATE_DIR and keeps the local default',()=>{
  expect(statePath({STATE_DIR:'/tmp/whynow-volume'})).toBe(path.resolve('/tmp/whynow-volume/local-state.json'));
  expect(statePath({})).toMatch(/\/\.whynow\/local-state\.json$/);
});
