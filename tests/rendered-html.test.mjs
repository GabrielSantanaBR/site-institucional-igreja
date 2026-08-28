import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("uses production metadata without a development marker", async () => {
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(layout, /"codex-preview"\s*:/);
  assert.match(layout, /Primeira Igreja Batista Renovada em Guadalupe/);
  assert.match(layout, /pedidos de oração/);
});

test("keeps general contact and prayer requests as separate channels", async () => {
  const [page, switcher, shell] = await Promise.all([
    readFile(new URL("../app/fale-conosco/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/ContactChannelExperience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/SiteShell.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(page, /Dois canais/);
  assert.match(page, /ContactChannelExperience/);
  assert.match(switcher, /Fale Conosco/);
  assert.match(switcher, /Pedido de Oração/);
  assert.match(switcher, /Os canais continuam separados/);
  assert.match(shell, /href="\/fale-conosco"/);
  assert.match(shell, /href="\/pedido-de-oracao"/);
});

test("protects contact identity and avoids access tokens in query strings", async () => {
  const [route, chat, permissions] = await Promise.all([
    readFile(new URL("../app/api/contact/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/ContactChat.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/internal-auth.ts", import.meta.url), "utf8"),
  ]);
  assert.match(route, /encryptPrivateData\(\{ name, contact \}\)/);
  assert.match(route, /VALUES \(\?, 'visitor', \?, 'Visitante'\)/);
  assert.match(route, /request\.headers\.get\("x-contact-token"\)/);
  assert.doesNotMatch(chat, /api\/contact\?id=.*token=/);
  assert.match(permissions, /secretary: \["content", "contacts"\]/);
  assert.match(permissions, /intercessor: \["prayers"\]/);
});

test("persists agenda changes with a saved record and edit-conflict protection", async () => {
  const [route, content, runtime] = await Promise.all([
    readFile(new URL("../app/api/internal/content/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/site-content.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/runtime.ts", import.meta.url), "utf8"),
  ]);
  assert.match(route, /item: savedItem\(id, item, updatedAt\)/);
  assert.match(route, /WHERE id = \? AND updated_at = \?/);
  assert.match(route, /updated\.meta\.changes !== 1/);
  assert.match(content, /updated_at AS updatedAt/);
  assert.doesNotMatch(runtime, /DELETE FROM content_items WHERE/);
});

test("keeps content editing responsive and prevents repeated submissions", async () => {
  const dashboard = await readFile(new URL("../app/components/InternalDashboard.tsx", import.meta.url), "utf8");
  assert.match(dashboard, /\/api\/internal\/content\?kind=\$\{kind\}/);
  assert.match(dashboard, /if \(submitting\.current\) return/);
  assert.match(dashboard, /const next = \[\.\.\.current\.filter/);
  assert.match(dashboard, /contentCache\.current\.set/);
  assert.match(dashboard, /kind !== "event"/);
  assert.match(dashboard, /Alterações não salvas/);
});

test("keeps completed events visible while advancing the upcoming queue", async () => {
  const [agenda, home] = await Promise.all([
    readFile(new URL("../app/components/AgendaExperience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(agenda, /const upcoming =/);
  assert.match(agenda, /\.slice\(0, 5\)/);
  assert.match(agenda, /const past =/);
  assert.match(agenda, /Eventos já realizados/);
  assert.match(agenda, /calendarEvents/);
  assert.match(home, /getPublicContent\("event"\)/);
  assert.match(home, /homeEventEnd/);
  assert.doesNotMatch(home, /import \{ services \}/);
});

test("does not invent gallery photos when the panel has no published media", async () => {
  const gallery = await readFile(new URL("../app/components/ClientWidgets.tsx", import.meta.url), "utf8");
  assert.match(gallery, /gallery-empty/);
  assert.doesNotMatch(gallery, /galleryItems/);
});

test("isolates Worker request state and avoids cross-request I/O promises", async () => {
  const [runtime, worker] = await Promise.all([
    readFile(new URL("../db/runtime.ts", import.meta.url), "utf8"),
    readFile(new URL("../worker/index.ts", import.meta.url), "utf8"),
  ]);
  assert.match(runtime, /AsyncLocalStorage/);
  assert.match(runtime, /runWithRuntimeScope/);
  assert.doesNotMatch(runtime, /schemaReady:\s*Promise/);
  assert.doesNotMatch(runtime, /__PIBRG_ENV__/);
  assert.match(worker, /runWithRuntimeScope\(env, ctx/);
});

test("skips repeated contact decryption when polling finds no changes", async () => {
  const [publicRoute, internalRoute, inbox] = await Promise.all([
    readFile(new URL("../app/api/contact/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/internal/contacts/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/ContactInbox.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(publicRoute, /knownRevision/);
  assert.match(publicRoute, /unchanged: true/);
  assert.match(internalRoute, /knownRevision/);
  assert.match(internalRoute, /createRevision/);
  assert.match(inbox, /document\.visibilityState/);
});

test("uses migrations instead of rebuilding the database during requests", async () => {
  const runtime = await readFile(new URL("../db/runtime.ts", import.meta.url), "utf8");
  assert.match(runtime, /esquema é aplicado pelas migrações versionadas/);
  assert.doesNotMatch(runtime, /CREATE TABLE IF NOT EXISTS/);
  assert.doesNotMatch(runtime, /CREATE INDEX IF NOT EXISTS/);
});

test("requires same-origin JSON for browser mutations", async () => {
  const security = await readFile(new URL("../lib/request-security.ts", import.meta.url), "utf8");
  assert.match(security, /\["same-origin", "none"\]/);
  assert.doesNotMatch(security, /"same-site"/);
  assert.match(security, /new URL\(origin\)\.origin !== new URL\(request\.url\)\.origin/);
  assert.match(security, /contentType !== "application\/json"/);
});

test("provides resilient editing states and navigable gallery previews", async () => {
  const [dashboard, gallery, loading, error] = await Promise.all([
    readFile(new URL("../app/components/InternalDashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/ClientWidgets.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/alteracao-de-dados/loading.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/alteracao-de-dados/error.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(dashboard, /Ctrl \+ S/);
  assert.match(dashboard, /content-list-tools/);
  assert.match(gallery, /ArrowLeft/);
  assert.match(gallery, /lightbox-next/);
  assert.match(loading, /Preparando a área administrativa/);
  assert.match(error, /Nenhuma alteração foi perdida/);
});
