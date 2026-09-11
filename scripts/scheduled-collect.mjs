// GitHub provides the clock; all publisher I/O and durable writes occur in Sites.
import {SOURCES} from '../lib/sources.mjs';
import {AUDIENCE} from '../lib/collection-identity.mjs';
if(process.env.GITHUB_ACTIONS!=='true'||process.env.GITHUB_REPOSITORY!=='TravisHunting/EducationNewsHubNZ'||process.env.GITHUB_REF!=='refs/heads/main')throw Error('Run only in the approved repository workflow');
const identityUrl=process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
const identityToken=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
if(!identityUrl||!identityToken)throw Error('Missing GitHub workflow identity permission');
let failed=false;
for(const source of SOURCES){
 try{
  const url=new URL(identityUrl);url.searchParams.set('audience',AUDIENCE);
  const identity=await fetch(url,{headers:{Authorization:'Bearer '+identityToken},redirect:'error',signal:AbortSignal.timeout(15000)});
  if(!identity.ok)throw Error('GitHub workflow identity unavailable');
  const {value:token}=await identity.json();if(!token)throw Error('GitHub returned no identity token');
  const response=await fetch('https://edu.travishunting.com/api/collect?source='+source.id,{method:'POST',redirect:'error',headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(540_000)});
  if(!response.ok)throw Error('Site returned HTTP '+response.status);
  const result=await response.json();console.log(source.id+': '+result.status);
  if(['error','blocked'].includes(result.status))failed=true;
 }catch(error){failed=true;console.error(source.id+': '+error.message)}
}
if(failed)process.exitCode=1;
