import {collect,SOURCES,dataset} from '../lib/collector.mjs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
await mkdir('data',{recursive:true});
let old;try{old=JSON.parse(await readFile('data/snapshot.json','utf8'))}catch{old={sources:[]}}
const states=[];const selected=process.argv.slice(2);
for(const source of SOURCES.filter(s=>!selected.length||selected.includes(s.id))){const state=await collect(source,old.sources.find(x=>x.id===source.id),selected.length?24:8);states.push(state);console.log(JSON.stringify({source:source.id,status:state.status,count:state.count,error:state.error}));await writeFile('data/snapshot.json',JSON.stringify(dataset([...states,...old.sources.filter(x=>!states.some(s=>s.id===x.id))]),null,2));}
console.log('Collected '+states.reduce((n,s)=>n+s.count,0)+' records.');
