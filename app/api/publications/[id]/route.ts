import {getStoredRecord,storage,withContent} from '@/lib/site-storage';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!/^[a-f0-9]{24}$/.test(id))return Response.json({error:'Not found'},{status:404});
 try{
  const record=await getStoredRecord(id);if(!record)return Response.json({error:'Not yet archived'},{status:404});
  const query=new URL(request.url).searchParams;
  if(query.has('document')||query.get('format')==='html'){
   const index=query.get('document');
   const key=index!==null&&/^\d+$/.test(index)?record.documents[Number(index)]?.storageKey:index===null?record.htmlKey:undefined;
   if(!key)return Response.json({error:'File has not been archived'},{status:404});
   const object=await storage().bucket.get(key);if(!object)return Response.json({error:'Archive unavailable'},{status:503});
   // Download only: never execute publisher HTML on the Site origin.
   return new Response(object.body,{headers:{'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename="${id}${index===null?'.html':'.'+record.documents[Number(index)].format.toLowerCase()}"`,'X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox; default-src 'none'",'Cache-Control':'public, max-age=300'}});
  }
  return Response.json(await withContent(record),{headers:{'Cache-Control':'public, max-age=300'}});
 }catch(error){console.error('Archive read failed',error);return Response.json({error:'Saved content is temporarily unavailable'},{status:503})}
}
