const UPSTREAM_ORIGIN = "https://site-institucional-igreja.tudoido521.chatgpt.site";
const PRAYER_ENDPOINT = "/api/prayer-requests";
const MAX_NOTIFICATION_BODY_BYTES = 12_000;

const AUTH_PATHS = new Set([
  "/acesso-interno",
  "/signin-with-chatgpt",
  "/callback",
  "/signout-with-chatgpt",
]);

type PrayerPayload = {
  name: string;
  contact: string;
  subject: string;
  message: string;
};

function rewriteHeaderUrl(value: string, publicOrigin: string): string {
  return value.startsWith(UPSTREAM_ORIGIN)
    ? `${publicOrigin}${value.slice(UPSTREAM_ORIGIN.length)}`
    : value;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] ?? character);
}

function clean(value: unknown, maximumLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maximumLength) : "";
}

async function readPrayerPayload(request: Request): Promise<PrayerPayload | null> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_NOTIFICATION_BODY_BYTES) return null;

  try {
    const body: unknown = await request.clone().json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return null;
    const values = body as Record<string, unknown>;
    const subject = clean(values.subject, 60);
    const message = clean(values.message, 4_000);
    if (!subject || message.length < 10 || values.consent !== true) return null;

    return {
      name: clean(values.name, 100) || "Anônimo",
      contact: clean(values.contact, 160) || "Não informado",
      subject,
      message,
    };
  } catch {
    return null;
  }
}

async function sendPrayerNotification(env: Env, prayer: PrayerPayload): Promise<void> {
  const receivedAt = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date());

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "api-key": env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { name: "PIBRG — Pedidos de oração", email: env.BREVO_SENDER_EMAIL },
        to: [{ email: env.PRAYER_NOTIFICATION_EMAIL, name: "Equipe de intercessão PIBRG" }],
        subject: `[PIBRG] Novo pedido de oração — ${prayer.subject}`,
        textContent: [
          `Nome: ${prayer.name}`,
          `Contato: ${prayer.contact}`,
          `Assunto: ${prayer.subject}`,
          `Recebido em: ${receivedAt}`,
          "",
          prayer.message,
        ].join("\n"),
        htmlContent: `<h2>Novo pedido de oração</h2>
          <p><strong>Nome:</strong> ${escapeHtml(prayer.name)}</p>
          <p><strong>Contato:</strong> ${escapeHtml(prayer.contact)}</p>
          <p><strong>Assunto:</strong> ${escapeHtml(prayer.subject)}</p>
          <p><strong>Recebido em:</strong> ${escapeHtml(receivedAt)}</p>
          <hr><p style="white-space:pre-wrap">${escapeHtml(prayer.message)}</p>`,
      }),
    });

    if (!response.ok) {
      console.error(JSON.stringify({ event: "prayer_email_failed", status: response.status }));
    }
  } catch (error) {
    console.error(JSON.stringify({
      event: "prayer_email_failed",
      reason: error instanceof Error ? error.message : "unknown",
    }));
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const publicUrl = new URL(request.url);

    if (AUTH_PATHS.has(publicUrl.pathname)) {
      return Response.redirect(
        `${UPSTREAM_ORIGIN}${publicUrl.pathname}${publicUrl.search}`,
        302,
      );
    }

    const shouldNotify = request.method === "POST" && publicUrl.pathname === PRAYER_ENDPOINT;
    const prayerPayload = shouldNotify ? await readPrayerPayload(request) : null;
    const upstreamUrl = new URL(publicUrl.pathname + publicUrl.search, UPSTREAM_ORIGIN);
    const headers = new Headers(request.headers);
    headers.delete("host");

    if (headers.get("origin") === publicUrl.origin) {
      headers.set("origin", UPSTREAM_ORIGIN);
    }

    const referer = headers.get("referer");
    if (referer?.startsWith(publicUrl.origin)) {
      headers.set("referer", `${UPSTREAM_ORIGIN}${referer.slice(publicUrl.origin.length)}`);
    }

    const upstreamResponse = await fetch(new Request(upstreamUrl, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
      redirect: "manual",
    }));

    if (prayerPayload && upstreamResponse.status === 201) {
      ctx.waitUntil(sendPrayerNotification(env, prayerPayload));
    }

    const responseHeaders = new Headers(upstreamResponse.headers);
    const location = responseHeaders.get("location");
    if (location) {
      responseHeaders.set("location", rewriteHeaderUrl(location, publicUrl.origin));
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  },
} satisfies ExportedHandler<Env>;
