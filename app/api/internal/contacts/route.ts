import { ensureDatabase, getD1 } from "../../../../db/runtime";
import { requireApiPermission, writeAudit } from "../../../../lib/internal-auth";
import { decryptPrivateData, encryptPrivateData } from "../../../../lib/private-data";
import { rejectCrossSiteMutation, readJsonObject } from "../../../../lib/request-security";

const statuses = ["new", "open", "closed"] as const;
type Identity = { name: string; contact: string };
type ConversationRow = {
  id: string; encryptedIdentity: string; subject: string; status: string; createdAt: string; updatedAt: string;
  lastVisitorAt: string; lastAdminAt: string | null; assignedTo: string | null; unread: number; encryptedPreview?: string | null;
};

export async function GET(request: Request) {
  const auth = await requireApiPermission("contacts");
  if ("error" in auth) return auth.error;
  await ensureDatabase();
  const url = new URL(request.url);
  const id = url.searchParams.get("id") ?? "";
  const knownRevision = url.searchParams.get("revision") ?? "";
  if (id) return getThread(id, knownRevision);

  const selected = url.searchParams.get("status") ?? "all";
  const filter = statuses.includes(selected as (typeof statuses)[number]);
  const query = `SELECT c.id, c.encrypted_identity AS encryptedIdentity, c.subject, c.status,
    c.created_at AS createdAt, c.updated_at AS updatedAt, c.last_visitor_at AS lastVisitorAt,
    c.last_admin_at AS lastAdminAt, c.assigned_to AS assignedTo,
    (SELECT COUNT(*) FROM contact_messages m WHERE m.conversation_id = c.id AND m.sender = 'visitor' AND m.read_by_admin = 0) AS unread,
    (SELECT encrypted_body FROM contact_messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS encryptedPreview
    FROM contact_conversations c ${filter ? "WHERE c.status = ?" : ""} ORDER BY c.updated_at DESC LIMIT 200`;
  const statement = filter ? getD1().prepare(query).bind(selected) : getD1().prepare(query);
  const { results } = await statement.all<ConversationRow>();
  const revision = await createRevision(results.map((row) => `${row.id}|${row.updatedAt}|${row.status}|${row.unread}`).join("\n"));
  if (knownRevision && knownRevision === revision) return noStore({ unchanged: true, revision });
  const conversations = await Promise.all(results.map(async ({ encryptedIdentity, encryptedPreview, ...row }) => {
    try {
      const identity = await decryptPrivateData<Identity>(encryptedIdentity);
      const preview = encryptedPreview ? (await decryptPrivateData<{ body: string }>(encryptedPreview)).body : "";
      return { ...row, identity, preview };
    } catch {
      return { ...row, identity: { name: "Conteúdo indisponível", contact: "" }, preview: "Não foi possível abrir esta mensagem." };
    }
  }));
  return noStore({ conversations, revision });
}

export async function POST(request: Request) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;
  const auth = await requireApiPermission("contacts");
  if ("error" in auth) return auth.error;
  const payload = await readJsonObject(request);
  if (!payload) return Response.json({ error: "Dados inválidos ou muito extensos." }, { status: 400 });
  const action = clean(payload.action, 20);
  const id = clean(payload.id, 60);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Conversa inválida." }, { status: 400 });
  await ensureDatabase();
  const exists = await getD1().prepare("SELECT id FROM contact_conversations WHERE id = ? LIMIT 1").bind(id).first<{ id: string }>();
  if (!exists) return Response.json({ error: "Conversa não encontrada." }, { status: 404 });

  if (action === "reply") {
    const body = clean(payload.message, 2000);
    if (body.length < 2) return Response.json({ error: "Digite uma resposta antes de enviar." }, { status: 400 });
    const encryptedBody = await encryptPrivateData({ body });
    await getD1().batch([
      getD1().prepare(`INSERT INTO contact_messages (conversation_id, sender, encrypted_body, author_name, read_by_admin)
        VALUES (?, 'admin', ?, ?, 1)`).bind(id, encryptedBody, auth.identity.name),
      getD1().prepare(`UPDATE contact_conversations SET status = 'open', updated_at = CURRENT_TIMESTAMP,
        last_admin_at = CURRENT_TIMESTAMP, assigned_to = ? WHERE id = ?`).bind(auth.identity.email, id),
    ]);
    await writeAudit(auth.identity.email, "reply", "contact", id);
    return Response.json({ ok: true });
  }

  if (action === "status") {
    const status = clean(payload.status, 20);
    if (!statuses.includes(status as (typeof statuses)[number])) return Response.json({ error: "Status inválido." }, { status: 400 });
    await getD1().prepare("UPDATE contact_conversations SET status = ?, updated_at = CURRENT_TIMESTAMP, assigned_to = ? WHERE id = ?")
      .bind(status, auth.identity.email, id).run();
    await writeAudit(auth.identity.email, "status", "contact", id, { status });
    return Response.json({ ok: true });
  }

  if (action === "delete") {
    if (!['owner', 'admin'].includes(auth.identity.role)) return Response.json({ error: "Somente proprietários e administradores podem excluir conversas." }, { status: 403 });
    await getD1().batch([
      getD1().prepare("DELETE FROM contact_messages WHERE conversation_id = ?").bind(id),
      getD1().prepare("DELETE FROM contact_conversations WHERE id = ?").bind(id),
    ]);
    await writeAudit(auth.identity.email, "delete", "contact", id);
    return Response.json({ ok: true });
  }
  return Response.json({ error: "Ação inválida." }, { status: 400 });
}

async function getThread(id: string, knownRevision: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Conversa inválida." }, { status: 400 });
  const conversation = await getD1().prepare(`SELECT id, encrypted_identity AS encryptedIdentity, subject, status,
    created_at AS createdAt, updated_at AS updatedAt, last_visitor_at AS lastVisitorAt,
    last_admin_at AS lastAdminAt, assigned_to AS assignedTo FROM contact_conversations WHERE id = ? LIMIT 1`)
    .bind(id).first<Omit<ConversationRow, "unread">>();
  if (!conversation) return Response.json({ error: "Conversa não encontrada." }, { status: 404 });
  const receipt = await getD1().prepare(`SELECT COUNT(*) AS readCount FROM contact_messages
    WHERE conversation_id = ? AND sender = 'admin' AND read_by_visitor = 1`).bind(id).first<{ readCount: number }>();
  const revision = await createRevision(`${conversation.updatedAt}|${conversation.status}|${receipt?.readCount ?? 0}`);
  if (knownRevision && knownRevision === revision) return noStore({ unchanged: true, revision });
  const { results } = await getD1().prepare(`SELECT id, sender, encrypted_body AS encryptedBody, author_name AS authorName,
    read_by_admin AS readByAdmin, read_by_visitor AS readByVisitor, created_at AS createdAt
    FROM contact_messages WHERE conversation_id = ? ORDER BY id ASC LIMIT 300`).bind(id).all<{
      id: number; sender: string; encryptedBody: string; authorName: string; readByAdmin: number; readByVisitor: number; createdAt: string;
    }>();
  const { encryptedIdentity, ...publicConversation } = conversation;
  const [identity, messages] = await Promise.all([
    decryptPrivateData<Identity>(encryptedIdentity),
    Promise.all(results.map(async ({ encryptedBody, ...message }) => ({ ...message, body: (await decryptPrivateData<{ body: string }>(encryptedBody)).body }))),
  ]);
  await getD1().prepare("UPDATE contact_messages SET read_by_admin = 1 WHERE conversation_id = ? AND sender = 'visitor' AND read_by_admin = 0").bind(id).run();
  return noStore({ conversation: { ...publicConversation, identity, messages }, revision });
}

function clean(value: unknown, maxLength: number) { return typeof value === "string" ? value.trim().slice(0, maxLength) : ""; }
function noStore(body: Record<string, unknown>) { return Response.json(body, { headers: { "Cache-Control": "no-store" } }); }
async function createRevision(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest).slice(0, 12), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
