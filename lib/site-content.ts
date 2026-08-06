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
  leader: [
    { id: -1, kind: "leader", title: "Pastoral", subtitle: "", body: "Cuidado, ensino bíblico e direção espiritual.", date: "", time: "", location: "", sortOrder: 1, active: true },
    { id: -2, kind: "leader", title: "Louvor e adoração", subtitle: "", body: "Serviço musical e apoio às celebrações.", date: "", time: "", location: "", sortOrder: 2, active: true },
    { id: -3, kind: "leader", title: "Intercessão", subtitle: "", body: "Oração e acolhimento das necessidades da comunidade.", date: "", time: "", location: "", sortOrder: 3, active: true },
    { id: -4, kind: "leader", title: "Famílias e gerações", subtitle: "", body: "Comunhão e formação cristã ao longo da vida.", date: "", time: "", location: "", sortOrder: 4, active: true },
    { id: -5, kind: "leader", title: "Ensino e discipulado", subtitle: "", body: "Crescimento na Palavra e na fé cristã.", date: "", time: "", location: "", sortOrder: 5, active: true },
    { id: -6, kind: "leader", title: "Serviço", subtitle: "", body: "Dons colocados à disposição da igreja e do próximo.", date: "", time: "", location: "", sortOrder: 6, active: true },
  ],
  event: [
    { id: -11, kind: "event", title: "Culto da Família", subtitle: "Celebração", body: "", date: "2026-08-09", time: "18:30", location: "Templo principal", sortOrder: 1, active: true },
    { id: -12, kind: "event", title: "Encontro de Casais", subtitle: "Família", body: "", date: "2026-08-16", time: "19:00", location: "Salão de convivência", sortOrder: 2, active: true },
    { id: -13, kind: "event", title: "Manhã para Servir", subtitle: "Ação social", body: "", date: "2026-08-22", time: "09:00", location: "Praça do bairro", sortOrder: 3, active: true },
    { id: -14, kind: "event", title: "Culto de Batismo", subtitle: "Celebração", body: "", date: "2026-08-30", time: "18:30", location: "Templo principal", sortOrder: 4, active: true },
  ],
  devotional: [
    { id: -21, kind: "devotional", title: "Paz para o caminho de hoje", subtitle: "João 14:27", body: "A paz de Jesus não depende de um dia sem problemas. Ela nos acompanha por dentro e nos lembra de que não caminhamos sozinhos.", date: "2026-08-05", time: "", location: "", sortOrder: 1, active: true },
    { id: -22, kind: "devotional", title: "Quando esperar também é fé", subtitle: "Salmo 27:14", body: "Esperar em Deus não é permanecer parado. É seguir obedecendo, crescendo e confiando enquanto a resposta ainda está a caminho.", date: "2026-07-29", time: "", location: "", sortOrder: 2, active: true },
    { id: -23, kind: "devotional", title: "Pequenos gestos, grande amor", subtitle: "1 João 3:18", body: "O amor ganha forma em atitudes simples: uma conversa atenta, uma ajuda discreta, uma presença que não desiste.", date: "2026-07-22", time: "", location: "", sortOrder: 3, active: true },
  ],
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

export function getDefaultContent() {
  return Object.values(defaults).flat();
}
