import { ensureDatabase, getD1, getRuntimeEnvironment } from "../../../../db/runtime";
import { normalizeEmail, requireApiPermission, roles, writeAudit, type AdminRole } from "../../../../lib/internal-auth";

export async function GET() {
  const auth = await requireApiPermission("users");
  if ("error" in auth) return auth.error;
  await ensureDatabase();
  const { results } = await getD1().prepare(`SELECT id, email, name, role, active,
    created_at AS createdAt, updated_at AS updatedAt FROM admin_users ORDER BY name, email`)
    .all<{ id: number; email: string; name: string; role: AdminRole; active: number; createdAt: string; updatedAt: string }>();
  const rootEmail = normalizeEmail(getRuntimeEnvironment().SUPER_ADMIN_EMAIL ?? "");
  return Response.json({
    users: results.map((user) => ({ ...user, active: Boolean(user.active), protected: false })),
    owner: { id: 0, email: rootEmail, name: auth.identity.email === rootEmail ? auth.identity.name : "Proprietário", role: "owner", active: true, protected: true },
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const auth = await requireApiPermission("users");
  if ("error" in auth) return auth.error;
  const payload = await request.json() as Record<string, unknown>;
  const action = String(payload.action ?? "");
  await ensureDatabase();

  if (action === "save") {
    const email = normalizeEmail(String(payload.email ?? ""));
    const name = String(payload.name ?? "").trim().slice(0, 120);
    const role = String(payload.role ?? "") as AdminRole;
    const active = payload.active !== false;
    if (!email.includes("@") || !roles.includes(role) || role === "owner") {
      return Response.json({ error: "Informe um e-mail e um nível de acesso válidos." }, { status: 400 });
    }
    if (email === normalizeEmail(getRuntimeEnvironment().SUPER_ADMIN_EMAIL ?? "")) {
      return Response.json({ error: "O proprietário principal não pode ser alterado aqui." }, { status: 400 });
    }
    await getD1().prepare(`INSERT INTO admin_users (email, name, role, active, created_by)
      VALUES (?, ?, ?, ?, ?) ON CONFLICT(email) DO UPDATE SET name = excluded.name,
      role = excluded.role, active = excluded.active, updated_at = CURRENT_TIMESTAMP`)
      .bind(email, name, role, active ? 1 : 0, auth.identity.email).run();
    await writeAudit(auth.identity.email, "save", "admin_user", email, { role, active });
    return Response.json({ ok: true });
  }

  if (action === "delete") {
    const email = normalizeEmail(String(payload.email ?? ""));
    if (!email || email === normalizeEmail(getRuntimeEnvironment().SUPER_ADMIN_EMAIL ?? "")) {
      return Response.json({ error: "Usuário inválido." }, { status: 400 });
    }
    await getD1().prepare("DELETE FROM admin_users WHERE email = ?").bind(email).run();
    await writeAudit(auth.identity.email, "delete", "admin_user", email);
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Ação inválida." }, { status: 400 });
}
