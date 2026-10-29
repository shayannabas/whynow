import {createRequire} from 'node:module';
import {expect,it} from 'vitest';
const require=createRequire(import.meta.url),{approvedVercel}=require('../scripts/run-vercel-prepare-oct28.cjs');
it('requires saved owner approval and refuses duplicate preparation',()=>{const w={name:'Vercel',status:'needs_review',sellerProfile:{approvedAt:null},runs:[]},s={workspaces:{v:w}};expect(()=>approvedVercel(s)).toThrow(/owner-approved/);w.status='active';w.sellerProfile.approvedAt='2026-10-28';expect(approvedVercel(s)).toBe(w);w.runs.push({type:'prepare_demo',status:'running'});expect(()=>approvedVercel(s)).toThrow(/duplicated/);});
