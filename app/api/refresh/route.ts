import {env} from 'cloudflare:workers';
import {SOURCES} from '@/lib/sources.mjs';
export async function POST(request:Request){
 const origin=request.headers.get('Origin');if(!origin||origin!==new URL(request.url).origin)return Response.json({error:'Open the app to refresh sources.'},{status:403});
 if(!env.COLLECTOR_TOKEN)return Response.json({error:'Automatic collection runs on the hosted app. This preview uses the saved collection.'},{status:503});
 const {source}=await request.json() as {source:string};if(!SOURCES.some(s=>s.id===source))return Response.json({error:'Unknown source'},{status:400});
 try{const r=await fetch(`${env.COLLECTOR_URL}/refresh?source=${encodeURIComponent(source)}`,{method:'POST',headers:{Authorization:`Bearer ${env.COLLECTOR_TOKEN}`},signal:AbortSignal.timeout(120000)});return Response.json(await r.json(),{status:r.status})}catch{return Response.json({error:'Source scan timed out. Automatic collection will retry later.'},{status:504})}
}
