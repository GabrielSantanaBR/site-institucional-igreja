"use client";
/* eslint-disable @next/next/no-img-element -- imagens administrativas já chegam reduzidas em WebP */
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { ContentGroup, ContentItem } from "../../lib/site-content";
import { requestJson } from "./client-fetch";

export function PrayerForm() {
  const submitting = useRef(false);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true; setSending(true); setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await requestJson("/api/prayer-requests", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.get("name"), contact: data.get("contact"), subject: data.get("subject"), message: data.get("message"), website: data.get("website"), consent: data.get("consent") === "on" }),
      }, "Não foi possível enviar o pedido agora.");
      form.reset(); setSent(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível enviar o pedido."); }
    finally { submitting.current = false; setSending(false); }
  }
  if (sent) return <div className="form-success" role="status"><span aria-hidden="true">✓</span><h2>Recebemos seu pedido.</h2><p>Ele foi protegido no painel confidencial e a equipe responsável poderá acompanhá-lo.</p><button type="button" className="text-link" onClick={() => setSent(false)}>Enviar outro pedido →</button></div>;
  return <form className="styled-form" onSubmit={submit}><div className="form-row"><label>Seu nome <small>(opcional)</small><input name="name" autoComplete="name" maxLength={100} placeholder="Você também pode enviar anonimamente" /></label><label>Contato <small>(opcional)</small><input name="contact" autoComplete="email" maxLength={160} placeholder="E-mail ou WhatsApp" /></label></div><label>Como podemos orar?<select name="subject" defaultValue="" required><option value="" disabled>Selecione um assunto</option><option>Família</option><option>Saúde</option><option>Trabalho e estudos</option><option>Vida espiritual</option><option>Outro</option></select></label><label>Seu pedido<textarea name="message" required minLength={10} maxLength={4000} rows={6} placeholder="Compartilhe apenas o que se sentir confortável em contar." /></label><label className="form-honeypot" aria-hidden="true">Não preencha<input name="website" tabIndex={-1} autoComplete="off" /></label><label className="check-label"><input name="consent" type="checkbox" required /><span>Autorizo o recebimento confidencial deste pedido pela equipe de intercessão, inclusive por notificação de e-mail.</span></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-green" type="submit" disabled={sending}>{sending ? "Protegendo e enviando…" : "Enviar pedido de oração"}</button><p className="privacy-note">O pedido fica protegido no painel e uma cópia pode ser enviada ao e-mail autorizado da equipe. Nada será publicado no site.</p></form>;
}

export function GalleryGrid({ items = [], groups = [] }: { items?: ContentItem[]; groups?: ContentGroup[] }) {
  const groupById = useMemo(() => new Map(groups.map((group) => [group.id, group])), [groups]);
  const displayedItems = useMemo(() => items.map((item) => ({ id: item.id, src: item.imageUrl, alt: item.body || item.title, title: item.title, category: groupById.get(item.groupId ?? -1)?.name || item.subtitle || "PIBRG", groupId: item.groupId, position: item.imagePosition || "center" })), [groupById, items]);
  const itemsByGroup = useMemo(() => {
    const grouped = new Map<number, typeof displayedItems>();
    for (const item of displayedItems) {
      if (!item.groupId) continue;
      const current = grouped.get(item.groupId) ?? [];
      current.push(item); grouped.set(item.groupId, current);
    }
    return grouped;
  }, [displayedItems]);
  const availableGroups = useMemo(() => groups.filter((group) => itemsByGroup.has(group.id)), [groups, itemsByGroup]);
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const filteredItems = selectedGroup ? itemsByGroup.get(selectedGroup) ?? [] : displayedItems;
  useEffect(() => {
    function navigate(event: KeyboardEvent) {
      if (selected === null) return;
      if (event.key === "Escape") setSelected(null);
      if (event.key === "ArrowLeft") setSelected((current) => current === null ? null : (current - 1 + filteredItems.length) % filteredItems.length);
      if (event.key === "ArrowRight") setSelected((current) => current === null ? null : (current + 1) % filteredItems.length);
    }
    const previous = document.body.style.overflow;
    document.addEventListener("keydown", navigate);
    if (selected !== null) document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", navigate); document.body.style.overflow = previous; };
  }, [filteredItems.length, selected]);
  if (!displayedItems.length) return <div className="gallery-empty"><span aria-hidden="true">＋</span><h2>A galeria está sendo preparada.</h2><p>As fotos publicadas pela equipe da PIBRG aparecerão aqui, organizadas por categoria.</p></div>;
  return <>{availableGroups.length > 0 && <section className="gallery-albums" aria-label="Categorias da galeria"><button type="button" className={!selectedGroup ? "active" : ""} aria-pressed={!selectedGroup} onClick={() => { setSelectedGroup(null); setSelected(null); }}><span className="gallery-album-all">Todas</span><strong>Todos os registros</strong><small>{displayedItems.length} fotos</small></button>{availableGroups.map((group) => { const groupItems = itemsByGroup.get(group.id) ?? []; const first = groupItems[0]; const cover = group.coverImageUrl || first?.src; const position = group.coverImageUrl ? group.coverImagePosition : first?.position; return <button type="button" className={selectedGroup === group.id ? "active" : ""} aria-pressed={selectedGroup === group.id} key={group.id} onClick={() => { setSelectedGroup(group.id); setSelected(null); }}>{cover ? <img src={cover} alt={`Capa da categoria ${group.name}`} style={{ objectPosition: position }} loading="lazy" /> : <span className="gallery-album-all">PIBRG</span>}<strong>{group.name}</strong><small>{groupItems.length} {groupItems.length === 1 ? "foto" : "fotos"}</small></button>; })}</section>}<div className="gallery-filter-status"><strong>{selectedGroup ? groupById.get(selectedGroup)?.name : "Todos os registros"}</strong><span>{filteredItems.length} {filteredItems.length === 1 ? "imagem" : "imagens"}</span></div><div className="gallery-grid">{filteredItems.map((item, index) => <button className={`gallery-item gallery-item-${(index % 6) + 1}`} type="button" key={item.id} aria-label={`Abrir foto: ${item.title}`} onClick={() => setSelected(index)}><img src={item.src} alt={item.alt} style={{ objectPosition: item.position }} loading="lazy" /><span><small>{item.category}</small><strong>{item.title}</strong><i aria-hidden="true">＋</i></span></button>)}</div>{selected !== null && filteredItems[selected] && <div className="lightbox" role="dialog" aria-modal="true" aria-label={filteredItems[selected].title} onClick={() => setSelected(null)}><button className="lightbox-close" type="button" aria-label="Fechar imagem" onClick={() => setSelected(null)} autoFocus>×</button>{filteredItems.length > 1 && <><button className="lightbox-nav lightbox-prev" type="button" aria-label="Foto anterior" onClick={(event) => { event.stopPropagation(); setSelected((selected - 1 + filteredItems.length) % filteredItems.length); }}>←</button><button className="lightbox-nav lightbox-next" type="button" aria-label="Próxima foto" onClick={(event) => { event.stopPropagation(); setSelected((selected + 1) % filteredItems.length); }}>→</button></>}<figure onClick={event => event.stopPropagation()}><img src={filteredItems[selected].src} alt={filteredItems[selected].alt} style={{ objectPosition: filteredItems[selected].position }} /><figcaption><span>{filteredItems[selected].category}</span>{filteredItems[selected].title}<small>{selected + 1} de {filteredItems.length}</small></figcaption></figure></div>}</>;
}
