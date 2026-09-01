import { getRuntimeEnvironment } from "../db/runtime";

/**
 * Endereço público atual. Quando a igreja adquirir um domínio, basta definir
 * PUBLIC_SITE_URL com o novo https://dominio-da-igreja para atualizar canônicos,
 * sitemap, Schema.org e llms.txt sem trocar links internos do site.
 */
export const DEFAULT_PUBLIC_SITE_URL = "https://pibrg-guadalupe.tudoido521.workers.dev";

function safeOrigin(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

export function getPublicSiteOrigin() {
  return safeOrigin(getRuntimeEnvironment().PUBLIC_SITE_URL) ?? DEFAULT_PUBLIC_SITE_URL;
}

export function getPublicSiteUrl(path = "/") {
  return new URL(path, `${getPublicSiteOrigin()}/`).toString();
}

export function getMetadataBase() {
  return new URL(getPublicSiteOrigin());
}
