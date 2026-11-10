// Imports only the explicit public snapshot made by recover-public.mjs into a new installation.
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
console.log('Ready for import credentials on stdin (not echoed).');
let input = ''; for await (const chunk of process.stdin) { input += chunk; if (input.includes('\n')) break; }
const {base,username,password} = JSON.parse(input);
const backup = JSON.parse(await readFile('qa/public-backup/recovered.json','utf8'));
const origin = 'https://pibrg-guadalupe.tudoido521.workers.dev';
assert.equal(backup.source, origin);
const pictures = new Map();
for (const item of backup.items) {
  if (!item.imageUrl || !item.imageUrl.startsWith('/api/media/')) continue;
  assert.match(item.imageUrl, /^\/api\/media\/[0-9]+-[0-9a-f-]+\.(jpg|png|webp|avif)$/i);
  if (pictures.has(item.imageUrl)) continue;
  const response = await fetch(origin + item.imageUrl, {signal:AbortSignal.timeout(30000)});
  assert.equal(response.status,200);
  const bytes = new Uint8Array(await response.arrayBuffer());
  assert.ok(bytes.length && bytes.length <= 3*1024*1024);
  const extension = item.imageUrl.split('.').pop();
  pictures.set(item.imageUrl, {bytes,type:{jpg:'image/jpeg',png:'image/png',webp:'image/webp',avif:'image/avif'}[extension]});
}
let cookie='';
async function api(path,body) {
  const response=await fetch(base+path,{method:body?'POST':'GET',headers:{Origin:base,...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});
  const data=await response.json();
  assert.ok(response.ok,path+': '+JSON.stringify(data));
  return {data,headers:response.headers};
}
const auth=await api('/api/internal/login',{username,password});cookie=auth.headers.get('set-cookie').split(';')[0];
const {data:existing}=await api('/api/internal/content');
assert.equal(existing.items.filter(item=>!item.title.startsWith('QA-PERSISTENCE-')).length,0,'Refusing to import over existing content');
const pictureUrls=new Map();
for(const [original,{bytes,type}] of pictures){
 const form=new FormData();form.set('file',new File([bytes],original.split('/').pop(),{type}));
 const response=await fetch(base+'/api/internal/media',{method:'POST',headers:{Origin:base,Cookie:cookie},body:form});
 const data=await response.json();assert.equal(response.status,201,JSON.stringify(data));pictureUrls.set(original,data.url);
}
const settings=await api('/api/internal/settings');
await api('/api/internal/settings',{...backup.settings,revision:settings.data.revision});
const imported=[];
for(const item of backup.items){
 assert.equal(item.groupId,null,'Public groups must be recovered explicitly');
 const {data}=await api('/api/internal/content',{...item,id:undefined,action:'create',imageUrl:pictureUrls.get(item.imageUrl)||item.imageUrl});
 imported.push({oldId:item.id,newId:data.item.id,kind:item.kind});
}
console.log(JSON.stringify({imported,images:pictures.size,settingsImported:true,privateDataImported:false}));
