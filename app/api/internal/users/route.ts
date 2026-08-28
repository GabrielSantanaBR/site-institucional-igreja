import { ensureDatabase, getD1, getRuntimeEnvironment } from "../../../../db/runtime";
import { normalizeEmail, requireApiPermission, roles, type AdminRole } from "../../../../lib/internal-auth";
import { rejectCrossSiteMutation, readJsonObject } from "../../../../lib/request-security";

export async function GET() {
  try {
    const auth = await requireApiPermission("users");
    if ("error" in auth) return auth.error;
    await ensureDatabase();
    const { results } = await getD1().prepare(`SELECT id, email, name, role, active,
      created_at AS createdAt, updated_at AS updatedAt FROM admin_users ORDER BY name, email`)
      .all<{ id: number; email: string; name: string; role: AdminRole; active: number; createdAt: string; updatedAt: string }>();
    const rootEmail = normalizeEmail(getRuntimeEnvironment().SUPER_ADMIN_EMAIL ?? "") || "painel@pibrg.local";
    return noStore({
      users: results.map((user) => ({ ...user, active: Boolean(user.active), protected: false })),
      owner: { id: 0, email: rootEmail, name: auth.identity.email === rootEmail || auth.identity.email === "painel@pibrg.local" ? auth.identity.name : "Proprietário", role: "owner", active: true, protected: true },
    });
  } catch (error) {
    logUserFailure("user_read_failed", error);
    return noStore({ error: "Não foi possível carregar os acessos agora." }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const rejected = rejectCrossSiteMutation(request);
    if (rejected) return rejected;
    const auth = await requireApiPermission("users");
    if ("error" in auth) return auth.error;
    const payload = await readJsonObject(request);
    if (!payload) return noStore({ error: "Dados inválidos ou muito extensos." }, 400);
    const action = String(payload.action ?? "");
    await ensureDatabase();
    const db = getD1();

    if (action === "save") {
      const email = normalizeEmail(String(payload.email ?? "")).slice(0, 254);
      const name = String(payload.name ?? "").trim().slice(0, 120);
      const role = String(payload.role ?? "") as AdminRole;
      const active = payload.active !== false;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || name.length < 2 || !roles.includes(role) || role === "owner") {
        return noStore({ error: "Informe nome, e-mail e nível de acesso válidos." }, 400);
      }
      if (email === normalizeEmail(getRuntimeEnvironment().SUPER_ADMIN_EMAIL ?? "")) {
        return noStore({ error: "O proprietário principal não pode ser alterado aqui." }, 400);
      }
      await db.batch([
        db.prepare(`INSERT INTO admin_users (email, name, role, active, created_by)
          VALUES (?, ?, ?, ?, ?) ON CONFLICT(email) DO UPDATE SET name = excluded.name,
          role = excluded.role, active = excluded.active, updated_at = CURRENT_TIMESTAMP`)
          .bind(email, name, role, active ? 1 : 0, auth.identity.email),
        userAudit(db, auth.identity.email, "save", email, { role, active }),
      ]);
      return noStore({ ok: true });
    }

    if (action === "delete") {
      const email = normalizeEmail(String(payload.email ?? "")).slice(0, 254);
      if (!email || email === normalizeEmail(getRuntimeEnvironment().SUPER_ADMIN_EMAIL ?? "")) {
        return noStore({ error: "Usuário inválido." }, 400);
      }
      const [deleted] = await db.batch([
        db.prepare("DELETE FROM admin_users WHERE email = ?").bind(email),
        userAudit(db, auth.identity.email, "delete", email),
      ]);
      if (deleted.meta.changes !== 1) return noStore({ error: "Este acesso já não existe mais." }, 404);
      return noStore({ ok: true });
    }

    return noStore({ error: "Ação inválida." }, 400);
  } catch (error) {
    logUserFailure("user_mutation_failed", error);
    return noStore({ error: "Não foi possível alterar o acesso agora. Tente novamente." }, 500);
  }
}

function userAudit(database: ReturnType<typeof getD1>, actor: string, action: string, email: string, metadata: Record<string, unknown> = {}) {
  return database.prepare(
    "INSERT INTO audit_logs (actor_email, action, entity_type, entity_id, metadata) VALUES (?, ?, 'admin_user', ?, ?)"
  ).bind(actor, action, email, JSON.stringify(metadata));
}

function noStore(data: Record<string, unknown>, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}

function logUserFailure(event: string, error: unknown) {
  console.error(JSON.stringify({ event, error: error instanceof Error ? error.message : String(error) }));
}
