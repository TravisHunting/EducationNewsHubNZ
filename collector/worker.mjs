import {SOURCES,collect,dataset} from '../lib/collector.mjs';
import {buildBrief} from './brief.mjs';
export {HourlyCollector} from './coordinator.mjs';
async function scan(source,env){
 const previous=await env.EVIDENCE.get('source:'+source.id,'json');
 const result=await collect(source,previous,5);
 await env.EVIDENCE.put('source:'+source.id,JSON.stringify(result));
 console.log(JSON.stringify({event:'source_scan',source:source.id,status:result.status,added:result.added,error:result.error}));return result;
}
export default {
 async fetch(request,env){
  try{
   const url=new URL(request.url);
   if(request.method==='GET'&&url.pathname==='/health')return Response.json({service:'education-intelligence-collector',status:'ok',collection:'scheduled-only',minimumIntervalSeconds:3600});
   if(request.method==='GET'&&url.pathname==='/data'){
    const states=(await Promise.all(SOURCES.map(s=>env.EVIDENCE.get('source:'+s.id,'json')))).filter(Boolean);
    return Response.json({...dataset(states),brief:await env.EVIDENCE.get('daily-brief','json')},{headers:{'Cache-Control':'public, max-age=60','X-Content-Type-Options':'nosniff'}});
   }
   if(['/refresh','/brief'].includes(url.pathname))return Response.json({error:'Generation is scheduled only; visitors cannot start jobs.'},{status:405});
   return Response.json({error:'Not found'},{status:404});
  }catch(e){console.error(JSON.stringify({event:'collector_error',message:e.message}));return Response.json({error:'Collection service unavailable'},{status:503})}
 },
 async scheduled(controller,env){
  const states=await Promise.all(SOURCES.map(s=>env.EVIDENCE.get('source:'+s.id,'json')));
  // Seed the initial slot from existing checks during migration from the old
  // rotating schedule. Subsequent runs use the strongly consistent SQL gate.
  const previousCheck=Math.max(0,...states.map(s=>Date.parse(s?.checkedAt)||0));
  if(!await env.COORDINATOR.getByName('global-hourly-collection').claim(previousCheck)){
   console.log(JSON.stringify({event:'collection_throttled'}));return;
  }
  for(const source of SOURCES){
   try{await scan(source,env)}catch(e){console.error(JSON.stringify({event:'source_error',source:source.id,message:e.message}))}
  }
  try{await buildBrief(env)}catch(e){console.error(JSON.stringify({event:'brief_error',message:e.message}))}
 }
};
