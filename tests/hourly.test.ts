import test from 'node:test';
import assert from 'node:assert/strict';
import {canCollect,reserveState,DAY_MS,budgetedFetch,boundSnapshot,MAX_SNAPSHOT_BYTES} from '../lib/collection-budget.mjs';
import {createDatasetReader,DATA_URL} from '../lib/dataset-reader.mjs';
import snapshot from '../data/snapshot.json';
import {POST} from '../app/api/refresh/route';
import {readFileSync,existsSync} from 'node:fs';

test('persisted reservation enforces the boundary and malformed state fails closed',()=>{
 const now=1_800_000_000_000;const state=reserveState({nextAllowedAt:new Date(now).toISOString()},now);
 assert.equal(canCollect(state,now),false);assert.equal(canCollect(state,now+DAY_MS-1),false);assert.equal(canCollect(JSON.parse(JSON.stringify(state)),now+DAY_MS),true);
 assert.equal(canCollect({},now),false);assert.equal(canCollect({nextAllowedAt:'broken'},now),false);assert.throws(()=>reserveState(state,now));
});
test('old hourly reservations also enforce a full day since the previous run',()=>{
 const now=1_800_000_000_000;const legacy={lastStartedAt:new Date(now).toISOString(),nextAllowedAt:new Date(now+3600000).toISOString()};
 assert.equal(canCollect(legacy,now+3600000),false);assert.equal(canCollect(legacy,now+DAY_MS-1),false);assert.equal(canCollect(legacy,now+DAY_MS),true);
 assert.equal(canCollect({...legacy,lastStartedAt:'invalid'},now+DAY_MS),false);
});
test('network budget stops before making an extra request',async()=>{
 let calls=0;const fetcher=budgetedFetch(async()=>{calls++;return new Response('ok')},3);
 for(let i=0;i<3;i++)await fetcher('https://example.test');
 assert.throws(()=>fetcher('https://example.test'),/budget exhausted/);assert.equal(calls,3);
});
test('storage stays below byte ceiling while preserving valid source counts',()=>{
 const large={...snapshot,sources:snapshot.sources.map(s=>({...s,records:Array.from({length:300},(_,i)=>({...snapshot.records[0],id:s.id+i,url:'https://example.test/'+s.id+'/'+i,excerpt:'x'.repeat(2000)}))}))};
 const bounded=boundSnapshot(large);
 assert.ok(Buffer.byteLength(JSON.stringify(bounded))<=MAX_SNAPSHOT_BYTES);assert.ok(bounded.records.length>0);
 assert.ok(bounded.sources.every((s:any)=>s.count===s.records.length&&s.count<=250));
});
test('concurrent public reads coalesce and cache only the fixed GitHub URL',async()=>{
 let calls=0;let now=1000;
 const reader=createDatasetReader(snapshot,async(url:string)=>{assert.equal(url,DATA_URL);calls++;return Response.json(snapshot)},()=>now);
 const results=await Promise.all(Array.from({length:50},()=>reader()));assert.equal(calls,1);assert.ok(results.every(r=>r.records.length===snapshot.records.length));
 now+=299999;await reader();assert.equal(calls,1);now+=2;await reader();assert.equal(calls,2);
});
test('oversized and unavailable feeds fall back with bounded negative caching',async()=>{
 let calls=0;const reader=createDatasetReader(snapshot,async()=>{calls++;return new Response(new Uint8Array(900001))});
 const result=await reader();assert.equal(result.mode,'snapshot');assert.equal(result.records.length,snapshot.records.length);await reader();assert.equal(calls,1);
});
test('public refresh never makes an outgoing request',async()=>{
 const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('Unexpected collection')};
 try{const results=await Promise.all(Array.from({length:50},()=>POST()));assert.ok(results.every(r=>r.status===405));assert.equal(calls,0)}finally{globalThis.fetch=original}
});
test('deployment cannot recreate paid collector and workflow uses only a free public runner',()=>{
 assert.equal(existsSync('collector/wrangler.jsonc'),false);
 const manifest=JSON.parse(readFileSync('.openai/hosting.json','utf8'));assert.equal(manifest.d1,null);assert.equal(manifest.r2,null);
 const workflow=readFileSync('.github/workflows/collect.yml','utf8');assert.match(workflow,/github.event.repository.private == false/);assert.match(workflow,/runs-on: ubuntu-24.04/);assert.match(workflow,/timeout-minutes: 12/);assert.match(workflow,/cron: '17 17 \* \* \*'/);assert.match(workflow,/package-manager-cache: false/);
 assert.doesNotMatch(workflow,/pull_request:|push:|upload-artifact@|actions\/cache@|CLOUDFLARE_API_TOKEN/);
});
