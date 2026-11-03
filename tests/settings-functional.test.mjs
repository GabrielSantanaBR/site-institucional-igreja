import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { build } from 'esbuild';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Real SQLite executes the same prepared statements and transactional batch as D1.
// Auth is isolated here; tests exercise the route's permission and origin gates.
const directory = await mkdtemp(join(tmpdir(), 'pibrg-settings-'));
let database;
let identity = { email: 'qa@example.invalid', role: 'owner' };
let unavailable = false;
let writeQueue = Promise.resolve();
const adapter = {
  prepare(query) {
    const make = (values = []) => ({
      bind: (...args) => make(args),
      async all() { return { results: database.prepare(query).all(...values) }; },
      async first() { return database.prepare(query).get(...values) ?? null; },
      async run() { const result = database.prepare(query).run(...values); return { success: true, meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } }; },
    });
    return make();
  },
  batch(statements) {
    const operation = writeQueue.then(async () => {
    database.exec('BEGIN');
    try { const results = []; for (const statement of statements) results.push(await statement.run()); database.exec('COMMIT'); return results; }
    catch (error) { database.exec('ROLLBACK'); throw error; }
    });
    writeQueue = operation.catch(() => {});
    return operation;
  },
};
globalThis.__testSettingsDb = () => { if (unavailable) throw Error('Test database unavailable'); return adapter; };
globalThis.__testSettingsAuth = () => identity && ['owner', 'admin', 'secretary'].includes(identity.role)
  ? { identity } : { error: Response.json({ error: 'Unauthorized' }, { status: identity ? 403 : 401 }) };
await build({ entryPoints: ['app/api/internal/settings/route.ts'], outfile: join(directory, 'route.mjs'), bundle: true, platform: 'node', format: 'esm', plugins: [{ name: 'isolated-dependencies', setup(builder) {
  builder.onResolve({ filter: /lib\/internal-auth$/ }, () => ({ path: 'auth', namespace: 'test' }));
  builder.onResolve({ filter: /db\/runtime$/ }, () => ({ path: 'db', namespace: 'test' }));
  builder.onLoad({ filter: /.*/, namespace: 'test' }, ({ path }) => ({ contents: path === 'auth' ? 'export async function requireApiPermission(){return globalThis.__testSettingsAuth()}' : 'export function getD1(){return globalThis.__testSettingsDb()} export async function ensureDatabase(){getD1()}' }));
} }] });
const route = await import(join(directory, 'route.mjs'));
const request = (body, origin = 'https://example.invalid') => new Request('https://example.invalid/api/internal/settings', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(body) });
const snapshot = async () => (await route.GET()).json();

await test('settings persist, protect concurrent edits, and preserve other sections', async () => {
  database = new DatabaseSync(':memory:');
  for (const name of (await readdir('drizzle')).filter(name => name.endsWith('.sql')).sort()) database.exec(await readFile(join('drizzle', name), 'utf8'));
  const initial = await snapshot();
  assert.equal(initial.settings.adBottomEnabled, 'false');
  assert.equal(initial.settings.adSideEnabled, 'false');
  assert.equal(initial.settings.adInlineEnabled, 'false');
  let response = await route.POST(request({ revision: initial.revision, address: 'Endereço preservado', adBottomEnabled: 'true' }));
  assert.equal(response.status, 200);
  let current = await snapshot();
  assert.equal(current.settings.adBottomEnabled, 'true');
  response = await route.POST(request({ revision: current.revision, adBottomEnabled: 'false', adSideEnabled: 'true', adInlineEnabled: 'true' }));
  assert.equal(response.status, 200);
  current = await snapshot();
  assert.equal(current.settings.address, 'Endereço preservado');
  assert.equal(current.settings.adBottomEnabled, 'false');
  assert.equal(current.settings.adSideEnabled, 'true');
  assert.equal(current.settings.adInlineEnabled, 'true');
  response = await route.POST(request({ revision: initial.revision, address: 'Stale write' }));
  assert.equal(response.status, 409);
  const results = await Promise.all([
    route.POST(request({ revision: current.revision, address: 'First editor' })),
    route.POST(request({ revision: current.revision, address: 'Second editor' })),
  ]);
  assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
  assert.equal(database.prepare("SELECT COUNT(*) AS n FROM audit_logs WHERE entity_type = 'settings'").get().n, 3);
});

await test('invalid data, cross-origin requests and unauthorized roles cannot change settings', async () => {
  const before = await snapshot();
  for (const payload of [{ adBottomEnabled: 'on' }, { adSideEnabled: true }, { instagramUrl: 'javascript:alert(1)' }, { heroText: 'x'.repeat(1201) }]) {
    assert.equal((await route.POST(request({ revision: before.revision, ...payload }))).status, 400);
  }
  assert.equal((await route.POST(request({ revision: before.revision, adBottomEnabled: 'true' }, 'https://untrusted.invalid'))).status, 403);
  identity = null;
  assert.equal((await route.GET()).status, 401);
  assert.equal((await route.POST(request({ revision: before.revision, adBottomEnabled: 'true' }))).status, 401);
  identity = { email: 'qa@example.invalid', role: 'intercessor' };
  assert.equal((await route.POST(request({ revision: before.revision, adBottomEnabled: 'true' }))).status, 403);
  identity.role = 'secretary';
  assert.deepEqual(await snapshot(), before);
});

await test('admin read fails visibly when database is unavailable', async () => {
  unavailable = true;
  assert.equal((await route.GET()).status, 500);
  unavailable = false;
});
database.close();
await rm(directory, { recursive: true });
delete globalThis.__testSettingsDb;
delete globalThis.__testSettingsAuth;
