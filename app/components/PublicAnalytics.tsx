"use client";
import { useEffect, useRef } from "react";
import { analyticsAds, isAnalyticsPage, isPrivateAnalyticsPath, type AnalyticsEvent } from "../../lib/analytics-contract";
import { analyticsAdTarget, analyticsLinkTarget, analyticsOptedOut, analyticsSource } from "../../lib/analytics-client";

export function PublicAnalytics({ pathname, enabled }: { pathname: string; enabled: boolean }) {
  const previousPage = useRef("");
  const lastPage = useRef("");
  useEffect(() => {
    if (!enabled || analyticsOptedOut() || isPrivateAnalyticsPath(pathname)) { previousPage.current = ""; lastPage.current = ""; return; }
    const notFound = !isAnalyticsPage(pathname) && !!document.querySelector("[data-public-not-found]");
    if (!isAnalyticsPage(pathname) && !notFound) { previousPage.current = ""; lastPage.current = ""; return; }
    const page = notFound ? "/404" : pathname;
    const device: AnalyticsEvent["device"] = window.innerWidth < 768 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop";
    const source = analyticsSource(document.referrer, window.location.origin);
    let queue: AnalyticsEvent[] = [];
    let timer: number | undefined;
    const emitted = new Set<string>();
    function flush() {
      if (timer) window.clearTimeout(timer);
      timer = undefined;
      if (analyticsOptedOut()) { queue = []; return; }
      if (!queue.length) return;
      const body = JSON.stringify({ events: queue.splice(0, 20) });
      try {
        if (navigator.sendBeacon?.("/api/analytics", new Blob([body], { type: "application/json" }))) return;
      } catch { /* Fetch fallback is optional and never blocks navigation. */ }
      void fetch("/api/analytics", { method: "POST", headers: { "Content-Type": "application/json" }, body, credentials: "same-origin", keepalive: true }).catch(() => {});
    }
    function send(event: AnalyticsEvent["event"], target = "", from = "") {
      if (analyticsOptedOut()) return;
      if (event === "error" || event === "ad_impression") {
        const key = event + target; if (emitted.has(key)) return; emitted.add(key);
      }
      queue.push({ event, page, target, from, device, source });
      if (queue.length >= 10) flush();
      else if (!timer) timer = window.setTimeout(flush, 1500);
    }
    if (lastPage.current !== pathname) {
      if (notFound) send("error", "not_found");
      else send("page_view", "", previousPage.current);
      lastPage.current = pathname;
      previousPage.current = notFound ? "" : pathname;
    }
    function click(event: MouseEvent) {
      if (notFound || !(event.target instanceof Element)) return;
      const target = event.target;
      if (target.closest("[data-analytics-close]")) { send("ad_close", "bottom"); return; }
      const ad = analyticsAdTarget(target);
      if (ad) { send("click", ad); return; }
      const link = target.closest<HTMLAnchorElement>("a[href]");
      if (!link) return;
      const name = analyticsLinkTarget(link.href, window.location.origin);
      if (name) send("click", name);
    }
    function error(event: Event) { if (!notFound) send("error", event.target instanceof Element ? "resource" : "script"); }
    function rejection() { if (!notFound) send("error", "script"); }
    function visibility() { if (document.visibilityState === "hidden") flush(); }
    function preference() { if (analyticsOptedOut()) queue = []; }
    let observer: IntersectionObserver | undefined;
    if (!notFound && "IntersectionObserver" in window) {
      observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.5 || document.visibilityState === "hidden") continue;
          const target = (entry.target as HTMLElement).dataset.analyticsAd;
          if (target && Object.hasOwn(analyticsAds, target)) send("ad_impression", target);
          observer?.unobserve(entry.target);
        }
      }, { threshold: 0.5 });
      document.querySelectorAll("[data-analytics-ad]").forEach(element => observer?.observe(element));
    }
    document.addEventListener("click", click, true);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", flush);
    window.addEventListener("error", error, true);
    window.addEventListener("unhandledrejection", rejection);
    window.addEventListener("pibrg-analytics-preference", preference);
    return () => {
      flush(); observer?.disconnect();
      document.removeEventListener("click", click, true);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("error", error, true);
      window.removeEventListener("unhandledrejection", rejection);
      window.removeEventListener("pibrg-analytics-preference", preference);
    };
  }, [pathname, enabled]);
  return null;
}
