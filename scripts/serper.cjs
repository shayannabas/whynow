const ENDPOINT='https://google.serper.dev/search';
const HARD_MAX_QUERIES_PER_RUN=4;
const HARD_MAX_PAGES_PER_RUN=20;

class SerperError extends Error {
  constructor(code,message) {super(message);this.name='SerperError';this.code=code;}
}

function positiveInteger(value,max) {
  if(!/^\d+$/.test(String(value??'')))return 0;
  const parsed=Number(value);
  return Number.isSafeInteger(parsed)&&parsed>0&&parsed<=max?parsed:0;
}

function serperSettings(env={}) {
  const requested=positiveInteger(env.WORKSPACE_MAX_SERPER_QUERIES_PER_RUN??env.SERPER_RESEARCH_QUERY_LIMIT??env.SERPER_MAX_QUERIES_PER_RUN,1000);
  return {
    enabled:env.SERPER_ENABLED==='true',
    keyPresent:Boolean(env.SERPER_API_KEY?.trim()),
    perRunLimit:Math.min(requested,HARD_MAX_QUERIES_PER_RUN),
    monthlyLimit:positiveInteger(env.SERPER_MONTHLY_QUERY_LIMIT,100000),
    pageLimit:Math.min(positiveInteger(env.ONBOARDING_MAX_PAGES??HARD_MAX_PAGES_PER_RUN,1000),HARD_MAX_PAGES_PER_RUN)
  };
}

function assertSerperReady(config) {
  if(!config.enabled)throw new SerperError('DISABLED','Serper research is disabled.');
  if(!config.keyPresent)throw new SerperError('KEY_MISSING','Add the Serper API key privately.');
  if(!config.perRunLimit)throw new SerperError('RUN_LIMIT_MISSING','Set a positive Serper research-query limit.');
  if(!config.monthlyLimit)throw new SerperError('MONTHLY_LIMIT_MISSING','Set a positive Serper monthly query limit.');
  if(!config.pageLimit)throw new SerperError('PAGE_LIMIT_MISSING','Set a positive onboarding page limit.');
  return config;
}

// Search is fail-closed by default. A low-level recorded-response test may opt
// out explicitly; production callers must satisfy the enable switch and caps.
async function search(query,{runtime,env=process.env,num=10,enforceEnabled=true}={}) {
  if(enforceEnabled)assertSerperReady(serperSettings(env));
  else if(!env.SERPER_API_KEY)throw new SerperError('KEY_MISSING','SERPER_API_KEY is not configured');
  if(typeof query!=='string' || !query.trim() || query.length>500)throw new SerperError('INVALID_QUERY','Enter a search query of 1–500 characters');
  if(!Number.isInteger(num)||num<1||num>10)throw new SerperError('INVALID_LIMIT','Search result count must be from 1 to 10.');
  if(!runtime||typeof runtime.request!=='function')throw new SerperError('RUNTIME_REQUIRED','A guarded collector runtime is required.');
  const response=await runtime.request('serper',ENDPOINT,{
    method:'POST',headers:{'X-API-KEY':env.SERPER_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({q:query.trim(),num})
  });
  let data;
  try {data=JSON.parse(response.text);} catch {throw new SerperError('INVALID_RESPONSE','Serper returned an unreadable search response.');}
  return (Array.isArray(data.organic)?data.organic:[]).slice(0,num).map(row=>({
    title:String(row?.title||'').slice(0,300),url:String(row?.link||'').slice(0,2000),snippet:String(row?.snippet||'').slice(0,1000)
  }));
}
module.exports={search,serperSettings,assertSerperReady,SerperError,ENDPOINT,HARD_MAX_QUERIES_PER_RUN,HARD_MAX_PAGES_PER_RUN};
