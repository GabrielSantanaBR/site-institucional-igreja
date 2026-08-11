import { ensureDatabase, getD1 } from "../db/runtime";

export const contentKinds = ["leader", "event", "devotional"] as const;
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
  sortOrder: number;
  active: boolean;
};

type DatabaseContentItem = Omit<ContentItem, "active"> & { active: number };

const defaults: Record<ContentKind, ContentItem[]> = {
  leader: [],
  event: [],
  devotional: [],
};

function normalize(row: DatabaseContentItem): ContentItem {
  return { ...row, active: Boolean(row.active) };
}

export async function getPublicContent(kind: ContentKind): Promise<ContentItem[]> {
  try {
    await ensureDatabase();
    const { results } = await getD1().prepare(
      `SELECT id, kind, title, subtitle, body, date, time, location,
       sort_order AS sortOrder, active FROM content_items WHERE kind = ? ORDER BY sort_order, id`
    ).bind(kind).all<DatabaseContentItem>();
    if (!results.length) return defaults[kind];
    return results.map(normalize).filter((item) => item.active);
  } catch {
    return defaults[kind];
  }
}

export async function getAllContent(kind?: ContentKind): Promise<ContentItem[]> {
  await ensureDatabase();
  const statement = kind
    ? getD1().prepare(`SELECT id, kind, title, subtitle, body, date, time, location,
        sort_order AS sortOrder, active FROM content_items WHERE kind = ? ORDER BY kind, sort_order, id`).bind(kind)
    : getD1().prepare(`SELECT id, kind, title, subtitle, body, date, time, location,
        sort_order AS sortOrder, active FROM content_items ORDER BY kind, sort_order, id`);
  const { results } = await statement.all<DatabaseContentItem>();
  return results.map(normalize);
}
