import { ensureDatabase, getD1 } from "../../../../db/runtime";
import { requireApiPermission } from "../../../../lib/internal-auth";

export async function GET() {
  const auth = await requireApiPermission("audit");
  if ("error" in auth) return auth.error;
  await ensureDatabase();
  const { results } = await getD1().prepare(`SELECT id, actor_email AS actorEmail, action,
    entity_type AS entityType, entity_id AS entityId, metadata, created_at AS createdAt
    FROM audit_logs ORDER BY created_at DESC, id DESC LIMIT 150`).all();
  return Response.json({ logs: results }, { headers: { "Cache-Control": "no-store" } });
}
