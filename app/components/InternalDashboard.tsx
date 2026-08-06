"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { AdminIdentity } from "../../lib/internal-auth";
import type { ContentItem, ContentKind } from "../../lib/site-content";

type Permissions = { content: boolean; prayers: boolean; users: boolean; audit: boolean };
type Prayer = { id: number; name: string; contact: string; message: string; subject: string; status: string; submittedAt: string; updatedBy: string | null };
type AdminUser = { id: number; email: string; name: string; role: string; active: boolean; protected?: boolean };
type AuditLog = { id: number; actorEmail: string; action: string; entityType: string; entityId: string; createdAt: string };

const roleLabels: Record<string, string> = { owner: "Proprietário", admin: "Administrador", secretary: "Secretaria", intercessor: "Intercessão" };
const statusLabels: Record<string, string> = { new: "Novo", praying: "Em oração", answered: "Respondido", archived: "Arquivado" };
const kindLabels: Record<ContentKind, string> = { event: "Agenda", leader: "Liderança", devotional: "Devocionais" };

export function InternalDashboard({ identity, signOutPath }: { identity: AdminIdentity; signOutPath: string }) {
  const permissions: Permissions = {
    content: ["owner", "admin", "secretary"].includes(identity.role),
    prayers: ["owner", "admin", "intercessor"].includes(identity.role),
    users: identity.role === "owner",
    audit: ["owner", "admin"].includes(identity.role),
  };
  const tabs = useMemo(() => [
    ["overview", "Visão geral", true],
    ["prayers", "Pedidos de oração", permissions.prayers],
    ["content", "Conteúdo do site", permissions.content],
    ["users", "Acessos", permissions.users],
    ["audit", "Atividades", permissions.audit],
  ].filter((tab) => tab[2]) as [string, string, boolean][], [permissions.audit, permissions.content, permissions.prayers, permissions.users]);
  const [active, setActive] = useState("overview");

  return <main className="internal-app">
    <aside className="internal-sidebar">
      <div className="internal-brand"><span>PIBRG</span><strong>Gestão interna</strong></div>
      <nav aria-label="Seções da gestão">{tabs.map(([key, label]) => <button type="button" className={active === key ? "active" : ""} onClick={() => setActive(key)} key={key}>{label}</button>)}</nav>
      <div className="internal-profile"><span>{identity.name}</span><small>{roleLabels[identity.role]}</small><a href={signOutPath}>Sair com segurança</a></div>
    </aside>
    <section className="internal-main">
      <header className="internal-topbar"><div><p>Área protegida</p><h1>{tabs.find(([key]) => key === active)?.[1]}</h1></div><a href="/" target="_blank" rel="noreferrer">Visualizar site ↗</a></header>
      {active === "overview" && <Overview identity={identity} permissions={permissions} onNavigate={setActive} />}
      {active === "prayers" && <PrayerManager canDelete={["owner", "admin"].includes(identity.role)} />}
      {active === "content" && <ContentManager />}
      {active === "users" && <UserManager />}
      {active === "audit" && <AuditManager />}
    </section>
  </main>;
}

function Overview({ identity, permissions, onNavigate }: { identity: AdminIdentity; permissions: Permissions; onNavigate: (tab: string) => void }) {
  const cards = [
    { key: "prayers", title: "Pedidos de oração", text: "Leia, acompanhe e arquive pedidos confidenciais.", allowed: permissions.prayers },
    { key: "content", title: "Conteúdo público", text: "Atualize agenda, liderança e devocionais.", allowed: permissions.content },
    { key: "users", title: "Níveis de acesso", text: "Cadastre a secretaria e a equipe de intercessão.", allowed: permissions.users },
    { key: "audit", title: "Histórico de atividades", text: "Acompanhe alterações importantes realizadas no painel.", allowed: permissions.audit },
  ];
  return <div className="internal-stack">
    <section className="internal-welcome"><div><p>Olá, {identity.name.split(" ")[0]}.</p><h2>O site está pronto para ser administrado com segurança.</h2></div><span>{roleLabels[identity.role]}</span></section>
    <div className="internal-card-grid">{cards.map((card) => <button key={card.key} type="button" disabled={!card.allowed} onClick={() => card.allowed && onNavigate(card.key)}><span>{card.allowed ? "Disponível" : "Sem acesso"}</span><h2>{card.title}</h2><p>{card.text}</p><strong>{card.allowed ? "Abrir ferramenta →" : "Protegido pelo seu nível"}</strong></button>)}</div>
    <section className="internal-security-note"><strong>Privacidade ativa</strong><p>Os pedidos ficam criptografados no banco. Somente perfis autorizados conseguem abrir o conteúdo, e as ações ficam registradas.</p></section>
  </div>;
}

function PrayerManager({ canDelete }: { canDelete: boolean }) {
  const [items, setItems] = useState<Prayer[]>([]);
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const data = await api<{ prayers: Prayer[] }>(`/api/internal/prayers${status === "all" ? "" : `?status=${status}`}`); setItems(data.prayers); }
    catch (reason) { setError(message(reason)); }
    finally { setLoading(false); }
  }, [status]);
  useEffect(() => {
    let current = true;
    api<{ prayers: Prayer[] }>(`/api/internal/prayers${status === "all" ? "" : `?status=${status}`}`)
      .then((data) => { if (current) { setItems(data.prayers); setError(""); } })
      .catch((reason) => { if (current) setError(message(reason)); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [status]);
  async function act(id: number, action: string, nextStatus?: string) {
    if (action === "delete" && !window.confirm("Excluir definitivamente este pedido?")) return;
    await api("/api/internal/prayers", { method: "POST", body: JSON.stringify({ id, action, status: nextStatus }) });
    await load();
  }
  return <div className="internal-stack">
    <div className="internal-toolbar"><div className="internal-filters">{["all", "new", "praying", "answered", "archived"].map((value) => <button type="button" className={status === value ? "active" : ""} onClick={() => setStatus(value)} key={value}>{value === "all" ? "Todos" : statusLabels[value]}</button>)}</div><button type="button" onClick={() => void load()}>Atualizar</button></div>
    {error && <Notice type="error">{error}</Notice>}
    {loading ? <Empty>Carregando pedidos protegidos…</Empty> : !items.length ? <Empty>Nenhum pedido nesta categoria.</Empty> : <div className="prayer-admin-list">{items.map((prayer) => <article key={prayer.id}>
      <header><div><span className={`status-pill status-${prayer.status}`}>{statusLabels[prayer.status]}</span><small>{formatDate(prayer.submittedAt)}</small></div><strong>{prayer.subject}</strong></header>
      <h2>{prayer.name || "Anônimo"}</h2>{prayer.contact && <a href={`mailto:${prayer.contact}`}>{prayer.contact}</a>}<p>{prayer.message}</p>
      <footer><select value={prayer.status} onChange={(event) => void act(prayer.id, "status", event.target.value)} aria-label={`Status do pedido de ${prayer.name}`}><option value="new">Novo</option><option value="praying">Em oração</option><option value="answered">Respondido</option><option value="archived">Arquivado</option></select>{canDelete && <button type="button" className="danger" onClick={() => void act(prayer.id, "delete")}>Excluir</button>}</footer>
    </article>)}</div>}
  </div>;
}

function ContentManager() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [kind, setKind] = useState<ContentKind>("event");
  const [editing, setEditing] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => { setLoading(true); try { const data = await api<{ items: ContentItem[] }>("/api/internal/content"); setItems(data.items); setError(""); } catch (reason) { setError(message(reason)); } finally { setLoading(false); } }, []);
  useEffect(() => {
    let current = true;
    api<{ items: ContentItem[] }>("/api/internal/content")
      .then((data) => { if (current) { setItems(data.items); setError(""); } })
      .catch((reason) => { if (current) setError(message(reason)); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, []);
  async function seed() { await api("/api/internal/content", { method: "POST", body: JSON.stringify({ action: "seed" }) }); await load(); }
  async function remove(id: number) { if (!window.confirm("Remover este item do site?")) return; await api("/api/internal/content", { method: "POST", body: JSON.stringify({ action: "delete", id }) }); await load(); }
  const visible = items.filter((item) => item.kind === kind);
  return <div className="internal-stack">
    <div className="internal-toolbar"><div className="internal-filters">{(["event", "leader", "devotional"] as ContentKind[]).map((value) => <button type="button" className={kind === value ? "active" : ""} onClick={() => { setKind(value); setEditing(null); }} key={value}>{kindLabels[value]}</button>)}</div><button type="button" className="primary" onClick={() => setEditing(blankItem(kind))}>Adicionar item</button></div>
    {error && <Notice type="error">{error}</Notice>}
    {editing && <ContentForm item={editing} onCancel={() => setEditing(null)} onSaved={async () => { setEditing(null); await load(); }} />}
    {loading ? <Empty>Carregando conteúdo…</Empty> : !items.length ? <section className="internal-empty-action"><h2>Importe o conteúdo atual</h2><p>Isso criará cópias editáveis da agenda, liderança e devocionais que já aparecem no site.</p><button type="button" className="primary" onClick={() => void seed()}>Preparar conteúdo</button></section> : !visible.length ? <Empty>Nenhum item nesta seção. Use “Adicionar item”.</Empty> : <div className="content-admin-list">{visible.map((item) => <article key={item.id} className={!item.active ? "inactive" : ""}><div><span>{item.active ? "Publicado" : "Oculto"}</span><h2>{item.title}</h2><p>{item.subtitle}{item.date ? ` • ${formatShortDate(item.date)}` : ""}</p></div><div><button type="button" onClick={() => setEditing(item)}>Editar</button><button type="button" className="danger" onClick={() => void remove(item.id)}>Excluir</button></div></article>)}</div>}
  </div>;
}

function ContentForm({ item, onCancel, onSaved }: { item: ContentItem; onCancel: () => void; onSaved: () => Promise<void> }) {
  const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const data = new FormData(event.currentTarget);
    const payload = Object.fromEntries(data.entries()) as Record<string, unknown>;
    payload.action = item.id > 0 ? "update" : "create"; payload.id = item.id; payload.kind = item.kind; payload.active = data.get("active") === "on";
    try { await api("/api/internal/content", { method: "POST", body: JSON.stringify(payload) }); await onSaved(); } catch (reason) { setError(message(reason)); } finally { setSaving(false); }
  }
  return <form className="internal-form" onSubmit={submit}><header><div><p>{item.id > 0 ? "Editar" : "Novo item"}</p><h2>{kindLabels[item.kind]}</h2></div><button type="button" onClick={onCancel}>Fechar</button></header>
    {error && <Notice type="error">{error}</Notice>}
    <div className="internal-form-grid"><label>Título<input name="title" required maxLength={160} defaultValue={item.title} /></label><label>{item.kind === "leader" ? "Nome da pessoa" : item.kind === "event" ? "Categoria" : "Referência bíblica"}<input name="subtitle" maxLength={160} defaultValue={item.subtitle} /></label>
    {item.kind !== "leader" && <label>Data<input name="date" type="date" defaultValue={item.date} /></label>}{item.kind === "event" && <><label>Horário<input name="time" type="time" defaultValue={item.time} /></label><label>Local<input name="location" maxLength={180} defaultValue={item.location} /></label></>}
    <label>Ordem<input name="sortOrder" type="number" min="0" max="999" defaultValue={item.sortOrder} /></label><label className="internal-check"><input name="active" type="checkbox" defaultChecked={item.active} /> Publicar no site</label>
    <label className="wide">{item.kind === "devotional" ? "Texto do devocional" : "Descrição"}<textarea name="body" rows={5} maxLength={2000} defaultValue={item.body} /></label></div>
    <footer><button type="button" onClick={onCancel}>Cancelar</button><button type="submit" className="primary" disabled={saving}>{saving ? "Salvando…" : "Salvar alterações"}</button></footer>
  </form>;
}

function UserManager() {
  const [users, setUsers] = useState<AdminUser[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const load = useCallback(async () => { setLoading(true); try { const data = await api<{ users: AdminUser[]; owner: AdminUser }>("/api/internal/users"); setUsers([data.owner, ...data.users]); setError(""); } catch (reason) { setError(message(reason)); } finally { setLoading(false); } }, []);
  useEffect(() => {
    let current = true;
    api<{ users: AdminUser[]; owner: AdminUser }>("/api/internal/users")
      .then((data) => { if (current) { setUsers([data.owner, ...data.users]); setError(""); } })
      .catch((reason) => { if (current) setError(message(reason)); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); try { await api("/api/internal/users", { method: "POST", body: JSON.stringify({ action: "save", email: data.get("email"), name: data.get("name"), role: data.get("role"), active: true }) }); form.reset(); await load(); } catch (reason) { setError(message(reason)); } }
  async function remove(email: string) { if (!window.confirm(`Remover o acesso de ${email}?`)) return; await api("/api/internal/users", { method: "POST", body: JSON.stringify({ action: "delete", email }) }); await load(); }
  return <div className="internal-stack"><section className="role-explainer"><article><strong>Administrador</strong><p>Conteúdo, orações e histórico.</p></article><article><strong>Secretaria</strong><p>Agenda, liderança e devocionais.</p></article><article><strong>Intercessão</strong><p>Somente pedidos de oração.</p></article></section>
    <form className="user-form" onSubmit={submit}><label>Nome<input name="name" required /></label><label>E-mail usado no ChatGPT<input name="email" type="email" required /></label><label>Nível<select name="role"><option value="secretary">Secretaria</option><option value="intercessor">Intercessão</option><option value="admin">Administrador</option></select></label><button type="submit" className="primary">Cadastrar acesso</button></form>
    {error && <Notice type="error">{error}</Notice>}{loading ? <Empty>Carregando acessos…</Empty> : <div className="user-list">{users.map((user) => <article key={user.email}><div className="user-avatar">{(user.name || user.email).slice(0, 2).toUpperCase()}</div><div><strong>{user.name || user.email}</strong><span>{user.email}</span></div><em>{roleLabels[user.role]}</em>{!user.protected && <button type="button" className="danger" onClick={() => void remove(user.email)}>Remover</button>}</article>)}</div>}
  </div>;
}

function AuditManager() {
  const [logs, setLogs] = useState<AuditLog[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  useEffect(() => { api<{ logs: AuditLog[] }>("/api/internal/audit").then((data) => setLogs(data.logs)).catch((reason) => setError(message(reason))).finally(() => setLoading(false)); }, []);
  return <div className="internal-stack">{error && <Notice type="error">{error}</Notice>}{loading ? <Empty>Carregando atividades…</Empty> : !logs.length ? <Empty>Nenhuma atividade registrada.</Empty> : <div className="audit-list">{logs.map((log) => <article key={log.id}><span>{formatDate(log.createdAt)}</span><strong>{log.actorEmail}</strong><p>{actionLabel(log.action)} em {entityLabel(log.entityType)} {log.entityId && `#${log.entityId}`}</p></article>)}</div>}</div>;
}

function Notice({ children, type }: { children: React.ReactNode; type: "error" }) { return <div className={`internal-notice ${type}`} role="alert">{children}</div>; }
function Empty({ children }: { children: React.ReactNode }) { return <div className="internal-empty">{children}</div>; }
function blankItem(kind: ContentKind): ContentItem { return { id: 0, kind, title: "", subtitle: "", body: "", date: "", time: "", location: "", sortOrder: 0, active: true }; }
async function api<T = { ok: boolean }>(url: string, init?: RequestInit): Promise<T> { const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } }); const data = await response.json() as T & { error?: string }; if (!response.ok) throw new Error(data.error || "Não foi possível concluir a operação."); return data; }
function message(error: unknown) { return error instanceof Error ? error.message : "Ocorreu um erro inesperado."; }
function formatDate(value: string) { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value.endsWith("Z") ? value : `${value.replace(" ", "T")}Z`)); }
function formatShortDate(value: string) { const [year, month, day] = value.split("-").map(Number); return new Intl.DateTimeFormat("pt-BR").format(new Date(year, month - 1, day)); }
function actionLabel(action: string) { return ({ create: "Criou", update: "Atualizou", delete: "Excluiu", save: "Salvou", seed: "Preparou", status: "Alterou o status", view_list: "Consultou" } as Record<string, string>)[action] ?? action; }
function entityLabel(entity: string) { return ({ content: "conteúdo", prayer: "pedidos", admin_user: "acesso" } as Record<string, string>)[entity] ?? entity; }
