import {getDataset} from '@/lib/data';
export async function GET(){return Response.json(await getDataset(),{headers:{'Cache-Control':'no-store'}})}
