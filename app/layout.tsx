import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteShell } from "./components/SiteShell";
import { getSiteSettings } from "../lib/site-settings";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://site-institucional-igreja.tudoido521.chatgpt.site"),
  title: { default: "Primeira Igreja Batista Renovada em Guadalupe", template: "%s | PIBRG" },
  description: "Site da Primeira Igreja Batista Renovada em Guadalupe: informações institucionais, agenda, sermões, devocionais, Fale Conosco e pedidos de oração.",
  icons: { icon: "/images/pibrg-logo.png", shortcut: "/images/pibrg-logo.png" },
  openGraph: {
    title: "Primeira Igreja Batista Renovada em Guadalupe",
    description: "Uma igreja para pertencer. Uma fé para viver.",
    type: "website",
    locale: "pt_BR",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Primeira Igreja Batista Renovada em Guadalupe" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Primeira Igreja Batista Renovada em Guadalupe",
    description: "Uma igreja para pertencer. Uma fé para viver.",
    images: ["/og.png"],
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { const settings = await getSiteSettings(); return <html lang="pt-BR"><body className={`${geistSans.variable} ${geistMono.variable}`}><SiteShell settings={settings}>{children}</SiteShell></body></html>; }
