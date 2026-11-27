import test from 'node:test';
import assert from 'node:assert/strict';
import {budgetedFetch} from '../lib/collection-budget.mjs';
import {POST} from '../app/api/refresh/route';
import {readFileSync,existsSync} from 'node:fs';
test('request budget stops before an extra publisher request',async()=>{let calls=0;const fetcher=budgetedFetch(async()=>{calls++;return new Response('ok')},3);for(let i=0;i<3;i++)await fetcher('https://example.test');assert.throws(()=>fetcher('https://example.test'),/budget exhausted/);assert.equal(calls,3)});
test('public refresh remains closed',async()=>{assert.equal((await POST()).status,405)});
test('the Cloudflare concept deploys only a static evidence snapshot',()=>{
 const config=JSON.parse(readFileSync('wrangler.jsonc','utf8'));
 assert.equal(config.assets.directory,'./dist/cloudflare/assets');
 for(const key of ['main','triggers','d1_databases','r2_buckets'])assert.equal(config[key],undefined);
 assert.equal(existsSync('.github/workflows/collect.yml'),false);
 const snapshot=JSON.parse(readFileSync('public/api/data','utf8'));
 assert.equal(snapshot.mode,'snapshot');
 assert.ok(snapshot.records.length>0);
 assert.ok(snapshot.records.every(record=>!record.contentKey&&!record.htmlKey));
});
