import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/acesso-interno", "/alteracao-de-dados", "/api/internal/"] }],
  };
}
