import type {RecordItem,Dataset} from './types';
import {SOURCES} from './sources.mjs';
import {researchPrompt,topicInsights} from './insights';
export type ExportFormat='markdown'|'json'|'jsonl'|'csv';
export function exportPack(records:RecordItem[],format:ExportFormat,data:Dataset){
 const generatedAt=new Date().toISOString();const sourceIds=new Set(records.map(r=>r.sourceId));const sources=SOURCES.filter(s=>sourceIds.has(s.id));
 const enriched=records.map(r=>({...r,documents:r.documents.map((d,i)=>({...d,archiveUrl:d.storageKey?'https://edu.travishunting.com/api/publications/'+r.id+'?document='+i:undefined})),sourceName:SOURCES.find(s=>s.id===r.sourceId)?.name||r.sourceId,contentScope:r.content?'Full extracted page text; linked document download status included':'Full content unavailable for this record',archiveUrl:r.contentKey?'/api/publications/'+r.id:undefined}));
 const manifest={schemaVersion:'2.0',generatedAt,collectionLastCheckedAt:data.generatedAt,recordCount:records.length,coverage:'Selected public NZ education sources. Collection is incomplete and subject to publisher access restrictions.',datePolicy:'publishedAt is null when not explicitly supplied; discoveredAt and retrievedAt are collection timestamps.',sourcePolicies:sources.map(s=>({id:s.id,name:s.name,url:s.url,policy:s.policy})),sourceHealth:data.sources.map(s=>({id:s.id,status:s.status,checkedAt:s.checkedAt,error:s.error}))};
 if(format==='json')return {text:JSON.stringify({manifest,researchPrompt,records:enriched},null,2),mime:'application/json',ext:'json'};
 if(format==='jsonl')return {text:enriched.map(r=>JSON.stringify({schemaVersion:'1.0',exportedAt:generatedAt,...r})).join('\n')+'\n',mime:'application/x-ndjson',ext:'jsonl'};
 if(format==='csv'){const fields=['id','sourceName','title','url','publishedAt','discoveredAt','retrievedAt','signal','topics','excerpt','content','documents'];const escape=(value:unknown)=>{let t=typeof value==='object'?JSON.stringify(value):String(value??'');if(/^[\s]*[=+@-]/.test(t))t="'"+t;return '"'+t.replaceAll('"','""')+'"'};return {text:'\uFEFF'+[fields.join(','),...enriched.map(r=>fields.map(f=>escape(r[f as keyof typeof r])).join(','))].join('\r\n'),mime:'text/csv',ext:'csv'}};
 const lines=['# New Zealand Education Intelligence','',`Exported: ${generatedAt}`,`Records: ${records.length}`,`Collection last checked: ${data.generatedAt}`,'','## Scope','',manifest.coverage,'',manifest.datePolicy,'','## Research instructions','',researchPrompt,'','## Topic coverage','',...topicInsights(records).filter(x=>x.count).map(x=>`- ${x.topic}: ${x.count} records from ${x.sources} sources.`),'','## Evidence records',''];
 for(const r of enriched)lines.push(markdownEvidence(r));
 lines.push('## Source reuse notes','',...sources.map(s=>`- ${s.name}: ${s.policy}`));return {text:lines.join('\n'),mime:'text/markdown',ext:'md'};
}

export function markdownEvidence(r:RecordItem & {sourceName?:string;contentScope?:string}){
 const lines=[`### ${r.title}`,'',`- Record ID: ${r.id}`,`- Source: ${r.sourceName||SOURCES.find(s=>s.id===r.sourceId)?.name||r.sourceId}`,`- Original: ${r.url}`,`- Published: ${r.publishedAt||'Not supplied'}`,`- First collected: ${r.discoveredAt}`,`- Last retrieved: ${r.retrievedAt}`,`- Topics: ${r.topics.join('; ')}`,`- Content scope: ${r.content?'Full extracted page text':'Full content unavailable'}`,'',r.content||r.excerpt||'Full content unavailable; open the original for context.',''];
 for(const [i,d] of r.documents.entries())lines.push(`- Publisher document (${d.format}): ${d.url}`,d.storageKey?`  Saved file: https://edu.travishunting.com/api/publications/${r.id}?document=${i}`:`  Not archived: ${d.error||'Unavailable'}`);
 return lines.join('\n')+'\n\n---\n\n';
}
