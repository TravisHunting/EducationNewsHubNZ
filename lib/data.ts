import {env} from 'cloudflare:workers';
import snapshot from '@/data/snapshot.json';
import type {Dataset} from './types';
export async function getDataset():Promise<Dataset>{
 try{const response=await fetch((env.COLLECTOR_URL||'https://education-intelligence-collector.travis-hunting.workers.dev')+'/data',{signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('Collector unavailable');const live=await response.json() as Dataset;if(!Array.isArray(live.records)||!live.records.length)throw Error('Collection not yet populated');return {...live,mode:'live'};}
 catch(error){console.warn('Evidence read fallback',error instanceof Error?error.message:'unavailable');return {...snapshot,mode:'snapshot',warning:'Live collection is temporarily unavailable. Showing the dated saved collection.'} as Dataset}
}
