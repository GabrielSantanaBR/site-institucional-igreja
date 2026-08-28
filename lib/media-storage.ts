import { ensureDatabase, getD1, getRuntimeEnvironment } from "../db/runtime";

export async function removeMediaWhenUnused(mediaUrl: string) {
  const match = mediaUrl.match(/^\/api\/media\/([0-9]+-[0-9a-f-]+\.(?:jpg|png|webp|avif))$/i);
  if (!match) return;
  await ensureDatabase();
  const [content, groups] = await Promise.all([
    getD1().prepare("SELECT COUNT(*) AS total FROM content_items WHERE image_url = ?").bind(mediaUrl).first<{ total: number }>(),
    getD1().prepare("SELECT COUNT(*) AS total FROM content_groups WHERE cover_image_url = ?").bind(mediaUrl).first<{ total: number }>(),
  ]);
  if ((content?.total ?? 0) + (groups?.total ?? 0) > 0) return;
  try {
    await getRuntimeEnvironment().BUCKET?.delete(match[1]);
  } catch {
    // A falha de limpeza não deve desfazer uma publicação já salva no banco.
  }
}
