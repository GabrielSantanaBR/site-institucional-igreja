import { getChatGPTUser } from "../app/chatgpt-auth";
import { cookies } from "next/headers";
import { ensureDatabase, getD1, getRuntimeEnvironment } from "../db/runtime";
import { ADMIN_COOKIE_NAME, verifyAdminSession } from "./admin-session";

export const roles = ["owner", "admin", "secretary", "intercessor"] as const;
export type AdminRole = (typeof roles)[number];
export type Permission = "content" | "prayers" | "contacts" | "users" | "audit";

export type AdminIdentity = {
  email: string;
  name: string;
  role: AdminRole;
};

const permissions: Record<AdminRole, Permission[]> = {
  owner: ["content", "prayers", "contacts", "users", "audit"],
  admin: ["content", "prayers", "contacts", "audit"],
  secretary: ["content", "contacts"],
  intercessor: ["prayers"],
};

export function can(identity: AdminIdentity, permission: Permission) {
  return permissions[identity.role].includes(permission);
}

export async function getAdminIdentity(): Promise<AdminIdentity | null> {
  const cookieStore = await cookies();
  const panelSession = await verifyAdminSession(cookieStore.get(ADMIN_COOKIE_NAME)?.value);
  if (panelSession) {
    return { email: "painel@pibrg.local", name: panelSession.name, role: panelSession.role };
  }

  const user = await getChatGPTUser();
  if (!user) return null;
  const email = normalizeEmail(user.email);
  const rootEmail = normalizeEmail(getRuntimeEnvironment().SUPER_ADMIN_EMAIL ?? "");

  if (rootEmail && email === rootEmail) {
    return { email, name: user.displayName, role: "owner" };
  }

  await ensureDatabase();
  const record = await getD1().prepare(
    "SELECT email, name, role, active FROM admin_users WHERE email = ? LIMIT 1"
  ).bind(email).first<{ email: string; name: string; role: string; active: number }>();

  if (!record?.active || !roles.includes(record.role as AdminRole)) return null;
  return { email: record.email, name: record.name || user.displayName, role: record.role as AdminRole };
}

export async function requireApiPermission(permission: Permission) {
  const identity = await getAdminIdentity();
  if (!identity) return { error: Response.json({ error: "Acesso não autorizado." }, { status: 401 }) } as const;
  if (!can(identity, permission)) return { error: Response.json({ error: "Seu perfil não possui esta permissão." }, { status: 403 }) } as const;
  return { identity } as const;
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export async function writeAudit(actorEmail: string, action: string, entityType: string, entityId = "", metadata: Record<string, unknown> = {}) {
  await ensureDatabase();
  await getD1().prepare(
    "INSERT INTO audit_logs (actor_email, action, entity_type, entity_id, metadata) VALUES (?, ?, ?, ?, ?)"
  ).bind(actorEmail, action, entityType, entityId, JSON.stringify(metadata)).run();
}
