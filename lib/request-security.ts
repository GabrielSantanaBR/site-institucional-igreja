const MAX_JSON_BYTES = 80 * 1024;

export function rejectCrossSiteMutation(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
  if (fetchSite && !["same-origin", "none"].includes(fetchSite)) {
    return Response.json({ error: "Origem da solicitação não autorizada." }, { status: 403 });
  }

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const expectedOrigin = process.env.APP_RUNTIME === "node" && process.env.PUBLIC_SITE_URL
        ? new URL(process.env.PUBLIC_SITE_URL).origin : new URL(request.url).origin;
      if (new URL(origin).origin !== expectedOrigin) {
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
  const reader = request.body?.getReader();
  if (!reader) return null;
  try {
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); return null; }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  } finally { reader.releaseLock(); }
}
