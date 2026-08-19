import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sobre" };

export default function NossaIgrejaPage() {
  return <main>
    <section className="page-hero page-hero-church"><div className="container page-hero-inner">
      <p className="eyebrow eyebrow-light">Sobre a organização</p>
      <h1>Uma presença institucional<br />construída com propósito.</h1>
      <p>Use esta página para apresentar história, atuação, diferenciais e informações relevantes da sua organização.</p>
    </div></section>

    <section className="section story-section"><div className="container story-grid">
      <div className="sticky-heading"><p className="eyebrow">Nossa história</p><h2>Uma trajetória que merece ser bem apresentada.</h2></div>
      <div className="story-copy">
        <p className="lead">A Nexa é uma organização fictícia criada para demonstrar como um site institucional pode apresentar uma história de forma clara e profissional.</p>
        <p>Este conteúdo é apenas demonstrativo e pode ser substituído por informações reais de uma empresa, associação, projeto, ONG ou negócio local.</p>
        <p>Equipe, agenda, conteúdos e outras informações podem ser mantidas pela área administrativa protegida do projeto.</p>
        <div className="timeline"><div><strong>2019</strong><span>Início demonstrativo</span></div><div><strong>Nexa</strong><span>Identidade fictícia</span></div><div><strong>Rio de Janeiro</strong><span>Localização de exemplo</span></div></div>
      </div>
    </div></section>

    <section className="section identity-section"><div className="container">
      <div className="section-heading centered-heading"><p className="eyebrow">Informações institucionais</p><h2>Apresente o que realmente importa.</h2></div>
      <div className="identity-grid">
        <article><span>01</span><h3>Propósito</h3><p>Explique de forma objetiva por que sua organização existe e qual problema busca resolver.</p></article>
        <article><span>02</span><h3>Atuação</h3><p>Mostre serviços, projetos, segmentos atendidos e principais áreas de trabalho.</p></article>
        <article><span>03</span><h3>Diferenciais</h3><p>Destaque experiência, processo, tecnologia, atendimento ou resultados relevantes.</p></article>
      </div>
    </div></section>

    <section className="section faith-section"><div className="container faith-grid">
      <div><p className="eyebrow eyebrow-light">Estrutura do site</p><h2>Conteúdo, equipe<br />e relacionamento.</h2><p>O template organiza informações institucionais e permite que conteúdos variáveis sejam atualizados por usuários autorizados.</p></div>
      <div className="faith-list">{[
        ["Agenda e eventos", "Divulgue compromissos, atividades e programações em uma área dedicada."],
        ["Equipe", "Apresente pessoas, funções e responsabilidades de forma organizada."],
        ["Conteúdos", "Publique textos, novidades e materiais institucionais pelo painel interno."],
        ["Contato", "Centralize canais de relacionamento e facilite o próximo passo de quem visita o site."],
      ].map(([title, text], index) => <article key={title}><span>0{index + 1}</span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div>
    </div></section>

    <section className="section pastor-section"><div className="container pastor-card">
      <div className="pastor-placeholder" role="img" aria-label="Identidade visual demonstrativa"><span>NEXA<br />Institucional</span></div>
      <div><p className="eyebrow">Projeto demonstrativo</p><h2>Uma base pronta para personalização.</h2><p className="pastor-role">Conteúdo fictício • Dados demonstrativos</p><p>O objetivo desta versão é mostrar a experiência visual e técnica sem expor informações do cliente que originou o projeto.</p><a className="text-link" href="/#contato">Entrar em contato <span>→</span></a></div>
    </div></section>
  </main>;
}
