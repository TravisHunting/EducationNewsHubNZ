import {getDataset} from '@/lib/data';
import {withContent} from '@/lib/site-storage';
import {exportPack,markdownEvidence,type ExportFormat} from '@/lib/exports';
import type {RecordItem} from '@/lib/types';
async function respond(request:Request,ids?:string[]){
 const u=new URL(request.url);const format=(u.searchParams.get('format')||'markdown') as ExportFormat;
 if(!['markdown','json','jsonl','csv'].includes(format))return Response.json({error:'Unsupported format'},{status:400});
 const data=await getDataset();const topic=u.searchParams.get('topic');const selection=ids?new Set(ids):null;
 const records=data.records.filter(r=>(!topic||r.topics.includes(topic))&&(!selection||selection.has(r.id)));
 const empty=exportPack([],format,data);
 const manifestPack=exportPack(records.map(({content,...r})=>r),format==='csv'?'json':format,data);
 async function* chunks(){
  if(format==='json'){const header=JSON.parse(manifestPack.text);delete header.records;yield JSON.stringify(header).slice(0,-1)+',"records":['}
  if(format==='markdown')yield manifestPack.text.split('## Evidence records')[0]+'## Evidence records\n\n';
  if(format==='csv')yield empty.text+'\r\n';
  let first=true;
  for(const metadata of records){
   let record:RecordItem;
   try{record=await withContent(metadata)}catch{record={...metadata,contentStatus:'unavailable'}}
   const rendered=exportPack([record],format,data).text;
   if(format==='json')yield (first?'':',')+JSON.stringify(JSON.parse(rendered).records[0]);
   if(format==='jsonl')yield rendered;
   if(format==='csv')yield rendered.slice(rendered.indexOf('\r\n')+2)+'\r\n';
   if(format==='markdown')yield markdownEvidence(record);
   first=false;
  }
  if(format==='json')yield ']}';
 }
 const iterator=chunks();const encoder=new TextEncoder();
 const body=new ReadableStream({async pull(controller){try{const next=await iterator.next();if(next.done)controller.close();else controller.enqueue(encoder.encode(next.value))}catch(error){controller.error(error)}},async cancel(){await iterator.return(undefined)}});
 return new Response(body,{headers:{'Content-Type':empty.mime+'; charset=utf-8','Content-Disposition':'attachment; filename="nz-education-intelligence.'+empty.ext+'"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
export async function GET(request:Request){return respond(request)}
export async function POST(request:Request){
 // Read-only selection, capped before parsing; no collection or writes.
 const reader=request.body?.getReader();if(!reader)return Response.json({error:'Missing selection'},{status:400});
 const chunks:Uint8Array[]=[];let bytes=0;
 while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.length;if(bytes>100000){await reader.cancel();return Response.json({error:'Selection too large'},{status:413})}chunks.push(part.value)}
 try{const text=chunks.map(c=>new TextDecoder().decode(c)).join('');const {ids}=JSON.parse(text);if(!Array.isArray(ids)||ids.length>2250||ids.some(id=>typeof id!=='string'||!/^[a-f0-9]{24}$/.test(id)))return Response.json({error:'Invalid selection'},{status:400});return respond(request,ids)}catch{return Response.json({error:'Invalid selection'},{status:400})}
}
