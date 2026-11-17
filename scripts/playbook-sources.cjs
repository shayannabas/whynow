'use strict';

// Availability means an event collector exists, not that its live switch is on.
const TIMING_SOURCES=Object.freeze({ats_jobs:true,news:true,statuspage:true,sec:true,apollo_firmographic:false,other:false});
function hasTimingCollector(source){return TIMING_SOURCES[source]===true;}
function sourceNotes(playbook={}){return (playbook.triggers||[]).flatMap((rule,i)=>hasTimingCollector(rule.source)?[]:[{path:`triggers.${i}.source`,triggerId:rule.id,code:'NO_DATA_SOURCE_YET',severity:'advisory',message:'No data source yet — this trigger never counts as timing evidence until a collector is implemented.'}]);}
module.exports={hasTimingCollector,sourceNotes};
