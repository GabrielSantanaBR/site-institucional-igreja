import { getAnalyticsReport, setAnalyticsEnabled } from "../../../../lib/analytics";
import { requireApiPermission } from "../../../../lib/internal-auth";
import { readJsonObject, rejectCrossSiteMutation } from "../../../../lib/request-security";

export async function GET(request: Request) {
  const auth = await requireApiPermission("analytics"); if ("error" in auth) return auth.error;
  const days = Number(new URL(request.url).searchParams.get("days") ?? "30");
  if (![7, 30, 90].includes(days)) return Response.json({ error: "Período inválido." }, { status: 400 });
  try { return Response.json(await getAnalyticsReport(days), { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ error: "Não foi possível carregar as estatísticas." }, { status: 500 }); }
}
export async function POST(request: Request) {
  const rejected = rejectCrossSiteMutation(request); if (rejected) return rejected;
  const auth = await requireApiPermission("analytics"); if ("error" in auth) return auth.error;
  const payload = await readJsonObject(request, 2048);
  if (!payload || typeof payload.enabled !== "boolean" || typeof payload.revision !== "string" || !payload.revision || payload.revision.length > 64) return Response.json({ error: "Configuração inválida." }, { status: 400 });
  try {
    const revision = await setAnalyticsEnabled(payload.enabled, payload.revision, auth.identity.email);
    if (!revision) return Response.json({ error: "Outra pessoa atualizou a coleta. Recarregue os dados antes de alterar." }, { status: 409 });
    return Response.json({ ok: true, enabled: payload.enabled, revision });
  } catch { return Response.json({ error: "Não foi possível alterar a coleta." }, { status: 500 }); }
}
