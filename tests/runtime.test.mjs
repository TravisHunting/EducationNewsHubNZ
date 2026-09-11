import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Miniflare} from 'miniflare';
import {build} from 'esbuild';
test('data reader uses request options supported by the deployed Workers runtime',async()=>{
 const built=await build({stdin:{contents:`import {createDatasetReader} from './lib/dataset-reader.mjs';import snapshot from './data/snapshot.json';const read=createDatasetReader(snapshot,async(url,options)=>{new Request(url,options);return Response.json(snapshot)});export default {async fetch(){return Response.json(await read())}}`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'browser'});
 const mf=new Miniflare({modules:true,script:built.outputFiles[0].text,compatibilityDate:'2026-05-22'});
 try{const r=await mf.dispatchFetch('https://test/data');const d=await r.json();assert.equal(d.mode,'live');assert.ok(d.records.length>0);assert.equal(d.warning,undefined)}finally{await mf.dispose()}
});
