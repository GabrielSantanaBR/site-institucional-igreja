import { ensureDatabase, getD1 } from "../../../../db/runtime";
import { requireApiPermission, writeAudit } from "../../../../lib/internal-auth";
import { decryptPrayer } from "../../../../lib/prayer-security";

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
  await writeAudit(auth.identity.email, "view_list", "prayer", "", { count: prayers.length });
  return Response.json({ prayers }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const auth = await requireApiPermission("prayers");
  if ("error" in auth) return auth.error;
  const payload = await request.json() as Record<string, unknown>;
  const action = String(payload.action ?? "");
  const id = Number(payload.id);
  if (!Number.isInteger(id) || id < 1) return Response.json({ error: "Pedido inválido." }, { status: 400 });
  await ensureDatabase();

  if (action === "status") {
    const status = String(payload.status ?? "");
    if (!statuses.includes(status as (typeof statuses)[number])) return Response.json({ error: "Status inválido." }, { status: 400 });
    await getD1().prepare(`UPDATE prayer_requests SET status = ?, updated_at = CURRENT_TIMESTAMP,
      updated_by = ? WHERE id = ?`).bind(status, auth.identity.email, id).run();
    await writeAudit(auth.identity.email, "status", "prayer", String(id), { status });
    return Response.json({ ok: true });
  }

  if (action === "delete") {
    if (auth.identity.role !== "owner" && auth.identity.role !== "admin") {
      return Response.json({ error: "Somente proprietários e administradores podem excluir pedidos." }, { status: 403 });
    }
    await getD1().prepare("DELETE FROM prayer_requests WHERE id = ?").bind(id).run();
    await writeAudit(auth.identity.email, "delete", "prayer", String(id));
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Ação inválida." }, { status: 400 });
}
