'use strict';
function atsJobUrl(provider,board,jobId){if(!/^[a-z0-9_-]+$/i.test(String(board||''))||!/^[a-z0-9_-]+$/i.test(String(jobId||'')))return '';const slug=encodeURIComponent(board),id=encodeURIComponent(jobId);if(provider==='greenhouse'&&/^\d+$/.test(String(jobId)))return `https://job-boards.greenhouse.io/${slug}/jobs/${id}`;if(provider==='lever')return `https://jobs.lever.co/${slug}/${id}`;if(provider==='ashby')return `https://jobs.ashbyhq.com/${slug}/${id}`;return '';}
function normalizeJobReceipt(provider,board,job){const url=atsJobUrl(provider,board,job.id);return url?{...job,url,...(job.url&&job.url!==url?{companyCareersUrl:job.url}:{})}:job;}
module.exports={atsJobUrl,normalizeJobReceipt};
