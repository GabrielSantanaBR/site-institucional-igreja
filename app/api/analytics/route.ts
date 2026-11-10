import { getRuntimeEnvironment } from "../../../db/runtime";
import { analyticsIsEnabled, recordAnalytics } from "../../../lib/analytics";
import { validAnalyticsEvent } from "../../../lib/analytics-contract";
import { ADMIN_COOKIE_NAME } from "../../../lib/admin-session";
import { clientIp, readJsonObject, rejectCrossSiteMutation } from "../../../lib/request-security";

const limits = new Map<string, { until: number; count: number }>();
async function allowEvents(request: Request, count: number) {
  const now = Date.now();
  for (const [key, value] of limits) if (value.until <= now) limits.delete(key);
  const env = getRuntimeEnvironment();
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${env.IP_HASH_SALT || env.ADMIN_SESSION_SECRET}:${clientIp(request)}`));
  const key = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("");
  const current = limits.get(key);
  if (current) { if (current.count + count > 120) return false; current.count += count; return true; }
  if (limits.size >= 2048) return false;
  limits.set(key, { until: now + 60_000, count }); return true;
}
export async function POST(request: Request) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;
  if (!request.headers.get("origin")) return new Response(null, { status: 403 });
  if (request.headers.get("dnt") === "1" || request.headers.get("sec-gpc") === "1" || /bot|spider|crawler|preview/i.test(request.headers.get("user-agent") ?? "")) return new Response(null, { status: 204 });
  if ((request.headers.get("cookie") ?? "").split(";").some(part => part.trim().startsWith(ADMIN_COOKIE_NAME + "="))) return new Response(null, { status: 204 });
  try {
    if (!(await analyticsIsEnabled())) return new Response(null, { status: 204 });
    const payload = await readJsonObject(request, 8192);
    if (!payload || Object.keys(payload).some(key => key !== "events") || !Array.isArray(payload.events) || !payload.events.length || payload.events.length > 20 || !payload.events.every(validAnalyticsEvent)) return Response.json({ error: "Eventos inválidos." }, { status: 400 });
    if (!(await allowEvents(request, payload.events.length))) return new Response(null, { status: 429, headers: { "Retry-After": "60" } });
    await recordAnalytics(payload.events);
    return new Response(null, { status: 204 });
  } catch {
    // Analytics must never interrupt the visitor's primary task.
    return new Response(null, { status: 503 });
  }
}
