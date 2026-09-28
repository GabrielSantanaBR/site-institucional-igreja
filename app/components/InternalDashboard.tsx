"use client";
/* eslint-disable @next/next/no-img-element -- prévias locais não devem passar pelo otimizador público */

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import type { AdminIdentity } from "../../lib/internal-auth";
import type { ContentGroup, ContentItem, ContentKind } from "../../lib/site-content";
import type { SiteSettings } from "../../lib/site-settings";
import { ContactInbox } from "./ContactInbox";

type Permissions = { content: boolean; prayers: boolean; contacts: boolean; users: boolean; audit: boolean };
type Prayer = { id: number; name: string; contact: string; message: string; subject: string; status: string; submittedAt: string; updatedAt: string; updatedBy: string | null };
type AdminUser = { id: number; email: string; name: string; role: string; active: boolean; protected?: boolean };
type AuditLog = { id: number; actorEmail: string; action: string; entityType: string; entityId: string; createdAt: string };

const roleLabels: Record<string, string> = { owner: "Proprietário", admin: "Administrador", secretary: "Secretaria", intercessor: "Intercessão" };
const statusLabels: Record<string, string> = { new: "Novo", praying: "Em oração", answered: "Respondido", archived: "Arquivado" };
const contentKinds: ContentKind[] = ["post", "sermon", "event", "devotional", "leader", "gallery"];
const kindLabels: Record<ContentKind, string> = { post: "Postagens", sermon: "Sermões", event: "Agenda", devotional: "Devocionais", leader: "Liderança", gallery: "Galeria" };

function confirmDiscardDraft() {
  return !document.querySelector('[data-unsaved="true"]') || window.confirm("Descartar as alterações que ainda não foram salvas?");
}

export function InternalDashboard({ identity, signOutPath }: { identity: AdminIdentity; signOutPath: string }) {
  const permissions: Permissions = {
    content: ["owner", "admin", "secretary"].includes(identity.role),
    prayers: ["owner", "admin", "intercessor"].includes(identity.role),
    contacts: ["owner", "admin", "secretary"].includes(identity.role),
    users: identity.role === "owner",
    audit: ["owner", "admin"].includes(identity.role),
  };
  const tabs = useMemo(() => [
    ["overview", "Visão geral", true],
    ["contacts", "Fale conosco", permissions.contacts],
    ["prayers", "Pedidos de oração", permissions.prayers],
    ["settings", "Informações gerais", permissions.content],
    ["content", "Conteúdo do site", permissions.content],
    ["users", "Acessos", permissions.users],
    ["audit", "Atividades", permissions.audit],
  ].filter((tab) => tab[2]) as [string, string, boolean][], [permissions.audit, permissions.contacts, permissions.content, permissions.prayers, permissions.users]);
  const [active, setActive] = useState("overview");
  function navigate(tab: string) {
    if (tab === active || !confirmDiscardDraft()) setActive(tab);
  }

  return <main className="internal-app">
    <aside className="internal-sidebar">
      <div className="internal-brand"><span>PIBRG</span><strong>Gestão interna</strong></div>
      <nav aria-label="Seções da gestão">{tabs.map(([key, label]) => <button type="button" className={active === key ? "active" : ""} onClick={() => navigate(key)} key={key}>{label}</button>)}</nav>
      <div className="internal-profile"><span>{identity.name}</span><small>{roleLabels[identity.role]}</small><form action={signOutPath} method="post"><button type="submit">Sair com segurança</button></form></div>
    </aside>
    <section className="internal-main">
      <header className="internal-topbar"><div><p>Área protegida</p><h1>{tabs.find(([key]) => key === active)?.[1]}</h1></div><a href="/" target="_blank" rel="noreferrer">Visualizar site ↗</a></header>
      {active === "overview" && <Overview identity={identity} permissions={permissions} onNavigate={navigate} />}
      {active === "contacts" && <ContactInbox canDelete={["owner", "admin"].includes(identity.role)} />}
      {active === "prayers" && <PrayerManager canDelete={["owner", "admin"].includes(identity.role)} />}
      {active === "settings" && <SettingsManager />}
      {active === "content" && <ContentManager />}
      {active === "users" && <UserManager />}
      {active === "audit" && <AuditManager />}
    </section>
  </main>;
}

function Overview({ identity, permissions, onNavigate }: { identity: AdminIdentity; permissions: Permissions; onNavigate: (tab: string) => void }) {
  const cards = [
    { key: "contacts", title: "Fale conosco", text: "Responda dúvidas gerais da secretaria em conversas organizadas.", allowed: permissions.contacts },
    { key: "prayers", title: "Pedidos de oração", text: "Leia, acompanhe e arquive pedidos confidenciais.", allowed: permissions.prayers },
    { key: "settings", title: "Informações gerais", text: "Atualize apresentação, versículo, endereço e redes sociais.", allowed: permissions.content },
    { key: "content", title: "Conteúdo público", text: "Publique postagens, sermões, agenda, devocionais, liderança e fotos.", allowed: permissions.content },
    { key: "users", title: "Níveis de acesso", text: "Cadastre a secretaria e a equipe de intercessão.", allowed: permissions.users },
    { key: "audit", title: "Histórico de atividades", text: "Acompanhe alterações importantes realizadas no painel.", allowed: permissions.audit },
  ];
  return <div className="internal-stack">
    <section className="internal-welcome"><div><p>Olá, {identity.name.split(" ")[0]}.</p><h2>O site está pronto para ser administrado com segurança.</h2></div><span>{roleLabels[identity.role]}</span></section>
    <div className="internal-card-grid">{cards.map((card) => <button key={card.key} type="button" disabled={!card.allowed} onClick={() => card.allowed && onNavigate(card.key)}><span>{card.allowed ? "Disponível" : "Sem acesso"}</span><h2>{card.title}</h2><p>{card.text}</p><strong>{card.allowed ? "Abrir ferramenta →" : "Protegido pelo seu nível"}</strong></button>)}</div>
    <section className="internal-security-note"><strong>Publicação organizada</strong><p>As alterações ficam salvas no banco, as fotos são reduzidas antes do envio e cada ação importante é registrada no histórico.</p></section>
  </div>;
}

function SettingsManager() {
  const submitting = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [revision, setRevision] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    api<{ settings: SiteSettings; revision: string }>("/api/internal/settings")
      .then((data) => { setSettings(data.settings); setRevision(data.revision); })
      .catch((reason) => setError(message(reason)))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const protectDraft = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    const saveShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (!saving) formRef.current?.requestSubmit();
      }
    };
    window.addEventListener("beforeunload", protectDraft);
    window.addEventListener("keydown", saveShortcut);
    return () => { window.removeEventListener("beforeunload", protectDraft); window.removeEventListener("keydown", saveShortcut); };
  }, [dirty, saving]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true; setSaving(true); setError(""); setSaved(false);
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const result = await api<{ ok: true; revision: string }>("/api/internal/settings", { method: "POST", body: JSON.stringify({ ...payload, revision }) });
      setRevision(result.revision); setDirty(false); setSaved(true);
    }
    catch (reason) { setError(message(reason)); }
    finally { submitting.current = false; setSaving(false); }
  }
  if (loading) return <Empty>Carregando informações do site…</Empty>;
  if (!settings) return <Notice type="error">{error || "Não foi possível abrir as informações gerais."}</Notice>;
  return <form ref={formRef} className="settings-form internal-stack" data-unsaved={dirty} onSubmit={submit} onChange={() => { setDirty(true); setSaved(false); }} aria-busy={saving}>
    <section className="internal-content-intro"><div><p>Página inicial e rodapé</p><h2>Informações gerais</h2></div><span>Alterações globais</span></section>
    {error && <Notice type="error">{error}</Notice>}{saved && <Notice type="success">Informações salvas e publicadas com sucesso.</Notice>}
    <section className="settings-panel"><header><div><p className="settings-kicker">Apresentação</p><h2>Mensagem principal</h2></div><span>Início do site</span></header><div className="settings-grid"><label className="wide">Texto acima do título<input name="heroEyebrow" maxLength={300} defaultValue={settings.heroEyebrow} /></label><label className="wide">Título principal <small>Use uma nova linha para separar as duas frases.</small><textarea name="heroTitle" rows={3} maxLength={300} defaultValue={settings.heroTitle} /></label><label className="wide">Texto de apresentação<textarea name="heroText" rows={4} maxLength={1200} defaultValue={settings.heroText} /></label><label className="wide">Sobre a comunidade<textarea name="welcomeText" rows={4} maxLength={1200} defaultValue={settings.welcomeText} /></label></div></section>
    <section className="settings-panel"><header><div><p className="settings-kicker">Mensagem bíblica</p><h2>Versículo em destaque</h2></div><span>Página inicial</span></header><div className="settings-grid"><label className="wide">Texto do versículo<textarea name="verseText" rows={3} maxLength={300} defaultValue={settings.verseText} /></label><label>Referência<input name="verseReference" maxLength={300} defaultValue={settings.verseReference} /></label></div></section>
    <section className="settings-panel"><header><div><p className="settings-kicker">Localização e canais</p><h2>Contato público</h2></div><span>Início e rodapé</span></header><div className="settings-grid"><label>Endereço<input name="address" maxLength={300} defaultValue={settings.address} /></label><label>Cidade e estado<input name="city" maxLength={300} defaultValue={settings.city} /></label><label>CEP<input name="postalCode" maxLength={300} defaultValue={settings.postalCode} /></label><label>Nome no Instagram<input name="instagramHandle" maxLength={300} defaultValue={settings.instagramHandle} /></label><label className="wide">Link do Instagram<input name="instagramUrl" type="url" maxLength={500} defaultValue={settings.instagramUrl} /></label><label className="wide">Link do Facebook<input name="facebookUrl" type="url" maxLength={500} defaultValue={settings.facebookUrl} /></label></div></section>
    <footer className="settings-actions"><span>{dirty ? "Há alterações aguardando salvamento. Atalho: Ctrl + S." : "As informações exibidas estão salvas."}</span><div><a href="/" target="_blank" rel="noreferrer">Visualizar site ↗</a><button type="submit" className="primary" disabled={saving || !dirty}>{saving ? "Salvando…" : "Salvar informações gerais"}</button></div></footer>
  </form>;
}

function PrayerManager({ canDelete }: { canDelete: boolean }) {
  const [items, setItems] = useState<Prayer[]>([]);
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(0);
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
  async function act(prayer: Prayer, action: string, nextStatus?: string) {
    if (action === "delete" && !window.confirm("Excluir definitivamente este pedido?")) return;
    setBusyId(prayer.id); setError("");
    try {
      const result = await api<{ ok: true; updatedAt?: string }>("/api/internal/prayers", { method: "POST", body: JSON.stringify({ id: prayer.id, action, status: nextStatus, updatedAt: prayer.updatedAt }) });
      setItems((current) => action === "delete" || (status !== "all" && nextStatus !== status)
        ? current.filter((item) => item.id !== prayer.id)
        : current.map((item) => item.id === prayer.id && nextStatus ? { ...item, status: nextStatus, updatedAt: result.updatedAt || item.updatedAt } : item));
    } catch (reason) { setError(message(reason)); }
    finally { setBusyId(0); }
  }
  return <div className="internal-stack">
    <div className="internal-toolbar"><div className="internal-filters">{["all", "new", "praying", "answered", "archived"].map((value) => <button type="button" className={status === value ? "active" : ""} onClick={() => setStatus(value)} key={value}>{value === "all" ? "Todos" : statusLabels[value]}</button>)}</div><button type="button" onClick={() => void load()}>Atualizar</button></div>
    {error && <Notice type="error">{error}</Notice>}
    {loading ? <Empty>Carregando pedidos protegidos…</Empty> : !items.length ? <Empty>Nenhum pedido nesta categoria.</Empty> : <div className="prayer-admin-list">{items.map((prayer) => <article key={prayer.id}>
      <header><div><span className={`status-pill status-${prayer.status}`}>{statusLabels[prayer.status]}</span><small>{formatDate(prayer.submittedAt)}</small></div><strong>{prayer.subject}</strong></header>
      <h2>{prayer.name || "Anônimo"}</h2>{prayer.contact && (contactHref(prayer.contact) ? <a href={contactHref(prayer.contact)}>{prayer.contact}</a> : <span className="prayer-contact">{prayer.contact}</span>)}<p>{prayer.message}</p>
      <footer><select value={prayer.status} onChange={(event) => void act(prayer, "status", event.target.value)} aria-label={`Status do pedido de ${prayer.name}`} disabled={busyId === prayer.id}><option value="new">Novo</option><option value="praying">Em oração</option><option value="answered">Respondido</option><option value="archived">Arquivado</option></select>{canDelete && <button type="button" className="danger" disabled={busyId === prayer.id} onClick={() => void act(prayer, "delete")}>{busyId === prayer.id ? "Aguarde…" : "Excluir"}</button>}</footer>
    </article>)}</div>}
  </div>;
}

function ContentManager() {
  const contentCache = useRef(new Map<ContentKind, ContentItem[]>());
  const [items, setItems] = useState<ContentItem[]>([]);
  const [groups, setGroups] = useState<ContentGroup[]>([]);
  const [groupItems, setGroupItems] = useState<ContentItem[]>([]);
  const [kind, setKind] = useState<ContentKind>("post");
  const [editing, setEditing] = useState<ContentItem | null>(null);
  const [managingGroups, setManagingGroups] = useState(false);
  const [loading, setLoading] = useState(true);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [agendaFocus, setAgendaFocus] = useState("");
  const [query, setQuery] = useState("");
  const supportsGroups = kind === "leader" || kind === "gallery";
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [contentData, groupData] = await Promise.all([
        api<{ items: ContentItem[] }>(`/api/internal/content?kind=${kind}`),
        supportsGroups ? api<{ groups: ContentGroup[] }>("/api/internal/groups") : Promise.resolve(null),
      ]);
      setItems(contentData.items);
      contentCache.current.set(kind, contentData.items);
      if (groupData) setGroups(groupData.groups);
      setError("");
    } catch (reason) { setError(message(reason)); }
    finally { setLoading(false); }
  }, [kind, supportsGroups]);
  useEffect(() => {
    let current = true;
    const cached = contentCache.current.get(kind);
    if (cached) { setItems(cached); setLoading(false); }
    else setLoading(true);
    Promise.all([
      api<{ items: ContentItem[] }>(`/api/internal/content?kind=${kind}`),
      supportsGroups ? api<{ groups: ContentGroup[] }>("/api/internal/groups") : Promise.resolve(null),
    ]).then(([contentData, groupData]) => {
      if (!current) return;
      setItems(contentData.items);
      contentCache.current.set(kind, contentData.items);
      if (groupData) setGroups(groupData.groups);
      setError("");
    }).catch((reason) => { if (current) setError(message(reason)); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [kind, supportsGroups]);
  async function remove(item: ContentItem) {
    if (!window.confirm(`Remover “${item.title}” do site?`)) return;
    setError(""); setSavedMessage("");
    try {
      await api("/api/internal/content", { method: "POST", body: JSON.stringify({ action: "delete", id: item.id, updatedAt: item.updatedAt }) });
      setItems((current) => {
        const next = current.filter((existing) => existing.id !== item.id);
        contentCache.current.set(kind, next);
        return next;
      });
      setSavedMessage("Item removido com segurança.");
    } catch (reason) { setError(message(reason)); }
  }
  function saved(savedItem: ContentItem) {
    setItems((current) => {
      const next = [...current.filter((existing) => existing.id !== savedItem.id), savedItem].sort(compareContent);
      contentCache.current.set(savedItem.kind, next);
      return next;
    });
    if (savedItem.kind === "event") setAgendaFocus(`${savedItem.date}|${savedItem.updatedAt}`);
    setEditing(null); setError("");
    setSavedMessage(savedItem.kind === "event" ? "Evento salvo e publicado na agenda." : "Alteração salva e publicada no site.");
  }
  function changeKind(nextKind: ContentKind) {
    if (nextKind === kind) return;
    if (!confirmDiscardDraft()) return;
    const cached = contentCache.current.get(nextKind);
    setItems(cached ?? []);
    setLoading(!cached);
    setKind(nextKind); setEditing(null); setManagingGroups(false); setSavedMessage(""); setError(""); setQuery("");
  }
  async function toggleGroups() {
    if (!confirmDiscardDraft()) return;
    if (managingGroups) { setManagingGroups(false); return; }
    setManagingGroups(true); setEditing(null); setGroupsLoading(true); setError("");
    try {
      const [leaders, gallery] = await Promise.all([
        api<{ items: ContentItem[] }>("/api/internal/content?kind=leader"),
        api<{ items: ContentItem[] }>("/api/internal/content?kind=gallery"),
      ]);
      setGroupItems([...leaders.items, ...gallery.items]);
    } catch (reason) { setError(message(reason)); }
    finally { setGroupsLoading(false); }
  }
  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
  const visible = normalizedQuery ? items.filter((item) => `${item.title} ${item.subtitle} ${item.body} ${groupName(item.groupId, groups)}`.toLocaleLowerCase("pt-BR").includes(normalizedQuery)) : items;
  return <div className="internal-stack">
    <div className="internal-content-intro"><div><p>Gerenciador do site</p><h2>{kindLabels[kind]}</h2></div><span>{visible.length} {visible.length === 1 ? "item" : "itens"}</span></div>
    <div className="internal-toolbar"><div className="internal-filters">{contentKinds.map((value) => <button type="button" className={kind === value ? "active" : ""} aria-pressed={kind === value} onClick={() => changeKind(value)} key={value}>{kindLabels[value]}</button>)}</div><div className="internal-toolbar-actions"><button type="button" onClick={() => void load()} disabled={loading}>{loading ? "Atualizando…" : "Atualizar seção"}</button>{supportsGroups && <button type="button" onClick={() => void toggleGroups()} disabled={groupsLoading}>{managingGroups ? "Voltar aos itens" : groupsLoading ? "Abrindo categorias…" : "Categorias e capas"}</button>}<button type="button" className="primary" onClick={() => { if (!confirmDiscardDraft()) return; setManagingGroups(false); setSavedMessage(""); setEditing(blankItem(kind)); }}>+ Adicionar</button></div></div>
    {!managingGroups && kind !== "event" && items.length > 5 && <div className="content-list-tools"><label><span className="sr-only">Buscar nesta seção</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Buscar em ${kindLabels[kind].toLocaleLowerCase("pt-BR")}`} /></label><span>{visible.length === items.length ? `${items.length} itens` : `${visible.length} de ${items.length} itens`}</span></div>}
    {error && <Notice type="error">{error}</Notice>}
    {savedMessage && <Notice type="success">{savedMessage} {kind === "event" && <a href="/agenda" target="_blank" rel="noreferrer">Ver agenda no site ↗</a>}</Notice>}
    {managingGroups && (groupsLoading ? <Empty>Carregando categorias, pessoas e fotos…</Empty> : <GroupManager groups={groups} items={groupItems} onChanged={load} />)}
    {!managingGroups && editing && <ContentForm item={editing} groups={groups} onCancel={() => setEditing(null)} onSaved={saved} />}
    {!managingGroups && kind === "event" && (loading ? <Empty>Carregando agenda…</Empty> : <AdminAgendaBoard key={agendaFocus || "agenda"} initialDate={agendaFocus.split("|")[0]} events={visible} onAdd={(date) => { if (!confirmDiscardDraft()) return; setSavedMessage(""); setEditing(blankItem("event", date)); }} onEdit={(item) => { if (!confirmDiscardDraft()) return; setSavedMessage(""); setEditing(item); }} />)}
    {!managingGroups && kind !== "event" && (loading ? <Empty>Carregando conteúdo…</Empty> : !visible.length ? <section className="internal-empty-action"><h2>{items.length ? "Nenhum resultado encontrado" : "Nenhum item cadastrado"}</h2><p>{items.length ? "Tente outro termo de busca." : "Use “Adicionar” para preparar a primeira publicação desta seção. Você pode salvar como oculto antes de colocar no ar."}</p>{!items.length && <button type="button" className="primary" onClick={() => setEditing(blankItem(kind))}>Criar primeiro item</button>}</section> : <div className="content-admin-list">{visible.map((item) => <article key={item.id} className={!item.active ? "inactive" : ""}>{item.imageUrl ? <img src={item.imageUrl} alt="" style={{ objectPosition: item.imagePosition }} /> : <div className="content-admin-placeholder" aria-hidden="true">{kindLabels[item.kind].slice(0, 1)}</div>}<div><span>{item.active ? "Publicado" : "Oculto"}</span><h2>{item.title}</h2><p>{groupName(item.groupId, groups) || item.subtitle}{item.date ? ` • ${formatShortDate(item.date)}` : ""}</p></div><div><button type="button" onClick={() => { if (!confirmDiscardDraft()) return; setSavedMessage(""); setEditing(item); }}>Editar</button><button type="button" className="danger" onClick={() => void remove(item)}>Excluir</button></div></article>)}</div>)}
  </div>;
}

function ContentForm({ item, groups, onCancel, onSaved }: { item: ContentItem; groups: ContentGroup[]; onCancel: () => void; onSaved: (saved: ContentItem) => void }) {
  const [saving, setSaving] = useState(false); const [error, setError] = useState(""); const [imageUrl, setImageUrl] = useState(item.imageUrl);
  const [pendingImage, setPendingImage] = useState<File | null>(null); const [previewUrl, setPreviewUrl] = useState(""); const [imagePosition, setImagePosition] = useState(item.imagePosition || "center");
  const [dirty, setDirty] = useState(false);
  const [publishing, setPublishing] = useState(item.active);
  const submitting = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  useEffect(() => {
    if (!dirty && !pendingImage) return;
    const protectDraft = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", protectDraft);
    return () => window.removeEventListener("beforeunload", protectDraft);
  }, [dirty, pendingImage]);
  useEffect(() => {
    const saveShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (!saving) formRef.current?.requestSubmit();
      }
    };
    window.addEventListener("keydown", saveShortcut);
    return () => window.removeEventListener("keydown", saveShortcut);
  }, [saving]);
  function cancel() {
    if (saving) return;
    if ((dirty || pendingImage) && !window.confirm("Descartar as alterações que ainda não foram salvas?")) return;
    onCancel();
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true; setSaving(true); setError("");
    const data = new FormData(event.currentTarget);
    const payload = Object.fromEntries(data.entries()) as Record<string, unknown>;
    payload.action = item.id > 0 ? "update" : "create"; payload.id = item.id; payload.kind = item.kind; payload.updatedAt = item.updatedAt; payload.active = data.get("active") === "on";
    try {
      payload.imageUrl = pendingImage ? await uploadImage(pendingImage) : imageUrl;
      payload.imagePosition = imagePosition;
      const result = await api<{ ok: true; item: ContentItem }>("/api/internal/content", { method: "POST", body: JSON.stringify(payload) });
      setDirty(false); onSaved(result.item);
    } catch (reason) { setError(message(reason)); } finally { submitting.current = false; setSaving(false); }
  }
  const needsImage = ["post", "sermon", "event", "devotional", "leader", "gallery"].includes(item.kind);
  const needsAuthor = ["post", "sermon", "devotional"].includes(item.kind);
  const needsLink = ["post", "sermon"].includes(item.kind);
  return <form ref={formRef} className={`internal-form content-editor ${item.kind === "event" ? "event-editor" : ""}`} data-unsaved={dirty || Boolean(pendingImage)} onSubmit={submit} onChange={() => setDirty(true)} aria-busy={saving}><header><div><p>{item.id > 0 ? "Editar item" : "Novo item"}</p><h2>{kindLabels[item.kind]}</h2><span>{item.kind === "event" ? "Título e data são obrigatórios. Horário, local, descrição e foto são opcionais." : "Revise as informações e a prévia antes de publicar."}</span></div><div className="editor-state"><em>{saving ? "Gravando no site…" : dirty || pendingImage ? "Alterações não salvas" : item.id ? "Tudo salvo" : "Novo conteúdo"}</em><button type="button" onClick={cancel} disabled={saving}>Fechar</button></div></header>
    {error && <Notice type="error">{error}</Notice>}
    {item.kind === "event" && <div className="event-editor-guide"><span>1</span><div><strong>Dados principais</strong><p>Use a mesma data para cadastrar quantos eventos desejar. Eles serão organizados automaticamente pelo horário.</p></div><span>2</span><div><strong>Publicação automática</strong><p>Ao salvar como publicado, o evento entra no calendário e na fila dos cinco próximos.</p></div></div>}
    <div className="internal-form-grid"><label>{item.kind === "leader" ? "Nome da pessoa" : "Título"}<input name="title" required maxLength={160} defaultValue={item.title} placeholder={titlePlaceholder(item.kind)} /></label><label>{subtitleLabel(item.kind)}<input name="subtitle" maxLength={160} defaultValue={item.subtitle} placeholder={subtitlePlaceholder(item.kind)} /></label>
    {item.kind !== "leader" && <label>Data<input name="date" type="date" required={item.kind === "event"} defaultValue={item.date} /></label>}{item.kind === "event" && <><label>Horário <small>(opcional)</small><input name="time" type="time" defaultValue={item.time} /></label><label>Local<input name="location" maxLength={180} defaultValue={item.location} placeholder="Templo, salão, endereço…" /></label></>}
    {["leader", "gallery"].includes(item.kind) && <label>Categoria ou grupo<select name="groupId" defaultValue={item.groupId ?? ""}><option value="">Sem categoria</option>{groups.filter((group) => group.active || group.id === item.groupId).map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>}
    {needsAuthor && <label>Autor ou pregador<input name="author" maxLength={120} defaultValue={item.author} placeholder="Nome de quem assina a mensagem" /></label>}
    {needsLink && <label className="wide">Link relacionado<input name="linkUrl" type="url" maxLength={500} defaultValue={item.linkUrl} placeholder={item.kind === "sermon" ? "https://youtube.com/…" : "https://… (opcional)"} /></label>}
    {needsImage && <div className="wide"><ImageUploader value={imageUrl} previewUrl={previewUrl} pending={Boolean(pendingImage)} variant={item.kind} position={imagePosition} onPositionChange={(value) => { setImagePosition(value); setDirty(true); }} onSelected={(file, url) => { setPendingImage(file); setPreviewUrl(url); }} onRemove={() => { setPendingImage(null); setPreviewUrl(""); setImageUrl(""); setDirty(true); }} /></div>}
    <label>Ordem<input name="sortOrder" type="number" min="0" max="999" defaultValue={item.sortOrder} /></label><label className="internal-check"><input name="active" type="checkbox" checked={publishing} onChange={(event) => { setPublishing(event.target.checked); setDirty(true); }} /> Publicar no site</label>
    <label className="wide">{bodyLabel(item.kind)}<textarea name="body" rows={7} maxLength={2000} defaultValue={item.body} placeholder="Escreva o conteúdo que será exibido no site." /></label></div>
    <footer><span>{dirty || pendingImage ? "Há mudanças aguardando salvamento. Atalho: Ctrl + S." : "Nenhuma alteração pendente."}</span><div><button type="button" onClick={cancel} disabled={saving}>Cancelar</button><button type="submit" className="primary" disabled={saving}>{saving ? "Salvando com segurança…" : publishing ? "Salvar e publicar" : "Salvar como oculto"}</button></div></footer>
  </form>;
}

function ImageUploader({ value, previewUrl, pending, variant, position, onPositionChange, onSelected, onRemove }: { value: string; previewUrl: string; pending: boolean; variant: ContentKind | "group"; position: string; onPositionChange: (value: string) => void; onSelected: (file: File, url: string) => void; onRemove: () => void }) {
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState("");
  async function select(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (!selected) return;
    setPreparing(true); setError("");
    try {
      const optimized = await optimizeImage(selected);
      onSelected(optimized, URL.createObjectURL(optimized));
    } catch (reason) { setError(message(reason)); }
    finally { setPreparing(false); event.target.value = ""; }
  }
  const source = previewUrl || value;
  return <section className="media-uploader"><div><strong>Imagem {variant === "group" ? "de capa" : "do conteúdo"}</strong><p>Escolha a foto e confira abaixo uma prévia do corte responsivo. Ela só será enviada quando você salvar.</p></div>{pending && <span className="media-pending">Pronta para salvar</span>}<label className="media-upload-button">{preparing ? "Preparando prévia…" : source ? "Trocar imagem" : "Selecionar imagem"}<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => void select(event)} disabled={preparing} /></label>{source && <div className={`media-preview media-preview-${variant}`}><span>Prévia no site</span><img src={source} alt="Prévia de como a imagem aparecerá no site" style={{ objectPosition: position }} /><button type="button" onClick={onRemove}>Remover</button></div>}<label className="media-position">Enquadramento<select value={position} onChange={(event) => onPositionChange(event.target.value)}><option value="top">Mostrar mais o topo</option><option value="center">Centralizar</option><option value="bottom">Mostrar mais a parte de baixo</option></select></label>{error && <span className="media-error" role="alert">{error}</span>}</section>;
}

async function uploadImage(file: File) {
  const form = new FormData();
  form.append("file", file, "imagem.webp");
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch("/api/internal/media", { method: "POST", body: form, signal: controller.signal, credentials: "same-origin" });
    const result = await response.json().catch(() => ({})) as { url?: string; error?: string };
    if (!response.ok || !result.url) throw new Error(result.error || "Não foi possível enviar a imagem.");
    return result.url;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new Error("O envio da foto demorou demais. Verifique sua conexão e tente novamente.");
    throw error;
  } finally { window.clearTimeout(timeout); }
}

async function optimizeImage(file: File) {
  if (file.size > 12 * 1024 * 1024) throw new Error("Escolha uma imagem de até 12 MB.");
  const bitmap = await createImageBitmap(file);
  let scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  let quality = 0.82;
  let blob: Blob | null = null;
  const canvas = document.createElement("canvas");
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await yieldToBrowser();
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) { bitmap.close(); throw new Error("Seu navegador não conseguiu preparar a imagem."); }
    context.drawImage(bitmap, 0, 0, width, height);
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    if (blob && (blob.size <= 900 * 1024 || attempt === 3)) break;
    scale *= 0.84; quality -= 0.07;
  }
  bitmap.close();
  if (!blob) throw new Error("Não foi possível otimizar a imagem.");
  return new File([blob], "imagem.webp", { type: "image/webp" });
}

function yieldToBrowser() {
  return new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
}

function GroupManager({ groups, items, onChanged }: { groups: ContentGroup[]; items: ContentItem[]; onChanged: () => Promise<void> }) {
  const [editing, setEditing] = useState<ContentGroup | null>(null);
  const [error, setError] = useState("");
  async function remove(group: ContentGroup) {
    if (!window.confirm(`Excluir a categoria “${group.name}”?`)) return;
    try {
      await api("/api/internal/groups", { method: "POST", body: JSON.stringify({ action: "delete", id: group.id, updatedAt: group.updatedAt }) });
      await onChanged();
    } catch (reason) { setError(message(reason)); }
  }
  return <section className="group-manager internal-stack">
    <div className="group-manager-head"><div><p className="settings-kicker">Categorias compartilhadas</p><h2>Organize liderança e galeria</h2><p>Crie grupos como “Ministério Pastoral”. A capa pode ser uma foto própria ou, se ficar vazia, a primeira foto publicada no grupo.</p></div><button type="button" className="primary" onClick={() => setEditing(blankGroup())}>+ Nova categoria</button></div>
    {error && <Notice type="error">{error}</Notice>}
    {editing && <GroupForm group={editing} onCancel={() => setEditing(null)} onSaved={async () => { setEditing(null); await onChanged(); }} />}
    {!groups.length ? <Empty>Nenhuma categoria criada. Comece pelo Ministério Pastoral ou pelo primeiro álbum da galeria.</Empty> : <div className="group-admin-grid">{groups.map((group) => {
      const fallback = items.find((item) => item.groupId === group.id && item.imageUrl);
      const cover = group.coverImageUrl || fallback?.imageUrl || "";
      const position = group.coverImageUrl ? group.coverImagePosition : fallback?.imagePosition || "center";
      const count = items.filter((item) => item.groupId === group.id).length;
      return <article key={group.id} className={!group.active ? "inactive" : ""}>{cover ? <img src={cover} alt="" style={{ objectPosition: position }} /> : <div className="group-cover-placeholder">PIBRG</div>}<div><span>{group.active ? "Visível" : "Oculta"} • {count} {count === 1 ? "item" : "itens"}</span><h3>{group.name}</h3><p>{group.description || "Sem descrição. A primeira foto do grupo será usada como capa."}</p><footer><button type="button" onClick={() => setEditing(group)}>Editar</button><button type="button" className="danger" onClick={() => void remove(group)}>Excluir</button></footer></div></article>;
    })}</div>}
  </section>;
}

function GroupForm({ group, onCancel, onSaved }: { group: ContentGroup; onCancel: () => void; onSaved: () => Promise<void> }) {
  const submitting = useRef(false);
  const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState(group.coverImageUrl); const [pendingImage, setPendingImage] = useState<File | null>(null); const [previewUrl, setPreviewUrl] = useState(""); const [position, setPosition] = useState(group.coverImagePosition || "center");
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true; setSaving(true); setError("");
    const data = new FormData(event.currentTarget);
    const payload = Object.fromEntries(data.entries()) as Record<string, unknown>;
    payload.action = group.id > 0 ? "update" : "create"; payload.id = group.id; payload.updatedAt = group.updatedAt; payload.active = data.get("active") === "on";
    try {
      payload.coverImageUrl = pendingImage ? await uploadImage(pendingImage) : coverImageUrl;
      payload.coverImagePosition = position;
      await api("/api/internal/groups", { method: "POST", body: JSON.stringify(payload) });
      await onSaved();
    } catch (reason) { setError(message(reason)); }
    finally { submitting.current = false; setSaving(false); }
  }
  return <form className="internal-form group-form" onSubmit={submit}><header><div><p>{group.id ? "Editar categoria" : "Nova categoria"}</p><h2>Grupo de pessoas e fotos</h2></div><button type="button" onClick={onCancel}>Fechar</button></header>{error && <Notice type="error">{error}</Notice>}<div className="internal-form-grid"><label>Nome da categoria<input name="name" required maxLength={100} defaultValue={group.name} placeholder="Ex.: Ministério Pastoral" /></label><label>Ordem de exibição<input name="sortOrder" type="number" min="0" max="999" defaultValue={group.sortOrder} /></label><label className="internal-check"><input name="active" type="checkbox" defaultChecked={group.active} /> Mostrar no site</label><label className="wide">Descrição<textarea name="description" rows={4} maxLength={600} defaultValue={group.description} placeholder="Apresente brevemente este ministério, equipe ou álbum." /></label><div className="wide"><ImageUploader value={coverImageUrl} previewUrl={previewUrl} pending={Boolean(pendingImage)} variant="group" position={position} onPositionChange={setPosition} onSelected={(file, url) => { setPendingImage(file); setPreviewUrl(url); }} onRemove={() => { setPendingImage(null); setPreviewUrl(""); setCoverImageUrl(""); }} /></div></div><footer><button type="button" onClick={onCancel}>Cancelar</button><button type="submit" className="primary" disabled={saving}>{saving ? "Salvando…" : "Salvar categoria"}</button></footer></form>;
}

function AdminAgendaBoard({ events, initialDate, onAdd, onEdit }: { events: ContentItem[]; initialDate?: string; onAdd: (date: string) => void; onEdit: (item: ContentItem) => void }) {
  const todayValue = todayKey();
  const firstDate = initialDate || events.map((event) => event.date).filter((date) => date >= todayValue).sort()[0] || todayValue;
  const [month, setMonth] = useState(() => monthStart(firstDate));
  const [selectedDate, setSelectedDate] = useState(firstDate);
  const cells = useMemo(() => calendarCells(month), [month]);
  const today = useMemo(() => todayKey(), []);
  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, ContentItem[]>();
    for (const event of events) {
      const day = grouped.get(event.date) ?? [];
      day.push(event); grouped.set(event.date, day);
    }
    for (const day of grouped.values()) day.sort(compareEvents);
    return grouped;
  }, [events]);
  const selectedEvents = eventsByDate.get(selectedDate) ?? [];
  return <section className="admin-agenda"><header><div><p className="settings-kicker">Agenda visual</p><h2>{monthTitle(month)}</h2><span>Clique em um dia para ver ou adicionar vários eventos.</span></div><div><button type="button" aria-label="Mês anterior" onClick={() => setMonth(moveMonth(month, -1))}>←</button><button type="button" onClick={() => { const current = todayKey(); setMonth(monthStart(current)); setSelectedDate(current); }}>Hoje</button><button type="button" aria-label="Próximo mês" onClick={() => setMonth(moveMonth(month, 1))}>→</button></div></header><div className="admin-agenda-layout"><div className="admin-calendar"><div className="admin-calendar-labels">{["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => <span key={day}>{day}</span>)}</div><div className="admin-calendar-days">{cells.map((cell) => { const dayEvents = eventsByDate.get(cell.key) ?? []; return <button type="button" key={cell.key} className={`${cell.current ? "" : "outside"} ${dayEvents.length ? "has-events" : ""} ${cell.key === selectedDate ? "selected" : ""} ${cell.key === today ? "today" : ""}`} aria-label={`${formatLongDate(cell.key)}${dayEvents.length ? `, ${dayEvents.length} ${dayEvents.length === 1 ? "evento" : "eventos"}` : ", sem eventos"}`} onClick={() => setSelectedDate(cell.key)}><strong>{Number(cell.key.slice(8, 10))}</strong><b className="admin-event-count" aria-hidden="true">{dayEvents.length}</b><span>{dayEvents.slice(0, 3).map((event) => <i key={event.id}>{event.time || "Dia todo"} {event.title}</i>)}{dayEvents.length > 3 && <em>+{dayEvents.length - 3}</em>}</span></button>; })}</div></div><aside className="admin-day-panel"><p>{formatLongDate(selectedDate)}</p><h3>{selectedEvents.length ? `${selectedEvents.length} ${selectedEvents.length === 1 ? "evento" : "eventos"}` : "Dia livre"}</h3><button type="button" className="primary" onClick={() => onAdd(selectedDate)}>+ Evento neste dia</button><div>{selectedEvents.map((event) => <button type="button" className="admin-day-event" key={event.id} onClick={() => onEdit(event)}><span>{event.time || "Sem horário"}</span><strong>{event.title}</strong><small>{event.location || "Local não informado"}</small></button>)}</div></aside></div></section>;
}

function UserManager() {
  const submitting = useRef(false);
  const [users, setUsers] = useState<AdminUser[]>([]); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [busyEmail, setBusyEmail] = useState(""); const [error, setError] = useState(""); const [editing, setEditing] = useState<AdminUser | null>(null);
  const load = useCallback(async () => { setLoading(true); try { const data = await api<{ users: AdminUser[]; owner: AdminUser }>("/api/internal/users"); setUsers([data.owner, ...data.users]); setError(""); } catch (reason) { setError(message(reason)); } finally { setLoading(false); } }, []);
  useEffect(() => {
    let current = true;
    api<{ users: AdminUser[]; owner: AdminUser }>("/api/internal/users")
      .then((data) => { if (current) { setUsers([data.owner, ...data.users]); setError(""); } })
      .catch((reason) => { if (current) setError(message(reason)); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (submitting.current) return; submitting.current = true; setSaving(true); setError(""); const form = event.currentTarget; const data = new FormData(form); try { await api("/api/internal/users", { method: "POST", body: JSON.stringify({ action: "save", email: data.get("email"), name: data.get("name"), role: data.get("role"), active: data.get("active") === "on" }) }); form.reset(); setEditing(null); await load(); } catch (reason) { setError(message(reason)); } finally { submitting.current = false; setSaving(false); } }
  async function remove(email: string) { if (!window.confirm(`Remover o acesso de ${email}?`)) return; setBusyEmail(email); setError(""); try { await api("/api/internal/users", { method: "POST", body: JSON.stringify({ action: "delete", email }) }); setUsers((current) => current.filter((user) => user.email !== email)); } catch (reason) { setError(message(reason)); } finally { setBusyEmail(""); } }
  return <div className="internal-stack"><section className="role-explainer"><article><strong>Administrador</strong><p>Conteúdo, Fale Conosco, orações e histórico.</p></article><article><strong>Secretaria</strong><p>Conteúdo do site e atendimento do Fale Conosco.</p></article><article><strong>Intercessão</strong><p>Somente pedidos de oração.</p></article></section>
    <form key={editing?.email || "new"} className="user-form" onSubmit={submit}><label>Nome<input name="name" minLength={2} maxLength={120} defaultValue={editing?.name || ""} required /></label><label>E-mail usado no ChatGPT<input name="email" type="email" maxLength={254} defaultValue={editing?.email || ""} readOnly={Boolean(editing)} required /></label><label>Nível<select name="role" defaultValue={editing?.role || "secretary"}><option value="secretary">Secretaria</option><option value="intercessor">Intercessão</option><option value="admin">Administrador</option></select></label><label className="user-active"><input name="active" type="checkbox" defaultChecked={editing ? editing.active : true} /> Acesso ativo</label><div className="user-form-actions"><button type="submit" className="primary" disabled={saving}>{saving ? "Salvando…" : editing ? "Salvar acesso" : "Cadastrar acesso"}</button>{editing && <button type="button" onClick={() => setEditing(null)}>Cancelar</button>}</div></form>
    {error && <Notice type="error">{error}</Notice>}{loading ? <Empty>Carregando acessos…</Empty> : <div className="user-list">{users.map((user) => <article key={user.email}><div className="user-avatar">{(user.name || user.email).slice(0, 2).toUpperCase()}</div><div><strong>{user.name || user.email}</strong><span>{user.email}</span></div><em>{user.active ? roleLabels[user.role] : "Acesso desativado"}</em>{!user.protected && <div className="user-row-actions"><button type="button" onClick={() => setEditing(user)}>Editar</button><button type="button" className="danger" disabled={busyEmail === user.email} onClick={() => void remove(user.email)}>{busyEmail === user.email ? "Removendo…" : "Remover"}</button></div>}</article>)}</div>}
  </div>;
}

function AuditManager() {
  const [logs, setLogs] = useState<AuditLog[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  useEffect(() => { api<{ logs: AuditLog[] }>("/api/internal/audit").then((data) => setLogs(data.logs)).catch((reason) => setError(message(reason))).finally(() => setLoading(false)); }, []);
  return <div className="internal-stack">{error && <Notice type="error">{error}</Notice>}{loading ? <Empty>Carregando atividades…</Empty> : !logs.length ? <Empty>Nenhuma atividade registrada.</Empty> : <div className="audit-list">{logs.map((log) => <article key={log.id}><span>{formatDate(log.createdAt)}</span><strong>{log.actorEmail}</strong><p>{actionLabel(log.action)} em {entityLabel(log.entityType)} {log.entityId && `#${log.entityId}`}</p></article>)}</div>}</div>;
}

function Notice({ children, type }: { children: React.ReactNode; type: "error" | "success" }) { return <div className={`internal-notice ${type}`} role={type === "error" ? "alert" : "status"}>{children}</div>; }
function Empty({ children }: { children: React.ReactNode }) { return <div className="internal-empty">{children}</div>; }
function blankItem(kind: ContentKind, date = ""): ContentItem { return { id: 0, kind, title: "", subtitle: "", body: "", date, time: "", location: "", imageUrl: "", linkUrl: "", author: "", groupId: null, imagePosition: "center", sortOrder: 0, active: true, updatedAt: "" }; }
function blankGroup(): ContentGroup { return { id: 0, name: "", description: "", coverImageUrl: "", coverImagePosition: "center", sortOrder: 0, active: true, updatedAt: "" }; }
function groupName(id: number | null, groups: ContentGroup[]) { return groups.find((group) => group.id === id)?.name || ""; }
async function api<T = { ok: boolean }>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, { ...init, cache: "no-store", credentials: "same-origin", signal: controller.signal, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
    const data = await response.json().catch(() => ({})) as T & { error?: string };
    if (!response.ok) throw new Error(data.error || "Não foi possível concluir a operação.");
    return data;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new Error("A operação demorou demais. Verifique sua conexão e tente novamente.");
    throw error;
  } finally { window.clearTimeout(timeout); }
}
function message(error: unknown) { return error instanceof Error ? error.message : "Ocorreu um erro inesperado."; }
function contactHref(value: string) {
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return `mailto:${value}`;
  const phone = value.replace(/[^\d+]/g, "");
  return phone.replace(/\D/g, "").length >= 8 ? `tel:${phone}` : "";
}
function formatDate(value: string) { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value.endsWith("Z") ? value : `${value.replace(" ", "T")}Z`)); }
function formatShortDate(value: string) { const [year, month, day] = value.split("-").map(Number); return new Intl.DateTimeFormat("pt-BR").format(new Date(year, month - 1, day)); }
function actionLabel(action: string) { return ({ create: "Criou", update: "Atualizou", delete: "Excluiu", upload: "Enviou", save: "Salvou", status: "Alterou o status", view_list: "Consultou" } as Record<string, string>)[action] ?? action; }
function entityLabel(entity: string) { return ({ content: "conteúdo", content_group: "categoria", settings: "informações gerais", media: "imagem", prayer: "pedidos", contact: "conversa", admin_user: "acesso" } as Record<string, string>)[entity] ?? entity; }
function subtitleLabel(kind: ContentKind) { return ({ post: "Categoria", sermon: "Tema ou passagem", event: "Categoria", devotional: "Referência bíblica", leader: "Cargo ou ministério", gallery: "Álbum ou categoria" } as Record<ContentKind, string>)[kind]; }
function subtitlePlaceholder(kind: ContentKind) { return ({ post: "Notícia, aviso, evento…", sermon: "João 3:16", event: "Culto, encontro, ação social…", devotional: "Salmos 23:1", leader: "Pastor, líder de jovens…", gallery: "Cultos, comunhão, serviço…" } as Record<ContentKind, string>)[kind]; }
function titlePlaceholder(kind: ContentKind) { return ({ post: "Título da publicação", sermon: "Título da mensagem", event: "Nome do evento", devotional: "Título do devocional", leader: "Nome completo", gallery: "Legenda principal da foto" } as Record<ContentKind, string>)[kind]; }
function bodyLabel(kind: ContentKind) { return ({ post: "Texto da postagem", sermon: "Resumo do sermão", event: "Descrição e orientações", devotional: "Texto do devocional", leader: "Apresentação breve", gallery: "Legenda ou descrição da foto" } as Record<ContentKind, string>)[kind]; }

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function monthStart(dateKey: string) { return `${dateKey.slice(0, 7)}-01`; }
function moveMonth(monthKey: string, amount: number) {
  const date = new Date(`${monthKey}T12:00:00Z`); date.setUTCMonth(date.getUTCMonth() + amount); return date.toISOString().slice(0, 7) + "-01";
}
function monthTitle(monthKey: string) { return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${monthKey}T12:00:00Z`)); }
function calendarCells(monthKey: string) {
  const first = new Date(`${monthKey}T12:00:00Z`); const start = new Date(first); start.setUTCDate(1 - first.getUTCDay());
  return Array.from({ length: 42 }, (_, index) => { const date = new Date(start); date.setUTCDate(start.getUTCDate() + index); const key = date.toISOString().slice(0, 10); return { key, current: key.slice(0, 7) === monthKey.slice(0, 7) }; });
}
function compareEvents(left: ContentItem, right: ContentItem) { return `${left.date}T${left.time || "23:59"}`.localeCompare(`${right.date}T${right.time || "23:59"}`) || left.sortOrder - right.sortOrder; }
function compareContent(left: ContentItem, right: ContentItem) {
  if (left.kind === "event" && right.kind === "event") return compareEvents(left, right);
  const manualOrder = left.sortOrder - right.sortOrder;
  if (manualOrder) return manualOrder;
  if (left.kind === right.kind && ["post", "sermon", "devotional"].includes(left.kind)) return right.date.localeCompare(left.date) || right.id - left.id;
  return left.id - right.id;
}
function formatLongDate(value: string) { return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`)); }
