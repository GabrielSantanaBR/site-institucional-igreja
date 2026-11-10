"use client";
import { useState, useSyncExternalStore } from "react";
import { adFormats, adIsEnabled, type AdFormat } from "../../lib/ad-formats";
import type { SiteSettings } from "../../lib/site-settings";

export function GenericAdSample({ format }: { format: AdFormat }) {
  return <div className={`generic-ad-sample generic-ad-${format}`}>
    <span className="generic-ad-label">Publicidade · Exemplo</span>
    <strong>Seu negócio pode estar aqui</strong>
    <span>Espaço demonstrativo para apoiadores da comunidade.</span>
  </div>;
}

export function GenericAds({ settings, pathname }: { settings: SiteSettings; pathname: string }) {
  const [closed, setClosed] = useState(false);
  const storedClosed = useSyncExternalStore(subscribeStorage, readClosed, () => false);
  function close() {
    setClosed(true);
    try { sessionStorage.setItem("pibrg-ad-bottom-closed", "1"); } catch { /* Keep close functional without storage. */ }
  }
  // Never overlay the visitor's prayer or conversation forms.
  const protectedPage = pathname.startsWith("/pedido-de-oracao") || pathname.startsWith("/fale-conosco");
  return <>{adFormats.map(({ key, id, title }) => {
    if (!adIsEnabled(settings[key]) || (id === "bottom" && (closed || storedClosed || protectedPage))) return null;
    return <aside key={id} className={`generic-ad-slot generic-ad-slot-${id}`} data-analytics-ad={id} aria-label={`Anúncio de exemplo: ${title}`}>
      <GenericAdSample format={id} />
      {id === "bottom" && <button type="button" className="generic-ad-close" data-analytics-close="bottom" aria-label="Fechar anúncio inferior" onClick={close}>×</button>}
    </aside>;
  })}</>;
}

function subscribeStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}
function readClosed() {
  try { return sessionStorage.getItem("pibrg-ad-bottom-closed") === "1"; } catch { return false; }
}
