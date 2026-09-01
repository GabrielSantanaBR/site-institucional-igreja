import type { Metadata } from "next";
/* eslint-disable @next/next/no-img-element -- mídia publicada pelo painel já é otimizada no envio */
import { getContentGroups, getPublicContent, type ContentGroup, type ContentItem } from "../../lib/site-content";

export const metadata: Metadata = {
  title: "Liderança",
  description: "Conheça a liderança, os ministérios e as áreas de cuidado da PIBRG em Guadalupe.",
  alternates: { canonical: "/lideranca" },
};
export const dynamic = "force-dynamic";

export default async function LiderancaPage() {
  const [leaders, groups] = await Promise.all([getPublicContent("leader"), getContentGroups()]);
  const grouped = groups.map((group) => ({ group, leaders: leaders.filter((leader) => leader.groupId === group.id) })).filter((section) => section.leaders.length);
  const ungrouped = leaders.filter((leader) => !leader.groupId || !groups.some((group) => group.id === leader.groupId));
  return <main><section className="page-hero simple-page-hero"><div className="container page-hero-inner"><p className="eyebrow eyebrow-light">Liderança e serviço</p><h1>Pessoas que servem<br />pessoas.</h1><p>Conheça a liderança da PIBRG organizada por ministérios e áreas de cuidado.</p></div></section><section className="section leadership-sections"><div className="container"><div className="section-heading split-heading"><div><p className="eyebrow">Liderança e ministérios</p><h2>Servir é cuidar de pessoas.</h2></div><p>Em cada grupo, a capa usa a imagem escolhida pela igreja ou a primeira foto cadastrada.</p></div>{grouped.length || ungrouped.length ? <div className="leadership-groups">{grouped.map(({ group, leaders: people }) => <LeadershipGroup key={group.id} group={group} leaders={people} />)}{ungrouped.length > 0 && <section className="leadership-group"><header className="leadership-group-simple"><div><p className="eyebrow">Outras áreas</p><h2>Liderança da PIBRG</h2></div></header><LeaderGrid leaders={ungrouped} /></section>}</div> : <p className="public-empty">A liderança e os ministérios serão publicados pela equipe da PIBRG.</p>}</div></section><section className="section serve-band"><div className="container serve-band-inner"><div><p className="eyebrow eyebrow-light">Conheça a igreja</p><h2>Acompanhe a liderança e os ministérios em atividade.</h2></div><a className="button button-gold" href="https://www.instagram.com/pibrg/" target="_blank" rel="noreferrer">Abrir Instagram da PIBRG</a></div></section></main>;
}

function LeadershipGroup({ group, leaders }: { group: ContentGroup; leaders: ContentItem[] }) {
  const firstWithImage = leaders.find((leader) => leader.imageUrl);
  const cover = group.coverImageUrl || firstWithImage?.imageUrl || "";
  const position = group.coverImageUrl ? group.coverImagePosition : firstWithImage?.imagePosition || "center";
  return <section className="leadership-group"><header className="leadership-group-cover">{cover ? <img src={cover} alt={`Capa do grupo ${group.name}`} style={{ objectPosition: position }} loading="lazy" /> : <div className="leadership-cover-placeholder">PIBRG</div>}<div><p className="eyebrow eyebrow-light">Ministério</p><h2>{group.name}</h2>{group.description && <p>{group.description}</p>}<span>{leaders.length} {leaders.length === 1 ? "pessoa" : "pessoas"}</span></div></header><LeaderGrid leaders={leaders} /></section>;
}

function LeaderGrid({ leaders }: { leaders: ContentItem[] }) { return <div className="leaders-grid">{[...leaders].sort((left, right) => left.sortOrder - right.sortOrder).map((item, index) => <article className="leader-card" key={item.id}>{item.imageUrl ? <div className="leader-photo leader-photo-real"><img src={item.imageUrl} alt={`Foto de ${item.title}`} style={{ objectPosition: item.imagePosition }} loading="lazy" /></div> : <div className={`leader-photo leader-${["forest", "clay", "gold", "sage", "sand", "night"][index % 6]}`}><span>{String(index + 1).padStart(2, "0")}</span></div>}<div><p>{item.subtitle || "Ministério"}</p><h2>{item.title}</h2><span>{item.body}</span></div></article>)}</div>; }
