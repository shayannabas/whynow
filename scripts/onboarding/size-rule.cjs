'use strict';
// A minimum does not conflict with an open-ended or qualitative target.
function targetMaximum(target,label){
 const text=String(target||'').toLowerCase().replaceAll(',',''),unit=String(label||'').replace(/([a-z])([A-Z])/g,'$1 $2').toLowerCase();
 const revenue=/revenue|arr/.test(unit),engineering=/engineer/.test(unit);
 const units=revenue?'(?:annual revenue|revenue|arr)':engineering?'(?:engineers?|engineering (?:employees|headcount|team members))':'(?:employees?|people|staff|headcount)';
 const number='(\\d+(?:\\.\\d+)?)\\s*(million|billion|[mkb])?';
 const upper=new RegExp('(?:under|fewer than|less than|below|<)\\s*\\$?'+number+'\\s*'+units,'i').exec(text),inclusive=new RegExp('(?:up to|at most|maximum(?: of)?|max(?:imum)?:?)\\s*\\$?'+number+'\\s*'+units,'i').exec(text),range=new RegExp('\\d+\\s*[-–—]\\s*'+number+'\\s*'+units,'i').exec(text),m=upper||inclusive||range;
 if(!m)return null;const multiplier={m:1e6,million:1e6,b:1e9,billion:1e9,k:1e3}[m[2]]||1;return {value:Number(m[1])*multiplier,exclusive:Boolean(upper)};
}
function sizeFloorContradictsTarget(target,label,floor){const max=targetMaximum(target,label);return Boolean(max&&Number.isFinite(Number(floor))&&(max.exclusive?Number(floor)>=max.value:Number(floor)>max.value));}
module.exports={targetMaximum,sizeFloorContradictsTarget};
