export const DAY_MS=86_400_000;
export const MAX_SNAPSHOT_BYTES=900_000;
export const MAX_REQUESTS=180;
export function canCollect(state,now=Date.now()) {
 const next=Date.parse(state.nextAllowedAt);
 // Missing or malformed state is a stop condition, never an automatic reset.
 const last=state.lastStartedAt===undefined?null:Date.parse(state.lastStartedAt);
 if(last!==null&&!Number.isFinite(last))return false;
 // Honor the new interval even when migrating a saved one-hour reservation.
 return Number.isFinite(next)&&now>=Math.max(next,last===null?0:last+DAY_MS);
}
export function reserveState(state,now=Date.now()) {
 if(!canCollect(state,now))throw Error('Daily collection slot is unavailable');
 return {version:1,lastStartedAt:new Date(now).toISOString(),nextAllowedAt:new Date(now+DAY_MS).toISOString()};
}
export function boundSnapshot(input) {
 const states=input.sources.map(s=>({...s,records:s.records.slice(0,250)}));
 let output;
 do {
  const records=[...new Map(states.flatMap(s=>s.records).map(r=>[r.url,r])).values()].sort((a,b)=>(b.publishedAt||b.discoveredAt).localeCompare(a.publishedAt||a.discoveredAt));
  output={version:'1.0',generatedAt:input.generatedAt,sources:states.map(s=>({...s,count:s.records.length})),records,...(input.brief?{brief:input.brief}: {})};
  if(new TextEncoder().encode(JSON.stringify(output)).byteLength<=MAX_SNAPSHOT_BYTES)return output;
  const largest=[...states].sort((a,b)=>b.records.length-a.records.length)[0];
  if(!largest?.records.length)throw Error('Snapshot metadata exceeds storage limit');
  largest.records.splice(-Math.max(1,Math.ceil(largest.records.length/10)));
 }while(true);
}
export function budgetedFetch(fetcher,max=MAX_REQUESTS) {
 let used=0;
 return (url,options)=>{
  if(++used>max)throw Error('Collection network request budget exhausted');
  return fetcher(url,options);
 };
}

