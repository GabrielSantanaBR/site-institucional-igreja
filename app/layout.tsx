import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteShell } from "./components/SiteShell";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = { title: { default: "Primeira Igreja Batista Renovada em Guadalupe", template: "%s | PIBRG" }, description: "Site da Primeira Igreja Batista Renovada em Guadalupe: informações institucionais, agenda e pedidos de oração.", other: { "codex-preview": "development" }, icons: { icon: "/images/pibrg-logo.png", shortcut: "/images/pibrg-logo.png" } };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="pt-BR"><body className={`${geistSans.variable} ${geistMono.variable}`}><SiteShell>{children}</SiteShell></body></html>; }
