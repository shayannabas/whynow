'use strict';

const {esc}=require('../utils.cjs');
const {pipelineProgress}=require('../pipeline.cjs');

function progressHeader(state){
  const progress=pipelineProgress(state);
  return `<div class="v21-progress-wrap"><details class="v21-progress">
    <summary><span data-progress-label>${esc(progress.stage)}${progress.running?' · '+progress.percent+'%':''}</span><progress data-progress-bar max="100" value="${progress.percent}" aria-label="Pipeline progress"></progress></summary>
    <div class="v21-progress-pop"><h2>Pipeline progress</h2><ol data-progress-stages>${progress.stages.map(row=>`<li>${esc(row.name)} · ${esc(row.status)}</li>`).join('')}</ol>
      <ul data-progress-usage></ul><section data-progress-failures></section><a href="/pipeline">Open guided pipeline</a></div></details></div>`;
}

const progressClient=`
(function(){
 function initialize(){
  const widget=document.querySelector('.v21-progress'),guide=document.querySelector('.v21-guide');
  if(!widget)return;
  const replay=guide?.dataset.replayRun,step=guide?.dataset.replayStep;
  const query=replay?'?'+new URLSearchParams({mode:'replay',run:replay,step}):'';
  const refresh=async()=>{
    try{
      const res=await fetch('/pipeline/progress'+query,{cache:'no-store',credentials:'same-origin'});
      if(!res.ok)return;
      const p=await res.json();
      widget.querySelector('[data-progress-label]').textContent=p.stage+(p.running||replay?' · '+p.percent+'%':'');
      widget.querySelector('[data-progress-bar]').value=p.percent;
      const list=(parent,rows)=>{
        parent.replaceChildren(...rows.map(text=>{const row=document.createElement('li');row.textContent=text;return row;}));
      };
      list(widget.querySelector('[data-progress-stages]'),p.stages.map(row=>row.name+' · '+row.status));
      const d=p.details,usage=[];
      if(d.serper!=null)usage.push(d.serper+(d.serperCap!=null?' of '+d.serperCap:'')+' searches used');
      if(d.apollo!=null)usage.push(d.apollo+(d.apolloCap!=null?' of '+d.apolloCap:'')+' Apollo calls used');
      if(d.openaiUsd!=null)usage.push('OpenAI $'+d.openaiUsd.toFixed(4)+' used');
      if(d.openaiReservedUsd!=null)usage.push('OpenAI $'+d.openaiReservedUsd.toFixed(4)+(d.openaiCapUsd!=null?' of $'+d.openaiCapUsd.toFixed(2):'')+' reserved this month');
      if(d.pages!=null)usage.push(d.pages+' seller pages saved');
      if(d.candidates!=null)usage.push(d.candidates+' candidates found');
      if(d.checked!=null)usage.push(d.checked+(d.selected!=null?' of '+d.selected:'')+' companies checked');
      else if(d.selected!=null)usage.push(d.selected+' candidates selected');
      if(d.verified!=null)usage.push(d.verified+' companies verified');
      if(d.rejected!=null)usage.push(d.rejected+' candidates rejected');
      if(p.elapsed!=null)usage.push(Math.floor(p.elapsed/60)+'m '+p.elapsed%60+'s elapsed');
      list(widget.querySelector('[data-progress-usage]'),usage);
      const issues=widget.querySelector('[data-progress-failures]');
      issues.replaceChildren();
      for(const [label,rows] of [['Skipped pages',p.skipped],['Errors',p.errors]]){
        if(!rows.length)continue;
        const title=document.createElement('h3'),items=document.createElement('ul');
        title.textContent=label;
        list(items,rows.map(row=>[row.company,row.reason.replaceAll('_',' ').toLowerCase(),row.status?'HTTP '+row.status:''].filter(Boolean).join(' · ')));
        issues.append(title,items);
      }
      if(!replay&&guide?.querySelector('[data-guide-wait]')&&p.done)location.reload();
    }catch{}
  };
  refresh();
  if(!replay){window.setInterval(()=>{if(!document.hidden)refresh();},2200);widget.addEventListener('toggle',()=>{if(widget.open)refresh();});}
  const next=guide?.dataset.replayNext;
  if(next){
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    window.setTimeout(()=>location.assign(next),1750);
  }
 }
 document.addEventListener('DOMContentLoaded',initialize,{once:true});
})();
`;
module.exports={progressHeader,progressClient};
