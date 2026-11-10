import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {JSDOM} from 'jsdom';
import React,{act} from 'react';
const directory=await mkdtemp(join(resolve('node_modules'),'.analytics-ui-'));
await build({entryPoints:['app/components/PublicAnalytics.tsx','app/components/AnalyticsDashboard.tsx','app/components/AnalyticsPrivacy.tsx'],outdir:directory,bundle:true,format:'esm',platform:'node',jsx:'automatic',external:['react','react-dom'],outExtension:{'.js':'.mjs'}});
const {PublicAnalytics}=await import(join(directory,'PublicAnalytics.mjs'));
const {AnalyticsDashboard}=await import(join(directory,'AnalyticsDashboard.mjs'));
const {AnalyticsPrivacy}=await import(join(directory,'AnalyticsPrivacy.mjs'));
const dom=new JSDOM('<main><a id="public" href="/agenda?email=private@example.invalid">Agenda</a><a id="private" href="/pedido-de-oracao?name=private">Oração</a><a id="social" href="https://www.instagram.com/pibrg/?secret=private">Instagram</a></main><div id="root"></div>',{url:'https://example.invalid/',referrer:'https://www.instagram.com/?secret=private'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,Element:dom.window.Element,Event:dom.window.Event,DOMException:dom.window.DOMException,localStorage:dom.window.localStorage,IS_REACT_ACT_ENVIRONMENT:true});
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
document.addEventListener('click',event=>event.preventDefault());
const {createRoot}=await import('react-dom/client');const root=createRoot(document.getElementById('root'));
const bodies=[];Object.defineProperty(navigator,'sendBeacon',{configurable:true,value:(url,body)=>{bodies.push({url,body});return true;}});
const flush=async()=>{await act(async()=>window.dispatchEvent(new window.Event('pagehide')));return Promise.all(bodies.map(async request=>JSON.parse(await request.body.text())));};
const render=async(pathname='/',enabled=true)=>act(async()=>root.render(React.createElement(React.StrictMode,null,React.createElement(PublicAnalytics,{pathname,enabled}))));
try{
 await test('tracker counts SPA navigation once and sends only allowlisted destinations without query strings',async()=>{
  await render();await act(async()=>{document.querySelector('#public').click();document.querySelector('#private').click();document.querySelector('#social').click();});
  const conversation=document.createElement('div');conversation.className='contact-hub is-open';document.body.append(conversation);
  await act(async()=>document.querySelector('#public').click());conversation.remove();
  await render('/agenda');
  const events=(await flush()).flatMap(batch=>batch.events);
  assert.equal(events.filter(item=>item.event==='page_view'&&item.page==='/').length,1);
  assert.ok(events.some(item=>item.event==='page_view'&&item.page==='/agenda'&&item.from==='/'));
  assert.deepEqual(events.filter(item=>item.event==='click').map(item=>item.target),['/agenda','instagram']);
  assert.ok(events.every(item=>item.source==='social'));assert.doesNotMatch(JSON.stringify(events),/private|email|secret|instagram\.com/);
 });
 await test('tracker skips private pages, opt-out and disabled collection',async()=>{
  await act(async()=>root.render(null));bodies.length=0;
  for(const path of ['/pedido-de-oracao','/fale-conosco','/alteracao-de-dados','/acesso-interno','/privacidade'])await render(path);
  await flush();assert.equal(bodies.length,0);
  localStorage.setItem('pibrg-analytics-opt-out','1');await render('/');await flush();assert.equal(bodies.length,0);
  localStorage.clear();await render('/agenda',false);await flush();assert.equal(bodies.length,0);
  Object.defineProperty(navigator,'doNotTrack',{value:'1',configurable:true});await render('/',true);await flush();assert.equal(bodies.length,0);
  Object.defineProperty(navigator,'doNotTrack',{value:null,configurable:true});
 });
 await test('privacy preference disables collection without creating a visitor identifier',async()=>{
  await act(async()=>root.render(React.createElement(AnalyticsPrivacy)));
  await act(async()=>document.querySelector('#root button').click());
  assert.equal(localStorage.length,1);assert.equal(localStorage.getItem('pibrg-analytics-opt-out'),'1');
  assert.match(document.querySelector('[role="status"]').textContent,/desativadas/);
  localStorage.clear();
 });
 await test('dashboard shows an honest empty state and collection/period controls work',async()=>{
  const fixture={enabled:true,revision:'initial',days:30,start:'2026-11-01',end:'2026-11-30',retentionDays:90,totals:{views:0,clicks:0,errors:0,adImpressions:0},daily:[],hourly:[],devices:[],sources:[],pages:[],clicks:[],errors:[],flows:[],ads:[]};
  const calls=[];
  globalThis.fetch=async(url,init)=>{calls.push({url,init});if(init?.method==='POST'){const body=JSON.parse(init.body);return Response.json({enabled:body.enabled,revision:'next'});}return Response.json(fixture);};
  await act(async()=>root.render(React.createElement(AnalyticsDashboard)));
  assert.match(document.querySelector('#root').textContent,/Ainda não há visualizações/);
  let button=[...document.querySelectorAll('#root button')].find(button=>button.textContent==='Pausar coleta');
  await act(async()=>button.click());assert.match(document.querySelector('#root').textContent,/Coleta pausada/);
  assert.deepEqual(JSON.parse(calls.find(call=>call.init?.method==='POST').init.body),{enabled:false,revision:'initial'});
  await act(async()=>{const select=document.querySelector('#root select');select.value='7';select.dispatchEvent(new window.Event('change',{bubbles:true}));});
  assert.ok(calls.some(call=>call.url.endsWith('?days=7')));
 });
 await test('privacy preference still applies during the current visit when local storage is blocked',async()=>{
  Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw Error('Storage blocked');}});
  try{
   await act(async()=>root.render(React.createElement(AnalyticsPrivacy)));
   await act(async()=>document.querySelector('#root button').click());
   assert.equal(document.querySelector('#root button').getAttribute('aria-pressed'),'true');
   assert.match(document.querySelector('[role="status"]').textContent,/nesta visita/);
  }finally{Object.defineProperty(globalThis,'localStorage',{configurable:true,writable:true,value:dom.window.localStorage});}
 });
}finally{await act(async()=>root.unmount());dom.window.close();await rm(directory,{recursive:true,force:true});}
