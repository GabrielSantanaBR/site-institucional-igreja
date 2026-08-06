"use client";
import Link from "next/link";
import Image from "next/image";
import { useState, type ReactNode } from "react";

const nav = [["Início", "/"], ["Nossa Igreja", "/nossa-igreja"], ["Liderança", "/lideranca"], ["Agenda", "/agenda"], ["Sermões", "/sermoes"], ["Galeria", "/galeria"], ["Devocionais", "/devocionais"]];

function Brand() {
  return <Link className="brand" href="/" aria-label="Primeira Igreja Batista Renovada em Guadalupe - página inicial"><Image className="brand-logo" src="/images/pibrg-logo.png" alt="Logo da Primeira Igreja Batista Renovada em Guadalupe" width={447} height={447} priority /><span className="brand-name"><strong>Primeira Igreja Batista Renovada em Guadalupe</strong></span></Link>;
}

export function SiteShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <>
    <div className="demo-bar">PIBRG • Servindo a Deus e à comunidade em Guadalupe</div>
    <header className="site-header"><div className="container header-inner"><Brand /><nav className="desktop-nav" aria-label="Navegação principal">{nav.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}</nav><Link className="header-cta" href="/pedido-de-oracao">Pedido de oração</Link><button className={`menu-button ${open ? "is-open" : ""}`} type="button" aria-label={open ? "Fechar menu" : "Abrir menu"} aria-controls="mobile-menu" aria-expanded={open} onClick={() => setOpen(v => !v)}><span /><span /></button></div><div className={`mobile-menu ${open ? "is-open" : ""}`} id="mobile-menu"><nav aria-label="Navegação para celular">{nav.map(([label, href]) => <Link href={href} key={href} onClick={() => setOpen(false)}>{label}<span>→</span></Link>)}<Link className="mobile-prayer" href="/pedido-de-oracao" onClick={() => setOpen(false)}>Pedido de oração</Link></nav></div></header>
    {children}
    <footer className="site-footer">
      <div className="container footer-grid"><div className="footer-brand"><Brand /><p>Uma comunidade cristã de tradição batista renovada, presente em Guadalupe e comprometida com a Palavra, a comunhão e o anúncio de Jesus.</p><div className="social-row" aria-label="Redes sociais"><a href="https://www.instagram.com/pibrg/" target="_blank" rel="noreferrer" aria-label="Instagram da PIBRG">ig</a><a href="https://www.facebook.com/p/Primeira-Igreja-Batista-Renovada-em-Guadalupe-100065692987381/" target="_blank" rel="noreferrer" aria-label="Facebook da PIBRG">f</a></div></div><div><h2>Visite-nos</h2><address>Rua Fernando Lobo, 226<br />Guadalupe • Rio de Janeiro – RJ<br />CEP 21665-070</address><a className="footer-link" href="https://www.google.com/maps/search/?api=1&query=Rua+Fernando+Lobo+226+Guadalupe+Rio+de+Janeiro" target="_blank" rel="noreferrer">Abrir mapa ↗</a></div><div><h2>Programação</h2><p>Consulte os cultos, eventos e atividades mais recentes nos canais oficiais da igreja.</p><a className="footer-link" href="https://www.instagram.com/pibrg/" target="_blank" rel="noreferrer">Ver agenda no Instagram →</a></div><div><h2>Fale conosco</h2><p>Instagram: <strong>@pibrg</strong><br />Para oração e acolhimento, use também o formulário deste site.</p><Link className="footer-link" href="/pedido-de-oracao">Enviar pedido de oração →</Link></div></div>
      <div className="container footer-map" aria-label="Representação do mapa de localização"><div className="map-road road-one" /><div className="map-road road-two" /><div className="map-road road-three" /><span className="map-pin" aria-hidden="true"><i /></span><div><strong>PIBRG</strong><small>Rua Fernando Lobo, 226 • Guadalupe</small></div></div>
      <div className="container footer-bottom"><span>© 2026 Primeira Igreja Batista Renovada em Guadalupe.</span><span>Feito com cuidado para acolher.</span></div>
    </footer>
    <Link className="floating-prayer" href="/pedido-de-oracao" aria-label="Fazer um pedido de oração"><span aria-hidden="true">♡</span><em>Podemos orar por você?</em></Link>
  </>;
}
