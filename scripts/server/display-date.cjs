'use strict';
function displayDate(value,now=new Date()){
  const date=new Date(value);if(!value||!Number.isFinite(date.getTime()))return 'Date unknown';
  const calendarDay=value=>{const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{year:'numeric',month:'numeric',day:'numeric',timeZone:'America/Los_Angeles'}).formatToParts(value).map(row=>[row.type,row.value]));return Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day));};
  const days=Math.round((calendarDay(now)-calendarDay(date))/86400000),label=new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'America/Los_Angeles'}).format(date);
  return `${label} · ${days<0?'upcoming':days===0?'today':days===1?'1 day ago':`${days} days ago`}`;
}
module.exports={displayDate};
