import {createRequire} from 'node:module';
import {expect,it,vi} from 'vitest';
import {fixture} from './fixtures/pipeline/fictional.mjs';

const require=createRequire(import.meta.url);
const {draftPlaybook,digest}=require('../scripts/playbook.cjs');
const {createDiscoveryCoordinator}=require('../scripts/discovery-runner.cjs');
const now=()=>new Date('2026-11-17T12:00:00Z');
const env={SERPER_ENABLED:'true',SERPER_API_KEY:'fixture-only',SERPER_MAX_QUERIES_PER_RUN:'4',SERPER_MONTHLY_QUERY_LIMIT:'40',DISCOVERY_MAX_SERPER_QUERIES_PER_RUN:'10'};
const title='Fir Market raises Series A funding',url='https://news.example/articles/fir-market';
const home='https://firmarket.example/';

function harness(published='2026-11-15T09:00:00Z') {
  const sample=fixture(),{id,raw,receipts}=sample;
  let state=sample.state;
  raw.triggers[0]={...raw.triggers[0],id:'funding',label:'New funding',source:'news',keywords:['raises','series a'],freshnessDays:30};
  const policy=draftPlaybook(raw,receipts,now().toISOString());
  sample.workspace.sellerProfile.playbook={...policy,status:'approved',approvedAt:now().toISOString(),approvedDigest:digest(policy)};
  sample.workspace.universeSeeds=[{name:'Fir Market',domain:'firmarket.example',segment:'revenue_teams'}];
  const newsSearchProvider=vi.fn(async()=>[{title,url,date:'2 days ago'}]);
  const searchProvider=vi.fn(async (_query,{task})=>task.kind==='official_identity'?[{title:'Fir Market | Official',url:home}]:[]);
  const requestText=vi.fn(async requested=>{
    const value=requested===url?
      `<head><meta property="article:published_time" content="${published}"></head><article><h1>${title}</h1><p>Fir Market raises capital to expand its revenue operations.</p></article>`:
      '<title>Fir Market</title><p>Fir Market is a fictional software company. Our product serves enterprise customers.</p>';
    return {url:requested,value,fetchedAt:now().toISOString()};
  });
  const runtime={identity:()=>'',requestText,snapshot:()=>({})};
  const coordinator=createDiscoveryCoordinator({
    read:()=>state,mutate:async change=>(state=change(structuredClone(state))),env,now,
    searchProvider,newsSearchProvider,runtimeFactory:()=>runtime
  });
  return {read:()=>state,id,coordinator,searchProvider,newsSearchProvider,requestText};
}

it('uses Serper News for a news-only playbook and persists a verified funding article with its original date',async()=>{
  const h=harness(),run=await h.coordinator.start(h.id),done=await h.coordinator.wait(run.id);
  expect(h.newsSearchProvider).toHaveBeenCalledOnce();
  expect(h.newsSearchProvider.mock.calls[0][0]).toBe('"raises" OR "series a"');
  expect(done).toMatchObject({newAccounts:1,serperQueries:3});
  const state=h.read(),account=state.workspaces[h.id].accounts[0],trigger=account.triggers[0];
  expect(account.discovery.kind).toBe('trigger_first_news');
  expect(trigger).toMatchObject({occurredAt:'2026-11-15T09:00:00.000Z',evidenceUrl:url,metadata:{playbookTriggerId:'funding',articlePublicationVerified:true}});
  expect(state.sources[trigger.metadata.savedSourceId].url).toBe(url);
});

it('rejects an old article even when the search result claims it is recent',async()=>{
  const h=harness('2026-01-15T09:00:00Z'),run=await h.coordinator.start(h.id),done=await h.coordinator.wait(run.id);
  expect(done).toMatchObject({newAccounts:0,rejections:[{reason:'news_date_unverified_or_stale'}]});
  expect(h.requestText).toHaveBeenCalledOnce();
  expect(h.read().workspaces[h.id].accounts).toEqual([]);
});
