'use strict';

const SIGNAL_KEYS=['techStack','revenueSensitivity','observabilityScale','activePain','aiCompatibility','competitiveWedge'];
function signalRubric(icpConfig={}) {
  return SIGNAL_KEYS.map(key=>{
    const value=icpConfig.signalDefinitions?.[key]||{};
    return {
      key,
      label:String(value.label||key),
      description:String(value.description||''),
      weight:Number(icpConfig.weights?.[key]||1),
      scoreMinimum:1,
      scoreMaximum:5,
      evidenceRequiredForFullConfidence:true,
    };
  });
}
function rubricForSignal(key,icpConfig={}) {
  if(!SIGNAL_KEYS.includes(key))throw new Error('Unknown scorecard signal.');
  return signalRubric(icpConfig).find(row=>row.key===key);
}
module.exports={SIGNAL_KEYS,rubricForSignal,signalRubric};
