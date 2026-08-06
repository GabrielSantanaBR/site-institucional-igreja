import Link from "next/link";
import { services } from "./data";

export default function Home() {
  return (
    <main>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-media" aria-hidden="true" />
        <div className="hero-shade" aria-hidden="true" />
        <div className="container hero-inner">
          <p className="eyebrow eyebrow-light">Bem-vindo à Primeira Igreja Batista Renovada em Guadalupe</p>
          <h1 id="hero-title">Uma igreja para pertencer.<br />Uma fé para viver.</h1>
          <p className="hero-copy">Uma comunidade cristã que acolhe pessoas, fortalece famílias e vive o evangelho com simplicidade, graça e propósito.</p>
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
            <p>Nossa igreja existe para conduzir pessoas a um relacionamento vivo com Jesus, formar discípulos e servir a cidade com amor prático.</p>
            <blockquote>“Queremos que cada pessoa encontre pertencimento, cresça na fé e descubra seu propósito.”</blockquote>
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
          <div className="service-grid">
            {services.map((service, index) => (
              <article className={`service-card service-card-${index + 1}`} key={service.title}>
                <div className="service-icon" aria-hidden="true">{service.icon}</div><p>{service.day}</p><h3>{service.title}</h3><div className="service-time">{service.time}</div><span>{service.note}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section events-preview" aria-labelledby="presenca-title"><div className="container welcome-grid"><div><p className="eyebrow">Desde 1979</p><h2 id="presenca-title">Uma história construída em Guadalupe.</h2></div><div className="welcome-copy"><p>Com registro institucional desde 1979, a PIBRG mantém sua presença no bairro de Guadalupe, no Rio de Janeiro, reunindo pessoas em torno da fé cristã, da Palavra e da comunhão.</p><blockquote>Primeira Igreja Batista Renovada em Guadalupe é um nome completo — uma identidade ligada à igreja e ao bairro onde ela serve.</blockquote><Link className="text-link" href="/nossa-igreja">Conheça nossa identidade <span>→</span></Link></div></div></section>

      <section className="verse-section" aria-label="Versículo do dia">
        <div className="container verse-inner"><span className="verse-mark" aria-hidden="true">“</span><p className="eyebrow eyebrow-light">Versículo do dia</p><blockquote>“Alegrem-se na esperança, sejam pacientes na tribulação, perseverem na oração.”</blockquote><cite>Romanos 12:12</cite></div>
      </section>

      <section className="section" aria-labelledby="visite-title"><div className="container"><div className="section-heading split-heading align-end"><div><p className="eyebrow">Onde estamos</p><h2 id="visite-title">No coração de Guadalupe.</h2></div><a className="text-link" href="https://www.google.com/maps/search/?api=1&query=Rua+Fernando+Lobo+226+Guadalupe+Rio+de+Janeiro" target="_blank" rel="noreferrer">Abrir localização <span>↗</span></a></div><div className="news-grid"><article className="news-card news-featured"><div className="news-image community-image" role="img" aria-label="Comunidade cristã reunida" /><div className="news-content"><span>Endereço</span><h3>Rua Fernando Lobo, 226</h3><p>Guadalupe • Rio de Janeiro – RJ • CEP 21665-070</p></div></article><article className="news-card news-compact"><div className="news-number">01</div><span>Instagram</span><h3>@pibrg</h3><p>Programações, cultos e registros recentes da comunidade.</p><a className="text-link" href="https://www.instagram.com/pibrg/" target="_blank" rel="noreferrer">Acompanhar <span>↗</span></a></article><article className="news-card news-compact dark-card"><div className="news-number">02</div><span>Acolhimento</span><h3>Podemos orar por você.</h3><p>Envie seu pedido com respeito e cuidado.</p><Link className="text-link" href="/pedido-de-oracao">Enviar pedido <span>→</span></Link></article></div></div></section>

      <section className="gallery-preview" aria-labelledby="galeria-title">
        <div className="gallery-preview-copy"><p className="eyebrow eyebrow-light">Nossa comunidade</p><h2 id="galeria-title">Momentos que contam nossa história.</h2><p>Fé compartilhada, amizades construídas e amor colocado em prática.</p><Link className="button button-gold" href="/galeria">Ver galeria</Link></div>
        <div className="gallery-preview-image" role="img" aria-label="Pessoas da comunidade conversando em um encontro" />
      </section>

      <section className="section visit-section"><div className="container visit-card"><div><p className="eyebrow eyebrow-light">Quer nos visitar?</p><h2>Você será bem-vindo.</h2><p>Confira a programação atual no Instagram oficial antes da visita.</p></div><div className="visit-actions"><a className="button button-light" href="https://www.instagram.com/pibrg/" target="_blank" rel="noreferrer">Ver programação</a><span>Rua Fernando Lobo, 226</span></div></div></section>
    </main>
  );
}
