"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { requestJson } from "./client-fetch";

type Summary = { id: string; subject: string; status: "new" | "open" | "closed"; createdAt: string; updatedAt: string; unread: number; preview: string; identity: { name: string; contact: string } };
type ThreadMessage = { id: number; sender: "visitor" | "admin"; body: string; authorName: string; createdAt: string; readByVisitor: number };
type Thread = Summary & { messages: ThreadMessage[]; assignedTo: string | null };

export function ContactInbox({ canDelete }: { canDelete: boolean }) {
  const [items, setItems] = useState<Summary[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [thread, setThread] = useState<Thread | null>(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const threadPanelRef = useRef<HTMLElement>(null);
  const listRevisions = useRef(new Map<string, string>());
  const threadRevisions = useRef(new Map<string, string>());
  const displayedFilter = useRef("");

  const loadList = useCallback(async () => {
    try {
      const query = new URLSearchParams();
      if (filter !== "all") query.set("status", filter);
      const knownRevision = displayedFilter.current === filter ? listRevisions.current.get(filter) : undefined;
      if (knownRevision) query.set("revision", knownRevision);
      const suffix = query.size ? `?${query.toString()}` : "";
      const data = await requestJson<{ conversations?: Summary[]; revision: string; unchanged?: boolean }>(`/api/internal/contacts${suffix}`, undefined, "Não foi possível abrir as conversas.");
      listRevisions.current.set(filter, data.revision);
      if (data.unchanged || !data.conversations) { setError(""); return; }
      const conversations = data.conversations;
      displayedFilter.current = filter;
      setItems((current) => sameSummaries(current, conversations) ? current : conversations); setError("");
    } catch (reason) { setError(message(reason)); }
    finally { setLoading(false); }
  }, [filter]);

  const loadThread = useCallback(async (id: string, quiet = false, force = false) => {
    try {
      const query = new URLSearchParams({ id });
      const knownRevision = threadRevisions.current.get(id);
      if (!force && knownRevision) query.set("revision", knownRevision);
      const data = await requestJson<{ conversation?: Thread; revision: string; unchanged?: boolean }>(`/api/internal/contacts?${query.toString()}`, undefined, "Não foi possível abrir a conversa.");
      threadRevisions.current.set(id, data.revision);
      if (data.unchanged || !data.conversation) return;
      const conversation = data.conversation;
      setThread((current) => sameThread(current, conversation) ? current : conversation); if (!quiet) setError("");
      setItems((current) => current.map((item) => item.id === id ? { ...item, unread: 0 } : item));
    } catch (reason) { if (!quiet) setError(message(reason)); }
  }, []);

  useEffect(() => { const initial = window.setTimeout(() => void loadList(), 0); return () => window.clearTimeout(initial); }, [loadList]);
  useEffect(() => {
    const timer = window.setInterval(() => { if (document.visibilityState !== "visible") return; void loadList(); if (selectedId) void loadThread(selectedId, true); }, 12000);
    return () => window.clearInterval(timer);
  }, [loadList, loadThread, selectedId]);

  async function select(id: string) { setSelectedId(id); setThread(null); await loadThread(id, false, true); if (window.matchMedia("(max-width: 720px)").matches) window.requestAnimationFrame(() => threadPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })); }
  async function act(action: string, status?: string) {
    if (!selectedId) return;
    if (action === "delete" && !window.confirm("Excluir definitivamente esta conversa?")) return;
    setSending(true); setError("");
    try {
      await requestJson("/api/internal/contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, id: selectedId, status }) }, "Não foi possível concluir a ação.");
      if (action === "delete") { threadRevisions.current.delete(selectedId); setSelectedId(""); setThread(null); }
      else await loadThread(selectedId, false, true);
      await loadList();
    } catch (reason) { setError(message(reason)); }
    finally { setSending(false); }
  }
  async function reply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selectedId) return;
    const form = event.currentTarget; const data = new FormData(form); setSending(true); setError("");
    try {
      await requestJson("/api/internal/contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reply", id: selectedId, message: data.get("message") }) }, "Não foi possível enviar a resposta.");
      form.reset(); await Promise.all([loadThread(selectedId, false, true), loadList()]);
    } catch (reason) { setError(message(reason)); }
    finally { setSending(false); }
  }

  const visible = useMemo(() => { const term = search.trim().toLowerCase(); return !term ? items : items.filter((item) => `${item.identity.name} ${item.identity.contact} ${item.subject} ${item.preview}`.toLowerCase().includes(term)); }, [items, search]);
  const unread = items.reduce((total, item) => total + Number(item.unread || 0), 0);

  return <div className="contact-inbox-wrap">
    <section className="contact-inbox-head"><div><p>Atendimento geral</p><h2>Caixa de entrada</h2><span>{unread ? `${unread} ${unread === 1 ? "mensagem nova" : "mensagens novas"}` : "Tudo acompanhado"}</span></div><button type="button" onClick={() => void loadList()}>Atualizar</button></section>
    {error && <div className="internal-notice error" role="alert">{error}</div>}
    <div className="contact-inbox">
      <aside className="contact-conversation-list"><div className="contact-inbox-search"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar nome, contato ou assunto" aria-label="Buscar conversas" /></div><div className="contact-inbox-filters">{[["all", "Todas"], ["new", "Novas"], ["open", "Em atendimento"], ["closed", "Concluídas"]].map(([value, label]) => <button type="button" className={filter === value ? "active" : ""} onClick={() => setFilter(value)} key={value}>{label}</button>)}</div>
        <div className="contact-conversation-scroll">{loading ? <p className="contact-list-empty">Carregando conversas…</p> : !visible.length ? <p className="contact-list-empty">Nenhuma conversa nesta seleção.</p> : visible.map((item) => <button type="button" className={`contact-conversation-card ${selectedId === item.id ? "active" : ""}`} key={item.id} onClick={() => void select(item.id)}><span className="contact-avatar">{initials(item.identity.name)}</span><span className="contact-card-copy"><span><strong>{item.identity.name}</strong><time>{shortDate(item.updatedAt)}</time></span><em>{item.subject}</em><small>{item.preview}</small></span>{item.unread > 0 && <b aria-label={`${item.unread} mensagens não lidas`}>{item.unread}</b>}</button>)}</div>
      </aside>
      <section className="contact-thread-admin" ref={threadPanelRef}>{!selectedId ? <div className="contact-thread-placeholder"><span>✦</span><h3>Selecione uma conversa</h3><p>As mensagens gerais aparecem aqui. Pedidos de oração permanecem em sua própria área protegida.</p></div> : !thread ? <div className="contact-thread-placeholder"><p>Abrindo conversa…</p></div> : <>
        <header><div><span className="contact-avatar">{initials(thread.identity.name)}</span><div><h3>{thread.identity.name}</h3><p>{thread.subject}{thread.identity.contact ? ` • ${thread.identity.contact}` : ""}</p></div></div><div className="contact-thread-actions"><select value={thread.status} onChange={(event) => void act("status", event.target.value)} disabled={sending} aria-label="Status da conversa"><option value="new">Nova</option><option value="open">Em atendimento</option><option value="closed">Concluída</option></select>{canDelete && <button className="danger" type="button" onClick={() => void act("delete")} disabled={sending}>Excluir</button>}</div></header>
        <div className="contact-admin-messages" role="log" aria-live="polite"><div className="contact-admin-date">Conversa iniciada em {longDate(thread.createdAt)}</div>{thread.messages.map((item) => <article className={item.sender} key={item.id}><span>{item.sender === "admin" ? item.authorName || "Equipe PIBRG" : thread.identity.name}</span><p>{item.body}</p><small>{fullDate(item.createdAt)}{item.sender === "admin" && item.readByVisitor ? " • Visualizada" : ""}</small></article>)}</div>
        <form className="contact-admin-reply" onSubmit={reply}><label><span className="sr-only">Responder à conversa</span><textarea name="message" rows={3} maxLength={2000} minLength={2} required placeholder="Escreva a resposta da igreja…" /></label><div><small>A resposta aparecerá para o visitante no mesmo dispositivo.</small><button className="primary" type="submit" disabled={sending}>{sending ? "Enviando…" : "Enviar resposta"}</button></div></form>
      </>}</section>
    </div>
    <p className="contact-inbox-note"><strong>Separação preservada:</strong> esta caixa recebe apenas dúvidas e mensagens gerais. A equipe de intercessão acessa os pedidos de oração em outra área.</p>
  </div>;
}

function message(error: unknown) { return error instanceof Error ? error.message : "Ocorreu um erro inesperado."; }
function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?"; }
function normalizeDate(value: string) { return new Date(value.endsWith("Z") ? value : `${value.replace(" ", "T")}Z`); }
function shortDate(value: string) { return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" }).format(normalizeDate(value)); }
function fullDate(value: string) { return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(normalizeDate(value)); }
function longDate(value: string) { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "America/Sao_Paulo" }).format(normalizeDate(value)); }
function sameSummaries(left: Summary[], right: Summary[]) { return left.length === right.length && left.every((item, index) => { const next = right[index]; return next && item.id === next.id && item.updatedAt === next.updatedAt && item.unread === next.unread && item.status === next.status && item.preview === next.preview; }); }
function sameThread(left: Thread | null, right: Thread) { const leftLast = left?.messages.at(-1); const rightLast = right.messages.at(-1); return Boolean(left && left.id === right.id && left.status === right.status && left.messages.length === right.messages.length && leftLast?.id === rightLast?.id && leftLast?.readByVisitor === rightLast?.readByVisitor); }
