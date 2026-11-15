'use strict';
const {scoreSignals}=require('./scoring.cjs');
const {tierCompany}=require('./tiering.cjs');
const {applyDecisioning,priorityForAccount}=require('./decisioning.cjs');
function scoreAccount(account={},config={},now=new Date()){
 const projected=require('./playbook-timing.cjs').projectPlaybookAccount(account,config,now);
 const score=scoreSignals(projected,{...config,...(config.scoring||{})},now);
 // Timing policy must not erase permanent evidence used by firmographic tiers or kills.
 const evidence=config.playbook?{...account,triggers:require('./trigger-identity.cjs').dedupeTriggers([...(account.triggerHistory||[]),...(account.triggers||[])])}:account;
 const tier=tierCompany(evidence,config.tierRules||{}),prepared={...evidence,...tier,fitScore:score.fitScore,fitConfidence:score.fitConfidence,score},decided=applyDecisioning(prepared,config,now);
 if(!config.playbook)return decided;
 const timed={...decided,signals:projected.signals,triggers:projected.triggers,triggerHistory:projected.triggerHistory,playbookVersion:projected.playbookVersion};
 return {...timed,...priorityForAccount(timed,now,config)};
}
module.exports={scoreAccount};
