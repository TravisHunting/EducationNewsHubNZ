import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import {Miniflare} from 'miniflare';
import {build} from 'esbuild';

test('Durable Object admits one concurrent job, persists across runtime restart, and HTTP cannot scrape',async()=>{
 const built=await build({stdin:{contents:`import worker from './collector/worker.mjs';export {HourlyCollector} from './collector/coordinator.mjs';export default {fetch(request,env){if(new URL(request.url).pathname==='/test-claim')return env.COORDINATOR.getByName('global-hourly-collection').claim().then(result=>Response.json(result));return worker.fetch(request,env)}}`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'browser',external:['cloudflare:workers']});
 const persist=await mkdtemp(resolve('work/gate-test-'));
 // The installed local workerd supports this date; production uses its newer configured date.
 const options={modules:true,script:built.outputFiles[0].text,compatibilityDate:'2026-05-22',durableObjects:{COORDINATOR:{className:'HourlyCollector',useSQLite:true}},durableObjectsPersist:persist};
 let mf=new Miniflare(options);
 try{
  const results=await Promise.all(Array.from({length:50},async()=>await(await mf.dispatchFetch('https://test/test-claim')).json()));
  assert.equal(results.filter(Boolean).length,1);
  for(const path of ['/refresh','/brief']){const response=await mf.dispatchFetch('https://test'+path,{method:'POST'});assert.equal(response.status,405)}
  await mf.dispose();mf=new Miniflare(options);
  assert.equal(await(await mf.dispatchFetch('https://test/test-claim')).json(),false);
 }finally{await mf.dispose();await rm(persist,{recursive:true,force:true})}
});

