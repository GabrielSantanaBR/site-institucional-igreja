import type { Metadata } from "next";

export const metadata: Metadata = { title: "Nossa Igreja" };

export default function NossaIgrejaPage() {
  return <main>
    <section className="page-hero page-hero-church"><div className="container page-hero-inner">
      <p className="eyebrow eyebrow-light">Nossa igreja</p>
      <h1>Uma presença cristã<br />com raízes em Guadalupe.</h1>
      <p>Conheça as informações institucionais confirmadas da Primeira Igreja Batista Renovada em Guadalupe.</p>
    </div></section>

    <section className="section story-section"><div className="container story-grid">
      <div className="sticky-heading"><p className="eyebrow">Nossa história</p><h2>Presente na região desde 1979.</h2></div>
      <div className="story-copy">
        <p className="lead">A Primeira Igreja Batista Renovada em Guadalupe foi registrada em 21 de fevereiro de 1979 e permanece ativa como organização religiosa no Rio de Janeiro.</p>
        <p>Sua sede está localizada na Rua Fernando Lobo, 226, CEP 21665-070, na região de Guadalupe e Ricardo de Albuquerque.</p>
        <p>As informações sobre liderança, ministérios, agenda e conteúdos da comunidade são mantidas pela equipe autorizada da própria igreja.</p>
        <div className="timeline"><div><strong>1979</strong><span>Início do registro institucional</span></div><div><strong>PIBRG</strong><span>Identidade da comunidade</span></div><div><strong>Rio de Janeiro</strong><span>Rua Fernando Lobo, 226</span></div></div>
      </div>
    </div></section>

    <section className="section identity-section"><div className="container">
      <div className="section-heading centered-heading"><p className="eyebrow">Informações confirmadas</p><h2>Uma apresentação fiel à igreja.</h2></div>
      <div className="identity-grid">
        <article><span>01</span><h3>Nome</h3><p>Primeira Igreja Batista Renovada em Guadalupe.</p></article>
        <article><span>02</span><h3>Endereço</h3><p>Rua Fernando Lobo, 226, Rio de Janeiro – RJ.</p></article>
        <article><span>03</span><h3>Comunidade</h3><p>Uma organização religiosa cristã com atuação local desde 1979.</p></article>
      </div>
    </div></section>

    <section className="section faith-section"><div className="container faith-grid">
      <div><p className="eyebrow eyebrow-light">Vida da igreja</p><h2>Fé, comunhão<br />e oração.</h2><p>O site aproxima visitantes da comunidade e reúne informações publicadas pela equipe da PIBRG.</p></div>
      <div className="faith-list">{[
        ["Cultos e encontros", "A agenda apresenta somente programações cadastradas pela igreja."],
        ["Liderança", "Nomes e ministérios podem ser publicados pela equipe autorizada."],
        ["Devocionais", "Reflexões podem ser incluídas e atualizadas no painel interno."],
        ["Pedidos de oração", "As mensagens ficam protegidas e acessíveis apenas a pessoas autorizadas."],
      ].map(([title, text], index) => <article key={title}><span>0{index + 1}</span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div>
    </div></section>

    <section className="section pastor-section"><div className="container pastor-card">
      <div className="pastor-placeholder" role="img" aria-label="Identidade visual da PIBRG"><span>PIBRG<br />Guadalupe</span></div>
      <div><p className="eyebrow">Visite a comunidade</p><h2>Conheça a PIBRG.</h2><p className="pastor-role">Rua Fernando Lobo, 226 • Rio de Janeiro – RJ</p><p>Confira a agenda deste site e os canais da igreja antes de sua visita para confirmar a programação atual.</p><a className="text-link" href="https://www.instagram.com/pibrg/" target="_blank" rel="noreferrer">Acompanhar a PIBRG no Instagram <span>↗</span></a></div>
    </div></section>
  </main>;
}
