import Link from "next/link";
import type { Metadata } from "next";
/* eslint-disable @next/next/no-img-element -- mídia publicada pelo painel já é otimizada no envio */
import { getPublicContent } from "../lib/site-content";
import { getSiteSettings } from "../lib/site-settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function Home() {
  const [allPosts, allEvents, settings] = await Promise.all([getPublicContent("post"), getPublicContent("event"), getSiteSettings()]);
  const posts = allPosts.slice(0, 3);
  const currentTimestamp = new Date().valueOf();
  const events = allEvents.filter((event) => homeEventEnd(event.date, event.time) >= currentTimestamp).sort((left, right) => `${left.date}T${left.time || "23:59"}`.localeCompare(`${right.date}T${right.time || "23:59"}`)).slice(0, 3);
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${settings.address} ${settings.city}`)}`;
  return (
    <main>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-media" aria-hidden="true" />
        <div className="hero-shade" aria-hidden="true" />
        <div className="container hero-inner">
          <p className="eyebrow eyebrow-light">{settings.heroEyebrow}</p>
          <h1 id="hero-title">{settings.heroTitle.split("\n").map((line, index, lines) => <span key={`${line}-${index}`}>{line}{index < lines.length - 1 && <br />}</span>)}</h1>
          <p className="hero-copy">{settings.heroText}</p>
          <div className="hero-actions">
            <Link className="button button-gold" href="/nossa-igreja">Conheça nossa igreja</Link>
            <Link className="button button-ghost" href="/pedido-de-oracao">Pedido de oração</Link>
          </div>
        </div>
        <a className="hero-scroll" href="#boas-vindas" aria-label="Ir para a próxima seção"><span /></a>
      </section>

      <section className="section welcome-section" id="boas-vindas">
        <div className="container welcome-grid">
          <div><p className="eyebrow">Há lugar para você</p><h2>Uma comunidade de braços abertos e coração em missão.</h2></div>
          <div className="welcome-copy">
            <p>{settings.welcomeText}</p>
            <blockquote>Agenda, liderança e devocionais podem ser atualizados pela equipe autorizada.</blockquote>
            <Link className="text-link" href="/nossa-igreja">Nossa história <span>→</span></Link>
          </div>
        </div>
      </section>

      <section className="section section-soft" aria-labelledby="cultos-title">
        <div className="container">
          <div className="section-heading split-heading">
            <div><p className="eyebrow">Próximos encontros</p><h2 id="cultos-title">Venha celebrar conosco</h2></div>
            <p>Acompanhe os canais oficiais para confirmar dias, horários e programações especiais.</p>
          </div>
          {events.length ? <div className="service-grid">
            {events.map((event, index) => (
              <article className={`service-card service-card-${index + 1}`} key={event.id}>
                <div className="service-icon" aria-hidden="true">{String(index + 1).padStart(2, "0")}</div><p>{formatHomeDate(event.date)}</p><h3>{event.title}</h3><div className="service-time">{event.time ? `${event.time}h` : "Horário a confirmar"}</div><span>{event.location || event.body || "Consulte a agenda para mais informações."}</span>
              </article>
            ))}
          </div> : <div className="public-empty"><strong>Novas programações serão publicadas em breve.</strong><p>A agenda do painel alimenta automaticamente esta área da página inicial.</p><Link className="text-link" href="/agenda">Abrir agenda completa <span>→</span></Link></div>}
        </div>
      </section>

      <section className="section events-preview" aria-labelledby="presenca-title"><div className="container welcome-grid"><div><p className="eyebrow">Desde 1979</p><h2 id="presenca-title">Uma história ligada a Guadalupe.</h2></div><div className="welcome-copy"><p>Com registro institucional desde 21 de fevereiro de 1979, a PIBRG permanece ativa no Rio de Janeiro e está situada na Rua Fernando Lobo, 226.</p><blockquote>Primeira Igreja Batista Renovada em Guadalupe é o nome institucional completo da comunidade.</blockquote><Link className="text-link" href="/nossa-igreja">Conheça nossa identidade <span>→</span></Link></div></div></section>

      {posts.length > 0 && <section className="section home-posts" aria-labelledby="home-posts-title"><div className="container"><div className="section-heading split-heading"><div><p className="eyebrow">Atualizações da PIBRG</p><h2 id="home-posts-title">Notícias, avisos e momentos.</h2></div><Link className="text-link" href="/postagens">Ver todas <span>→</span></Link></div><div className="public-post-grid">{posts.map((post) => <article key={post.id}>{post.imageUrl ? <img src={post.imageUrl} alt={`Imagem da publicação ${post.title}`} style={{ objectPosition: post.imagePosition }} loading="lazy" /> : <div className="post-placeholder" aria-hidden="true">PIBRG</div>}<div><span>{post.subtitle || "Publicação"}{post.date ? ` • ${formatHomeDate(post.date)}` : ""}</span><h3>{post.title}</h3><p>{post.body}</p><Link className="text-link" href="/postagens">Ler publicação <span>→</span></Link></div></article>)}</div></div></section>}

      <section className="verse-section" aria-label="Versículo do dia">
        <div className="container verse-inner"><span className="verse-mark" aria-hidden="true">“</span><p className="eyebrow eyebrow-light">Versículo em destaque</p><blockquote>“{settings.verseText}”</blockquote><cite>{settings.verseReference}</cite></div>
      </section>

      <section className="section" aria-labelledby="visite-title"><div className="container"><div className="section-heading split-heading align-end"><div><p className="eyebrow">Onde estamos</p><h2 id="visite-title">No coração de Guadalupe.</h2></div><a className="text-link" href={mapUrl} target="_blank" rel="noreferrer">Abrir localização <span>↗</span></a></div><div className="news-grid"><article className="news-card news-featured"><div className="news-image community-image" role="img" aria-label="Comunidade cristã reunida" /><div className="news-content"><span>Endereço</span><h3>{settings.address}</h3><p>{settings.city} • {settings.postalCode}</p></div></article><article className="news-card news-compact"><div className="news-number">01</div><span>Instagram</span><h3>{settings.instagramHandle}</h3><p>Programações, cultos e registros recentes da comunidade.</p><a className="text-link" href={settings.instagramUrl} target="_blank" rel="noreferrer">Acompanhar <span>↗</span></a></article><article className="news-card news-compact dark-card"><div className="news-number">02</div><span>Acolhimento</span><h3>Podemos orar por você.</h3><p>Envie seu pedido com respeito e cuidado.</p><Link className="text-link" href="/pedido-de-oracao">Enviar pedido <span>→</span></Link></article></div></div></section>

      <section className="gallery-preview" aria-labelledby="galeria-title">
        <div className="gallery-preview-copy"><p className="eyebrow eyebrow-light">Nossa comunidade</p><h2 id="galeria-title">Momentos que contam nossa história.</h2><p>Fé compartilhada, amizades construídas e amor colocado em prática.</p><Link className="button button-gold" href="/galeria">Ver galeria</Link></div>
        <div className="gallery-preview-image" role="img" aria-label="Pessoas da comunidade conversando em um encontro" />
      </section>

      <section className="section visit-section"><div className="container visit-card"><div><p className="eyebrow eyebrow-light">Quer nos visitar?</p><h2>Consulte a programação.</h2><p>Veja a agenda publicada neste site e confirme os detalhes nos canais da PIBRG.</p></div><div className="visit-actions"><Link className="button button-light" href="/agenda">Ver agenda</Link><span>{settings.address}</span></div></div></section>
    </main>
  );
}

function formatHomeDate(value: string) { const [year, month, day] = value.split("-").map(Number); return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(year, month - 1, day)); }
function homeEventEnd(date: string, time: string) { const value = Date.parse(`${date}T${time || "23:59"}:59-03:00`); return Number.isFinite(value) ? value : 0; }
