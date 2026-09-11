export const DATA_URL='https://raw.githubusercontent.com/TravisHunting/EducationNewsHubNZ/collection/snapshot.json';
export function createDatasetReader(snapshot,fetcher=(...args)=>fetch(...args),clock=Date.now){
 let cached;let expires=0;let pending;
 return async()=>{
  if(cached&&clock()<expires)return cached;
  if(pending)return pending;
  pending=(async()=>{
   const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),5000);
   try{
    const response=await fetcher(DATA_URL,{redirect:'manual',signal:controller.signal});
    if(!response.ok)throw Error('Saved feed unavailable');
    if(Number(response.headers.get('content-length'))>900000)throw Error('Feed exceeds size limit');
    const reader=response.body?.getReader();if(!reader)throw Error('Empty feed');
    const chunks=[];let size=0;
    while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>900000){await reader.cancel();throw Error('Feed exceeds size limit')}chunks.push(value)}
    const bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length}
    const live=JSON.parse(new TextDecoder().decode(bytes));
    if(live.version!=='1.0'||!Array.isArray(live.records)||!live.records.length||live.records.length>2250||!Array.isArray(live.sources)||live.sources.length!==9||!Number.isFinite(Date.parse(live.generatedAt)))throw Error('Invalid saved feed');
    cached={...live,mode:'live'};expires=clock()+300000;
   }catch{
    cached={...(cached||snapshot),mode:'snapshot',warning:'Showing the last saved collection. New collection results are temporarily unavailable.'};expires=clock()+60000;
   }finally{clearTimeout(timer);pending=undefined}
   return cached;
  })();return pending;
 };
}
