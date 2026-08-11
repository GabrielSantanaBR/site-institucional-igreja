import { getRuntimeEnvironment } from "../db/runtime";

type PrayerNotification = {
  name: string;
  contact: string;
  subject: string;
  message: string;
};

export async function notifyPrayerByEmail(prayer: PrayerNotification) {
  const destination = getRuntimeEnvironment().PRAYER_NOTIFICATION_EMAIL?.trim().toLowerCase();
  if (!destination || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destination)) return false;

  try {
    const response = await fetch(`https://formsubmit.co/ajax/${destination}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        _subject: `[PIBRG] Novo pedido de oração — ${prayer.subject}`,
        _template: "table",
        _captcha: "false",
        Nome: prayer.name || "Anônimo",
        Contato: prayer.contact || "Não informado",
        Assunto: prayer.subject,
        Pedido: prayer.message,
        "Recebido em": new Intl.DateTimeFormat("pt-BR", {
          dateStyle: "short",
          timeStyle: "short",
          timeZone: "America/Sao_Paulo",
        }).format(new Date()),
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
