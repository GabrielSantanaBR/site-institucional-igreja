import { ensureDatabase, getD1, scheduleBackground } from "../../../db/runtime";
import { createContactAccess, hashContactIp, hashContactToken, isContactAccess } from "../../../lib/contact-security";
import { notifyContactByEmail } from "../../../lib/contact-notification";
import { decryptPrivateData, encryptPrivateData } from "../../../lib/private-data";
import { rejectCrossSiteMutation, readJsonObject } from "../../../lib/request-security";

const subjects = ["Secretaria", "Agenda e eventos", "Visita", "Ministérios", "Informações gerais", "Outro"];
type StoredMessage = { id: number; sender: string; encryptedBody: string; authorName: string; readByVisitor: number; createdAt: string };

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id") ?? "";
    const knownRevision = url.searchParams.get("revision") ?? "";
    const token = request.headers.get("x-contact-token") ?? "";
    if (!isContactAccess(id, token)) return json({ error: "Conversa inválida." }, 400);
    await ensureDatabase();
    const accessHash = await hashContactToken(token);
    const conversation = await getD1().prepare(`SELECT id, subject, status, encrypted_identity AS encryptedIdentity,
      created_at AS createdAt, updated_at AS updatedAt FROM contact_conversations WHERE id = ? AND access_hash = ? LIMIT 1`)
      .bind(id, accessHash).first<{ id: string; subject: string; status: string; encryptedIdentity: string; createdAt: string; updatedAt: string }>();
    if (!conversation) return json({ error: "Conversa não encontrada neste dispositivo." }, 404);
    const revision = await createRevision(`${conversation.updatedAt}|${conversation.status}`);
    if (knownRevision && knownRevision === revision) return json({ unchanged: true, revision });
    const { results } = await getD1().prepare(`SELECT id, sender, encrypted_body AS encryptedBody, author_name AS authorName,
      read_by_visitor AS readByVisitor, created_at AS createdAt FROM contact_messages WHERE conversation_id = ? ORDER BY id ASC LIMIT 300`)
      .bind(id).all<StoredMessage>();
    const messages = await Promise.all(results.map(async ({ encryptedBody, ...message }) => ({ ...message, body: (await decryptPrivateData<{ body: string }>(encryptedBody)).body })));
    await getD1().prepare("UPDATE contact_messages SET read_by_visitor = 1 WHERE conversation_id = ? AND sender = 'admin' AND read_by_visitor = 0").bind(id).run();
    const { encryptedIdentity, ...publicConversation } = conversation;
    const identity = await decryptPrivateData<{ name: string; contact: string }>(encryptedIdentity);
    return json({ conversation: { ...publicConversation, identity, messages }, revision });
  } catch (error) {
    console.error("contact conversation read failed", error instanceof Error ? error.message : "unknown error");
    return json({ error: "Não foi possível abrir a conversa agora." }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const rejected = rejectCrossSiteMutation(request);
    if (rejected) return rejected;
    const payload = await readJsonObject(request);
    if (!payload) return json({ error: "Dados inválidos ou muito extensos." }, 400);
    if (String(payload.website ?? "").trim()) return json({ ok: true }, 201);
    const action = clean(payload.action, 20);
    await ensureDatabase();
    const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const ipHash = await hashContactIp(ip);
    if (!(await allowMessage(ipHash))) return json({ error: "Muitas mensagens foram enviadas deste dispositivo. Tente novamente mais tarde." }, 429);

    if (action === "start") {
      const name = clean(payload.name, 100);
      const contact = clean(payload.contact, 160);
      const subject = clean(payload.subject, 60);
      const message = clean(payload.message, 2000);
      if (name.length < 2 || !subjects.includes(subject) || message.length < 2 || payload.consent !== true) return json({ error: "Revise os campos obrigatórios antes de iniciar a conversa." }, 400);
      const { id, token } = createContactAccess();
      const [accessHash, encryptedIdentity, encryptedBody] = await Promise.all([
        hashContactToken(token), encryptPrivateData({ name, contact }), encryptPrivateData({ body: message }),
      ]);
      await getD1().batch([
        getD1().prepare(`INSERT INTO contact_conversations (id, access_hash, encrypted_identity, subject, source_ip_hash)
          VALUES (?, ?, ?, ?, ?)`).bind(id, accessHash, encryptedIdentity, subject, ipHash),
        getD1().prepare(`INSERT INTO contact_messages (conversation_id, sender, encrypted_body, author_name)
          VALUES (?, 'visitor', ?, 'Visitante')`).bind(id, encryptedBody),
      ]);
      const notification = notifyContactByEmail({ name, contact, subject, message });
      const notificationQueued = scheduleBackground(notification);
      const emailNotified = notificationQueued ? true : await notification;
      return json({ ok: true, id, token, emailNotified, notificationQueued }, 201);
    }

    if (action === "send") {
      const id = clean(payload.id, 60);
      const token = clean(payload.token, 80);
      const message = clean(payload.message, 2000);
      if (!isContactAccess(id, token) || message.length < 2) return json({ error: "Mensagem ou conversa inválida." }, 400);
      const accessHash = await hashContactToken(token);
      const conversation = await getD1().prepare(`SELECT id, subject, encrypted_identity AS encryptedIdentity
        FROM contact_conversations WHERE id = ? AND access_hash = ? LIMIT 1`).bind(id, accessHash)
        .first<{ id: string; subject: string; encryptedIdentity: string }>();
      if (!conversation) return json({ error: "Conversa não encontrada neste dispositivo." }, 404);
      const encryptedBody = await encryptPrivateData({ body: message });
      await getD1().batch([
        getD1().prepare(`INSERT INTO contact_messages (conversation_id, sender, encrypted_body, author_name)
          VALUES (?, 'visitor', ?, 'Visitante')`).bind(id, encryptedBody),
        getD1().prepare(`UPDATE contact_conversations SET status = CASE WHEN status = 'closed' THEN 'open' ELSE status END,
          updated_at = CURRENT_TIMESTAMP, last_visitor_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(id),
      ]);
      const identity = await decryptPrivateData<{ name: string; contact: string }>(conversation.encryptedIdentity);
      const notification = notifyContactByEmail({ name: identity.name, contact: identity.contact, subject: conversation.subject, message });
      const notificationQueued = scheduleBackground(notification);
      if (!notificationQueued) await notification;
      return json({ ok: true, notificationQueued }, 201);
    }
    return json({ error: "Ação inválida." }, 400);
  } catch (error) {
    console.error("contact conversation write failed", error instanceof Error ? error.message : "unknown error");
    return json({ error: "Não foi possível enviar sua mensagem agora. Tente novamente em alguns minutos." }, 500);
  }
}

function clean(value: unknown, maxLength: number) { return typeof value === "string" ? value.trim().slice(0, maxLength) : ""; }
function json(body: Record<string, unknown>, status = 200) { return Response.json(body, { status, headers: { "Cache-Control": "no-store" } }); }
async function allowMessage(ipHash: string) {
  const db = getD1();
  const now = Math.floor(Date.now() / 1000);
  const row = await db.prepare("SELECT window_started_at AS windowStartedAt, message_count AS messageCount FROM contact_limits WHERE ip_hash = ?")
    .bind(ipHash).first<{ windowStartedAt: number; messageCount: number }>();
  if (!row || row.windowStartedAt < now - 3600) {
    await db.prepare(`INSERT INTO contact_limits (ip_hash, window_started_at, message_count) VALUES (?, ?, 1)
      ON CONFLICT(ip_hash) DO UPDATE SET window_started_at = excluded.window_started_at, message_count = 1`).bind(ipHash, now).run();
    return true;
  }
  if (row.messageCount >= 20) return false;
  await db.prepare("UPDATE contact_limits SET message_count = message_count + 1 WHERE ip_hash = ?").bind(ipHash).run();
  return true;
}
async function createRevision(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest).slice(0, 12), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
