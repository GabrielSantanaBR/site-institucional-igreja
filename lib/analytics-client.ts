import { analyticsAds, isAnalyticsPage, type AnalyticsEvent } from "./analytics-contract";

let temporaryOptOut: boolean | undefined;
export function analyticsOptedOut() {
  if (navigator.doNotTrack === "1" || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true) return true;
  if (temporaryOptOut !== undefined) return temporaryOptOut;
  try { return localStorage.getItem("pibrg-analytics-opt-out") === "1"; } catch { return false; }
}
export function setAnalyticsPreference(optedOut: boolean) {
  temporaryOptOut = optedOut;
  let stored = false;
  try {
    if (optedOut) localStorage.setItem("pibrg-analytics-opt-out", "1"); else localStorage.removeItem("pibrg-analytics-opt-out");
    temporaryOptOut = undefined; stored = true;
  } catch { /* The current visit still respects the preference when storage is blocked. */ }
  window.dispatchEvent(new Event("pibrg-analytics-preference"));
  return stored;
}
export function analyticsSource(referrer: string, origin: string): AnalyticsEvent["source"] {
  try {
    const url = new URL(referrer);
    if (url.origin === origin) return "direct";
    if (/(^|\.)(instagram\.com|facebook\.com|fb\.com|t\.co|twitter\.com|x\.com|whatsapp\.com|tiktok\.com|youtube\.com)$/.test(url.hostname)) return "social";
    if (/(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|search\.yahoo\.com)$/.test(url.hostname)) return "search";
    return "other";
  } catch { return "direct"; }
}
export function analyticsLinkTarget(href: string, origin: string): string | null {
  try {
    const url = new URL(href, origin);
    if (!["https:", "http:"].includes(url.protocol)) return null;
    if (url.origin === origin) return isAnalyticsPage(url.pathname) ? url.pathname : null;
    if (/(^|\.)instagram\.com$/.test(url.hostname)) return "instagram";
    if (/(^|\.)facebook\.com$/.test(url.hostname)) return "facebook";
    if ((url.hostname === "www.google.com" || url.hostname === "maps.google.com") && url.pathname.startsWith("/maps")) return "map";
    return null;
  } catch { return null; }
}
export function analyticsAdTarget(element: Element): string | null {
  const target = element.closest<HTMLElement>("[data-analytics-ad]")?.dataset.analyticsAd;
  return target && Object.hasOwn(analyticsAds, target) ? target : null;
}
