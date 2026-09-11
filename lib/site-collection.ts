import {collect,recordId,SOURCES} from './collector.mjs';
import {budgetedFetch,DAY_MS} from './collection-budget.mjs';
import {storage,readSource} from './site-storage';
import type {RecordItem,SourceState} from './types';
import snapshot from '@/data/snapshot.json';
export async function runSource(id:string){
 const source=SOURCES.find(s=>s.id===id);if(!source)throw Error('Unknown source');
 const {db,bucket}=storage();const now=Date.now();
 // Atomic reservation: duplicates and failed runs cannot reset the rolling daily gate.
 const gate=await db.prepare(`INSERT INTO collection_sources (id,next_allowed_at) VALUES (?,?)
 ON CONFLICT(id) DO UPDATE SET next_allowed_at=excluded.next_allowed_at
 WHERE collection_sources.next_allowed_at <= ? RETURNING id`).bind(id,now+DAY_MS,now).first();
 if(!gate)return {source:id,status:'cooldown'};
 let previous=await readSource(id);
 if(!previous){
  previous=snapshot.sources.find(s=>s.id===id) as SourceState|undefined;
  if(previous?.records.length)await db.batch(previous.records.map(record=>db.prepare('INSERT INTO publications (id,source_id,retrieved_at,metadata) VALUES (?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(record.id,id,record.retrievedAt,JSON.stringify(record))));
 }
 const deadline=Date.now()+480_000;
 const fetcher=budgetedFetch((url:RequestInfo|URL,options?:RequestInit)=>{
  if(Date.now()>deadline)throw Error('Source collection deadline reached');
  return fetch(url,options);
 },45);
 const result=await collect(source,previous,5,{
  fetcher,
  storeDocument:async(doc:{url:string},file:{bytes:Uint8Array;contentType:string;url:string})=>{
   const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(file.bytes))),b=>b.toString(16).padStart(2,'0')).join('');
   const key=`documents/${await recordId(doc.url)}/${digest}`;
   await bucket.put(key,file.bytes,{httpMetadata:{contentType:file.contentType}});
   return {storageKey:key,bytes:file.bytes.byteLength,sha256:digest,resolvedUrl:file.url};
  },
  onRecord:async(record:RecordItem,html:string)=>{
   const revision=await recordId(html);const prefix=`publications/${record.id}/${revision}`;
   await bucket.put(prefix+'/original.html',html,{httpMetadata:{contentType:'text/html; charset=utf-8'}});
   await bucket.put(prefix+'/content.txt',record.content||'',{httpMetadata:{contentType:'text/plain; charset=utf-8'}});
   const {content,...metadata}=record;
   const saved={...metadata,contentStatus:'stored' as const,contentKey:prefix+'/content.txt',htmlKey:prefix+'/original.html',contentCharacters:content?.length||0};
   await db.prepare(`INSERT INTO publications (id,source_id,retrieved_at,metadata) VALUES (?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET retrieved_at=excluded.retrieved_at,metadata=excluded.metadata`).bind(record.id,id,record.retrievedAt,JSON.stringify(saved)).run();
   return saved;
  },
 });
 const {records,...state}=result;
 await db.prepare('UPDATE collection_sources SET state = ? WHERE id = ?').bind(JSON.stringify(state),id).run();
 return {...state,source:id,saved:records.filter((r:RecordItem)=>r.contentStatus==='stored').length};
}
