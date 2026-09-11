import { SOURCES, TOPICS } from './sources.mjs';

export const USER_AGENT = 'EducationIntelligenceNZ/1.0 (+https://edu.travishunting.com)';
const patterns = [/curricul|ncea|qualification|assessment|literacy|numeracy|phonics|maths|mathematics/i,/attendance|absence|engagement|truancy|disengag/i,/teacher|workforce|principal|kaiako|staffing|profession/i,/funding|budget|policy|reform|minister|government|investment|regulat/i,/disabilit|learning support|special needs|inclusive|autism|neurodiver/i,/māori|maori|pacific|pasifika|kura|reo māori|whānau|rangatahi/i,/early learning|early childhood|ece\b|kindergarten/i,/tertiary|university|universities|vocational|polytechnic|apprentice|skills|student loan/i,/research|study|report|evidence|survey|statistics|data|findings/i];
export function classify(text) { const topics = TOPICS.filter((_,i)=>patterns[i].test(text)); return topics.length?topics:['Research & evidence']; }
export function clean(text='') {
 return text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>{const v=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return v>0&&v<=0x10ffff?String.fromCodePoint(v):''}).replace(/&(amp|lt|gt|quot|apos|nbsp|rsquo|lsquo|ndash|mdash|hellip);/g,(_,n)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',rsquo:'’',lsquo:'‘',ndash:'–',mdash:'—',hellip:'…'}[n])).replace(/\s+/g,' ').trim();
}
export function allowed(raw,source) { try {const u=new URL(raw);return u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')&&source.hosts.includes(u.hostname)} catch{return false} }
export function canonical(raw,base) {const u=new URL(raw,base);u.hash='';for(const k of [...u.searchParams.keys()])if(/^(utm_|fbclid|gclid)/i.test(k))u.searchParams.delete(k);return u.toString()}

// RFC 9309 group selection, wildcard/end rules and longest-match precedence.
export function robotsDecision(text,path) {
 const groups=[];let group={agents:[],rules:[],delay:0};let hasRules=false;
 for(const raw of text.split(/\r?\n/)){const line=raw.replace(/#.*/,'').trim();const cut=line.indexOf(':');if(cut<0)continue;const k=line.slice(0,cut).toLowerCase().trim(),v=line.slice(cut+1).trim();if(k==='user-agent'){if(hasRules){groups.push(group);group={agents:[],rules:[],delay:0};hasRules=false}group.agents.push(v.toLowerCase())}else if(group.agents.length){hasRules=true;if((k==='allow'||k==='disallow')&&v)group.rules.push({allow:k==='allow',path:v});if(k==='crawl-delay')group.delay=Math.max(group.delay,Number(v)||0)}}if(group.agents.length)groups.push(group);
 const bot='educationintelligencenz';const exact=groups.filter(g=>g.agents.some(a=>a!=='*'&&bot.includes(a)));const selected=exact.length?exact:groups.filter(g=>g.agents.includes('*'));
 const rules=selected.flatMap(g=>g.rules).filter(r=>{const p=r.path.replace(/[.+?^${}()|[\]\\]/g,'\\$&').replace(/\*/g,'.*').replace(/\\\$$/,'$');return new RegExp('^'+p).test(path)}).sort((a,b)=>b.path.length-a.path.length||Number(b.allow)-Number(a.allow));
 return {allowed:rules[0]?.allow??true,delay:Math.max(1,...selected.map(g=>g.delay))};
}
export async function boundedFetch(raw,source,{robots=false,binary=false,checkRedirect=null,fetcher=fetch}={}) {
 let url=raw;
 for(let i=0;i<5;i++){
  if(!allowed(url,source))throw Error('Redirect or URL is outside the approved source hosts.');
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);
  try{
   const r=await fetcher(url,{redirect:'manual',signal:controller.signal,headers:{'User-Agent':USER_AGENT,Accept:robots?'text/plain':binary?'application/pdf, application/octet-stream, */*':'text/html, application/rss+xml, application/xml;q=0.9'}});
   if([301,302,303,307,308].includes(r.status)){const location=r.headers.get('location');if(!location)throw Error('Redirect missing location');await r.body?.cancel();url=canonical(location,url);if(!allowed(url,source))throw Error('Redirect is outside approved source hosts');if(checkRedirect)await checkRedirect(url);continue}
   if(robots&&r.status===404){await r.body?.cancel();return {text:'',url,status:r.status}}
   if(!r.ok){await r.body?.cancel();throw Error(`HTTP ${r.status}: ${r.status===403?'publisher blocked automated access':r.status===429?'publisher rate limit':'source unavailable'}`)}
   if(!robots&&!binary&&!/(text\/html|xml|text\/plain)/i.test(r.headers.get('content-type')||'')){await r.body?.cancel();throw Error('Unexpected content type')}
   if(binary&&/text\/html/i.test(r.headers.get('content-type')||'')){await r.body?.cancel();throw Error('Publisher returned a web page instead of the document')}
   const limit=robots?512000:binary?10000000:2000000;if(Number(r.headers.get('content-length'))>limit){await r.body?.cancel();throw Error('Response exceeds collection size limit')}
   const reader=r.body?.getReader();if(!reader)throw Error('Empty response');let size=0;const chunks=[];
   while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw Error('Response exceeds collection size limit')}chunks.push(value)}
   const data=new Uint8Array(size);let offset=0;for(const c of chunks){data.set(c,offset);offset+=c.length}if(binary)return {bytes:data,url,status:r.status,contentType:r.headers.get('content-type')||'application/octet-stream'};const text=new TextDecoder().decode(data);
   if(/<title>\s*(just a moment|access denied)|cf-chl-|verify you are human|_Incapsula_Resource|Incapsula incident/i.test(text))throw Error('Publisher bot verification; collection stopped.');
   return {text,url,status:r.status};
  }finally{clearTimeout(timer)}
 }
 throw Error('Too many redirects');
}
function attr(tag,key){return tag.match(new RegExp('(?:^|\\s)'+key+'\\s*=\\s*["\']([^"\']*)["\']','i'))?.[1]||''}
function meta(html,key){for(const m of html.matchAll(/<meta\b[^>]*>/gi))if((attr(m[0],'name')||attr(m[0],'property')).toLowerCase()===key)return clean(attr(m[0],'content'));return ''}
export function parseDate(raw){if(!raw)return null;const numeric=raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(20\d{2})$/);const normalized=numeric?`${numeric[3]}-${numeric[2].padStart(2,'0')}-${numeric[1].padStart(2,'0')}`:/^\d{1,2}\s+[a-z]+\s+20\d{2}$/i.test(raw.trim())?raw.trim()+' UTC':raw;const stamp=Date.parse(normalized);if(Number.isNaN(stamp)||stamp>Date.now()+86400000||stamp<Date.UTC(2000,0,1))return null;return new Date(stamp).toISOString()}
export function candidates(html,base,source){
 const main=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]||html.replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi,'');const out=[];
 for(const m of main.matchAll(/<a\b([^>]*?)href=["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi)){
  try{const url=canonical(clean(m[2]),base);if(!allowed(url,source)||url.replace(/\/$/,'')===base.replace(/\/$/,''))continue;const u=new URL(url);if(!source.paths.some(p=>u.pathname.startsWith(p))||/\.(pdf|docx?|xlsx?|csv|zip|jpg|png)$/i.test(u.pathname)||/\/(page|category|tag|search|archive)\//i.test(u.pathname))continue;
   const title=clean(m[4])||clean(attr(m[1]+m[3],'aria-label'));if(title.length<22||/^(read more|find out|view all|skip|next|previous|news and consultations)/i.test(title))continue;
   if(source.id==='counts'&&u.pathname.split('/').filter(Boolean).length<3)continue;
   out.push({url,title:title.slice(0,260)})
  }catch{/* Ignore malformed publisher links. */}
 }
 return [...new Map(out.map(r=>[r.url,r])).values()].slice(0,24);
}
export function extract(html,url,source,fallback){
 const heading=[...html.matchAll(/<h1\b([^>]*)>([\s\S]*?)<\/h1>/gi)].filter(m=>!/visually-hidden|sr-only/i.test(m[1])).map(m=>clean(m[2])).find(s=>s.length>15);
 const title=meta(html,'og:title')||heading||fallback;
 const excerpt=(meta(html,'description')||meta(html,'og:description')).slice(0,320);
 const visibleTime=clean(html.match(/<time[^>]*>([\s\S]*?)<\/time>/i)?.[1]);
 const date=meta(html,'article:published_time')||meta(html,'date')||html.match(/"datePublished"\s*:\s*"([^"]+)"/i)?.[1]||(/^\d{1,2}\/\d{1,2}\/20\d{2}$/.test(visibleTime)?visibleTime:html.match(/<time[^>]*datetime=["']([^"']+)/i)?.[1]);
 const body=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]||html;
 const specificDate=html.match(/<[^>]*class=["'][^"']*publish-date[^"']*["'][^>]*>([\s\S]*?)<\//i)?.[1];
 const textDate=clean(body).match(/(?:Published|Posted|Date|Release)\s*:?\s*(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+20\d{2})/i)?.[1];
 const documents=[];for(const a of body.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){try{const u=canonical(clean(a[1]),url);const format=new URL(u).pathname.match(/\.(pdf|docx?|xlsx?|csv)$/i)?.[1];if(format&&allowed(u,source))documents.push({url:u,format:format.toUpperCase(),title:clean(a[2])||'Publisher document'})}catch{}}
 return {title:title.replace(/\s*[|]\s*(Ministry of Education|Education Review Office|NZQA).*$/i,'').slice(0,260),excerpt,publishedAt:parseDate(date||clean(specificDate)||textDate),documents:[...new Map(documents.map(d=>[d.url,d])).values()]};
}
// Preserve all readable body text without a snippet cutoff; archive unchanged HTML too.
export function fullText(html){
 const body=html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1]||html;
 return body.replace(/<(script|style|noscript|template)\b[^>]*>[\s\S]*?<\/\1>/gi,'')
  .replace(/<\/(p|div|section|article|main|h[1-6]|li|tr|blockquote)>|<br\s*\/?\s*>/gi,'\n')
  .split('\n').map(line=>clean(line)).filter(Boolean).join('\n\n');
}
export async function recordId(url){const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(url));return Array.from(new Uint8Array(hash).slice(0,12),b=>b.toString(16).padStart(2,'0')).join('')}
export function mergeRecords(previous,incoming){const map=new Map(previous.map(r=>[r.url,r]));for(const r of incoming){const old=map.get(r.url);map.set(r.url,{...r,discoveredAt:old?.discoveredAt||r.discoveredAt})}return [...map.values()].sort((a,b)=>(b.publishedAt||b.discoveredAt).localeCompare(a.publishedAt||a.discoveredAt)).slice(0,250)}
export async function collect(source,previous,limit=5,options=/** @type {{fetcher?: typeof fetch, onRecord?: (record: import('./types').RecordItem, html: string) => Promise<import('./types').RecordItem>, storeDocument?: (doc: {url:string}, file: {bytes:Uint8Array,contentType:string,url:string}) => Promise<object>, sleep?: (ms:number)=>Promise<void>}} */ ({})){
 const {fetcher=fetch,onRecord,storeDocument,sleep=ms=>new Promise(r=>setTimeout(r,ms))}=options;
 const now=new Date().toISOString();const prior=previous?.records||[];
 try{
  const robotsByOrigin=new Map();
  const check=async(url)=>{const u=new URL(url);if(!robotsByOrigin.has(u.origin)){const r=await boundedFetch(u.origin+'/robots.txt',source,{robots:true,fetcher});robotsByOrigin.set(u.origin,r.text)}const rule=robotsDecision(robotsByOrigin.get(u.origin),u.pathname+u.search);if(!rule.allowed)throw Error('robots.txt disallows this collection path');if(rule.delay>20)throw Error('Publisher crawl delay exceeds this collector window');return rule.delay};
  const wait=async url=>{await sleep((await check(url))*1000)};
  const fetchPage=async(url,binary=false)=>{await wait(url);return boundedFetch(url,source,{binary,fetcher,checkRedirect:wait})};
  const index=await fetchPage(source.url);const list=candidates(index.text,index.url,source);if(!list.length)throw Error('No matching publication links found; publisher layout needs review');
  const known=new Set(prior.map(x=>x.url));const chosen=[...new Map([...prior.filter(r=>!r.contentKey).map(r=>({url:r.url,title:r.title})),...list.filter(x=>!known.has(x.url)),...list.filter(x=>known.has(x.url)).sort((a,b)=>(prior.find(r=>r.url===a.url)?.retrievedAt||'').localeCompare(prior.find(r=>r.url===b.url)?.retrievedAt||''))].map(r=>[r.url,r])).values()].slice(0,limit);const incoming=[];const failures=[];let documentCount=0;
  for(const c of chosen){try{
   const page=await fetchPage(c.url);const detail=extract(page.text,page.url,source,c.title);
   detail.content=fullText(page.text);if(!detail.content)throw Error('No readable publication content');
   detail.contentStatus='stored';detail.resolvedUrl=page.url;
   for(const doc of detail.documents){
    const archived=prior.find(r=>r.url===c.url)?.documents?.find(d=>d.url===doc.url&&d.storageKey);if(archived){Object.assign(doc,archived);continue}
    doc.status='unavailable';
    if(!storeDocument){doc.error='Document storage is unavailable';continue}
    if(documentCount>=6){doc.error='Document budget reached for this source run';failures.push(doc.error);continue}
    documentCount++;
    try{const file=await fetchPage(doc.url,true);Object.assign(doc,await storeDocument(doc,file),{status:'stored',retrievedAt:now})}catch(e){doc.error=e.message;failures.push(e.message)}
   }
   const topics=classify(detail.title+' '+detail.excerpt);if(source.id==='tec'&&!topics.includes('Tertiary & skills'))topics.push('Tertiary & skills');
   let record={id:await recordId(c.url),sourceId:source.id,url:c.url,...detail,topics,signal:/reform|announc|new curriculum|new qualification|funding|government|policy|budget/i.test(detail.title)?'Policy change':source.kind==='Research'?'Research':'Sector update',discoveredAt:prior.find(r=>r.url===c.url)?.discoveredAt||now,retrievedAt:now,method:'Full fetched HTML + extracted text; document download status recorded'};
   if(onRecord)record=await onRecord(record,page.text);
   incoming.push(record);
  }catch(e){failures.push(e.message)}}
  if(!incoming.length)throw Error(failures[0]||'No readable publication metadata');
  const records=mergeRecords(prior,incoming);return {id:source.id,checkedAt:now,status:failures.length?'error':'healthy',error:failures.length?`${failures.length} publication(s) unavailable: ${failures[0]}`:undefined,count:records.length,added:incoming.filter(x=>!known.has(x.url)).length,method:'HTML discovery · robots respected',records};
 }catch(e){return {id:source.id,checkedAt:now,status:/403|429|robots|verification/i.test(e.message)?'blocked':'error',error:e.message,count:prior.length,added:0,method:'HTML discovery · robots respected',records:prior}}
}
export function dataset(states){const records=[...new Map(states.flatMap(s=>s.records).map(r=>[r.url,r])).values()].sort((a,b)=>(b.publishedAt||b.discoveredAt).localeCompare(a.publishedAt||a.discoveredAt));return {version:'1.0',generatedAt:states.map(s=>s.checkedAt).sort().at(-1)||new Date().toISOString(),sources:states,records};}
export {SOURCES};
