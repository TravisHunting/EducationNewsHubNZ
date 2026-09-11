import{build}from'esbuild';import{spawnSync}from'node:child_process';
await build({entryPoints:['tests/collector.test.ts','tests/hourly.test.ts'],outdir:'work/tests',bundle:true,format:'esm',platform:'node',target:'node22',outExtension:{'.js':'.mjs'}});
const result=spawnSync(process.execPath,['--test','work/tests/collector.test.mjs','work/tests/hourly.test.mjs'],{stdio:'inherit'});process.exitCode=result.status??1;
