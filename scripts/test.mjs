import{build}from'esbuild';import{spawnSync}from'node:child_process';
await build({entryPoints:['tests/collector.test.ts'],outfile:'work/collector-tests.mjs',bundle:true,format:'esm',platform:'node',target:'node22'});
const result=spawnSync(process.execPath,['--test','work/collector-tests.mjs'],{stdio:'inherit'});process.exitCode=result.status??1;
