"use client";
import { useState, useSyncExternalStore } from "react";
import { analyticsOptedOut, setAnalyticsPreference } from "../../lib/analytics-client";

export function AnalyticsPrivacy() {
  const optedOut = useSyncExternalStore(subscribe, analyticsOptedOut, () => false);
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  const [message, setMessage] = useState("");
  function toggle() {
    const next = !optedOut;
    const stored = setAnalyticsPreference(next);
    const effective = analyticsOptedOut();
    setMessage(effective && !next ? "Seu navegador solicita não rastrear. Essa preferência será respeitada." : !stored ? "Preferência aplicada nesta visita. O navegador não permitiu salvá-la para visitas futuras." : next ? "As estatísticas foram desativadas neste navegador." : "Sua preferência foi atualizada. Ela será aplicada nas próximas páginas.");
  }
  return <section className="analytics-panel"><h2>Estatísticas neste navegador</h2><p>Você pode impedir o envio de contagens de uso. Essa preferência é salva apenas neste navegador e não identifica você.</p><button type="button" disabled={!ready} aria-pressed={optedOut} onClick={toggle}>{optedOut ? "Revisar preferência de estatísticas" : "Desativar estatísticas neste navegador"}</button>{message && <p role="status">{message}</p>}</section>;
}

function subscribe(callback: () => void) {
  window.addEventListener("pibrg-analytics-preference", callback); window.addEventListener("storage", callback);
  return () => { window.removeEventListener("pibrg-analytics-preference", callback); window.removeEventListener("storage", callback); };
}
