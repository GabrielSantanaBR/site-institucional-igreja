import { getRuntimeEnvironment } from "../db/runtime";

type PrayerNotification = {
  name: string;
  contact: string;
  subject: string;
  message: string;
};

export async function notifyPrayerByEmail(prayer: PrayerNotification) {
  const environment = getRuntimeEnvironment();
  const destination = environment.PRAYER_NOTIFICATION_EMAIL?.trim().toLowerCase();
  const sender = environment.BREVO_SENDER_EMAIL?.trim().toLowerCase();
  const apiKey = environment.BREVO_API_KEY?.trim();
  if (!isEmail(destination) || !isEmail(sender) || !apiKey) {
    console.error("prayer email notification is not configured");
    return false;
  }

  try {
    const receivedAt = new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "America/Sao_Paulo",
    }).format(new Date());
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        sender: { name: "PIBRG — Pedidos de oração", email: sender },
        to: [{ email: destination, name: "Equipe de intercessão PIBRG" }],
        subject: `[PIBRG] Novo pedido de oração — ${prayer.subject}`,
        textContent: [
          `Nome: ${prayer.name || "Anônimo"}`,
          `Contato: ${prayer.contact || "Não informado"}`,
          `Assunto: ${prayer.subject}`,
          `Recebido em: ${receivedAt}`,
          "",
          prayer.message,
        ].join("\n"),
        htmlContent: `<h2>Novo pedido de oração</h2>
          <p><strong>Nome:</strong> ${escapeHtml(prayer.name || "Anônimo")}</p>
          <p><strong>Contato:</strong> ${escapeHtml(prayer.contact || "Não informado")}</p>
          <p><strong>Assunto:</strong> ${escapeHtml(prayer.subject)}</p>
          <p><strong>Recebido em:</strong> ${escapeHtml(receivedAt)}</p>
          <hr><p style="white-space:pre-wrap">${escapeHtml(prayer.message)}</p>`,
      }),
    });

    if (!response.ok) {
      console.error("prayer email notification failed", response.status);
      return false;
    }
    return true;
  } catch (error) {
    console.error("prayer email notification failed", error instanceof Error ? error.message : "unknown error");
    return false;
  }
}

function isEmail(value: string | undefined): value is string {
  return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] ?? character);
}
