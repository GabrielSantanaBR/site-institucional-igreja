"use client";
import { useEffect, useState, type FormEvent } from "react";

export function PrayerForm() {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSending(true); setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const response = await fetch("/api/prayer-requests", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.get("name"), contact: data.get("contact"), subject: data.get("subject"), message: data.get("message"), website: data.get("website"), consent: data.get("consent") === "on" }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível enviar.");
      form.reset(); setSent(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível enviar o pedido."); }
    finally { setSending(false); }
  }
  if (sent) return <div className="form-success" role="status"><span aria-hidden="true">✓</span><h2>Recebemos seu pedido.</h2><p>Ele foi protegido no painel confidencial e a equipe responsável poderá acompanhá-lo.</p><button type="button" className="text-link" onClick={() => setSent(false)}>Enviar outro pedido →</button></div>;
  return <form className="styled-form" onSubmit={submit}><div className="form-row"><label>Seu nome <small>(opcional)</small><input name="name" autoComplete="name" maxLength={100} placeholder="Você também pode enviar anonimamente" /></label><label>Contato <small>(opcional)</small><input name="contact" autoComplete="email" maxLength={160} placeholder="E-mail ou WhatsApp" /></label></div><label>Como podemos orar?<select name="subject" defaultValue="" required><option value="" disabled>Selecione um assunto</option><option>Família</option><option>Saúde</option><option>Trabalho e estudos</option><option>Vida espiritual</option><option>Outro</option></select></label><label>Seu pedido<textarea name="message" required minLength={10} maxLength={4000} rows={6} placeholder="Compartilhe apenas o que se sentir confortável em contar." /></label><label className="form-honeypot" aria-hidden="true">Não preencha<input name="website" tabIndex={-1} autoComplete="off" /></label><label className="check-label"><input name="consent" type="checkbox" required /><span>Autorizo o recebimento confidencial deste pedido pela equipe de intercessão, inclusive por notificação de e-mail.</span></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-green" type="submit" disabled={sending}>{sending ? "Protegendo e enviando…" : "Enviar pedido de oração"}</button><p className="privacy-note">O pedido fica protegido no painel e uma cópia pode ser enviada ao e-mail autorizado da equipe. Nada será publicado no site.</p></form>;
}

const galleryItems = [
  { src: "/images/community-gathering.png", alt: "Comunidade reunida em um pátio", title: "Comunhão que aproxima", category: "Comunidade", position: "center" },
  { src: "/images/church-hero.png", alt: "Congregação reunida para o culto", title: "Noite de celebração", category: "Cultos", position: "70% center" },
  { src: "/images/devotional-bible.png", alt: "Bíblia aberta sobre uma mesa", title: "Tempo com a Palavra", category: "Devocional", position: "center" },
  { src: "/images/community-gathering.png", alt: "Pessoas conversando em um encontro comunitário", title: "Domingo em família", category: "Família", position: "15% center" },
  { src: "/images/church-hero.png", alt: "Pessoas em momento de louvor", title: "Adoração e gratidão", category: "Louvor", position: "90% center" },
  { src: "/images/community-gathering.png", alt: "Encontro entre diferentes gerações", title: "Gerações conectadas", category: "Encontros", position: "80% center" },
];

export function GalleryGrid() {
  const [selected, setSelected] = useState<number | null>(null);
  useEffect(() => { function close(e: KeyboardEvent) { if (e.key === "Escape") setSelected(null); } document.addEventListener("keydown", close); document.body.style.overflow = selected === null ? "" : "hidden"; return () => { document.removeEventListener("keydown", close); document.body.style.overflow = ""; }; }, [selected]);
  return <><div className="gallery-grid">{galleryItems.map((item, index) => <button className={`gallery-item gallery-item-${index + 1}`} type="button" key={`${item.title}-${index}`} onClick={() => setSelected(index)}><img src={item.src} alt={item.alt} style={{ objectPosition: item.position }} /><span><small>{item.category}</small><strong>{item.title}</strong><i aria-hidden="true">＋</i></span></button>)}</div>{selected !== null && <div className="lightbox" role="dialog" aria-modal="true" aria-label={galleryItems[selected].title} onClick={() => setSelected(null)}><button className="lightbox-close" type="button" aria-label="Fechar imagem" onClick={() => setSelected(null)}>×</button><figure onClick={e => e.stopPropagation()}><img src={galleryItems[selected].src} alt={galleryItems[selected].alt} /><figcaption><span>{galleryItems[selected].category}</span>{galleryItems[selected].title}</figcaption></figure></div>}</>;
}
