import {env} from 'cloudflare:workers';
import type {Dataset,RecordItem,SourceState} from './types';
import {SOURCES} from './sources.mjs';
export function storage(){
 if(!env.DB||!env.BUCKET)throw Error('Site storage is unavailable');
 return {db:env.DB,bucket:env.BUCKET};
}
export async function readSource(id:string):Promise<SourceState|undefined>{
 const {db}=storage();
 const state=await db.prepare('SELECT state FROM collection_sources WHERE id = ?').bind(id).first<{state:string|null}>();
 const rows=await db.prepare('SELECT metadata FROM publications WHERE source_id = ? ORDER BY retrieved_at DESC LIMIT 250').bind(id).all<{metadata:string}>();
 const records=rows.results.map(r=>JSON.parse(r.metadata) as RecordItem);
 return state?.state?{...JSON.parse(state.state),records}:records.length?{id,records,count:records.length,added:0,checkedAt:records[0].retrievedAt,status:'error',error:'Collection did not finish; saved publications are retained.',method:'Full content archive'}:undefined;
}
export async function readStoredDataset():Promise<Dataset>{
 const sources=await Promise.all(SOURCES.map(s=>readSource(s.id)));
 const available=sources.filter((s):s is SourceState=>!!s);
 const records=available.flatMap(s=>s.records).sort((a,b)=>(b.publishedAt||b.discoveredAt).localeCompare(a.publishedAt||a.discoveredAt));
 return {version:'2.0',generatedAt:available.map(s=>s.checkedAt).sort().at(-1)||new Date().toISOString(),sources:available,records,mode:'live',...(!records.length?{warning:'Site storage is ready. The first scheduled collection has not saved any publications yet.'}:{})};
}
export async function getStoredRecord(id:string):Promise<RecordItem|null>{
 const row=await storage().db.prepare('SELECT metadata FROM publications WHERE id = ?').bind(id).first<{metadata:string}>();
 return row?JSON.parse(row.metadata):null;
}
export async function withContent(record:RecordItem):Promise<RecordItem>{
 if(!record.contentKey)return {...record,contentStatus:'unavailable'};
 const object=await storage().bucket.get(record.contentKey);
 if(!object)throw Error('Saved publication content is unavailable');
 return {...record,content:await object.text()};
}
