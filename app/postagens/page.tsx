import type { Metadata } from "next";
/* eslint-disable @next/next/no-img-element -- mídia publicada pelo painel já é otimizada no envio */
import { getPublicContent } from "../../lib/site-content";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Postagens",
  description: "Veja notícias, avisos e atualizações publicados pela equipe da Primeira Igreja Batista Renovada em Guadalupe.",
  alternates: { canonical: "/postagens" },
};

export default async function PostagensPage() {
  const posts = await getPublicContent("post");
  return <main><section className="page-hero posts-hero"><div className="container page-hero-inner"><p className="eyebrow eyebrow-light">Postagens</p><h1>Informação que aproxima<br />a nossa comunidade.</h1><p>Notícias, avisos e registros publicados pela equipe da PIBRG.</p></div></section><section className="section"><div className="container"><div className="section-heading split-heading"><div><p className="eyebrow">Mural da igreja</p><h2>Fique por dentro do que acontece.</h2></div><p>Os conteúdos mais recentes aparecem primeiro e podem ser atualizados diretamente pela liderança.</p></div>{posts.length ? <div className="public-post-grid public-post-grid-full">{posts.map((post) => <article key={post.id}>{post.imageUrl ? <img src={post.imageUrl} alt={`Imagem da publicação ${post.title}`} style={{ objectPosition: post.imagePosition }} loading="lazy" /> : <div className="post-placeholder" aria-hidden="true">PIBRG</div>}<div><span>{post.subtitle || "Publicação"}{post.date ? ` • ${formatDate(post.date)}` : ""}</span><h2>{post.title}</h2>{post.author && <strong>{post.author}</strong>}<p>{post.body}</p>{post.linkUrl && <a className="text-link" href={post.linkUrl} target="_blank" rel="noreferrer">Abrir informação relacionada <span>↗</span></a>}</div></article>)}</div> : <p className="public-empty">As primeiras notícias e avisos serão publicados em breve.</p>}</div></section></main>;
}

function formatDate(value: string) { const [year, month, day] = value.split("-").map(Number); return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(year, month - 1, day)); }
