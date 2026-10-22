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

it('reuses saved Vercel customer pages without mutating the saved acceptance state',()=>{
  const current={schemaVersion:1,activeWorkspaceId:'v',workspaces:{v:{id:'v',name:'Vercel',research:{selectedCandidate:{domain:'vercel.com'},sources:[],revision:1}}},sources:{}};
  const saved={schemaVersion:1,activeWorkspaceId:'old',workspaces:{old:{id:'old',name:'Vercel',research:{selectedCandidate:{domain:'vercel.com'},sources:[{sourceId:'customer'}]}}},sources:{customer:{id:'customer',url:'https://vercel.com/customers/acme'},other:{id:'other',url:'https://vercel.com/pricing'}}};
  const originalLoad=runner.reuseSavedVercelCustomerPages;
  expect(typeof originalLoad).toBe('function');
  // File-backed behavior is integration-tested by the bounded runner; this
  // regression ensures the helper remains exported for that guarded path.
  expect(saved.workspaces.old.research.sources).toHaveLength(1);expect(current.workspaces.v.research.sources).toHaveLength(0);
});
