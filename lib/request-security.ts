const MAX_JSON_BYTES = 80 * 1024;

export function rejectCrossSiteMutation(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
  if (fetchSite && !["same-origin", "none"].includes(fetchSite)) {
    return Response.json({ error: "Origem da solicitação não autorizada." }, { status: 403 });
  }

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(request.url).origin) {
        return Response.json({ error: "Origem da solicitação não autorizada." }, { status: 403 });
      }
    } catch {
      return Response.json({ error: "Origem da solicitação inválida." }, { status: 403 });
    }
  }
  return null;
}

export async function readJsonObject(request: Request, maxBytes = MAX_JSON_BYTES): Promise<Record<string, unknown> | null> {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json" && !contentType?.endsWith("+json")) return null;
  const declaredSize = Number(request.headers.get("content-length") || 0);
  if (declaredSize > maxBytes) return null;
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength > maxBytes) return null;
  try {
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}
