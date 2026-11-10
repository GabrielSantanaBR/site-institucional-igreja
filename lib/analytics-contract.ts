export const analyticsPages: Record<string, string> = {
  "/": "Início", "/nossa-igreja": "Nossa Igreja", "/lideranca": "Liderança",
  "/agenda": "Agenda", "/sermoes": "Sermões", "/postagens": "Postagens",
  "/galeria": "Galeria", "/devocionais": "Devocionais", "/404": "Página não encontrada",
};
export const analyticsDevices = { mobile: "Celular", tablet: "Tablet", desktop: "Computador" };
export const analyticsSources = { direct: "Direto / não informado", social: "Redes sociais", search: "Buscadores", other: "Outros sites" };
export const analyticsAds = { bottom: "Faixa inferior", side: "Lateral adaptável", inline: "Banner no conteúdo" };
export const analyticsErrors = { script: "Erro de execução", resource: "Falha ao carregar recurso", not_found: "Página não encontrada" };
export const analyticsTargets: Record<string, string> = { ...analyticsPages, instagram: "Instagram", facebook: "Facebook", map: "Localização", ...analyticsAds };
export type AnalyticsEvent = {
  event: "page_view" | "click" | "error" | "ad_impression" | "ad_close";
  page: string;
  target: string;
  from: string;
  device: keyof typeof analyticsDevices;
  source: keyof typeof analyticsSources;
};
export function isAnalyticsPage(path: string) { return Object.hasOwn(analyticsPages, path) && path !== "/404"; }
export function isPrivateAnalyticsPath(path: string) {
  return /^\/(api|acesso-interno|alteracao-de-dados|pedido-de-oracao|fale-conosco|privacidade|signin-with-chatgpt|signout-with-chatgpt|callback)(\/|$)/.test(path);
}
export function validAnalyticsEvent(value: unknown): value is AnalyticsEvent {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  if (Object.keys(item).some(key => !["event", "page", "target", "from", "device", "source"].includes(key))) return false;
  if (!["event", "page", "target", "from", "device", "source"].every(key => typeof item[key] === "string")) return false;
  const event = item as AnalyticsEvent;
  if (!Object.hasOwn(analyticsDevices, event.device) || !Object.hasOwn(analyticsSources, event.source)) return false;
  if (event.page === "/404") return event.event === "error" && event.target === "not_found" && event.from === "";
  if (!isAnalyticsPage(event.page) || (event.from !== "" && !isAnalyticsPage(event.from))) return false;
  if (event.event === "page_view") return event.target === "";
  if (event.from !== "") return false;
  if (event.event === "click") return Object.hasOwn(analyticsTargets, event.target) && event.target !== "/404";
  if (event.event === "error") return event.target === "script" || event.target === "resource";
  if (event.event === "ad_impression") return Object.hasOwn(analyticsAds, event.target);
  return event.event === "ad_close" && event.target === "bottom";
}
export type AnalyticsRow = { label: string; total: number };
export type AnalyticsReport = {
  enabled: boolean; revision: string; days: number; start: string; end: string; retentionDays: number;
  totals: { views: number; clicks: number; errors: number; adImpressions: number };
  daily: AnalyticsRow[]; hourly: AnalyticsRow[]; devices: AnalyticsRow[]; sources: AnalyticsRow[];
  pages: AnalyticsRow[]; clicks: AnalyticsRow[]; errors: AnalyticsRow[]; flows: AnalyticsRow[];
  ads: { label: string; impressions: number; clicks: number; closes: number }[];
};
