"use client";
import { useEffect, useState, type FormEvent } from "react";
import { sermons } from "../data";

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
  if (sent) return <div className="form-success" role="status"><span aria-hidden="true">✓</span><h2>Recebemos seu pedido.</h2><p>Ele foi protegido e encaminhado ao painel confidencial da equipe autorizada.</p><button type="button" className="text-link" onClick={() => setSent(false)}>Enviar outro pedido →</button></div>;
  return <form className="styled-form" onSubmit={submit}><div className="form-row"><label>Seu nome <small>(opcional)</small><input name="name" autoComplete="name" maxLength={100} placeholder="Você também pode enviar anonimamente" /></label><label>Contato <small>(opcional)</small><input name="contact" autoComplete="email" maxLength={160} placeholder="E-mail ou WhatsApp" /></label></div><label>Como podemos orar?<select name="subject" defaultValue="" required><option value="" disabled>Selecione um assunto</option><option>Família</option><option>Saúde</option><option>Trabalho e estudos</option><option>Vida espiritual</option><option>Outro</option></select></label><label>Seu pedido<textarea name="message" required minLength={10} maxLength={4000} rows={6} placeholder="Compartilhe apenas o que se sentir confortável em contar." /></label><label className="form-honeypot" aria-hidden="true">Não preencha<input name="website" tabIndex={-1} autoComplete="off" /></label><label className="check-label"><input name="consent" type="checkbox" required /><span>Autorizo que a equipe de intercessão receba este pedido de forma confidencial.</span></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-green" type="submit" disabled={sending}>{sending ? "Protegendo e enviando…" : "Enviar pedido de oração"}</button><p className="privacy-note">O conteúdo é criptografado e não será exibido publicamente.</p></form>;
}

export function EventSignup() {
  const [sent, setSent] = useState(false);
  return sent ? <div className="signup-success" role="status"><strong>Inscrição registrada!</strong><span>Esta confirmação é demonstrativa.</span></div> : <form className="signup-form" onSubmit={e => { e.preventDefault(); setSent(true); }}><label>Nome completo<input required name="name" /></label><label>WhatsApp<input required name="phone" inputMode="tel" /></label><label>Participantes<select name="people"><option>1 pessoa</option><option>2 pessoas</option></select></label><button className="button button-gold" type="submit">Confirmar interesse</button></form>;
}

export function SermonCards() {
  const [speaking, setSpeaking] = useState<string | null>(null);
  useEffect(() => () => window.speechSynthesis?.cancel(), []);
  function listen(title: string, text: string) { if (!("speechSynthesis" in window)) return; window.speechSynthesis.cancel(); if (speaking === title) { setSpeaking(null); return; } const utterance = new SpeechSynthesisUtterance(`${title}. ${text}`); utterance.lang = "pt-BR"; utterance.rate = .92; utterance.onend = () => setSpeaking(null); window.speechSynthesis.speak(utterance); setSpeaking(title); }
  return <div className="sermon-list">{sermons.map((sermon, index) => <article className="sermon-card" key={sermon.title}><div className="sermon-index">0{index + 1}</div><div className="sermon-body"><p>{sermon.speaker} • {sermon.date}</p><h2>{sermon.title}</h2><span>{sermon.reference} • {sermon.duration}</span><p className="sermon-excerpt">{sermon.excerpt}</p></div><div className="sermon-actions"><button type="button" onClick={() => listen(sermon.title, sermon.excerpt)} aria-pressed={speaking === sermon.title}><i aria-hidden="true">{speaking === sermon.title ? "Ⅱ" : "▶"}</i>{speaking === sermon.title ? "Pausar áudio" : "Ouvir resumo"}</button><a href={sermon.pdf} download><i aria-hidden="true">↓</i>Baixar esboço em PDF</a></div></article>)}</div>;
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
