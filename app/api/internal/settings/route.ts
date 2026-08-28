import { ensureDatabase, getD1 } from "../../../../db/runtime";
import { requireApiPermission } from "../../../../lib/internal-auth";
import { getSiteSettings, safePublicUrl, siteSettingKeys, siteSettingsDefaults, type SiteSettingKey } from "../../../../lib/site-settings";
import { rejectCrossSiteMutation, readJsonObject } from "../../../../lib/request-security";

export async function GET() {
  try {
    const auth = await requireApiPermission("content");
    if ("error" in auth) return auth.error;
    return Response.json({ settings: await getSiteSettings() }, { headers: { "Cache-Control": "no-store" } });
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
    await ensureDatabase();
    const db = getD1();
    const statements = siteSettingKeys.map((key) => {
      const limit = key.toLowerCase().includes("url") ? 500 : key === "heroText" || key === "welcomeText" ? 1200 : 300;
      const raw = typeof payload[key] === "string" ? payload[key] as string : siteSettingsDefaults[key];
      const trimmed = raw.trim().slice(0, limit);
      const value = key === "instagramUrl" || key === "facebookUrl" ? safePublicUrl(trimmed, siteSettingsDefaults[key]) : trimmed;
      return db.prepare(`INSERT INTO site_settings (key, value, updated_by)
        VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value,
        updated_at = CURRENT_TIMESTAMP, updated_by = excluded.updated_by`).bind(key, value, auth.identity.email);
    });
    statements.push(db.prepare(
      "INSERT INTO audit_logs (actor_email, action, entity_type, entity_id, metadata) VALUES (?, 'update', 'settings', 'general', '{}')"
    ).bind(auth.identity.email));
    await db.batch(statements);
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
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
