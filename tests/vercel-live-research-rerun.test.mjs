import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),runner=require('../scripts/run-vercel-live-research-rerun.cjs');

it('bounds the Vercel-only rerun and offsets prior reservations without expanding the new-run cap',()=>{
  expect(runner.TARGET).toEqual({name:'Vercel',domain:'vercel.com'});expect(runner.MODEL).toBe('gpt-5.5');expect(runner.CALLS).toBe(3);expect(runner.OPENAI_CAP_USD).toBe(1.2);expect(runner.SERPER_CAP).toBe(10);
  const state={workspaces:{v:{id:'v',budgets:{openai:{month:'2026-10',calls:4,reservedMicros:243225}}},other:{id:'other',budgets:{openai:{month:'2026-10',calls:2,reservedMicros:100000}}}}};
  expect(runner.monthOpenAiUsage(state,'2026-10')).toEqual({calls:6,reservedMicros:343225});
  const env=runner.paidEnvFor(state,state.workspaces.v,{},'2026-10');expect(env).toMatchObject({OPENAI_ENABLED:'true',OPENAI_MONTHLY_LIMIT_USD:'1.543225',OPENAI_WORKSPACE_MONTHLY_CALL_LIMIT:'7',OPENAI_RETRY_LIMIT:'0',OPENAI_MODEL:'gpt-5.5'});
});

it('keeps provider failure details safe while retaining incomplete diagnostics',()=>{
  const failure=runner.safeFailure(Object.assign(new Error('OpenAI returned incomplete output.'),{code:'INCOMPLETE',finishReason:'length',incompleteReason:'max_output_tokens',usage:{inputTokens:23000,outputTokens:8000,reasoningTokens:8000},costUsd:.355}));
  expect(failure).toEqual({code:'INCOMPLETE',message:'OpenAI returned incomplete output.',finishReason:'length',incompleteReason:'max_output_tokens',usage:{inputTokens:23000,outputTokens:8000,reasoningTokens:8000},costUsd:.355});
  expect(JSON.stringify(failure)).not.toContain('OPENAI_API_KEY');
});
