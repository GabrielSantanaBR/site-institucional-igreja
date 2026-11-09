import type { MetadataRoute } from "next";
import { getPublicSiteOrigin, getPublicSiteUrl } from "../lib/site-url";

export const dynamic = "force-dynamic";

const blockedPaths = ["/alteracao-de-dados", "/acesso-interno", "/api/", "/_next/", "/_vinext/"];

export default function robots(): MetadataRoute.Robots {
  if (process.env.SITE_STAGE === "staging") return { rules: { userAgent: "*", disallow: "/" } };
  return {
    host: getPublicSiteOrigin(),
    sitemap: getPublicSiteUrl("/sitemap.xml"),
    rules: [
      {
        userAgent: ["Googlebot", "Bingbot", "GPTBot", "ChatGPT-User", "ClaudeBot", "PerplexityBot", "Google-Extended"],
        allow: "/",
        disallow: blockedPaths,
      },
      { userAgent: "*", allow: "/", disallow: blockedPaths },
    ],
  };
}
