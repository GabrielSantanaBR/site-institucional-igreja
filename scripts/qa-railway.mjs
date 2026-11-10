import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
let server, directory;
let configuration;
if (process.argv.includes('--local')) {
  directory = await mkdtemp(join(tmpdir(), 'pibrg-native-'));
  configuration = { base: 'http://127.0.0.1:3100', username: 'qa-owner', password: randomBytes(24).toString('base64url') };
  const env = { ...process.env, APP_RUNTIME: 'node', DATA_DIR: directory, ADMIN_USERNAME: configuration.username, ADMIN_PASSWORD: configuration.password, ADMIN_SESSION_SECRET: randomBytes(48).toString('base64url'), IP_HASH_SALT: randomBytes(32).toString('base64url'), PRAYER_ENCRYPTION_KEY: randomBytes(32).toString('base64'), PUBLIC_SITE_URL: configuration.base, SITE_STAGE: 'staging', NODE_ENV: 'production' };
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3100'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = '';
  server.stdout.on('data', d => logs += d);
  server.stderr.on('data', d => logs += d);
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(Error('Server failed to start: ' + logs.slice(-1000))), 20000);
    server.stdout.on('data', () => { if (/Ready in/.test(logs)) { clearTimeout(timeout); resolve(); } });
  });
} else {
  console.log('Ready for QA credentials on stdin (not echoed).');
  let input = ''; for await (const chunk of process.stdin) { input += chunk; if (input.includes('\n')) break; }
  configuration = JSON.parse(input);
}
const { base, username, password } = configuration;
let cookie = '';
async function api(path, body, { auth = true, extra = {}, expected = 200, method } = {}) {
  const r = await fetch(base + path, { method: method || (body ? 'POST' : 'GET'), headers: { Origin: base, ...(auth && cookie ? { Cookie: cookie } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}), ...extra }, body: body ? JSON.stringify(body) : undefined, redirect: 'manual', signal: AbortSignal.timeout(20000) });
  const text = await r.text();
  assert.equal(r.status, expected, path + ': ' + text.slice(0, 250));
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { data, headers: r.headers };
}
const mark = 'QA-' + randomBytes(6).toString('hex');
try {
  await api('/api/health');
  for (const page of ['/', '/agenda', '/galeria', '/fale-conosco', '/pedido-de-oracao', '/alteracao-de-dados']) await api(page, undefined, { auth: false });
  await api('/api/internal/settings', undefined, { auth: false, expected: 401 });
  await api('/api/internal/settings', undefined, { auth: false, extra: { 'oai-authenticated-user-email': 'spoof@example.invalid' }, expected: 401 });
  await api('/api/internal/login', { username, password: 'invalid-' + mark }, { expected: 401 });
  const login = await api('/api/internal/login', { username, password });
  cookie = login.headers.get('set-cookie').split(';')[0];
  assert.match(login.headers.get('set-cookie'), /HttpOnly/i); assert.match(login.headers.get('set-cookie'), /Secure/i);
  await api('/api/internal/settings', { revision: '', adBottomEnabled: 'true' }, { extra: { Origin: 'https://untrusted.invalid' }, expected: 403 });
  let { data: snapshot } = await api('/api/internal/settings');
  await api('/api/internal/settings', { revision: snapshot.revision, adBottomEnabled: 'true', adSideEnabled: 'true', adInlineEnabled: 'true' });
  const { data: settingsOn } = await api('/api/internal/settings'); assert.equal(settingsOn.settings.adBottomEnabled, 'true');
  await api('/api/internal/settings', { revision: snapshot.revision, adBottomEnabled: 'false' }, { expected: 409 });
  await api('/api/internal/settings', { revision: settingsOn.revision, adBottomEnabled: snapshot.settings.adBottomEnabled, adSideEnabled: snapshot.settings.adSideEnabled, adInlineEnabled: snapshot.settings.adInlineEnabled });
  const create = { action: 'create', kind: 'event', title: mark, date: '2027-01-01', active: false };
  let { data: { item } } = await api('/api/internal/content', create, { expected: 201 });
  const original = item;
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j9ZkAAAAASUVORK5CYII=', 'base64');
  const form = new FormData(); form.set('file', new File([png], 'qa.png', { type: 'image/png' }));
  const upload = await fetch(base + '/api/internal/media', { method: 'POST', headers: { Cookie: cookie, Origin: base }, body: form });
  assert.equal(upload.status, 201); const media = await upload.json();
  const image = await fetch(base + media.url); assert.equal(image.status, 200); assert.equal((await image.arrayBuffer()).byteLength, png.length);
  ({ data: { item } } = await api('/api/internal/content', { ...item, title: mark + '-updated', imageUrl: media.url, action: 'update', active: false }));
  await api('/api/internal/content', { ...original, action: 'update' }, { expected: 409 });
  await api('/api/internal/content', { id: item.id, updatedAt: item.updatedAt, action: 'delete' });
  assert.equal((await fetch(base + media.url)).status, 404);
  const email = mark.toLowerCase() + '@example.invalid', userPassword = randomBytes(24).toString('base64url');
  await api('/api/internal/users', { action: 'save', email, name: mark, role: 'secretary', password: userPassword, active: true });
  const userLogin = await api('/api/internal/login', { username: email, password: userPassword });
  const ownerCookie = cookie; cookie = userLogin.headers.get('set-cookie').split(';')[0];
  await api('/api/internal/settings');
  await api('/api/internal/users', undefined, { expected: 403 });
  await api('/api/internal/prayers', undefined, { expected: 403 });
  const memberCookie = cookie; cookie = ownerCookie;
  await api('/api/internal/users', { action: 'save', email, name: mark, role: 'secretary', active: false });
  cookie = memberCookie; await api('/api/internal/settings', undefined, { expected: 401 }); cookie = ownerCookie;
  await api('/api/internal/users', { action: 'delete', email });
  const { data: contact } = await api('/api/contact', { action: 'start', name: mark, contact: '', subject: 'Secretaria', message: 'Mensagem sintética de verificação ' + mark, consent: true }, { auth: false, expected: 201 });
  await api('/api/internal/contacts', { action: 'reply', id: contact.id, message: 'Resposta de teste ' + mark });
  const { data: thread } = await api('/api/contact?id=' + contact.id, undefined, { auth: false, extra: { 'x-contact-token': contact.token } });
  assert.equal(thread.conversation.messages.length, 2);
  await api('/api/internal/contacts', { action: 'delete', id: contact.id });
  await api('/api/prayer-requests', { name: mark, subject: 'Outro', message: 'Pedido sintético para verificar armazenamento protegido ' + mark, consent: true }, { auth: false, expected: 201 });
  const { data: prayers } = await api('/api/internal/prayers');
  const prayer = prayers.prayers.find(p => p.name === mark); assert.ok(prayer);
  await api('/api/internal/prayers', { action: 'delete', id: prayer.id, updatedAt: prayer.updatedAt });
  const persistence = await api('/api/internal/content', { ...create, title: 'QA-PERSISTENCE-' + mark }, { expected: 201 });
  console.log('PASS: pages, login, spoofing/CSRF, settings/ads, conflicts, photo upload/read/delete, role enforcement/revocation, conversations and encrypted prayers.');
  console.log('PERSISTENCE_ITEM=' + JSON.stringify(persistence.data.item));
  const logout = await api('/api/internal/logout', {}, { expected: 303 });
  assert.equal(new URL(logout.headers.get('location')).origin, base);
} finally {
  if (server) { server.kill(); await new Promise(resolve => server.on('exit', resolve)); }
  if (directory) await rm(directory, { recursive: true, force: true });
}
