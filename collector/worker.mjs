import {SOURCES,collect,dataset} from '../lib/collector.mjs';
import {buildBrief} from './brief.mjs';
async function scan(source,env,force=false){
 const previous=await env.EVIDENCE.get('source:'+source.id,'json');
 if(!force&&previous&&Date.now()-Date.parse(previous.checkedAt)<3600000)return {...previous,cached:true};
 const result=await collect(source,previous,5);
 await env.EVIDENCE.put('source:'+source.id,JSON.stringify(result));
 console.log(JSON.stringify({event:'source_scan',source:source.id,status:result.status,added:result.added,error:result.error}));return result;
}
export default {
 async fetch(request,env){
  try{
   const url=new URL(request.url);
   if(request.method==='GET'&&url.pathname==='/health')return Response.json({service:'education-intelligence-collector',status:'ok'});
   // Read access is public: this endpoint contains only collected public-source metadata.
   if(request.method==='GET'&&url.pathname==='/data'){
    const states=(await Promise.all(SOURCES.map(s=>env.EVIDENCE.get('source:'+s.id,'json')))).filter(Boolean);
    return Response.json({...dataset(states),brief:await env.EVIDENCE.get('daily-brief','json')},{headers:{'Cache-Control':'public, max-age=60','X-Content-Type-Options':'nosniff'}});
   }
   if(request.method==='POST'&&['/refresh','/brief'].includes(url.pathname)){
    const provided=new TextEncoder().encode(request.headers.get('Authorization')||'');const expected=new TextEncoder().encode('Bearer '+env.COLLECTOR_TOKEN);
    if(!env.COLLECTOR_TOKEN||provided.length!==expected.length||!crypto.subtle.timingSafeEqual(provided,expected))return Response.json({error:'Unauthorized'},{status:401});
    if(url.pathname==='/brief')return Response.json(await buildBrief(env));
    const source=SOURCES.find(s=>s.id===url.searchParams.get('source'));if(!source)return Response.json({error:'Unknown source'},{status:400});
    const {records,...status}=await scan(source,env);return Response.json(status);
   }
   return Response.json({error:'Not found'},{status:404});
  }catch(e){console.error(JSON.stringify({event:'collector_error',message:e.message}));return Response.json({error:'Collection service unavailable'},{status:503})}
 },
 async scheduled(controller,env){const slot=Math.floor(controller.scheduledTime/900000)%SOURCES.length;await scan(SOURCES[slot],env,true);try{await buildBrief(env)}catch(e){console.error(JSON.stringify({event:'brief_error',message:e.message}))}}
};
