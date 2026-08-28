"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { requestJson } from "./client-fetch";

const STORAGE_KEY = "pibrg_contact_session_v1";
const subjects = ["Secretaria", "Agenda e eventos", "Visita", "Ministérios", "Informações gerais", "Outro"];
type ContactSession = { id: string; token: string };
type ContactMessage = { id: number; sender: "visitor" | "admin"; body: string; authorName: string; createdAt: string; readByVisitor: number };
type Conversation = { id: string; subject: string; status: string; updatedAt: string; identity: { name: string; contact: string }; messages: ContactMessage[] };

export function ContactChat({ compact = false }: { compact?: boolean }) {
  const [session, setSession] = useState<ContactSession | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const logRef = useRef<HTMLDivElement>(null);
  const revisionRef = useRef("");

  const load = useCallback(async (current: ContactSession, quiet = false, force = false) => {
    try {
      const query = new URLSearchParams({ id: current.id });
      if (!force && revisionRef.current) query.set("revision", revisionRef.current);
      const data = await requestJson<{ conversation?: Conversation; revision: string; unchanged?: boolean }>(`/api/contact?${query.toString()}`, { headers: { "x-contact-token": current.token } }, "Não foi possível abrir a conversa.");
      revisionRef.current = data.revision;
      if (data.unchanged || !data.conversation) return;
      const nextConversation = data.conversation;
      setConversation((previous) => sameConversation(previous, nextConversation) ? previous : nextConversation); setError("");
    } catch (reason) {
      if (!quiet) setError(message(reason));
      if (reason instanceof Error && /não encontrada/i.test(reason.message)) { localStorage.removeItem(STORAGE_KEY); setSession(null); setConversation(null); }
    } finally { setRestoring(false); }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => {
      try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") as ContactSession | null;
        if (stored?.id && stored?.token) { setSession(stored); void load(stored); }
        else setRestoring(false);
      } catch { localStorage.removeItem(STORAGE_KEY); setRestoring(false); }
    });
  }, [load]);

  useEffect(() => {
    if (!session) return;
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void load(session, true); }, 10000);
    return () => window.clearInterval(timer);
  }, [load, session]);

  useEffect(() => {
    if (!conversation?.messages.length) return;
    window.setTimeout(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, 30);
  }, [conversation?.messages.length]);

  async function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSending(true); setError("");
    const form = event.currentTarget; const data = new FormData(form);
    try {
      const result = await requestJson<{ id: string; token: string }>("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start", name: data.get("name"), contact: data.get("contact"), subject: data.get("subject"), message: data.get("message"), website: data.get("website"), consent: data.get("consent") === "on" }) }, "Não foi possível iniciar a conversa.");
      const next = { id: result.id, token: result.token };
      revisionRef.current = ""; localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); setSession(next); form.reset(); await load(next, false, true);
    } catch (reason) { setError(message(reason)); }
    finally { setSending(false); }
  }

  async function reply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!session) return;
    const form = event.currentTarget; const data = new FormData(form); setSending(true); setError("");
    try {
      await requestJson("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "send", id: session.id, token: session.token, message: data.get("message") }) }, "Não foi possível enviar a mensagem.");
      form.reset(); await load(session, false, true);
    } catch (reason) { setError(message(reason)); }
    finally { setSending(false); }
  }

  function restart() {
    if (conversation && !window.confirm("Iniciar uma nova conversa neste dispositivo? A conversa atual deixará de aparecer aqui.")) return;
    revisionRef.current = ""; localStorage.removeItem(STORAGE_KEY); setSession(null); setConversation(null); setError("");
  }

  if (restoring) return <div className={`contact-chat ${compact ? "compact" : ""}`}><div className="contact-loading">Abrindo seu canal de contato…</div></div>;
  if (!session || !conversation) return <div className={`contact-chat ${compact ? "compact" : ""}`}>
    <header className="contact-chat-head"><div><span className="contact-online" aria-hidden="true" /> <small>Fale conosco</small><h2>Como podemos ajudar?</h2></div><p>Envie sua mensagem à secretaria. A resposta aparecerá nesta conversa.</p></header>
    <form className="contact-start-form" onSubmit={start}>
      <div className="contact-form-row"><label>Seu nome<input name="name" autoComplete="name" required minLength={2} maxLength={100} placeholder="Como podemos chamar você?" /></label><label>Contato <small>(opcional)</small><input name="contact" autoComplete="email" maxLength={160} placeholder="E-mail ou WhatsApp" /></label></div>
      <label>Assunto<select name="subject" required defaultValue=""><option value="" disabled>Escolha um assunto</option>{subjects.map((subject) => <option key={subject}>{subject}</option>)}</select></label>
      <label>Sua mensagem<textarea name="message" required minLength={2} maxLength={2000} rows={compact ? 3 : 5} placeholder="Conte brevemente como a igreja pode ajudar." /></label>
      <label className="form-honeypot" aria-hidden="true">Não preencha<input name="website" tabIndex={-1} autoComplete="off" /></label>
      <label className="contact-consent"><input name="consent" type="checkbox" required /><span>Autorizo o recebimento desta mensagem pela equipe responsável e o armazenamento desta conversa no painel protegido.</span></label>
      {error && <p className="contact-error" role="alert">{error}</p>}
      <button type="submit" className="contact-send" disabled={sending}>{sending ? "Enviando com segurança…" : "Iniciar conversa"}<span>→</span></button>
      <p className="contact-privacy">Este canal é para informações gerais. Pedidos de oração continuam em uma área confidencial separada.</p>
    </form>
  </div>;

  return <div className={`contact-chat contact-chat-active ${compact ? "compact" : ""}`}>
    <header className="contact-chat-head active"><div><span className="contact-online" aria-hidden="true" /> <small>Conversa protegida</small><h2>{conversation.subject}</h2></div><button type="button" onClick={restart}>Nova conversa</button></header>
    <div className="contact-thread" ref={logRef} role="log" aria-live="polite" aria-label="Mensagens da conversa">
      <div className="contact-welcome"><strong>PIBRG</strong><span>A secretaria recebeu sua mensagem. Você pode voltar a esta página no mesmo dispositivo para acompanhar a resposta.</span></div>
      {conversation.messages.map((item) => <article className={`contact-bubble ${item.sender}`} key={item.id}><span>{item.sender === "admin" ? item.authorName || "Equipe PIBRG" : "Você"}</span><p>{item.body}</p><small>{formatMessageDate(item.createdAt)}{item.sender === "admin" ? " • Resposta da igreja" : ""}</small></article>)}
    </div>
    {conversation.status === "closed" && <p className="contact-closed">Esta conversa foi concluída. Se você enviar outra mensagem, ela será reaberta.</p>}
    {error && <p className="contact-error" role="alert">{error}</p>}
    <form className="contact-reply-form" onSubmit={reply}><label><span className="sr-only">Digite sua mensagem</span><textarea name="message" required minLength={2} maxLength={2000} rows={2} placeholder="Escreva sua mensagem…" /></label><button type="submit" disabled={sending} aria-label="Enviar mensagem">{sending ? "…" : "↑"}</button></form>
    <p className="contact-poll-note">As respostas são atualizadas automaticamente enquanto este canal estiver aberto.</p>
  </div>;
}

export function ContactHub() {
  const [open, setOpen] = useState(false);
  return <div className={`contact-hub ${open ? "is-open" : ""}`}>
    {open && <div className="contact-hub-panel"><div className="contact-hub-top"><div><span>PIBRG</span><strong>Central de contato</strong></div><button type="button" onClick={() => setOpen(false)} aria-label="Fechar central de contato">×</button></div><ContactChat compact /><div className="contact-prayer-choice"><span aria-hidden="true">♡</span><div><strong>Precisa de oração?</strong><p>Use o canal confidencial da intercessão.</p></div><Link href="/pedido-de-oracao" onClick={() => setOpen(false)}>Abrir →</Link></div></div>}
    <button className="contact-hub-trigger" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={open ? "Fechar central de contato" : "Abrir Fale Conosco"}><span aria-hidden="true">{open ? "×" : "✦"}</span><em>{open ? "Fechar" : "Fale conosco"}</em></button>
  </div>;
}

function message(error: unknown) { return error instanceof Error ? error.message : "Ocorreu um erro inesperado."; }
function formatMessageDate(value: string) { const normalized = value.endsWith("Z") ? value : `${value.replace(" ", "T")}Z`; return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(normalized)); }
function sameConversation(left: Conversation | null, right: Conversation) { const leftLast = left?.messages.at(-1); const rightLast = right.messages.at(-1); return Boolean(left && left.id === right.id && left.status === right.status && left.messages.length === right.messages.length && leftLast?.id === rightLast?.id && leftLast?.readByVisitor === rightLast?.readByVisitor); }
