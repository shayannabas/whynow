'use strict';

const {scoreSignals}=require('./scoring.cjs');
const {tierCompany}=require('./tiering.cjs');
const {applyDecisioning}=require('./decisioning.cjs');
function scoreAccount(account={},config={},now=new Date()){
  account=require('./playbook-timing.cjs').projectPlaybookAccount(account,config,now);
  const score=scoreSignals(account,{...config,...(config.scoring||{})},now),tier=tierCompany(account,config.tierRules||{}),prepared={...account,...tier,fitScore:score.fitScore,fitConfidence:score.fitConfidence,score};
  return applyDecisioning(prepared,config,now);
}
module.exports={scoreAccount};
