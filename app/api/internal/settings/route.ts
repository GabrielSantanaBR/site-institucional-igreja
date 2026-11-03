import { ensureDatabase, getD1 } from "../../../../db/runtime";
import { requireApiPermission } from "../../../../lib/internal-auth";
import { getSiteSettingsSnapshot, safePublicUrl, siteSettingKeys, type SiteSettingKey } from "../../../../lib/site-settings";
import { rejectCrossSiteMutation, readJsonObject } from "../../../../lib/request-security";

export async function GET() {
  try {
    const auth = await requireApiPermission("content");
    if ("error" in auth) return auth.error;
    return Response.json(await getSiteSettingsSnapshot(true), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logSettingsFailure("settings_read_failed", error);
    return Response.json({ error: "Não foi possível carregar as informações gerais agora." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(request: Request) {
  try {
    const rejected = rejectCrossSiteMutation(request);
    if (rejected) return rejected;
    const auth = await requireApiPermission("content");
    if ("error" in auth) return auth.error;
    const payload = await readJsonObject(request);
    if (!payload) return Response.json({ error: "Dados inválidos ou muito extensos." }, { status: 400 });
    const receivedRevision = typeof payload.revision === "string" ? payload.revision.slice(0, 64) : "";
    const current = await getSiteSettingsSnapshot(true);
    if (!receivedRevision || receivedRevision !== current.revision) {
      return Response.json({ error: "As informações foram atualizadas em outra janela. Atualize o painel antes de salvar para não sobrescrever o conteúdo." }, { status: 409, headers: { "Cache-Control": "no-store" } });
    }
    await ensureDatabase();
    const db = getD1();
    const nextRevision = crypto.randomUUID();
    const values: [SiteSettingKey, string][] = [];
    for (const key of siteSettingKeys) {
      if (!Object.hasOwn(payload, key)) continue; // Partial saves preserve other sections.
      const raw = payload[key];
      if (typeof raw !== "string") return Response.json({ error: "Valor inválido em " + key }, { status: 400 });
      const limit = key.toLowerCase().includes("url") ? 500 : key === "heroText" || key === "welcomeText" ? 1200 : 300;
      if (raw.length > limit) return Response.json({ error: "O campo " + key + " ultrapassa o limite permitido." }, { status: 400 });
      const value = raw.trim();
      if (key.startsWith("ad") && key.endsWith("Enabled") && !["true", "false"].includes(value)) return Response.json({ error: "Estado de anúncio inválido." }, { status: 400 });
      if ((key === "instagramUrl" || key === "facebookUrl") && value && !safePublicUrl(value)) return Response.json({ error: "Use um endereço HTTPS válido para as redes sociais." }, { status: 400 });
      values.push([key, value]);
    }
    if (!values.length) return Response.json({ error: "Nenhuma configuração foi enviada." }, { status: 400 });
    // D1 batch is transactional. The revision claim gates every write in the batch.
    const statements = [
      db.prepare("INSERT OR IGNORE INTO site_settings (key, value, updated_by) VALUES ('_revision', ?, ?)").bind(receivedRevision, auth.identity.email),
      db.prepare("UPDATE site_settings SET value = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE key = '_revision' AND value = ?").bind(nextRevision, auth.identity.email, receivedRevision),
      ...values.map(([key, value]) => db.prepare(`INSERT INTO site_settings (key, value, updated_by)
        SELECT ?, ?, ? WHERE EXISTS (SELECT 1 FROM site_settings WHERE key = '_revision' AND value = ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP, updated_by = excluded.updated_by`).bind(key, value, auth.identity.email, nextRevision)),
      db.prepare(`INSERT INTO audit_logs (actor_email, action, entity_type, entity_id, metadata)
        SELECT ?, 'update', 'settings', 'general', ? WHERE EXISTS (SELECT 1 FROM site_settings WHERE key = '_revision' AND value = ?)`)
        .bind(auth.identity.email, JSON.stringify({ fields: values.map(([key]) => key) }), nextRevision),
    ];
    const results = await db.batch(statements);
    if (results[1].meta.changes !== 1) return Response.json({ error: "Outra pessoa salvou antes de você. Atualize o painel antes de tentar novamente." }, { status: 409 });
    return Response.json({ ok: true, revision: nextRevision }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logSettingsFailure("settings_mutation_failed", error);
    return Response.json({ error: "Não foi possível salvar as informações agora. Tente novamente." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

export function isSiteSettingKey(value: string): value is SiteSettingKey {
  return siteSettingKeys.includes(value as SiteSettingKey);
}

function logSettingsFailure(event: string, error: unknown) {
  console.error(JSON.stringify({ event, error: error instanceof Error ? error.message : String(error) }));
}
