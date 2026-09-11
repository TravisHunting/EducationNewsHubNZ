import snapshot from '@/data/snapshot.json';
import type {Dataset} from './types';
import {createDatasetReader} from './dataset-reader.mjs';
// Public reads cannot reach the retired collector or select an arbitrary URL.
const read=createDatasetReader(snapshot);
export async function getDataset():Promise<Dataset>{return await read() as Dataset}
