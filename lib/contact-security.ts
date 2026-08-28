import { saltedHash } from "./private-data";

export function createContactAccess() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return { id: crypto.randomUUID(), token: btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "") };
}

export function isContactAccess(id: string, token: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    && /^[A-Za-z0-9_-]{40,64}$/.test(token);
}

export function hashContactToken(token: string) {
  return saltedHash(`contact-token:${token}`);
}

export function hashContactIp(ip: string) {
  return saltedHash(`contact-ip:${ip}`);
}
