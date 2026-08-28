import { getRuntimeEnvironment } from "../../../../db/runtime";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9]+-[0-9a-f-]+\.(jpg|png|webp|avif)$/i.test(id)) return new Response("Imagem inválida.", { status: 400 });
  const bucket = getRuntimeEnvironment().BUCKET;
  if (!bucket) return new Response("Armazenamento indisponível.", { status: 503 });
  const object = await bucket.get(id);
  if (!object) return new Response("Imagem não encontrada.", { status: 404 });
  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      "ETag": object.etag || id,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
