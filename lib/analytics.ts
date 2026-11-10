import { ensureDatabase, getD1 } from "../db/runtime";
import { analyticsAds, analyticsDevices, analyticsErrors, analyticsPages, analyticsSources, analyticsTargets, type AnalyticsEvent, type AnalyticsReport, type AnalyticsRow } from "./analytics-contract";

export function analyticsClock(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const part = (type: string) => parts.find(item => item.type === type)!.value;
  return { day: `${part("year")}-${part("month")}-${part("day")}`, hour: Number(part("hour")) };
}
function shiftDay(day: string, amount: number) {
  const date = new Date(day + "T12:00:00Z"); date.setUTCDate(date.getUTCDate() + amount); return date.toISOString().slice(0, 10);
}
export async function getAnalyticsConfig() {
  await ensureDatabase();
  const row = await getD1().prepare("SELECT enabled, revision FROM analytics_config WHERE id = 1").first<{ enabled: number; revision: string }>();
  if (!row) throw Error("Analytics configuration unavailable");
  return { enabled: row.enabled === 1, revision: row.revision };
}
export async function analyticsIsEnabled() {
  try { return (await getAnalyticsConfig()).enabled; } catch { return false; }
}
export async function recordAnalytics(events: AnalyticsEvent[], now = new Date()) {
  const { day, hour } = analyticsClock(now);
  const db = getD1();
  await db.batch(events.map(item => db.prepare(`INSERT INTO analytics_counts (day, hour, event, page, target, from_page, device, source, total)
    SELECT ?, ?, ?, ?, ?, ?, ?, ?, 1 WHERE EXISTS (SELECT 1 FROM analytics_config WHERE id = 1 AND enabled = 1)
    ON CONFLICT(day, hour, event, page, target, from_page, device, source) DO UPDATE SET total = MIN(total + 1, 1000000000)`)
    .bind(day, hour, item.event, item.page, item.target, item.from, item.device, item.source)));
  await pruneAnalytics(now);
}
const pruneDays = new WeakMap<object, string>();
async function pruneAnalytics(now: Date) {
  const db = getD1(), { day } = analyticsClock(now);
  if (pruneDays.get(db) === day) return;
  await db.prepare("DELETE FROM analytics_counts WHERE day < ?").bind(shiftDay(day, -89)).run();
  pruneDays.set(db, day);
}
export async function setAnalyticsEnabled(enabled: boolean, revision: string, actor: string) {
  const db = getD1();
  const nextRevision = crypto.randomUUID();
  const results = await db.batch([
    db.prepare("UPDATE analytics_config SET enabled = ?, revision = ? WHERE id = 1 AND revision = ?").bind(Number(enabled), nextRevision, revision),
    db.prepare(`INSERT INTO audit_logs (actor_email, action, entity_type, entity_id, metadata)
      SELECT ?, 'update', 'analytics', 'collection', ? WHERE EXISTS (SELECT 1 FROM analytics_config WHERE id = 1 AND revision = ?)`)
      .bind(actor, JSON.stringify({ enabled }), nextRevision),
  ]);
  return results[0].meta.changes === 1 ? nextRevision : null;
}
type CountRow = { event: AnalyticsEvent["event"]; page: string; target: string; from_page: string; device: AnalyticsEvent["device"]; source: AnalyticsEvent["source"]; total: number };
export async function getAnalyticsReport(days: number, now = new Date()): Promise<AnalyticsReport> {
  const config = await getAnalyticsConfig();
  await pruneAnalytics(now);
  const end = analyticsClock(now).day, start = shiftDay(end, 1 - days);
  // Aggregate in SQLite before returning rows: memory use stays bounded as traffic grows.
  const db = getD1();
  const [{ results }, { results: byDay }, { results: byHour }] = await Promise.all([
    db.prepare("SELECT event, page, target, from_page, device, source, SUM(total) AS total FROM analytics_counts WHERE day >= ? AND day <= ? GROUP BY event, page, target, from_page, device, source").bind(start, end).all<CountRow>(),
    db.prepare("SELECT day AS label, SUM(total) AS total FROM analytics_counts WHERE event = 'page_view' AND day >= ? AND day <= ? GROUP BY day").bind(start, end).all<AnalyticsRow>(),
    db.prepare("SELECT hour, SUM(total) AS total FROM analytics_counts WHERE event = 'page_view' AND day >= ? AND day <= ? GROUP BY hour").bind(start, end).all<{ hour: number; total: number }>(),
  ]);
  const totals = { views: 0, clicks: 0, errors: 0, adImpressions: 0 };
  const daily = new Map<string, number>(), hourly = new Map<string, number>(), devices = new Map<string, number>(), sources = new Map<string, number>(), pages = new Map<string, number>(), clicks = new Map<string, number>(), errors = new Map<string, number>(), flows = new Map<string, number>();
  const ads = Object.entries(analyticsAds).map(([id, label]) => ({ id, label, impressions: 0, clicks: 0, closes: 0 }));
  for (let index = 0; index < days; index++) daily.set(shiftDay(start, index), 0);
  for (let hour = 0; hour < 24; hour++) hourly.set(String(hour).padStart(2, "0") + "h", 0);
  for (const row of byDay) daily.set(row.label, row.total);
  for (const row of byHour) hourly.set(String(row.hour).padStart(2, "0") + "h", row.total);
  const add = (map: Map<string, number>, key: string, count: number) => map.set(key, (map.get(key) ?? 0) + count);
  for (const row of results) {
    if (row.event === "page_view") {
      totals.views += row.total;
      add(devices, analyticsDevices[row.device], row.total); add(sources, analyticsSources[row.source], row.total); add(pages, analyticsPages[row.page], row.total);
      if (row.from_page && row.from_page !== row.page) add(flows, `${analyticsPages[row.from_page]} → ${analyticsPages[row.page]}`, row.total);
    }
    if (row.event === "click") { totals.clicks += row.total; add(clicks, `${analyticsTargets[row.target]} · ${analyticsPages[row.page]}`, row.total); }
    if (row.event === "error") { totals.errors += row.total; add(errors, `${analyticsErrors[row.target as keyof typeof analyticsErrors]} · ${analyticsPages[row.page]}`, row.total); }
    const ad = ads.find(item => item.id === row.target);
    if (ad && row.event === "ad_impression") { ad.impressions += row.total; totals.adImpressions += row.total; }
    if (ad && row.event === "click") ad.clicks += row.total;
    if (ad && row.event === "ad_close") ad.closes += row.total;
  }
  const rows = (map: Map<string, number>, sorted = true): AnalyticsRow[] => {
    const values = [...map].map(([label, total]) => ({ label, total }));
    return sorted ? values.sort((a, b) => b.total - a.total).slice(0, 30) : values;
  };
  return { ...config, days, start, end, retentionDays: 90, totals, daily: rows(daily, false), hourly: rows(hourly, false), devices: rows(devices), sources: rows(sources), pages: rows(pages), clicks: rows(clicks), errors: rows(errors), flows: rows(flows), ads: ads.map(ad => ({ label: ad.label, impressions: ad.impressions, clicks: ad.clicks, closes: ad.closes })) };
}
