import { getRuntimeEnvironment } from "../db/runtime";

type ContactNotification = { name: string; contact: string; subject: string; message: string };

export async function notifyContactByEmail(contact: ContactNotification) {
  const environment = getRuntimeEnvironment();
  const destination = (environment.CONTACT_NOTIFICATION_EMAIL || environment.PRAYER_NOTIFICATION_EMAIL)?.trim().toLowerCase();
  const sender = environment.BREVO_SENDER_EMAIL?.trim().toLowerCase();
  const apiKey = environment.BREVO_API_KEY?.trim();
  if (!isEmail(destination) || !isEmail(sender) || !apiKey) return false;

  try {
    const receivedAt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date());
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "api-key": apiKey },
      body: JSON.stringify({
        sender: { name: "PIBRG — Fale Conosco", email: sender },
        to: [{ email: destination, name: "Secretaria PIBRG" }],
        subject: `[PIBRG] Nova mensagem — ${contact.subject}`,
        textContent: [`Nome: ${contact.name}`, `Contato: ${contact.contact || "Não informado"}`, `Assunto: ${contact.subject}`, `Recebida em: ${receivedAt}`, "", contact.message, "", "Responda pelo painel reservado do site."].join("\n"),
        htmlContent: `<h2>Nova mensagem no Fale Conosco</h2><p><strong>Nome:</strong> ${escapeHtml(contact.name)}</p><p><strong>Contato:</strong> ${escapeHtml(contact.contact || "Não informado")}</p><p><strong>Assunto:</strong> ${escapeHtml(contact.subject)}</p><p><strong>Recebida em:</strong> ${escapeHtml(receivedAt)}</p><hr><p style="white-space:pre-wrap">${escapeHtml(contact.message)}</p><p><strong>Responda pelo painel reservado do site.</strong></p>`,
      }),
    });
    if (!response.ok) console.error("contact email notification failed", response.status);
    return response.ok;
  } catch (error) {
    console.error("contact email notification failed", error instanceof Error ? error.message : "unknown error");
    return false;
  }
}

function isEmail(value: string | undefined): value is string { return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)); }
function escapeHtml(value: string) { return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] ?? character); }
