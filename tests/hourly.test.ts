import test from 'node:test';
import assert from 'node:assert/strict';
import {budgetedFetch} from '../lib/collection-budget.mjs';
import {POST} from '../app/api/refresh/route';
import {readFileSync,existsSync} from 'node:fs';
test('request budget stops before an extra publisher request',async()=>{let calls=0;const fetcher=budgetedFetch(async()=>{calls++;return new Response('ok')},3);for(let i=0;i<3;i++)await fetcher('https://example.test');assert.throws(()=>fetcher('https://example.test'),/budget exhausted/);assert.equal(calls,3)});
test('public refresh remains closed',async()=>{assert.equal((await POST()).status,405)});
test('GitHub only triggers and Sites owns both storage bindings',()=>{
 const manifest=JSON.parse(readFileSync('.openai/hosting.json','utf8'));assert.equal(manifest.d1,'DB');assert.equal(manifest.r2,'BUCKET');assert.equal(existsSync('collector/wrangler.jsonc'),false);
 const workflow=readFileSync('.github/workflows/collect.yml','utf8');assert.match(workflow,/contents: read/);assert.match(workflow,/id-token: write/);assert.doesNotMatch(workflow,/contents: write|CLOUDFLARE_API_TOKEN/);
 const trigger=readFileSync('scripts/scheduled-collect.mjs','utf8');assert.doesNotMatch(trigger,/collector.mjs|api.github.com|snapshot.json/);assert.match(trigger,/edu.travishunting.com\/api\/collect/);
});
