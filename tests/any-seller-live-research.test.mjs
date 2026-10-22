import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const runner=require('../scripts/run-any-seller-live-research.cjs');

it('keeps the live any-seller authorization bounded and refuses enabled persistent defaults',()=>{
  expect(runner.TARGETS).toEqual([{name:'Vercel',domain:'vercel.com'},{name:'Gong',domain:'gong.io'}]);
  expect(runner.MODEL).toBe('gpt-5.5');expect(runner.OPENAI_CAP_USD).toBe(1.3);expect(runner.SERPER_CAP).toBe(20);
  expect(runner.assertProviderDefaultsOff({OPENAI_ENABLED:'false',OPENAI_MONTHLY_LIMIT_USD:'0'})).toEqual({openaiEnabled:false,openaiLimitUsd:0});
  expect(()=>runner.assertProviderDefaultsOff({OPENAI_ENABLED:'true',OPENAI_MONTHLY_LIMIT_USD:'1.30'})).toThrow('false and 0');
});

it('reports only review data and never presents a generated profile as approved',()=>{
  const workspace={id:'w',status:'needs_review',sellerProfile:{customers:[],competitors:[],evidence:{},targetCompanySize:'500+ employees'},icpConfig:{segments:[],personas:{buyerTitles:['VP Sales'],championTitles:['Revenue Operations']},killPatterns:{solvingInHouse:[],buildCulture:[],sizeMetric:{label:'employees',floor:500}}}};
  const result=runner.publicResult(workspace);expect(result).toMatchObject({workspaceId:'w',status:'needs_review',customers:[],competitors:[],sizeMetric:{label:'employees',floor:500}});expect(result).not.toHaveProperty('approvedAt');
});

it('reuses saved Vercel customer and comparison pages before the 20-source ceiling without mutating the saved state',()=>{
  const generic=Array.from({length:20},(_,index)=>({sourceId:`generic-${index}`}));
  const current={schemaVersion:1,activeWorkspaceId:'v',workspaces:{v:{id:'v',name:'Vercel',research:{selectedCandidate:{domain:'vercel.com'},sources:generic,revision:1}}},sources:Object.fromEntries(generic.map((row,index)=>[row.sourceId,{id:row.sourceId,url:`https://vercel.com/blog/${index}`}]))};
  const saved={schemaVersion:1,activeWorkspaceId:'old',workspaces:{old:{id:'old',name:'Vercel',research:{selectedCandidate:{domain:'vercel.com'},sources:[{sourceId:'customer'},{sourceId:'comparison'},{sourceId:'pricing'}]}}},sources:{customer:{id:'customer',url:'https://vercel.com/customers/acme'},comparison:{id:'comparison',url:'https://domains.vercel.com/kb/comparisons'},pricing:{id:'pricing',url:'https://vercel.com/pricing'}}};
  const original=structuredClone(saved),merged=runner.mergeSavedVercelPriorityPages(current,saved),ids=merged.workspaces.v.research.sources.map(row=>row.sourceId);
  expect(ids).toHaveLength(20);expect(ids.slice(0,2)).toEqual(['customer','comparison']);expect(ids).not.toContain('pricing');expect(merged.workspaces.v.research.revision).toBe(2);expect(saved).toEqual(original);
  expect(runner.isVercelPriorityPage('https://domains.vercel.com/kb/comparisons')).toBe(true);
});
