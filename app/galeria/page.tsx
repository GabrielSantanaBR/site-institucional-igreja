import type { Metadata } from "next";
import { GalleryGrid } from "../components/ClientWidgets";
import { getContentGroups, getPublicContent } from "../../lib/site-content";
export const metadata: Metadata = {
  title: "Galeria",
  description: "Veja fotos e registros da vida em comunidade da Primeira Igreja Batista Renovada em Guadalupe.",
  alternates: { canonical: "/galeria" },
};
export const dynamic = "force-dynamic";
export default async function GaleriaPage() { const [gallery, groups] = await Promise.all([getPublicContent("gallery"), getContentGroups()]); const photos = gallery.filter((item) => item.imageUrl); return <main><section className="page-hero gallery-hero"><div className="container page-hero-inner"><p className="eyebrow eyebrow-light">Galeria</p><h1>Gente, fé e histórias<br />vividas em comunidade.</h1><p>Registros da vida da PIBRG, organizados por ministérios, equipes e momentos.</p></div></section><section className="section"><div className="container"><div className="gallery-toolbar"><p><strong>Vida em comunidade</strong><span>{photos.length ? `${photos.length} registros publicados` : "Aguardando as primeiras fotos da equipe"}</span></p></div><GalleryGrid items={photos} groups={groups} /></div></section><section className="section video-placeholder-section"><div className="container video-placeholder"><div className="video-play" aria-hidden="true">●</div><div><p className="eyebrow eyebrow-light">Mais registros</p><h2>Veja o que está acontecendo na PIBRG.</h2><p>Fotos, convites e momentos recentes também são publicados no Instagram da igreja.</p></div><a className="button button-gold" href="https://www.instagram.com/pibrg/" target="_blank" rel="noreferrer">Abrir Instagram</a></div></section></main>; }
