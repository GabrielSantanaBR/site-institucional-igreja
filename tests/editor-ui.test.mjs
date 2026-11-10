import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {JSDOM} from 'jsdom';
import React,{act} from 'react';
const directory=await mkdtemp(join(resolve('node_modules'),'.editor-ui-test-'));
await build({entryPoints:['lib/scroll-reveal.ts','app/components/AdminLogin.tsx','app/components/InternalDashboard.tsx'],outdir:directory,bundle:true,platform:'node',format:'esm',jsx:'automatic',external:['react','react-dom'],outExtension:{'.js':'.mjs'},plugins:[{name:'link-stub',setup(build){build.onResolve({filter:/^next\/link$/},()=>({path:'link',namespace:'stub'}));build.onLoad({filter:/.*/,namespace:'stub'},()=>({contents:'import React from "react"; export default function Link({children,...props}){return React.createElement("a",props,children)}',loader:'js'}));}}]});
const {startScrollReveal}=await import(join(directory,'lib/scroll-reveal.mjs'));
const {AdminLogin}=await import(join(directory,'app/components/AdminLogin.mjs'));
const {InternalDashboard}=await import(join(directory,'app/components/InternalDashboard.mjs'));
const dom=new JSDOM('<main><div class="news-card">Conteúdo publicado</div></main><div id="root"></div>',{url:'https://example.invalid/alteracao-de-dados'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,FormData:dom.window.FormData,DOMException:dom.window.DOMException,IS_REACT_ACT_ENVIRONMENT:true});
const {createRoot}=await import('react-dom/client');
const root=createRoot(document.getElementById('root'));
try {
 await test('off-screen content still reveals after a long visit and is restored on navigation',()=>{
  const observers=[];
  class Observer {constructor(callback){this.callback=callback;this.disconnected=false;observers.push(this);}observe(){}unobserve(){}disconnect(){this.disconnected=true;}}
  globalThis.IntersectionObserver=window.IntersectionObserver=Observer;
  window.requestAnimationFrame=callback=>{callback();return 1;};window.cancelAnimationFrame=()=>{};
  const timeouts=[];const setTimeout=window.setTimeout,clearTimeout=window.clearTimeout;
  window.setTimeout=(callback,delay)=>{timeouts.push({callback,delay});return timeouts.length;};window.clearTimeout=()=>{};
  try{
   const cleanup=startScrollReveal();const card=document.querySelector('.news-card');const observer=observers[0];
   assert.ok(card.classList.contains('scroll-reveal'));
   for(const timer of timeouts.filter(timer=>timer.delay>=12000))timer.callback();
   assert.equal(observer.disconnected,false,'Observer must remain active for late scrolling');
   observer.callback([{target:card,isIntersecting:true}]);
   assert.ok(card.classList.contains('is-revealed'));timeouts.find(timer=>timer.delay===700).callback();
   assert.equal(card.classList.contains('scroll-reveal'),false);
   cleanup();assert.equal(observer.disconnected,true);assert.equal(card.style.getPropertyValue('--reveal-delay'),'');
  }finally{window.setTimeout=setTimeout;window.clearTimeout=clearTimeout;}
 });
 await test('login prevents duplicate submits and recovers from a network error',async()=>{
  let rejectRequest,calls=0;
  globalThis.fetch=()=>{calls++;return new Promise((resolve,reject)=>{rejectRequest=reject;});};
  await act(async()=>root.render(React.createElement(AdminLogin)));
  const form=document.querySelector('#root form');
  await act(async()=>{form.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));form.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));});
  assert.equal(calls,1);assert.equal(document.querySelector('button[type="submit"]').disabled,true);
  await act(async()=>rejectRequest(new TypeError('Failed to fetch')));
  assert.match(document.querySelector('[role="alert"]').textContent,/Verifique sua conexão/);
  assert.equal(document.querySelector('button[type="submit"]').disabled,false);
 });
 await test('expired editor session offers re-entry without silently discarding form state',async()=>{
  await act(async()=>root.render(React.createElement(InternalDashboard,{identity:{email:'qa@example.invalid',name:'Equipe',role:'owner'},signOutPath:'/api/internal/logout'})));
  await act(async()=>window.dispatchEvent(new window.Event('pibrg-session-expired')));
  assert.match(document.querySelector('[role="alert"]').textContent,/Sua sessão expirou/);
  assert.ok([...document.querySelectorAll('button')].some(button=>button.textContent==='Entrar novamente'));
 });
}finally{
 await act(async()=>root.unmount());dom.window.close();await rm(directory,{recursive:true,force:true});
}
