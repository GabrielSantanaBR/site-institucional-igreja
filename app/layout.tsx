import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteShell } from "./components/SiteShell";
import { getSiteSettings } from "../lib/site-settings";
import { getMetadataBase, getPublicSiteOrigin, getPublicSiteUrl } from "../lib/site-url";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: getMetadataBase(),
    title: { default: "Primeira Igreja Batista Renovada em Guadalupe", template: "%s | PIBRG" },
    description: "Informações, agenda, liderança, sermões, devocionais e pedidos de oração da Primeira Igreja Batista Renovada em Guadalupe.",
    applicationName: "PIBRG",
    manifest: "/manifest.webmanifest",
    category: "religion",
    icons: { icon: "/images/pibrg-logo.png", shortcut: "/images/pibrg-logo.png", apple: "/images/pibrg-logo.png" },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
    },
    openGraph: {
      title: "Primeira Igreja Batista Renovada em Guadalupe",
      description: "Uma igreja para pertencer. Uma fé para viver.",
      type: "website",
      locale: "pt_BR",
      siteName: "PIBRG",
      images: [{ url: "/og.png", width: 1200, height: 630, alt: "Primeira Igreja Batista Renovada em Guadalupe" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Primeira Igreja Batista Renovada em Guadalupe",
      description: "Uma igreja para pertencer. Uma fé para viver.",
      images: ["/og.png"],
    },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const settings = await getSiteSettings();
  const origin = getPublicSiteOrigin();
  const organization = {
    "@context": "https://schema.org",
    "@type": "Church",
    "@id": `${origin}/#pibrg`,
    name: "Primeira Igreja Batista Renovada em Guadalupe",
    alternateName: "PIBRG",
    url: origin,
    logo: getPublicSiteUrl("/images/pibrg-logo.png"),
    image: getPublicSiteUrl("/og.png"),
    description: "Comunidade cristã batista renovada em Guadalupe, Rio de Janeiro.",
    address: {
      "@type": "PostalAddress",
      streetAddress: settings.address,
      addressLocality: "Rio de Janeiro",
      addressRegion: "RJ",
      postalCode: settings.postalCode.replace(/\D/g, ""),
      addressCountry: "BR",
    },
    sameAs: [settings.instagramUrl, settings.facebookUrl].filter(Boolean),
  };
  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${origin}/#website`,
    name: "PIBRG",
    url: origin,
    inLanguage: "pt-BR",
    publisher: { "@id": `${origin}/#pibrg` },
  };
  const structuredData = JSON.stringify([organization, website]).replace(/</g, "\\u003c");

  return <html lang="pt-BR"><body className={`${geistSans.variable} ${geistMono.variable}`}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} />
    <SiteShell settings={settings}>{children}</SiteShell>
  </body></html>;
}
