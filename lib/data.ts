import snapshot from '@/data/snapshot.json';
import type {Dataset} from './types';
import {readStoredDataset} from './site-storage';
export async function getDataset():Promise<Dataset>{
 try{return {...await readStoredDataset(),brief:snapshot.brief}}
 catch(error){console.error('Site data unavailable',error);return {...snapshot,mode:'snapshot',warning:'Site storage is temporarily unavailable. Showing the dated legacy metadata snapshot; full content is unavailable.'} as Dataset}
}
