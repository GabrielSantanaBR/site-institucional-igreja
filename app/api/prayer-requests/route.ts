import { ensureDatabase, getD1 } from "../../../db/runtime";
import { encryptPrayer, hashIp } from "../../../lib/prayer-security";

const allowedSubjects = ["Família", "Saúde", "Trabalho e estudos", "Vida espiritual", "Outro"];

export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) {
      return Response.json({ error: "Origem da solicitação inválida." }, { status: 403 });
    }

    const payload = await request.json() as Record<string, unknown>;
    if (String(payload.website ?? "").trim()) return Response.json({ ok: true }, { status: 201 });

    const name = clean(payload.name, 100);
    const contact = clean(payload.contact, 160);
    const subject = clean(payload.subject, 60);
    const message = clean(payload.message, 4000);
    const consent = payload.consent === true;

    if (!allowedSubjects.includes(subject) || message.length < 10 || !consent) {
      return Response.json({ error: "Revise os campos obrigatórios antes de enviar." }, { status: 400 });
    }

    await ensureDatabase();
    const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const ipHash = await hashIp(ip);
    if (!(await allowSubmission(ipHash))) {
      return Response.json({ error: "Muitos pedidos foram enviados deste dispositivo. Tente novamente mais tarde." }, { status: 429 });
    }

    const encrypted = await encryptPrayer({ name: name || "Anônimo", contact, message });
    await getD1().prepare(
      "INSERT INTO prayer_requests (encrypted_payload, subject, source_ip_hash) VALUES (?, ?, ?)"
    ).bind(encrypted, subject, ipHash).run();

    return Response.json({ ok: true }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("prayer submission failed", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: "Não foi possível registrar o pedido agora. Tente novamente em alguns minutos." }, { status: 500 });
  }
}

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

async function allowSubmission(ipHash: string) {
  const db = getD1();
  const now = Math.floor(Date.now() / 1000);
  const oneHourAgo = now - 3600;
  const row = await db.prepare(
    "SELECT window_started_at AS windowStartedAt, submission_count AS submissionCount FROM submission_limits WHERE ip_hash = ?"
  ).bind(ipHash).first<{ windowStartedAt: number; submissionCount: number }>();

  if (!row || row.windowStartedAt < oneHourAgo) {
    await db.prepare(`INSERT INTO submission_limits (ip_hash, window_started_at, submission_count)
      VALUES (?, ?, 1) ON CONFLICT(ip_hash) DO UPDATE SET window_started_at = excluded.window_started_at, submission_count = 1`)
      .bind(ipHash, now).run();
    return true;
  }
  if (row.submissionCount >= 5) return false;
  await db.prepare("UPDATE submission_limits SET submission_count = submission_count + 1 WHERE ip_hash = ?").bind(ipHash).run();
  return true;
}
