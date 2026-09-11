import {collect,SOURCES,dataset} from '../lib/collector.mjs';
import {canCollect,reserveState,boundSnapshot,budgetedFetch} from '../lib/collection-budget.mjs';

const REPO='TravisHunting/EducationNewsHubNZ';
if(process.env.GITHUB_ACTIONS!=='true'||process.env.GITHUB_REPOSITORY!==REPO||process.env.GITHUB_REF!=='refs/heads/main')throw Error('Run only in the approved repository workflow');
const token=process.env.GITHUB_TOKEN;if(!token)throw Error('Missing workflow credential');
const nativeFetch=globalThis.fetch;
// A process deadline bounds I/O; the independent 12-minute job timeout also stops CPU loops.
const deadline=setTimeout(()=>{console.error('Collection stopped at its 10-minute hard deadline');process.exit(1)},600_000);
async function api(path,method='GET',body) {
 const r=await nativeFetch('https://api.github.com/repos/'+REPO+path,{method,redirect:'error',headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20_000)});
 if(!r.ok)throw Error('Repository operation failed: HTTP '+r.status);
 return r.json();
}
const decode=x=>JSON.parse(Buffer.from(x.content.replace(/\s/g,''),'base64').toString('utf8'));
const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64');
try {
 const repo=await api('');if(repo.private!==false)throw Error('Paid/private repository execution is disabled');
 const gate=await api('/contents/state.json?ref=collection');const state=decode(gate);
 if(!canCollect(state)){console.log('Daily cooldown active; no sources contacted.');process.exitCode=0;}
 else {
  // GitHub rejects a stale SHA. This persisted compare-and-swap must succeed
  // before any publisher fetch, and a failed job never refunds its reservation.
  await api('/contents/state.json','PUT',{branch:'collection',sha:gate.sha,message:'Reserve daily collection slot',content:encode(reserveState(state))});
  const saved=await api('/contents/snapshot.json?ref=collection');const previous=decode(saved);
  globalThis.fetch=budgetedFetch(nativeFetch);
  const states=[];
  for(const source of SOURCES){
   states.push(await collect(source,previous.sources.find(s=>s.id===source.id),5));
   console.log(source.id+': '+states.at(-1).status);
  }
  const next=boundSnapshot({...dataset(states),brief:previous.brief});
  if(!next.records.length)throw Error('Refusing to replace saved data with an empty collection');
  await api('/contents/snapshot.json','PUT',{branch:'collection',sha:saved.sha,message:'Update bounded education collection',content:encode(next)});
  console.log('Published '+next.records.length+' records. No paid cloud services were used.');
 }
}finally{clearTimeout(deadline);globalThis.fetch=nativeFetch}

