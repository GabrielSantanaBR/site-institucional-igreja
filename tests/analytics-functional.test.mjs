import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
const directory=await mkdtemp(join(tmpdir(),'pibrg-analytics-'));
await build({entryPoints:['db/node-storage.ts'],outfile:join(directory,'storage.mjs'),bundle:true,platform:'node',format:'esm'});
const {openNodeDatabase}=await import(join(directory,'storage.mjs'));
const db=openNodeDatabase(join(directory,'pibrg.sqlite'),resolve('drizzle'));
let identity={email:'qa@example.invalid',role:'owner'};
globalThis.__analyticsDb=()=>db;
globalThis.__analyticsAuth=()=>identity&&['owner','admin'].includes(identity.role)?{identity}:{error:Response.json({error:'Unauthorized'},{status:identity?403:401})};
await build({entryPoints:['app/api/analytics/route.ts','app/api/internal/analytics/route.ts','lib/analytics.ts'],outbase:'.',outdir:directory,bundle:true,platform:'node',format:'esm',outExtension:{'.js':'.mjs'},plugins:[{name:'isolate-runtime',setup(builder){
 builder.onResolve({filter:/db\/runtime$/},()=>({path:'db',namespace:'test'}));
 builder.onResolve({filter:/lib\/internal-auth$/},()=>({path:'auth',namespace:'test'}));
 builder.onLoad({filter:/.*/,namespace:'test'},({path})=>({contents:path==='auth'?'export async function requireApiPermission(){return globalThis.__analyticsAuth()}':'export function getD1(){return globalThis.__analyticsDb()} export async function ensureDatabase(){} export function getRuntimeEnvironment(){return {IP_HASH_SALT:"qa-salt"}}'}));
}}]});
const publicApi=await import(join(directory,'app/api/analytics/route.mjs'));
const admin=await import(join(directory,'app/api/internal/analytics/route.mjs'));
const analytics=await import(join(directory,'lib/analytics.mjs'));
const event=(overrides={})=>({event:'page_view',page:'/',target:'',from:'',device:'mobile',source:'social',...overrides});
const request=(events,extra={})=>new Request('https://example.invalid/api/analytics',{method:'POST',headers:{Origin:'https://example.invalid','Content-Type':'application/json',...extra},body:JSON.stringify({events})});
const adminRequest=body=>new Request('https://example.invalid/api/internal/analytics',{method:'POST',headers:{Origin:'https://example.invalid','Content-Type':'application/json'},body:JSON.stringify(body)});
const report=async()=>{const response=await admin.GET(new Request('https://example.invalid/api/internal/analytics?days=7'));assert.equal(response.status,200);return response.json();};
try {
 await test('real SQLite aggregates views, navigation, destinations, errors and ad interactions without visitor records',async()=>{
  assert.equal((await publicApi.POST(request([event(),event({page:'/agenda',from:'/'}),event({event:'click',page:'/agenda',target:'map'}),event({event:'ad_impression',target:'bottom'}),event({event:'click',target:'bottom'}),event({event:'ad_close',target:'bottom'}),event({event:'error',target:'resource'})]))).status,204);
  const data=await report();assert.deepEqual(data.totals,{views:2,clicks:2,errors:1,adImpressions:1});
  assert.equal(data.daily.reduce((total,row)=>total+row.total,0),2);assert.equal(data.hourly.reduce((total,row)=>total+row.total,0),2);
  assert.equal(data.flows[0].label,'Início → Agenda');assert.equal(data.devices[0].label,'Celular');assert.equal(data.sources[0].total,2);
  assert.deepEqual(data.ads[0],{label:'Faixa inferior',impressions:1,clicks:1,closes:1});
  const columns=(await db.prepare('PRAGMA table_info(analytics_counts)').all()).results.map(row=>row.name);
  assert.deepEqual(columns,['day','hour','event','page','target','from_page','device','source','total']);
 });
 await test('private paths, query strings, arbitrary targets and extra personal fields are rejected before storage',async()=>{
  const count=async()=>(await db.prepare('SELECT SUM(total) AS n FROM analytics_counts').first()).n;
  const before=await count();
  for(const invalid of [event({page:'/pedido-de-oracao'}),event({page:'/fale-conosco'}),event({page:'/alteracao-de-dados'}),event({page:'/agenda?email=private@example.invalid'}),event({event:'click',target:'https://example.invalid/private'}),event({email:'private@example.invalid'}),event({from:'/pedido-de-oracao'}),event({event:'error',target:'Private message'}),event({event:'page_view',page:'/404'})])assert.equal((await publicApi.POST(request([invalid]))).status,400);
  assert.equal((await publicApi.POST(request(Array.from({length:21},()=>event())))).status,400);
  assert.equal((await publicApi.POST(request([event()],{Origin:'https://untrusted.invalid'}))).status,403);
  assert.equal(await count(),before);
 });
 await test('DNT, GPC and administrative session requests do not enter the counters',async()=>{
  const before=await report();
  for(const headers of [{DNT:'1'},{'Sec-GPC':'1'},{Cookie:'pibrg_admin_session=synthetic'}])assert.equal((await publicApi.POST(request([event()],headers))).status,204);
  assert.deepEqual((await report()).totals,before.totals);
 });
 await test('collection can pause and resume, rejects stale changes and audits only successful changes',async()=>{
  const initial=await report();
  const disabled=await admin.POST(adminRequest({enabled:false,revision:initial.revision}));assert.equal(disabled.status,200);
  assert.equal((await admin.POST(adminRequest({enabled:true,revision:initial.revision}))).status,409);
  const before=(await report()).totals;
  assert.equal((await publicApi.POST(request([event()]))).status,204);assert.deepEqual((await report()).totals,before);
  const current=await report();assert.equal(current.enabled,false);
  const results=await Promise.all([admin.POST(adminRequest({enabled:true,revision:current.revision})),admin.POST(adminRequest({enabled:true,revision:current.revision}))]);
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM audit_logs WHERE entity_type='analytics'").first()).n,2);
 });
 await test('stats and collection settings require owner/admin access',async()=>{
  identity=null;assert.equal((await admin.GET(new Request('https://example.invalid/api/internal/analytics'))).status,401);
  for(const role of ['secretary','intercessor']){identity={email:'qa@example.invalid',role};assert.equal((await admin.GET(new Request('https://example.invalid/api/internal/analytics'))).status,403);assert.equal((await admin.POST(adminRequest({enabled:false,revision:'initial'}))).status,403);}
  identity={email:'qa@example.invalid',role:'owner'};
  assert.equal((await admin.GET(new Request('https://example.invalid/api/internal/analytics?days=9999'))).status,400);
 });
 await test('anonymous ingestion rate limits bound repeated writes',async()=>{
  let limited=false;
  for(let index=0;index<7;index++){const response=await publicApi.POST(request(Array.from({length:20},()=>event())));if(response.status===429){limited=true;break;}assert.equal(response.status,204);}
  assert.equal(limited,true);
 });
 await test('retention deletes old aggregate buckets and dates follow São Paulo midnight',async()=>{
  assert.deepEqual(analytics.analyticsClock(new Date('2026-11-10T01:00:00Z')),{day:'2026-11-09',hour:22});
  await db.prepare("INSERT INTO analytics_counts (day,hour,event,page,target,from_page,device,source,total) VALUES ('2000-01-01',0,'page_view','/','','','mobile','direct',9)").run();
  const tomorrow=new Date(Date.now()+86400000);await analytics.getAnalyticsReport(90,tomorrow);
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM analytics_counts WHERE day='2000-01-01'").first()).n,0);
  assert.ok((await db.prepare('SELECT COUNT(*) AS n FROM analytics_counts').first()).n>0);
 });
}finally{await rm(directory,{recursive:true,force:true});delete globalThis.__analyticsDb;delete globalThis.__analyticsAuth;}
