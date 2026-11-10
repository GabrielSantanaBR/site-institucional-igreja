import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
let server,directory,configuration,cookie='',originalEnabled,lastRevision;
async function api(path,body,{auth=true,expected=200,headers={}}={}){
 const response=await fetch(configuration.base+path,{method:body?'POST':'GET',headers:{Origin:configuration.base,...(auth&&cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{}),...headers},body:body?JSON.stringify(body):undefined,redirect:'manual',signal:AbortSignal.timeout(30000)});
 const text=await response.text();assert.equal(response.status,expected,path+': HTTP '+response.status);let data;try{data=JSON.parse(text);}catch{data=text;}return {data,headers:response.headers};
}
async function config(){return (await api('/api/internal/analytics?days=7')).data;}
async function setCollection(enabled,revision){const {data}=await api('/api/internal/analytics',{enabled,revision});lastRevision=data.revision;return data;}
try{
 if(process.argv.includes('--local')){
  directory=await mkdtemp(join(tmpdir(),'pibrg-analytics-http-'));
  configuration={base:'http://127.0.0.1:3101',username:'qa-owner',password:randomBytes(24).toString('base64url')};
  server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3101'],{env:{...process.env,NODE_ENV:'production',APP_RUNTIME:'node',DATA_DIR:directory,PUBLIC_SITE_URL:configuration.base,SITE_STAGE:'staging',ADMIN_USERNAME:configuration.username,ADMIN_PASSWORD:configuration.password,ADMIN_SESSION_SECRET:randomBytes(48).toString('base64url'),IP_HASH_SALT:randomBytes(32).toString('base64url'),PRAYER_ENCRYPTION_KEY:randomBytes(32).toString('base64')},stdio:['ignore','pipe','pipe']});
  let logs='';server.stdout.on('data',chunk=>logs+=chunk);server.stderr.on('data',chunk=>logs+=chunk);
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Server not ready: '+logs.slice(-500))),20000);server.stdout.on('data',()=>{if(logs.includes('Ready in')){clearTimeout(timer);resolve();}});});
 }else{
  console.log('Ready for analytics QA credentials on stdin (not echoed).');
  let input='';for await(const chunk of process.stdin){input+=chunk;if(input.includes('\n'))break;}configuration=JSON.parse(input);
 }
 await api('/api/health');await api('/privacidade',undefined,{auth:false});
 await api('/api/internal/analytics',undefined,{auth:false,expected:401});
 const login=await api('/api/internal/login',{username:configuration.username,password:configuration.password});cookie=login.headers.get('set-cookie').split(';')[0];
 const page=await api('/alteracao-de-dados');assert.match(page.data,/Estatísticas/);
 let current=await config();originalEnabled=current.enabled;
 if(!current.enabled){await setCollection(true,current.revision);current=await config();}
 const before=current.totals.views;
 await api('/',undefined,{auth:false});
 const event={event:'page_view',page:'/',target:'',from:'',device:'desktop',source:'direct'};
 await api('/api/analytics',{events:[event]},{auth:false,expected:204});
 current=await config();assert.ok(current.totals.views>=before+1);
 assert.equal(current.daily.reduce((total,row)=>total+row.total,0),current.totals.views);
 await api('/api/analytics',{events:[{...event,page:'/pedido-de-oracao'}]},{auth:false,expected:400});
 await api('/api/analytics',{events:[{...event,email:'synthetic@example.invalid'}]},{auth:false,expected:400});
 await api('/api/analytics',{events:[event]},{auth:false,headers:{Origin:'https://untrusted.invalid'},expected:403});
 await api('/api/analytics',{events:[event]},{auth:false,headers:{DNT:'1'},expected:204});
 const stale=current.revision;await setCollection(false,current.revision);
 const paused=await config();assert.equal(paused.enabled,false);
 await api('/api/analytics',{events:[event]},{auth:false,expected:204});
 assert.equal((await config()).totals.views,paused.totals.views);
 await api('/api/internal/analytics',{enabled:true,revision:stale},{expected:409});
 current=await config();await setCollection(originalEnabled,current.revision);
 assert.equal((await config()).enabled,originalEnabled);originalEnabled=undefined;
 console.log('PASS: authenticated statistics, real collection/reporting, privacy rejection, DNT, pause/resume and stale changes. Original collection setting restored.');
}finally{
 if(originalEnabled!==undefined&&cookie){const current=await config();if(current.revision===lastRevision&&current.enabled!==originalEnabled)await setCollection(originalEnabled,current.revision);}
 if(server){server.kill();await new Promise(resolve=>server.on('exit',resolve));}
 if(directory)await rm(directory,{recursive:true,force:true});
}
