import Link from "next/link";
import { services } from "./data";

export default function Home() {
  return (
    <main>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-media" aria-hidden="true" />
        <div className="hero-shade" aria-hidden="true" />
        <div className="container hero-inner">
          <p className="eyebrow eyebrow-light">Nexa Institucional • Template demonstrativo</p>
          <h1 id="hero-title">Sua organização apresentada<br />com clareza e presença digital.</h1>
          <p className="hero-copy">Um site institucional moderno para apresentar serviços, equipe, agenda, projetos, conteúdos e canais de contato.</p>
          <div className="hero-actions">
            <Link className="button button-gold" href="/nossa-igreja">Conheça a organização</Link>
            <Link className="button button-ghost" href="/#contato">Fale conosco</Link>
          </div>
        </div>
        <a className="hero-scroll" href="#boas-vindas" aria-label="Ir para a próxima seção"><span /></a>
      </section>

      <section className="section welcome-section" id="boas-vindas">
        <div className="container welcome-grid">
          <div><p className="eyebrow">Presença digital</p><h2>Uma base institucional preparada para crescer junto com o projeto.</h2></div>
          <div className="welcome-copy">
            <p>Esta demonstração apresenta uma organização fictícia para mostrar como informações institucionais podem ser organizadas em um site profissional, responsivo e fácil de atualizar.</p>
            <blockquote>Agenda, equipe e publicações podem ser atualizadas pela área administrativa protegida.</blockquote>
            <Link className="text-link" href="/nossa-igreja">Conheça a estrutura <span>→</span></Link>
          </div>
        </div>
      </section>

      <section className="section section-soft" aria-labelledby="services-title">
        <div className="container">
          <div className="section-heading split-heading">
            <div><p className="eyebrow">Principais áreas</p><h2 id="services-title">Conteúdo pensado para organizações reais</h2></div>
            <p>Apresente serviços, projetos, agenda e canais de relacionamento sem depender do desenvolvedor para cada atualização.</p>
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

      <section className="section events-preview" aria-labelledby="historia-title"><div className="container welcome-grid"><div><p className="eyebrow">Sobre a organização</p><h2 id="historia-title">Conte sua história e mostre o que torna seu trabalho diferente.</h2></div><div className="welcome-copy"><p>Use esta seção para apresentar trajetória, propósito, atuação e informações importantes para clientes, parceiros ou comunidade.</p><blockquote>Todo o conteúdo desta versão é fictício e serve apenas como demonstração de portfólio.</blockquote><Link className="text-link" href="/nossa-igreja">Ver página institucional <span>→</span></Link></div></div></section>

      <section className="verse-section" aria-label="Mensagem institucional">
        <div className="container verse-inner"><span className="verse-mark" aria-hidden="true">“</span><p className="eyebrow eyebrow-light">Posicionamento</p><blockquote>“Tecnologia simples de usar, conteúdo bem organizado e uma experiência que aproxima pessoas da sua organização.”</blockquote><cite>Nexa Institucional</cite></div>
      </section>

      <section className="section" aria-labelledby="visite-title"><div className="container"><div className="section-heading split-heading align-end"><div><p className="eyebrow">Estrutura completa</p><h2 id="visite-title">Informação organizada em um só lugar.</h2></div><Link className="text-link" href="/agenda">Explorar agenda <span>→</span></Link></div><div className="news-grid"><article className="news-card news-featured"><div className="news-image community-image" role="img" aria-label="Equipe trabalhando em conjunto" /><div className="news-content"><span>Institucional</span><h3>Apresente sua organização</h3><p>História, propósito, serviços, equipe e informações importantes.</p></div></article><article className="news-card news-compact"><div className="news-number">01</div><span>Atualizações</span><h3>Conteúdo gerenciável</h3><p>Agenda e publicações podem ser mantidas por usuários autorizados.</p><Link className="text-link" href="/agenda">Ver agenda <span>→</span></Link></article><article className="news-card news-compact dark-card"><div className="news-number">02</div><span>Relacionamento</span><h3>Facilite o contato.</h3><p>Centralize informações e canais para clientes, parceiros e comunidade.</p><Link className="text-link" href="/#contato">Fale conosco <span>→</span></Link></article></div></div></section>

      <section className="gallery-preview" aria-labelledby="galeria-title">
        <div className="gallery-preview-copy"><p className="eyebrow eyebrow-light">Galeria</p><h2 id="galeria-title">Mostre projetos, eventos e momentos importantes.</h2><p>Uma área visual para reforçar identidade, atuação e resultados.</p><Link className="button button-gold" href="/galeria">Ver galeria</Link></div>
        <div className="gallery-preview-image" role="img" aria-label="Equipe em um encontro institucional" />
      </section>

      <section className="section visit-section"><div className="container visit-card"><div><p className="eyebrow eyebrow-light">Quer saber mais?</p><h2>Conheça a demonstração completa.</h2><p>Explore agenda, equipe, galeria e área de conteúdos deste template institucional.</p></div><div className="visit-actions"><Link className="button button-light" href="/agenda">Ver agenda</Link><span>Template de portfólio • Dados fictícios</span></div></div></section>
    </main>
  );
}
