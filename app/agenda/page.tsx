import type { Metadata } from "next";
import { getPublicContent } from "../../lib/site-content";
import { getPublicSiteOrigin, getPublicSiteUrl } from "../../lib/site-url";
import { AgendaExperience } from "../components/AgendaExperience";
export const metadata: Metadata = {
  title: "Agenda",
  description: "Confira os próximos cultos, encontros e eventos da Primeira Igreja Batista Renovada em Guadalupe.",
  alternates: { canonical: "/agenda" },
};
export const dynamic = "force-dynamic";
export default async function AgendaPage() {
 const events = await getPublicContent("event");
 const origin = getPublicSiteOrigin();
 // eslint-disable-next-line react-hooks/purity -- a rota dinâmica captura o horário uma vez para marcar eventos futuros
 const now = Date.now();
 const eventSchema = events
  .filter((event) => event.date && event.time && Date.parse(`${event.date}T${event.time}:00-03:00`) >= now)
  .slice(0, 20)
  .map((event) => ({
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.body || event.subtitle || undefined,
    startDate: `${event.date}T${event.time}:00-03:00`,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: event.location || "Primeira Igreja Batista Renovada em Guadalupe",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Rua Fernando Lobo, 226",
        addressLocality: "Rio de Janeiro",
        addressRegion: "RJ",
        postalCode: "21665-070",
        addressCountry: "BR",
      },
    },
    organizer: { "@type": "Church", name: "Primeira Igreja Batista Renovada em Guadalupe", url: origin },
    url: getPublicSiteUrl("/agenda"),
    ...(event.imageUrl ? { image: event.imageUrl.startsWith("http") ? event.imageUrl : getPublicSiteUrl(event.imageUrl) } : {}),
  }));
 const structuredEvents = JSON.stringify(eventSchema).replace(/</g, "\\u003c");
 // eslint-disable-next-line react-hooks/purity -- a rota dinâmica captura o horário uma vez e envia o mesmo valor para a hidratação
 const initialNow = Date.now();
 return <main>
  {eventSchema.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredEvents }} />}
  <section className="page-hero agenda-hero"><div className="container page-hero-inner"><p className="eyebrow eyebrow-light">Agenda</p><h1>Encontros que<br />fortalecem a caminhada.</h1><p>As programações da PIBRG são divulgadas pelos canais oficiais da igreja.</p></div></section>
  <AgendaExperience events={events} initialNow={initialNow} />
  <section className="section signup-section"><div className="container signup-grid"><div><p className="eyebrow eyebrow-light">Como chegar</p><h2>Visite a PIBRG</h2><p>Rua Fernando Lobo, 226<br />Guadalupe • Rio de Janeiro – RJ<br />CEP 21665-070</p></div><div className="calendar-card"><div className="calendar-head"><strong>PIBRG</strong><span>Guadalupe</span></div><p>Consulte a programação oficial e venha participar dos encontros da comunidade.</p><a className="button button-gold" href="https://www.google.com/maps/search/?api=1&query=Rua+Fernando+Lobo+226+Guadalupe+Rio+de+Janeiro" target="_blank" rel="noreferrer">Abrir no mapa</a></div></div></section>
 </main>;
}
