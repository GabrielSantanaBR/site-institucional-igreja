import { contentKinds, getAllContent, type ContentKind } from "../../../../lib/site-content";
import { ensureDatabase, getD1 } from "../../../../db/runtime";
import { requireApiPermission, writeAudit } from "../../../../lib/internal-auth";

export async function GET(request: Request) {
  const auth = await requireApiPermission("content");
  if ("error" in auth) return auth.error;
  const kindValue = new URL(request.url).searchParams.get("kind");
  const kind = contentKinds.includes(kindValue as ContentKind) ? kindValue as ContentKind : undefined;
  return Response.json({ items: await getAllContent(kind) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const auth = await requireApiPermission("content");
  if ("error" in auth) return auth.error;
  const payload = await request.json() as Record<string, unknown>;
  const action = String(payload.action ?? "");
  const id = Number(payload.id);
  await ensureDatabase();

  if (action === "delete") {
    if (!Number.isInteger(id) || id < 1) return Response.json({ error: "Registro inválido." }, { status: 400 });
    await getD1().prepare("DELETE FROM content_items WHERE id = ?").bind(id).run();
    await writeAudit(auth.identity.email, "delete", "content", String(id));
    return Response.json({ ok: true });
  }

  const item = parseItem(payload);
  if (!item) return Response.json({ error: "Preencha os campos obrigatórios." }, { status: 400 });

  if (action === "create") {
    await getD1().prepare(`INSERT INTO content_items
      (kind, title, subtitle, body, date, time, location, sort_order, active, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(item.kind, item.title, item.subtitle, item.body, item.date, item.time, item.location, item.sortOrder, item.active ? 1 : 0, auth.identity.email).run();
    await writeAudit(auth.identity.email, "create", "content", "", { kind: item.kind });
    return Response.json({ ok: true }, { status: 201 });
  }

  if (action === "update" && Number.isInteger(id) && id > 0) {
    await getD1().prepare(`UPDATE content_items SET kind = ?, title = ?, subtitle = ?, body = ?, date = ?,
      time = ?, location = ?, sort_order = ?, active = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE id = ?`)
      .bind(item.kind, item.title, item.subtitle, item.body, item.date, item.time, item.location, item.sortOrder, item.active ? 1 : 0, auth.identity.email, id).run();
    await writeAudit(auth.identity.email, "update", "content", String(id), { kind: item.kind });
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Ação inválida." }, { status: 400 });
}

function parseItem(payload: Record<string, unknown>) {
  const kind = String(payload.kind ?? "") as ContentKind;
  const title = text(payload.title, 160);
  if (!contentKinds.includes(kind) || !title) return null;
  return {
    kind,
    title,
    subtitle: text(payload.subtitle, 160),
    body: text(payload.body, 2000),
    date: text(payload.date, 20),
    time: text(payload.time, 20),
    location: text(payload.location, 180),
    sortOrder: Math.max(0, Math.min(999, Number(payload.sortOrder) || 0)),
    active: payload.active !== false,
  };
}

function text(value: unknown, length: number) {
  return typeof value === "string" ? value.trim().slice(0, length) : "";
}
