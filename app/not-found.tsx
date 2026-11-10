import Link from "next/link";
export default function NotFound() {
  return <main data-public-not-found><section className="simple-page-hero"><div className="container"><p className="eyebrow eyebrow-light">Página não encontrada</p><h1>Não encontramos este endereço.</h1><p>Confira o link ou volte para a página inicial.</p><Link className="button button-gold" href="/">Voltar ao início</Link></div></section></main>;
}
