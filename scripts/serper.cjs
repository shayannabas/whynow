async function search(query,{runtime,env=process.env}={}) {
  if(!env.SERPER_API_KEY)throw new Error('SERPER_API_KEY is not configured');
  if(typeof query!=='string' || !query.trim() || query.length>500)throw new Error('Enter a search query of 1–500 characters');
  const response=await runtime.request('serper','https://google.serper.dev/search',{
    method:'POST',headers:{'X-API-KEY':env.SERPER_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({q:query.trim(),num:10})
  });
  const data=JSON.parse(response.text);
  return (Array.isArray(data.organic)?data.organic:[]).map(row=>({title:String(row.title||''),url:String(row.link||''),snippet:String(row.snippet||'')}));
}
module.exports={search};
