import {runSource} from '@/lib/site-collection';
import {authorized} from '@/lib/github-oidc';
import {SOURCES} from '@/lib/sources.mjs';
export async function POST(request:Request){
 if(!await authorized(request))return Response.json({error:'Unauthorized'},{status:401});
 const id=new URL(request.url).searchParams.get('source');
 if(!SOURCES.some(s=>s.id===id))return Response.json({error:'Unknown source'},{status:400});
 try{return Response.json(await runSource(id!),{headers:{'Cache-Control':'no-store'}})}
 catch(error){console.error('Site collection failed',error);return Response.json({error:'Collection or storage unavailable; daily reservation remains in place.'},{status:503})}
}
