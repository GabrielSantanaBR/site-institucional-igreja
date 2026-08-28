import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, ADMIN_SESSION_SECONDS, createAdminSession, validAdminCredentials } from "../../../../lib/admin-session";
import { ensureDatabase, getD1, getRuntimeEnvironment } from "../../../../db/runtime";
import { rejectCrossSiteMutation, readJsonObject } from "../../../../lib/request-security";

const WINDOW_SECONDS = 15 * 60;
const MAX_ATTEMPTS = 10;

export async function POST(request: Request) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;
  const payload = await readJsonObject(request, 8 * 1024) ?? {};
  const username = typeof payload.username === "string" ? payload.username.slice(0, 80) : "";
  const password = typeof payload.password === "string" ? payload.password.slice(0, 160) : "";
  const ipKey = await requestKey(request);

  if (!(await mayAttempt(ipKey))) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde 15 minutos e tente novamente." }, { status: 429 });
  }

  if (!(await validAdminCredentials(username, password))) {
    await recordFailure(ipKey);
    return NextResponse.json({ error: "Usuário ou senha incorretos." }, { status: 401 });
  }

  await clearFailures(ipKey);
  const token = await createAdminSession(username);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: ADMIN_SESSION_SECONDS,
    priority: "high",
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

async function requestKey(request: Request) {
  const env = getRuntimeEnvironment();
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const salt = env.ADMIN_SESSION_SECRET || env.IP_HASH_SALT || "pibrg-login";
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${ip.trim()}`));
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function mayAttempt(key: string) {
  await ensureDatabase();
  const now = Math.floor(Date.now() / 1000);
  const row = await getD1().prepare("SELECT window_started_at AS startedAt, attempt_count AS attemptCount FROM admin_login_limits WHERE ip_hash = ?").bind(key).first<{ startedAt: number; attemptCount: number }>();
  return !row || now - row.startedAt >= WINDOW_SECONDS || row.attemptCount < MAX_ATTEMPTS;
}

async function recordFailure(key: string) {
  const now = Math.floor(Date.now() / 1000);
  await getD1().prepare(`INSERT INTO admin_login_limits (ip_hash, window_started_at, attempt_count)
    VALUES (?, ?, 1)
    ON CONFLICT(ip_hash) DO UPDATE SET
      window_started_at = CASE WHEN ? - window_started_at >= ? THEN ? ELSE window_started_at END,
      attempt_count = CASE WHEN ? - window_started_at >= ? THEN 1 ELSE attempt_count + 1 END`)
    .bind(key, now, now, WINDOW_SECONDS, now, now, WINDOW_SECONDS).run();
}

async function clearFailures(key: string) {
  await getD1().prepare("DELETE FROM admin_login_limits WHERE ip_hash = ?").bind(key).run();
}
