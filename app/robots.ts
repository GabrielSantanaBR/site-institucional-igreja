import type { MetadataRoute } from "next";
import { getPublicSiteOrigin, getPublicSiteUrl } from "../lib/site-url";

const blockedPaths = ["/alteracao-de-dados", "/acesso-interno", "/api/", "/_next/", "/_vinext/"];

export default function robots(): MetadataRoute.Robots {
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
