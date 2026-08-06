import { getRuntimeEnvironment } from "../db/runtime";

export type PrayerPayload = { name: string; contact: string; message: string };

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function getEncryptionKey() {
  const encoded = getRuntimeEnvironment().PRAYER_ENCRYPTION_KEY;
  if (!encoded) throw new Error("A chave de proteção dos pedidos não foi configurada.");
  const raw = base64ToBytes(encoded);
  if (raw.byteLength !== 32) throw new Error("A chave de proteção dos pedidos é inválida.");
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptPrayer(payload: PrayerPayload) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(payload));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await getEncryptionKey(), data);
  return `${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(encrypted))}`;
}

export async function decryptPrayer(value: string): Promise<PrayerPayload> {
  const [encodedIv, encodedData] = value.split(".");
  if (!encodedIv || !encodedData) throw new Error("Pedido com formato inválido.");
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(encodedIv) },
    await getEncryptionKey(),
    base64ToBytes(encodedData),
  );
  return JSON.parse(new TextDecoder().decode(decrypted)) as PrayerPayload;
}

export async function hashIp(ip: string) {
  const salt = getRuntimeEnvironment().IP_HASH_SALT;
  if (!salt) throw new Error("A proteção contra abuso não foi configurada.");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${ip}`));
  return bytesToBase64(new Uint8Array(digest));
}
