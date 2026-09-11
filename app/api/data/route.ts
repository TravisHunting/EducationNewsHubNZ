import {getDataset} from '@/lib/data';
export async function GET(){return Response.json(await getDataset(),{headers:{'Cache-Control':'public, max-age=300, stale-while-revalidate=600','X-Content-Type-Options':'nosniff'}})}
