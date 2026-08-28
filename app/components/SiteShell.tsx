"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { SiteSettings } from "../../lib/site-settings";
import { ContactHub } from "./ContactChat";

const nav = [["Início", "/"], ["Nossa Igreja", "/nossa-igreja"], ["Liderança", "/lideranca"], ["Agenda", "/agenda"], ["Sermões", "/sermoes"], ["Postagens", "/postagens"], ["Galeria", "/galeria"], ["Devocionais", "/devocionais"]];

function Brand() {
  return <Link className="brand" href="/" aria-label="Primeira Igreja Batista Renovada em Guadalupe - página inicial"><Image className="brand-logo" src="/images/pibrg-logo.png" alt="Logo da Primeira Igreja Batista Renovada em Guadalupe" width={447} height={447} priority /><span className="brand-name"><strong>Primeira Igreja Batista Renovada em Guadalupe</strong></span></Link>;
}

export function SiteShell({ children, settings }: { children: ReactNode; settings: SiteSettings }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", close);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", close); };
  }, [open]);
  useEffect(() => {
    if (pathname.startsWith("/acesso-interno") || pathname.startsWith("/alteracao-de-dados") || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const selector = [
      "main .section-heading", "main .welcome-grid", "main .service-card", "main .news-card",
      "main .public-post-grid > article", "main .upcoming-event-cards > article", "main .leadership-group",
      "main .gallery-albums > button", "main .gallery-item", "main .sermons-public-grid > article",
    ].join(",");
    const frame = window.requestAnimationFrame(() => {
      const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
      const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const element = entry.target as HTMLElement;
          element.classList.add("is-revealed");
          observer.unobserve(element);
          window.setTimeout(() => element.classList.remove("scroll-reveal", "is-revealed"), 700);
        }
      }, { rootMargin: "0px 0px -8%", threshold: 0.08 });
      elements.forEach((element, index) => {
        element.classList.add("scroll-reveal");
        element.style.setProperty("--reveal-delay", `${Math.min(index % 4, 3) * 55}ms`);
        observer.observe(element);
      });
      window.setTimeout(() => observer.disconnect(), 12_000);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);
  if (pathname.startsWith("/acesso-interno") || pathname.startsWith("/alteracao-de-dados")) return <>{children}</>;
  return <>
    <div className="demo-bar">PIBRG • Servindo a Deus e à comunidade em Guadalupe</div>
    <header className="site-header"><div className="container header-inner"><Brand /><nav className="desktop-nav" aria-label="Navegação principal">{nav.map(([label, href]) => <Link href={href} key={href} className={pathname === href ? "active" : undefined} aria-current={pathname === href ? "page" : undefined}>{label}</Link>)}</nav><Link className={`header-cta ${pathname === "/fale-conosco" ? "active" : ""}`} href="/fale-conosco" aria-current={pathname === "/fale-conosco" ? "page" : undefined}>Fale conosco</Link><button className={`menu-button ${open ? "is-open" : ""}`} type="button" aria-label={open ? "Fechar menu" : "Abrir menu"} aria-controls="mobile-menu" aria-expanded={open} onClick={() => setOpen(v => !v)}><span /><span /></button></div><div className={`mobile-menu ${open ? "is-open" : ""}`} id="mobile-menu"><nav aria-label="Navegação para celular">{nav.map(([label, href]) => <Link href={href} key={href} className={pathname === href ? "active" : undefined} aria-current={pathname === href ? "page" : undefined} onClick={() => setOpen(false)}>{label}<span>→</span></Link>)}<Link className={`mobile-contact ${pathname === "/fale-conosco" ? "active" : ""}`} href="/fale-conosco" onClick={() => setOpen(false)}>Fale conosco <span>→</span></Link><Link className={`mobile-prayer ${pathname === "/pedido-de-oracao" ? "active" : ""}`} href="/pedido-de-oracao" onClick={() => setOpen(false)}>Pedido de oração <span>♡</span></Link></nav></div></header>
    {children}
    <footer className="site-footer">
      <div className="container footer-grid"><div className="footer-brand"><Brand /><p>Uma comunidade cristã de tradição batista renovada, presente em Guadalupe e comprometida com a Palavra, a comunhão e o anúncio de Jesus.</p><div className="social-row" aria-label="Redes sociais"><a href={settings.instagramUrl} target="_blank" rel="noreferrer" aria-label="Instagram da PIBRG">ig</a><a href={settings.facebookUrl} target="_blank" rel="noreferrer" aria-label="Facebook da PIBRG">f</a></div></div><div><h2>Visite-nos</h2><address>{settings.address}<br />{settings.city}<br />{settings.postalCode}</address><a className="footer-link" href={mapUrl(settings)} target="_blank" rel="noreferrer">Abrir mapa ↗</a></div><div><h2>Programação</h2><p>Consulte os cultos, eventos e atividades mais recentes nos canais oficiais da igreja.</p><Link className="footer-link" href="/agenda">Ver agenda completa →</Link></div><div><h2>Fale conosco</h2><p>Converse com a secretaria ou escolha o canal confidencial de intercessão.</p><Link className="footer-link" href="/fale-conosco">Conversar com a igreja →</Link><br /><Link className="footer-link" href="/pedido-de-oracao">Enviar pedido de oração →</Link></div></div>
      <div className="container footer-map" aria-label="Representação do mapa de localização"><div className="map-road road-one" /><div className="map-road road-two" /><div className="map-road road-three" /><span className="map-pin" aria-hidden="true"><i /></span><div><strong>PIBRG</strong><small>{settings.address} • {settings.city}</small></div></div>
      <div className="container footer-bottom"><span>© {new Date().getFullYear()} Primeira Igreja Batista Renovada em Guadalupe.</span><span>Feito com cuidado para acolher.</span></div>
    </footer>
    {pathname !== "/fale-conosco" && <ContactHub />}
  </>;
}

function mapUrl(settings: SiteSettings) { return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${settings.address} ${settings.city}`)}`; }
