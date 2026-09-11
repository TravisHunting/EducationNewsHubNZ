import {REPOSITORY,REPOSITORY_ID,OWNER_ID,AUDIENCE,ISSUER,WORKFLOW} from './collection-identity.mjs';
const bytes=(value:string)=>Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
const decode=(value:string)=>JSON.parse(new TextDecoder().decode(bytes(value))) as Record<string,unknown>;
export async function authorized(request:Request){
 try{
  const token=request.headers.get('authorization')?.match(/^Bearer ([A-Za-z0-9_.-]+)$/)?.[1];
  if(!token||token.length>16000)return false;
  const parts=token.split('.');if(parts.length!==3)return false;
  const header=decode(parts[0]),claims=decode(parts[1]);const now=Date.now()/1000;
  if(header.alg!=='RS256'||typeof header.kid!=='string'||header.crit!==undefined)return false;
  if(claims.iss!==ISSUER||claims.aud!==AUDIENCE||claims.repository!==REPOSITORY||claims.repository_id!==REPOSITORY_ID||claims.repository_owner_id!==OWNER_ID||claims.workflow_ref!==WORKFLOW||claims.ref!=='refs/heads/main'||claims.repository_visibility!=='public'||!['schedule','workflow_dispatch'].includes(String(claims.event_name)))return false;
  if(typeof claims.exp!=='number'||typeof claims.nbf!=='number'||typeof claims.iat!=='number'||claims.exp<=now||claims.nbf>now+30||claims.iat>now+30||now-claims.iat>600)return false;
  const subjects=[`repo:${REPOSITORY}:ref:refs/heads/main`,`repo:TravisHunting@${OWNER_ID}/EducationNewsHubNZ@${REPOSITORY_ID}:ref:refs/heads/main`];
  if(!subjects.includes(String(claims.sub)))return false;
  // The key URL is fixed; JWT-supplied URLs and algorithms never control verification.
  const response=await fetch(ISSUER+'/.well-known/jwks',{redirect:'manual',signal:AbortSignal.timeout(5000)});
  if(!response.ok)return false;
  const reader=response.body?.getReader();if(!reader)return false;
  let text='',size=0;const decoder=new TextDecoder();
  while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>64000){await reader.cancel();return false}text+=decoder.decode(part.value,{stream:true})}text+=decoder.decode();
  const jwks=JSON.parse(text) as {keys:(JsonWebKey&{kid?:string})[]};
  const jwk=jwks.keys.find(k=>k.kid===header.kid&&k.kty==='RSA'&&k.use==='sig'&&k.alg==='RS256');if(!jwk)return false;
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  return crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,bytes(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1]));
 }catch{return false}
}
