import { ensureDatabase, getD1 } from "../../../../db/runtime";
import { requireApiPermission } from "../../../../lib/internal-auth";
import { rejectCrossSiteMutation, readJsonObject } from "../../../../lib/request-security";
import { getContentGroups } from "../../../../lib/site-content";
import { removeMediaWhenUnused } from "../../../../lib/media-storage";

export async function GET() {
  try {
    const auth = await requireApiPermission("content");
    if ("error" in auth) return auth.error;
    return Response.json({ groups: await getContentGroups(true) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logGroupFailure("group_read_failed", error);
    return Response.json({ error: "Não foi possível carregar as categorias agora." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(request: Request) {
  try {
    return await mutate(request);
  } catch (error) {
    logGroupFailure("group_mutation_failed", error);
    return Response.json({ error: "Não foi possível salvar a categoria agora. Tente novamente." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

async function mutate(request: Request) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;
  const auth = await requireApiPermission("content");
  if ("error" in auth) return auth.error;
  const payload = await readJsonObject(request);
  if (!payload) return Response.json({ error: "Dados inválidos ou muito extensos." }, { status: 400 });
  const action = String(payload.action ?? "");
  const id = Number(payload.id);
  const expectedUpdatedAt = text(payload.updatedAt, 64);
  await ensureDatabase();
  const db = getD1();

  if (action === "delete") {
    if (!Number.isInteger(id) || id < 1 || !expectedUpdatedAt) return Response.json({ error: "Categoria inválida. Atualize o painel e tente novamente." }, { status: 400 });
    const linked = await db.prepare("SELECT COUNT(*) AS total FROM content_items WHERE group_id = ?").bind(id).first<{ total: number }>();
    if ((linked?.total ?? 0) > 0) {
      return Response.json({ error: "Esta categoria ainda possui pessoas ou fotos. Mova esses itens antes de excluí-la." }, { status: 409 });
    }
    const existing = await db.prepare("SELECT cover_image_url AS coverImageUrl, updated_at AS updatedAt FROM content_groups WHERE id = ?").bind(id).first<{ coverImageUrl: string; updatedAt: string }>();
    if (!existing) return Response.json({ error: "Esta categoria já não existe mais." }, { status: 404 });
    if (existing.updatedAt !== expectedUpdatedAt) return groupConflict();
    const [deleted] = await db.batch([
      db.prepare("DELETE FROM content_groups WHERE id = ? AND updated_at = ?").bind(id, expectedUpdatedAt),
      groupAudit(db, auth.identity.email, "delete", String(id)),
    ]);
    if (deleted.meta.changes !== 1) return groupConflict();
    if (existing?.coverImageUrl) await removeMediaWhenUnused(existing.coverImageUrl);
    return Response.json({ ok: true });
  }

  const group = parseGroup(payload);
  if (!group) return Response.json({ error: "Informe um nome válido para a categoria." }, { status: 400 });

  try {
    if (action === "create") {
      const updatedAt = new Date().toISOString();
      const [inserted] = await db.batch([
        db.prepare(`INSERT INTO content_groups
          (name, description, cover_image_url, cover_image_position, sort_order, active, updated_at, updated_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
          .bind(group.name, group.description, group.coverImageUrl, group.coverImagePosition, group.sortOrder, group.active ? 1 : 0, updatedAt, auth.identity.email),
        groupAudit(db, auth.identity.email, "create", "", { name: group.name }),
      ]);
      const newId = inserted.meta.last_row_id;
      if (!Number.isInteger(newId) || newId < 1) throw new Error("D1 não confirmou o identificador da categoria criada.");
      return Response.json({ ok: true, group: { id: newId, ...group, updatedAt } }, { status: 201 });
    }

    if (action === "update" && Number.isInteger(id) && id > 0) {
      if (!expectedUpdatedAt) return groupConflict();
      const existing = await db.prepare("SELECT cover_image_url AS coverImageUrl, updated_at AS updatedAt FROM content_groups WHERE id = ?").bind(id).first<{ coverImageUrl: string; updatedAt: string }>();
      if (!existing) return Response.json({ error: "Esta categoria já não existe mais." }, { status: 404 });
      if (existing.updatedAt !== expectedUpdatedAt) return groupConflict();
      const updatedAt = new Date().toISOString();
      const [updated] = await db.batch([
        db.prepare(`UPDATE content_groups SET name = ?, description = ?, cover_image_url = ?,
          cover_image_position = ?, sort_order = ?, active = ?, updated_at = ?,
          updated_by = ? WHERE id = ? AND updated_at = ?`)
          .bind(group.name, group.description, group.coverImageUrl, group.coverImagePosition, group.sortOrder, group.active ? 1 : 0, updatedAt, auth.identity.email, id, expectedUpdatedAt),
        groupAudit(db, auth.identity.email, "update", String(id), { name: group.name }),
      ]);
      if (updated.meta.changes !== 1) return groupConflict();
      if (existing?.coverImageUrl && existing.coverImageUrl !== group.coverImageUrl) await removeMediaWhenUnused(existing.coverImageUrl);
      return Response.json({ ok: true, group: { id, ...group, updatedAt } });
    }
  } catch (error) {
    if (String(error).toLowerCase().includes("unique")) {
      return Response.json({ error: "Já existe uma categoria com esse nome." }, { status: 409 });
    }
    throw error;
  }

  return Response.json({ error: "Ação inválida." }, { status: 400 });
}

function groupAudit(database: ReturnType<typeof getD1>, actor: string, action: string, entityId: string, metadata: Record<string, unknown> = {}) {
  return database.prepare(
    "INSERT INTO audit_logs (actor_email, action, entity_type, entity_id, metadata) VALUES (?, ?, 'content_group', ?, ?)"
  ).bind(actor, action, entityId, JSON.stringify(metadata));
}

function groupConflict() {
  return Response.json({ error: "Esta categoria foi alterada em outra janela ou por outra pessoa. Atualize o painel antes de continuar." }, { status: 409 });
}

function logGroupFailure(event: string, error: unknown) {
  console.error(JSON.stringify({ event, error: error instanceof Error ? error.message : String(error) }));
}

function parseGroup(payload: Record<string, unknown>) {
  const name = text(payload.name, 100);
  if (!name) return null;
  return {
    name,
    description: text(payload.description, 600),
    coverImageUrl: safeMediaUrl(payload.coverImageUrl),
    coverImagePosition: imagePosition(payload.coverImagePosition),
    sortOrder: Math.max(0, Math.min(999, Number(payload.sortOrder) || 0)),
    active: payload.active !== false,
  };
}

function safeMediaUrl(value: unknown) {
  const candidate = text(value, 500);
  return candidate.startsWith("/api/media/") ? candidate : "";
}

function imagePosition(value: unknown) {
  const position = String(value ?? "center");
  return ["top", "center", "bottom"].includes(position) ? position : "center";
}

function text(value: unknown, length: number) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, length) : "";
}
