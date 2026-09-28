import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Primeira Igreja Batista Renovada em Guadalupe",
    short_name: "PIBRG",
    description: "Informações, agenda e conteúdos da Primeira Igreja Batista Renovada em Guadalupe.",
    start_url: "/",
    display: "standalone",
    lang: "pt-BR",
    background_color: "#050b16",
    theme_color: "#0b3d91",
    icons: [{ src: "/images/pibrg-logo.png", sizes: "447x447", type: "image/png", purpose: "maskable" }],
  };
}
