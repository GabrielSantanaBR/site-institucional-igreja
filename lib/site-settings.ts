import { ensureDatabase, getD1 } from "../db/runtime";

export const siteSettingsDefaults = {
  heroEyebrow: "Bem-vindo à Primeira Igreja Batista Renovada em Guadalupe",
  heroTitle: "Uma igreja para pertencer.\nUma fé para viver.",
  heroText: "Conheça a comunidade, acompanhe a programação publicada pela igreja e envie seu pedido de oração com privacidade.",
  welcomeText: "A PIBRG é uma comunidade cristã presente na região desde 1979. Este site reúne informações verificadas e conteúdos publicados pela própria equipe da igreja.",
  verseText: "Alegrem-se na esperança, sejam pacientes na tribulação, perseverem na oração.",
  verseReference: "Romanos 12:12",
  address: "Rua Fernando Lobo, 226",
  city: "Guadalupe • Rio de Janeiro – RJ",
  postalCode: "CEP 21665-070",
  instagramHandle: "@pibrg",
  instagramUrl: "https://www.instagram.com/pibrg/",
  facebookUrl: "https://www.facebook.com/p/Primeira-Igreja-Batista-Renovada-em-Guadalupe-100065692987381/",
};

export type SiteSettings = typeof siteSettingsDefaults;
export type SiteSettingKey = keyof SiteSettings;
export const siteSettingKeys = Object.keys(siteSettingsDefaults) as SiteSettingKey[];

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    await ensureDatabase();
    const { results } = await getD1().prepare("SELECT key, value FROM site_settings").all<{ key: string; value: string }>();
    const settings = { ...siteSettingsDefaults };
    for (const row of results) {
      if (siteSettingKeys.includes(row.key as SiteSettingKey)) {
        const key = row.key as SiteSettingKey;
        settings[key] = key === "instagramUrl" || key === "facebookUrl" ? safePublicUrl(row.value, siteSettingsDefaults[key]) : row.value;
      }
    }
    return settings;
  } catch (error) {
    console.error(JSON.stringify({
      event: "site_settings_read_failed",
      error: error instanceof Error ? error.message : String(error),
    }));
    return { ...siteSettingsDefaults };
  }
}

export function safePublicUrl(value: string, fallback = "") {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}
