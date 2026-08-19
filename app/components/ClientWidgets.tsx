"use client";
import { useEffect, useState, type FormEvent } from "react";

export function ContactForm() {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSending(true); setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      // Endpoint legado preservado para compatibilidade com a estrutura original.
      const response = await fetch("/api/prayer-requests", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.get("name"), contact: data.get("contact"), subject: data.get("subject"), message: data.get("message"), website: data.get("website"), consent: data.get("consent") === "on" }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível enviar.");
      form.reset(); setSent(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível enviar a mensagem."); }
    finally { setSending(false); }
  }
  if (sent) return <div className="form-success" role="status"><span aria-hidden="true">✓</span><h2>Mensagem recebida.</h2><p>O contato foi registrado com segurança e poderá ser acompanhado pela equipe responsável.</p><button type="button" className="text-link" onClick={() => setSent(false)}>Enviar outra mensagem →</button></div>;
  return <form className="styled-form" onSubmit={submit}><div className="form-row"><label>Seu nome <small>(opcional)</small><input name="name" autoComplete="name" maxLength={100} placeholder="Como podemos chamar você?" /></label><label>Contato <small>(opcional)</small><input name="contact" autoComplete="email" maxLength={160} placeholder="E-mail ou telefone" /></label></div><label>Assunto<select name="subject" defaultValue="" required><option value="" disabled>Selecione um assunto</option><option>Orçamento</option><option>Parceria</option><option>Suporte</option><option>Informações</option><option>Outro</option></select></label><label>Mensagem<textarea name="message" required minLength={10} maxLength={4000} rows={6} placeholder="Conte como podemos ajudar." /></label><label className="form-honeypot" aria-hidden="true">Não preencha<input name="website" tabIndex={-1} autoComplete="off" /></label><label className="check-label"><input name="consent" type="checkbox" required /><span>Autorizo o envio destas informações para a equipe responsável pelo atendimento.</span></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-green" type="submit" disabled={sending}>{sending ? "Enviando…" : "Enviar mensagem"}</button><p className="privacy-note">Os dados enviados são usados apenas para demonstrar um fluxo seguro de contato e não são publicados no site.</p></form>;
}

const galleryItems = [
  { src: "/images/community-gathering.png", alt: "Equipe reunida em um espaço de trabalho", title: "Colaboração em equipe", category: "Equipe", position: "center" },
  { src: "/images/church-hero.png", alt: "Evento com pessoas reunidas", title: "Evento institucional", category: "Eventos", position: "70% center" },
  { src: "/images/devotional-bible.png", alt: "Material de estudo sobre uma mesa", title: "Conteúdo e planejamento", category: "Conteúdo", position: "center" },
  { src: "/images/community-gathering.png", alt: "Pessoas conversando durante um encontro", title: "Relacionamento", category: "Comunidade", position: "15% center" },
  { src: "/images/church-hero.png", alt: "Público em uma apresentação", title: "Apresentação de projeto", category: "Projetos", position: "90% center" },
  { src: "/images/community-gathering.png", alt: "Grupo participando de uma atividade", title: "Conexões", category: "Encontros", position: "80% center" },
];

export function GalleryGrid() {
  const [selected, setSelected] = useState<number | null>(null);
  useEffect(() => { function close(e: KeyboardEvent) { if (e.key === "Escape") setSelected(null); } document.addEventListener("keydown", close); document.body.style.overflow = selected === null ? "" : "hidden"; return () => { document.removeEventListener("keydown", close); document.body.style.overflow = ""; }; }, [selected]);
  return <><div className="gallery-grid">{galleryItems.map((item, index) => <button className={`gallery-item gallery-item-${index + 1}`} type="button" key={`${item.title}-${index}`} onClick={() => setSelected(index)}><img src={item.src} alt={item.alt} style={{ objectPosition: item.position }} /><span><small>{item.category}</small><strong>{item.title}</strong><i aria-hidden="true">＋</i></span></button>)}</div>{selected !== null && <div className="lightbox" role="dialog" aria-modal="true" aria-label={galleryItems[selected].title} onClick={() => setSelected(null)}><button className="lightbox-close" type="button" aria-label="Fechar imagem" onClick={() => setSelected(null)}>×</button><figure onClick={e => e.stopPropagation()}><img src={galleryItems[selected].src} alt={galleryItems[selected].alt} /><figcaption><span>{galleryItems[selected].category}</span>{galleryItems[selected].title}</figcaption></figure></div>}</>;
}
