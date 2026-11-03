import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
const directory = await mkdtemp(join(resolve('node_modules'), '.ads-test-'));
await build({ entryPoints: ['app/components/GenericAds.tsx', 'app/components/AdSettings.tsx'], outdir: directory, bundle: true, platform: 'node', format: 'esm', jsx: 'automatic', external: ['react', 'react-dom'], outExtension: { '.js': '.mjs' } });
const { GenericAds } = await import(join(directory, 'GenericAds.mjs'));
const { AdSettings } = await import(join(directory, 'AdSettings.mjs'));
const dom = new JSDOM('<div id="root"></div>', { url: 'https://example.invalid/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.sessionStorage = dom.window.sessionStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const root = createRoot(document.getElementById('root'));
const off = { adBottomEnabled: 'false', adSideEnabled: 'false', adInlineEnabled: 'false' };
const on = { adBottomEnabled: 'true', adSideEnabled: 'true', adInlineEnabled: 'true' };
const render = async (settings, pathname = '/') => act(async () => root.render(React.createElement(GenericAds, { settings, pathname })));

await test('three generic formats can be enabled and disabled independently', async () => {
  await render(off);
  assert.equal(document.querySelectorAll('aside').length, 0);
  for (const key of Object.keys(on)) {
    await render({ ...off, [key]: 'true' });
    assert.equal(document.querySelectorAll('aside').length, 1);
    assert.match(document.body.textContent, /Publicidade · Exemplo/);
    assert.equal(document.querySelectorAll('iframe,script,img').length, 0);
  }
  await render(on);
  assert.equal(document.querySelectorAll('aside').length, 3);
});
await test('bottom ad closes and stays closed across navigation and remounts', async () => {
  await act(async () => document.querySelector('button[aria-label="Fechar anúncio inferior"]').click());
  assert.equal(document.querySelectorAll('aside').length, 2);
  assert.equal(sessionStorage.getItem('pibrg-ad-bottom-closed'), '1');
  await act(async () => root.render(null));
  await render(on, '/agenda');
  assert.equal(document.querySelectorAll('aside').length, 2);
});
await test('contact and prayer pages never receive a floating ad', async () => {
  sessionStorage.clear();
  for (const pathname of ['/pedido-de-oracao', '/fale-conosco']) {
    await act(async () => root.render(null));
    await render(on, pathname);
    assert.equal(document.querySelector('.generic-ad-slot-bottom'), null);
    assert.equal(document.querySelectorAll('aside').length, 2);
  }
});
await test('closing works even when visitor storage is blocked', async () => {
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, get() { throw Error('Storage disabled'); } });
  await act(async () => root.render(null));
  await render(on);
  await act(async () => document.querySelector('button').click());
  assert.equal(document.querySelector('.generic-ad-slot-bottom'), null);
});
await test('editor controls emit explicit true/false values and preview all models', async () => {
  const changes = [];
  await act(async () => root.render(React.createElement(AdSettings, { settings: off, onChange: (...args) => changes.push(args) })));
  assert.equal(document.querySelectorAll('input[type="checkbox"]').length, 3);
  await act(async () => document.querySelector('input[type="checkbox"]').click());
  assert.deepEqual(changes, [['adBottomEnabled', 'true']]);
  assert.deepEqual([...document.querySelectorAll('input[type="hidden"]')].map(input => input.value), ['false', 'false', 'false']);
  assert.equal(document.querySelectorAll('.generic-ad-sample').length, 3);
});
await act(async () => root.unmount());
dom.window.close();
await rm(directory, { recursive: true });
