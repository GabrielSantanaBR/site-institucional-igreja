"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

const nav = [["Início", "/"], ["Sobre", "/nossa-igreja"], ["Equipe", "/lideranca"], ["Agenda", "/agenda"], ["Projetos", "/sermoes"], ["Galeria", "/galeria"], ["Conteúdos", "/devocionais"]];

function Brand() {
  return <Link className="brand" href="/" aria-label="Nexa Institucional - página inicial"><span className="brand-name"><strong>Nexa Institucional</strong><small>Template demonstrativo</small></span></Link>;
}

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  if (pathname.startsWith("/acesso-interno")) return <>{children}</>;
  return <>
    <div className="demo-bar">DEMO • Site institucional com conteúdo gerenciável</div>
    <header className="site-header"><div className="container header-inner"><Brand /><nav className="desktop-nav" aria-label="Navegação principal">{nav.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}</nav><Link className="header-cta" href="/#contato">Fale conosco</Link><button className={`menu-button ${open ? "is-open" : ""}`} type="button" aria-label={open ? "Fechar menu" : "Abrir menu"} aria-controls="mobile-menu" aria-expanded={open} onClick={() => setOpen(v => !v)}><span /><span /></button></div><div className={`mobile-menu ${open ? "is-open" : ""}`} id="mobile-menu"><nav aria-label="Navegação para celular">{nav.map(([label, href]) => <Link href={href} key={href} onClick={() => setOpen(false)}>{label}<span>→</span></Link>)}<Link className="mobile-prayer" href="/#contato" onClick={() => setOpen(false)}>Fale conosco</Link></nav></div></header>
    {children}
    <footer className="site-footer" id="contato">
      <div className="container footer-grid"><div className="footer-brand"><Brand /><p>Um template institucional moderno para apresentar sua organização, serviços, equipe, agenda e conteúdos em uma experiência responsiva.</p><div className="social-row" aria-label="Redes sociais"><a href="#contato" aria-label="Instagram demonstrativo">ig</a><a href="#contato" aria-label="LinkedIn demonstrativo">in</a></div></div><div><h2>Localização</h2><address>Av. Exemplo, 100<br />Centro • Rio de Janeiro – RJ<br />CEP 20000-000</address><span className="footer-link">Endereço demonstrativo</span></div><div><h2>Agenda</h2><p>Divulgue eventos, reuniões, lançamentos e atividades com atualização pela área administrativa.</p><Link className="footer-link" href="/agenda">Ver agenda →</Link></div><div><h2>Fale conosco</h2><p>E-mail: <strong>contato@exemplo.com</strong><br />Telefone: <strong>(21) 0000-0000</strong></p><a className="footer-link" href="mailto:contato@exemplo.com">Enviar mensagem →</a></div></div>
      <div className="container footer-map" aria-label="Representação visual de localização"><div className="map-road road-one" /><div className="map-road road-two" /><div className="map-road road-three" /><span className="map-pin" aria-hidden="true"><i /></span><div><strong>Nexa</strong><small>Endereço demonstrativo • Rio de Janeiro</small></div></div>
      <div className="container footer-bottom"><span>© 2026 Nexa Institucional — demonstração de portfólio.</span><span>Projeto full-stack institucional.</span></div>
    </footer>
  </>;
}
