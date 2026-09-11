import test from 'node:test';
import assert from 'node:assert/strict';
import {robotsDecision,allowed,extract,mergeRecords,parseDate,boundedFetch,collect,SOURCES} from '../lib/collector.mjs';
import {exportPack} from '../lib/exports';
import type {Dataset,RecordItem} from '../lib/types';
test('robots uses longest matching rule, groups and wildcard endings',()=>{
 const text='User-agent: *\nDisallow: /private/\nAllow: /private/public/\nDisallow: /*.pdf$\n\nUser-agent: AnotherBot\nDisallow: /';
 assert.equal(robotsDecision(text,'/private/report').allowed,false);
 assert.equal(robotsDecision(text,'/private/public/report').allowed,true);
 assert.equal(robotsDecision(text,'/documents/report.pdf').allowed,false);
 assert.equal(robotsDecision(text,'/documents/report.pdf?download=1').allowed,true);
 assert.equal(robotsDecision('User-agent: *\nDisallow: /\nUser-agent: EducationIntelligenceNZ\nAllow: /news','/news').allowed,true);
});
test('collection excludes credential URLs, alternate protocols and off-list hosts',()=>{
 const source=SOURCES[0];assert.equal(allowed('https://www.education.govt.nz/news/story',source),true);
 for(const url of ['http://www.education.govt.nz/news','https://www.education.govt.nz.evil.test/news','https://user:pass@www.education.govt.nz/news','https://127.0.0.1/news','https://www.education.govt.nz:8443/news'])assert.equal(allowed(url,source),false);
});
test('extracts visible headings and explicit dates, with safe document URLs',()=>{
 const html='<h1 class="visually-hidden">Header</h1><h1>New education qualification changes announced</h1><div class="page-hero__publish-date">28 August 2026</div><meta name="description" content="A change &amp; its context."><main><a href="https://evil.test/report.pdf">Wrong</a><a href="/report.pdf">Public report</a></main>';
 const result=extract(html,'https://www.education.govt.nz/news/story',SOURCES[0],'Fallback title');
 assert.equal(result.title,'New education qualification changes announced');assert.equal(result.publishedAt,'2026-08-28T00:00:00.000Z');assert.equal(result.excerpt,'A change & its context.');assert.equal(result.documents.length,1);
 assert.equal(parseDate('Not dated'),null);assert.equal(parseDate('2099-01-01'),null);
});
test('duplicate URLs retain original discovery time while updating metadata',()=>{
 const prior=[{url:'https://example.test/item',title:'Old',discoveredAt:'2026-01-01',publishedAt:null}];
 const next=mergeRecords(prior,[{...prior[0],title:'New',discoveredAt:'2026-09-11'}]);assert.equal(next.length,1);assert.equal(next[0].title,'New');assert.equal(next[0].discoveredAt,'2026-01-01');
});
test('rejects off-list redirects before contacting the target',async()=>{
 const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;return new Response(null,{status:302,headers:{location:'https://127.0.0.1/secret'}})};
 try{await assert.rejects(()=>boundedFetch(SOURCES[0].url,SOURCES[0]),/outside approved/);assert.equal(calls,1)}finally{globalThis.fetch=original}
});
test('robots blocks preserve existing records',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>new Response('User-agent: *\nDisallow: /',{headers:{'Content-Type':'text/plain'}});
 try{const previous={records:[{id:'evidence',url:'https://www.education.govt.nz/news/retained'}]};const r=await collect(SOURCES[0],previous);assert.equal(r.status,'blocked');assert.equal(r.records[0].id,'evidence')}finally{globalThis.fetch=original}
});
test('streaming size limit applies even without content length',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>new Response(new Uint8Array(2000001),{headers:{'Content-Type':'text/html'}});
 try{await assert.rejects(()=>boundedFetch(SOURCES[0].url,SOURCES[0]),/size limit/)}finally{globalThis.fetch=original}
});
test('export formats preserve provenance, null dates and CSV formula safety',()=>{
 const record:RecordItem={id:'1',sourceId:'ncea',title:'=HYPERLINK("unsafe")',url:'https://ncea.education.govt.nz/whats-new/item',publishedAt:null,discoveredAt:'2026-09-01T00:00:00Z',retrievedAt:'2026-09-11T00:00:00Z',topics:['Curriculum & assessment'],signal:'Policy change',excerpt:'Quoted "text", with commas',documents:[],method:'test'};
 const data:Dataset={version:'1.0',generatedAt:record.retrievedAt,sources:[],records:[record]};
 const json=JSON.parse(exportPack([record],'json',data).text);assert.equal(json.records[0].publishedAt,null);assert.equal(json.manifest.recordCount,1);assert.equal(json.records[0].url,record.url);
 assert.match(exportPack([record],'csv',data).text,/"'=HYPERLINK/);assert.match(exportPack([record],'markdown',data).text,/Published: Not supplied/);
 assert.equal(JSON.parse(exportPack([record],'jsonl',data).text.trim()).id,'1');
});
