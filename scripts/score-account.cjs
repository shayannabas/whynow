'use strict';

const {scoreSignals}=require('./scoring.cjs');
const {tierCompany}=require('./tiering.cjs');
const {applyDecisioning}=require('./decisioning.cjs');
function scoreAccount(account={},config={},now=new Date()){
  const score=scoreSignals(account,config.scoring||config,now),tier=tierCompany(account,config.tierRules||{}),prepared={...account,...tier,fitScore:score.fitScore,fitConfidence:score.fitConfidence,score};
  return applyDecisioning(prepared,config,now);
}
module.exports={scoreAccount};
