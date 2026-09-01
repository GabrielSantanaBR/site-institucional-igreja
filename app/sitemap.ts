import type { MetadataRoute } from "next";
import { getPublicContent, type ContentItem } from "../lib/site-content";
import { getPublicSiteUrl } from "../lib/site-url";

export const dynamic = "force-dynamic";

const pages = [
  ["/", 1],
  ["/nossa-igreja", 0.9],
  ["/agenda", 0.9],
  ["/lideranca", 0.8],
  ["/sermoes", 0.8],
  ["/devocionais", 0.8],
  ["/postagens", 0.8],
  ["/galeria", 0.7],
  ["/fale-conosco", 0.6],
  ["/pedido-de-oracao", 0.5],
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const kinds = ["event", "leader", "sermon", "devotional", "post", "gallery"] as const;
  const results = await Promise.all(kinds.map((kind) => getPublicContent(kind)));
  const latestByPath = new Map<string, Date>();
  const paths = ["/agenda", "/lideranca", "/sermoes", "/devocionais", "/postagens", "/galeria"];
  results.forEach((items, index) => latestByPath.set(paths[index], newestDate(items)));
  const newest = newestDate(results.flat());

  return pages.map(([path, priority]) => ({
    url: getPublicSiteUrl(path),
    lastModified: latestByPath.get(path) ?? newest,
    changeFrequency: path === "/" || path === "/agenda" || path === "/postagens" ? "weekly" : "monthly",
    priority,
  }));
}

function newestDate(items: ContentItem[]) {
  const timestamps = items.map((item) => Date.parse(item.updatedAt)).filter(Number.isFinite);
  return timestamps.length ? new Date(Math.max(...timestamps)) : new Date("2026-08-01T00:00:00.000Z");
}
