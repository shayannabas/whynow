import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {createRouter}=require('../scripts/server/router.cjs');
const {loadState}=require('../scripts/server/state.cjs');

it('loads the reference demo, adds a killed account, renders it, and persists across restart',async()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'whynow-phase-a-')),stateFile=path.join(directory,'state.json');let server;
  const start=async()=>{server=http.createServer(createRouter({stateFile,env:{NODE_ENV:'development',OPENAI_ENABLED:'false',SERPER_ENABLED:'false'},runtimeFactory:()=>{throw Error('Providers are forbidden in Phase A tests');}}));await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});return `http://127.0.0.1:${server.address().port}`;};
  const stop=()=>new Promise(resolve=>server.close(resolve));
  try{
    let base=await start(),post=(url,fields)=>fetch(base+url,{method:'POST',headers:{Origin:base},body:new URLSearchParams(fields),redirect:'manual'});
    expect((await post('/reference-demo/load',{})).status).toBe(303);
    expect((await post('/accounts',{name:'Coinbase',domain:'coinbase.com',segment:'crypto_fintech',sourceUrl:'https://www.coinbase.com/about'})).status).toBe(303);
    const accounts=await (await fetch(base+'/accounts')).text(),scorecard=await (await fetch(base+'/scorecard')).text(),killLog=await (await fetch(base+'/kill-log')).text();
    expect(accounts).toContain('Coinbase');expect(scorecard).toContain('Coinbase');expect(scorecard).toContain('8');expect(killLog).toContain('KILL_EXISTING_CUSTOMER');expect(killLog).toContain('https://resolve.ai/customers');
    const saved=loadState(stateFile),workspace=saved.workspaces[saved.activeWorkspaceId];expect(workspace.sellerProfile.approvedAt).toBeNull();expect(workspace.accounts[0]).toMatchObject({name:'Coinbase',killStatus:'killed',primaryKill:{code:'KILL_EXISTING_CUSTOMER'}});
    await stop();base=await start();
    expect(await (await fetch(base+'/kill-log')).text()).toContain('Coinbase');
  }finally{if(server?.listening)await stop();fs.rmSync(directory,{recursive:true,force:true});}
});
