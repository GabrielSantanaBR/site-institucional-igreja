import { ensureDatabase, getD1 } from "../../../../db/runtime";
import { requireApiPermission } from "../../../../lib/internal-auth";
import { decryptPrayer } from "../../../../lib/prayer-security";
import { rejectCrossSiteMutation, readJsonObject } from "../../../../lib/request-security";

const statuses = ["new", "praying", "answered", "archived"] as const;

export async function GET(request: Request) {
  const auth = await requireApiPermission("prayers");
  if ("error" in auth) return auth.error;
  await ensureDatabase();
  const selected = new URL(request.url).searchParams.get("status");
  const statement = selected && statuses.includes(selected as (typeof statuses)[number])
    ? getD1().prepare(`SELECT id, encrypted_payload AS encryptedPayload, subject, status,
        submitted_at AS submittedAt, updated_at AS updatedAt, updated_by AS updatedBy
        FROM prayer_requests WHERE status = ? ORDER BY submitted_at DESC LIMIT 200`).bind(selected)
    : getD1().prepare(`SELECT id, encrypted_payload AS encryptedPayload, subject, status,
        submitted_at AS submittedAt, updated_at AS updatedAt, updated_by AS updatedBy
        FROM prayer_requests ORDER BY submitted_at DESC LIMIT 200`);
  const { results } = await statement.all<{
    id: number; encryptedPayload: string; subject: string; status: string;
    submittedAt: string; updatedAt: string; updatedBy: string | null;
  }>();

  const prayers = await Promise.all(results.map(async ({ encryptedPayload, ...record }) => {
    try {
      return { ...record, ...(await decryptPrayer(encryptedPayload)) };
    } catch {
      return { ...record, name: "Conteúdo indisponível", contact: "", message: "Não foi possível abrir este pedido." };
    }
  }));
  return Response.json({ prayers }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;
  const auth = await requireApiPermission("prayers");
  if ("error" in auth) return auth.error;
  const payload = await readJsonObject(request);
  if (!payload) return Response.json({ error: "Dados inválidos ou muito extensos." }, { status: 400 });
  const action = String(payload.action ?? "");
  const id = Number(payload.id);
  const expectedUpdatedAt = typeof payload.updatedAt === "string" ? payload.updatedAt.trim().slice(0, 64) : "";
  if (!Number.isInteger(id) || id < 1 || !expectedUpdatedAt) return Response.json({ error: "Pedido inválido. Atualize o painel e tente novamente." }, { status: 400 });
  await ensureDatabase();
  const db = getD1();

  if (action === "status") {
    const status = String(payload.status ?? "");
    if (!statuses.includes(status as (typeof statuses)[number])) return Response.json({ error: "Status inválido." }, { status: 400 });
    const updatedAt = new Date().toISOString();
    const [updated] = await db.batch([
      db.prepare(`UPDATE prayer_requests SET status = ?, updated_at = ?,
        updated_by = ? WHERE id = ? AND updated_at = ?`).bind(status, updatedAt, auth.identity.email, id, expectedUpdatedAt),
      db.prepare("INSERT INTO audit_logs (actor_email, action, entity_type, entity_id, metadata) VALUES (?, 'status', 'prayer', ?, ?)")
        .bind(auth.identity.email, String(id), JSON.stringify({ status })),
    ]);
    if (updated.meta.changes !== 1) return prayerConflict();
    return Response.json({ ok: true, updatedAt }, { headers: { "Cache-Control": "no-store" } });
  }

  if (action === "delete") {
    if (auth.identity.role !== "owner" && auth.identity.role !== "admin") {
      return Response.json({ error: "Somente proprietários e administradores podem excluir pedidos." }, { status: 403 });
    }
    const [deleted] = await db.batch([
      db.prepare("DELETE FROM prayer_requests WHERE id = ? AND updated_at = ?").bind(id, expectedUpdatedAt),
      db.prepare("INSERT INTO audit_logs (actor_email, action, entity_type, entity_id, metadata) VALUES (?, 'delete', 'prayer', ?, '{}')")
        .bind(auth.identity.email, String(id)),
    ]);
    if (deleted.meta.changes !== 1) return prayerConflict();
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Ação inválida." }, { status: 400 });
}

function prayerConflict() {
  return Response.json({ error: "Este pedido foi alterado em outra janela ou por outra pessoa. Atualize a lista antes de continuar." }, { status: 409, headers: { "Cache-Control": "no-store" } });
}
