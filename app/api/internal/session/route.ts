import { can, getAdminIdentity } from "../../../../lib/internal-auth";

export async function GET() {
  const identity = await getAdminIdentity();
  if (!identity) return Response.json({ error: "Acesso não autorizado." }, { status: 401 });
  return Response.json({
    user: identity,
    permissions: {
      content: can(identity, "content"),
      prayers: can(identity, "prayers"),
      contacts: can(identity, "contacts"),
      users: can(identity, "users"),
      audit: can(identity, "audit"),
    },
  }, { headers: { "Cache-Control": "no-store" } });
}
