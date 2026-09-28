import { contentKinds, getAllContent, type ContentItem, type ContentKind } from "../../../../lib/site-content";
import { ensureDatabase, getD1 } from "../../../../db/runtime";
import { requireApiPermission } from "../../../../lib/internal-auth";
import { rejectCrossSiteMutation, readJsonObject } from "../../../../lib/request-security";
import { removeMediaWhenUnused } from "../../../../lib/media-storage";

export async function GET(request: Request) {
  try {
    const auth = await requireApiPermission("content");
    if ("error" in auth) return auth.error;
    const kindValue = new URL(request.url).searchParams.get("kind");
    if (kindValue && !contentKinds.includes(kindValue as ContentKind)) return json({ error: "Tipo de conteúdo inválido." }, 400);
    const kind = kindValue as ContentKind | null;
    return json({ items: await getAllContent(kind ?? undefined) });
  } catch (error) {
    logFailure("content_read_failed", error);
    return json({ error: "Não foi possível carregar o conteúdo agora. Tente novamente." }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const rejected = rejectCrossSiteMutation(request);
    if (rejected) return rejected;
    const auth = await requireApiPermission("content");
    if ("error" in auth) return auth.error;
    const payload = await readJsonObject(request);
    if (!payload) return json({ error: "Dados inválidos ou muito extensos." }, 400);
    const action = String(payload.action ?? "");
    const id = Number(payload.id);
    const expectedUpdatedAt = text(payload.updatedAt, 64);
    await ensureDatabase();
    const db = getD1();

    if (action === "delete") {
      if (!Number.isInteger(id) || id < 1 || !expectedUpdatedAt) return json({ error: "Registro inválido. Atualize o painel e tente novamente." }, 400);
      const existing = await db.prepare("SELECT image_url AS imageUrl, updated_at AS updatedAt FROM content_items WHERE id = ?").bind(id).first<{ imageUrl: string; updatedAt: string }>();
      if (!existing) return json({ error: "Este item já não existe mais." }, 404);
      if (existing.updatedAt !== expectedUpdatedAt) return conflict();
      const [deleted] = await db.batch([
        db.prepare("DELETE FROM content_items WHERE id = ? AND updated_at = ?").bind(id, expectedUpdatedAt),
        audit(db, auth.identity.email, "delete", String(id)),
      ]);
      if (deleted.meta.changes !== 1) return conflict();
      if (existing.imageUrl) await removeMediaWhenUnused(existing.imageUrl);
      return json({ ok: true });
    }

    const item = parseItem(payload);
    if (!item) return json({ error: "Confira o título, a data do evento e os links. Use HTTPS para endereços externos." }, 400);
    if (item.groupId) {
      const group = await db.prepare("SELECT id FROM content_groups WHERE id = ? LIMIT 1").bind(item.groupId).first<{ id: number }>();
      if (!group) return json({ error: "A categoria selecionada não existe mais." }, 400);
    }

    if (action === "create") {
      const updatedAt = new Date().toISOString();
      const [inserted] = await db.batch([
        db.prepare(`INSERT INTO content_items
          (kind, title, subtitle, body, date, time, location, image_url, link_url, author,
           group_id, image_position, sort_order, active, updated_at, updated_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .bind(item.kind, item.title, item.subtitle, item.body, item.date, item.time, item.location,
            item.imageUrl, item.linkUrl, item.author, item.groupId, item.imagePosition,
            item.sortOrder, item.active ? 1 : 0, updatedAt, auth.identity.email),
        audit(db, auth.identity.email, "create", "", { kind: item.kind }),
      ]);
      const id = inserted.meta.last_row_id;
      if (!Number.isInteger(id) || id < 1) throw new Error("D1 não confirmou o identificador do conteúdo criado.");
      return json({ ok: true, item: savedItem(id, item, updatedAt) }, 201);
    }

    if (action === "update" && Number.isInteger(id) && id > 0) {
      if (!expectedUpdatedAt) return json({ error: "Este formulário está desatualizado. Reabra o item antes de salvar." }, 409);
      const existing = await db.prepare("SELECT image_url AS imageUrl, updated_at AS updatedAt FROM content_items WHERE id = ?").bind(id).first<{ imageUrl: string; updatedAt: string }>();
      if (!existing) return json({ error: "Este item já não existe mais." }, 404);
      if (existing.updatedAt !== expectedUpdatedAt) return conflict();
      const updatedAt = new Date().toISOString();
      const [updated] = await db.batch([
        db.prepare(`UPDATE content_items SET kind = ?, title = ?, subtitle = ?, body = ?, date = ?,
          time = ?, location = ?, image_url = ?, link_url = ?, author = ?, group_id = ?,
          image_position = ?, sort_order = ?, active = ?, updated_at = ?, updated_by = ?
          WHERE id = ? AND updated_at = ?`)
          .bind(item.kind, item.title, item.subtitle, item.body, item.date, item.time, item.location,
            item.imageUrl, item.linkUrl, item.author, item.groupId, item.imagePosition,
            item.sortOrder, item.active ? 1 : 0, updatedAt, auth.identity.email, id, expectedUpdatedAt),
        audit(db, auth.identity.email, "update", String(id), { kind: item.kind }),
      ]);
      if (updated.meta.changes !== 1) return conflict();
      if (existing.imageUrl && existing.imageUrl !== item.imageUrl) await removeMediaWhenUnused(existing.imageUrl);
      return json({ ok: true, item: savedItem(id, item, updatedAt) });
    }

    return json({ error: "Ação inválida." }, 400);
  } catch (error) {
    logFailure("content_mutation_failed", error);
    return json({ error: "Não foi possível salvar a alteração agora. Nenhum dado foi apagado; tente novamente." }, 500);
  }
}

function savedItem(id: number, item: ReturnType<typeof parseItem> & {}, updatedAt: string): ContentItem {
  return { id, ...item, updatedAt };
}

function audit(database: ReturnType<typeof getD1>, actor: string, action: string, entityId: string, metadata: Record<string, unknown> = {}) {
  return database.prepare(
    "INSERT INTO audit_logs (actor_email, action, entity_type, entity_id, metadata) VALUES (?, ?, 'content', ?, ?)"
  ).bind(actor, action, entityId, JSON.stringify(metadata));
}

function conflict() {
  return json({ error: "Este item foi alterado em outra janela ou por outra pessoa. Atualize o painel para não sobrescrever o trabalho mais recente." }, 409);
}

function json(data: Record<string, unknown>, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}

function logFailure(event: string, error: unknown) {
  console.error(JSON.stringify({ event, error: error instanceof Error ? error.message : String(error) }));
}

function parseItem(payload: Record<string, unknown>) {
  const kind = String(payload.kind ?? "") as ContentKind;
  const title = text(payload.title, 160);
  const date = validDate(payload.date);
  if (!contentKinds.includes(kind) || !title || (kind === "event" && !date) ||
    (text(payload.imageUrl, 500) && !safeUrl(payload.imageUrl, true)) ||
    (text(payload.linkUrl, 500) && !safeUrl(payload.linkUrl, false))) return null;
  return {
    kind,
    title,
    subtitle: text(payload.subtitle, 160),
    body: text(payload.body, 2000),
    date,
    time: validTime(payload.time),
    location: text(payload.location, 180),
    imageUrl: safeUrl(payload.imageUrl, true),
    linkUrl: safeUrl(payload.linkUrl, false),
    author: text(payload.author, 120),
    groupId: ["leader", "gallery"].includes(kind) ? nullableId(payload.groupId) : null,
    imagePosition: imagePosition(payload.imagePosition),
    sortOrder: Math.max(0, Math.min(999, Number(payload.sortOrder) || 0)),
    active: payload.active !== false,
  };
}

function nullableId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function imagePosition(value: unknown) {
  const position = String(value ?? "center");
  return ["top", "center", "bottom"].includes(position) ? position : "center";
}

function safeUrl(value: unknown, allowLocal: boolean) {
  const candidate = text(value, 500);
  if (!candidate) return "";
  if (allowLocal && /^\/api\/media\/[1-9]\d*$/.test(candidate)) return candidate;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function text(value: unknown, length: number) {
  return typeof value === "string" ? value.trim().slice(0, length) : "";
}

function validDate(value: unknown) {
  const candidate = text(value, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return "";
  const date = new Date(`${candidate}T12:00:00Z`);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === candidate ? candidate : "";
}

function validTime(value: unknown) {
  const candidate = text(value, 5);
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(candidate) ? candidate : "";
}
