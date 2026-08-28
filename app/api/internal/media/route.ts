import { getRuntimeEnvironment, scheduleBackground } from "../../../../db/runtime";
import { requireApiPermission, writeAudit } from "../../../../lib/internal-auth";
import { rejectCrossSiteMutation } from "../../../../lib/request-security";

const allowedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/avif", "avif"],
]);

export async function POST(request: Request) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;
  const auth = await requireApiPermission("content");
  if ("error" in auth) return auth.error;
  const bucket = getRuntimeEnvironment().BUCKET;
  if (!bucket) return Response.json({ error: "O armazenamento de imagens ainda não está disponível." }, { status: 503 });
  const declaredSize = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declaredSize) && declaredSize > 4 * 1024 * 1024) {
    return Response.json({ error: "O envio ultrapassa o limite permitido. Otimize a imagem e tente novamente." }, { status: 413 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Selecione uma imagem válida." }, { status: 400 });
  const declaredExtension = allowedTypes.get(file.type);
  if (!declaredExtension) return Response.json({ error: "Use uma imagem JPG, PNG, WebP ou AVIF." }, { status: 415 });
  if (file.size < 1 || file.size > 3 * 1024 * 1024) return Response.json({ error: "A imagem deve ter no máximo 3 MB após a otimização." }, { status: 413 });

  const bytes = await file.arrayBuffer();
  const detectedType = detectImageType(new Uint8Array(bytes));
  const extension = detectedType ? allowedTypes.get(detectedType) : undefined;
  if (!extension || detectedType !== file.type) {
    return Response.json({ error: "O conteúdo do arquivo não corresponde a uma imagem válida." }, { status: 415 });
  }
  const id = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
  await bucket.put(id, bytes, {
    httpMetadata: { contentType: detectedType, cacheControl: "public, max-age=31536000, immutable" },
    customMetadata: { originalName: file.name.slice(0, 150), uploadedBy: auth.identity.email },
  });
  const audit = writeAudit(auth.identity.email, "upload", "media", id, { type: file.type, size: file.size })
    .catch((error) => console.error(JSON.stringify({ event: "media_audit_failed", error: error instanceof Error ? error.message : String(error) })));
  if (!scheduleBackground(audit)) await audit;
  return Response.json({ ok: true, url: `/api/media/${id}` }, { status: 201 });
}

function detectImageType(bytes: Uint8Array) {
  if (bytes.length >= 12 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value)) return "image/png";
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return "image/webp";
  if (bytes.length >= 16 && ascii(bytes, 4, 8) === "ftyp" && ["avif", "avis"].includes(ascii(bytes, 8, 12))) return "image/avif";
  return "";
}

function ascii(bytes: Uint8Array, start: number, end: number) {
  return String.fromCharCode(...bytes.slice(start, end));
}
