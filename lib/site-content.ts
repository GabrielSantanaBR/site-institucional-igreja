import { ensureDatabase, getD1 } from "../db/runtime";

export const contentKinds = ["post", "sermon", "event", "devotional", "leader", "gallery"] as const;
export type ContentKind = (typeof contentKinds)[number];

export type ContentItem = {
  id: number;
  kind: ContentKind;
  title: string;
  subtitle: string;
  body: string;
  date: string;
  time: string;
  location: string;
  imageUrl: string;
  linkUrl: string;
  author: string;
  groupId: number | null;
  imagePosition: string;
  sortOrder: number;
  active: boolean;
  updatedAt: string;
};

export type ContentGroup = {
  id: number;
  name: string;
  description: string;
  coverImageUrl: string;
  coverImagePosition: string;
  sortOrder: number;
  active: boolean;
  updatedAt: string;
};

type DatabaseContentItem = Omit<ContentItem, "active"> & { active: number };

const defaults: Record<ContentKind, ContentItem[]> = {
  post: [],
  sermon: [],
  leader: [],
  event: [],
  devotional: [],
  gallery: [],
};

function normalize(row: DatabaseContentItem): ContentItem {
  return { ...row, active: Boolean(row.active) };
}

export async function getPublicContent(kind: ContentKind): Promise<ContentItem[]> {
  try {
    await ensureDatabase();
    const { results } = await getD1().prepare(
      `SELECT id, kind, title, subtitle, body, date, time, location,
       image_url AS imageUrl, link_url AS linkUrl, author, group_id AS groupId,
       image_position AS imagePosition,
       sort_order AS sortOrder, active, updated_at AS updatedAt
       FROM content_items WHERE kind = ? ORDER BY sort_order, id`
    ).bind(kind).all<DatabaseContentItem>();
    if (!results.length) return defaults[kind];
    return results.map(normalize).filter((item) => item.active).sort((left, right) => comparePublicContent(kind, left, right));
  } catch (error) {
    console.error(JSON.stringify({
      event: "public_content_read_failed",
      kind,
      error: error instanceof Error ? error.message : String(error),
    }));
    return defaults[kind];
  }
}

function comparePublicContent(kind: ContentKind, left: ContentItem, right: ContentItem) {
  const manualOrder = left.sortOrder - right.sortOrder;
  if (manualOrder) return manualOrder;
  if (kind === "event") return `${left.date}T${left.time || "23:59"}`.localeCompare(`${right.date}T${right.time || "23:59"}`) || left.id - right.id;
  if (["post", "sermon", "devotional"].includes(kind)) return right.date.localeCompare(left.date) || right.id - left.id;
  return left.id - right.id;
}

export async function getAllContent(kind?: ContentKind): Promise<ContentItem[]> {
  await ensureDatabase();
  const statement = kind
    ? getD1().prepare(`SELECT id, kind, title, subtitle, body, date, time, location,
        image_url AS imageUrl, link_url AS linkUrl, author, group_id AS groupId,
        image_position AS imagePosition,
        sort_order AS sortOrder, active, updated_at AS updatedAt
        FROM content_items WHERE kind = ? ORDER BY kind, sort_order, id`).bind(kind)
    : getD1().prepare(`SELECT id, kind, title, subtitle, body, date, time, location,
        image_url AS imageUrl, link_url AS linkUrl, author, group_id AS groupId,
        image_position AS imagePosition,
        sort_order AS sortOrder, active, updated_at AS updatedAt
        FROM content_items ORDER BY kind, sort_order, id`);
  const { results } = await statement.all<DatabaseContentItem>();
  return results.map(normalize);
}

type DatabaseContentGroup = Omit<ContentGroup, "active"> & { active: number };

export async function getContentGroups(includeInactive = false): Promise<ContentGroup[]> {
  try {
    await ensureDatabase();
    const { results } = await getD1().prepare(`SELECT id, name, description,
      cover_image_url AS coverImageUrl, cover_image_position AS coverImagePosition,
      sort_order AS sortOrder, active, updated_at AS updatedAt
      FROM content_groups ORDER BY sort_order, name COLLATE NOCASE`)
      .all<DatabaseContentGroup>();
    return results.map((group) => ({ ...group, active: Boolean(group.active) }))
      .filter((group) => includeInactive || group.active);
  } catch (error) {
    console.error(JSON.stringify({
      event: "content_groups_read_failed",
      error: error instanceof Error ? error.message : String(error),
    }));
    return [];
  }
}
