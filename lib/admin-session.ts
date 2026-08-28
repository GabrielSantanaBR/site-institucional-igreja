import { getRuntimeEnvironment } from "../db/runtime";

export const ADMIN_COOKIE_NAME = "pibrg_admin_session";
export const ADMIN_SESSION_SECONDS = 60 * 60 * 8;

type SessionPayload = {
  username: string;
  name: string;
  role: "owner";
  expiresAt: number;
};

function sessionSecret() {
  const env = getRuntimeEnvironment();
  return env.ADMIN_SESSION_SECRET || "";
}

function encode(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
}

async function sign(value: string) {
  const secret = sessionSecret();
  if (!secret) return "";
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
  let binary = "";
  for (const byte of signature) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function sameValue(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

async function digest(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function validAdminCredentials(username: string, password: string) {
  const env = getRuntimeEnvironment();
  const expectedUser = env.ADMIN_USERNAME || "";
  const expectedPassword = env.ADMIN_PASSWORD || "";
  if (!expectedUser || !expectedPassword) return false;
  const [receivedUser, storedUser, receivedPassword, storedPassword] = await Promise.all([
    digest(username.trim().toUpperCase()),
    digest(expectedUser.trim().toUpperCase()),
    digest(password),
    digest(expectedPassword),
  ]);
  return sameValue(receivedUser, storedUser) && sameValue(receivedPassword, storedPassword);
}

export async function createAdminSession(username: string) {
  const payload: SessionPayload = {
    username: username.trim().toUpperCase(),
    name: "Administrador PIBRG",
    role: "owner",
    expiresAt: Date.now() + ADMIN_SESSION_SECONDS * 1000,
  };
  const encoded = encode(JSON.stringify(payload));
  const signature = await sign(encoded);
  if (!signature) throw new Error("A sessão administrativa ainda não foi configurada.");
  return `${encoded}.${signature}`;
}

export async function verifyAdminSession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  const [encoded, receivedSignature, extra] = token.split(".");
  if (!encoded || !receivedSignature || extra) return null;
  const expectedSignature = await sign(encoded);
  if (!expectedSignature || !sameValue(receivedSignature, expectedSignature)) return null;
  try {
    const payload = JSON.parse(decode(encoded)) as SessionPayload;
    if (payload.role !== "owner"
      || typeof payload.username !== "string" || !payload.username
      || typeof payload.name !== "string" || !payload.name
      || typeof payload.expiresAt !== "number" || !Number.isFinite(payload.expiresAt)
      || payload.expiresAt <= Date.now()
      || payload.expiresAt > Date.now() + ADMIN_SESSION_SECONDS * 1000 + 60_000) return null;
    return payload;
  } catch {
    return null;
  }
}
