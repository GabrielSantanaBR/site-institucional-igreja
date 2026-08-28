import type { Metadata } from "next";
import { getPublicContent } from "../../lib/site-content";
import { AgendaExperience } from "../components/AgendaExperience";
export const metadata: Metadata = { title: "Agenda" };
export const dynamic = "force-dynamic";
export default async function AgendaPage() {
 const events = await getPublicContent("event");
 // eslint-disable-next-line react-hooks/purity -- a rota dinâmica captura o horário uma vez e envia o mesmo valor para a hidratação
 const initialNow = Date.now();
 return <main>
  <section className="page-hero agenda-hero"><div className="container page-hero-inner"><p className="eyebrow eyebrow-light">Agenda</p><h1>Encontros que<br />fortalecem a caminhada.</h1><p>As programações da PIBRG são divulgadas pelos canais oficiais da igreja.</p></div></section>
  <AgendaExperience events={events} initialNow={initialNow} />
  <section className="section signup-section"><div className="container signup-grid"><div><p className="eyebrow eyebrow-light">Como chegar</p><h2>Visite a PIBRG</h2><p>Rua Fernando Lobo, 226<br />Guadalupe • Rio de Janeiro – RJ<br />CEP 21665-070</p></div><div className="calendar-card"><div className="calendar-head"><strong>PIBRG</strong><span>Guadalupe</span></div><p>Consulte a programação oficial e venha participar dos encontros da comunidade.</p><a className="button button-gold" href="https://www.google.com/maps/search/?api=1&query=Rua+Fernando+Lobo+226+Guadalupe+Rio+de+Janeiro" target="_blank" rel="noreferrer">Abrir no mapa</a></div></div></section>
 </main>;
}
