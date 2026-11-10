"use client";
import { useEffect, useState } from "react";
import type { AnalyticsReport, AnalyticsRow } from "../../lib/analytics-contract";

const format = (value: number) => new Intl.NumberFormat("pt-BR").format(value);
async function responseData<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({})) as { error?: string };
  if (response.status === 401) window.dispatchEvent(new Event("pibrg-session-expired"));
  if (!response.ok) throw Error(data.error || "Não foi possível carregar as estatísticas.");
  return data as T;
}
export function AnalyticsDashboard() {
  const [days, setDays] = useState(30), [reload, setReload] = useState(0);
  const [result, setResult] = useState<{ key: string; data: AnalyticsReport | null; error: string }>({ key: "", data: null, error: "" });
  const [saving, setSaving] = useState(false), [saveError, setSaveError] = useState("");
  const key = `${days}-${reload}`;
  const loading = result.key !== key;
  const data = loading ? null : result.data;
  const error = saveError || (loading ? "" : result.error);
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 20_000);
    let current = true;
    void fetch(`/api/internal/analytics?days=${days}`, { cache: "no-store", credentials: "same-origin", signal: controller.signal })
      .then(response => responseData<AnalyticsReport>(response)).then(data => { if (current) setResult({ key, data, error: "" }); })
      .catch(reason => { if (current) setResult({ key, data: null, error: reason instanceof DOMException && reason.name === "AbortError" ? "A consulta demorou demais. Tente atualizar os dados." : reason instanceof Error ? reason.message : "Falha na consulta." }); })
      .finally(() => { window.clearTimeout(timer); });
    return () => { current = false; controller.abort(); window.clearTimeout(timer); };
  }, [days, reload, key]);
  async function toggle() {
    if (!data || saving) return;
    setSaving(true); setSaveError("");
    const controller = new AbortController(), timer = window.setTimeout(() => controller.abort(), 20_000);
    try {
      const result = await responseData<{ enabled: boolean; revision: string }>(await fetch("/api/internal/analytics", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ enabled: !data.enabled, revision: data.revision }), signal: controller.signal }));
      setResult(current => current.data ? { ...current, data: { ...current.data, enabled: result.enabled, revision: result.revision } } : current);
    } catch (reason) { setSaveError(reason instanceof DOMException && reason.name === "AbortError" ? "A alteração demorou demais. Atualize para confirmar o estado da coleta." : reason instanceof Error ? reason.message : "Não foi possível alterar a coleta."); }
    finally { window.clearTimeout(timer); setSaving(false); }
  }
  return <div className="internal-stack analytics-dashboard">
    <section className="internal-content-intro"><div><p>Uso do site público</p><h2>Estatísticas</h2></div><span>Dados agregados</span></section>
    <div className="analytics-toolbar"><label>Período<select value={days} disabled={loading || saving} onChange={event => { setSaveError(""); setDays(Number(event.target.value)); }}><option value={7}>Últimos 7 dias</option><option value={30}>Últimos 30 dias</option><option value={90}>Últimos 90 dias</option></select></label><button type="button" disabled={loading || saving} onClick={() => { setSaveError(""); setReload(value => value + 1); }}>Atualizar dados</button>{data && <button type="button" className={data.enabled ? "analytics-enabled" : ""} disabled={loading || saving} aria-pressed={data.enabled} onClick={() => void toggle()}>{saving ? "Salvando…" : data.enabled ? "Pausar coleta" : "Ativar coleta"}</button>}</div>
    {error && <div className="internal-notice error" role="alert">{error}</div>}
    {loading ? <div className="internal-empty" role="status">Carregando estatísticas…</div> : data && <>
      <div className="analytics-collection" role="status"><strong>{data.enabled ? "Coleta ativa" : "Coleta pausada"}</strong><span>{data.enabled ? "Novas páginas carregadas podem enviar contagens de uso." : "Novos eventos não são armazenados. O histórico continua disponível."} Retenção de {data.retentionDays} dias, no horário de Brasília.</span></div>
      <div className="analytics-metrics">{[["Páginas vistas", data.totals.views], ["Cliques", data.totals.clicks], ["Exibições de anúncios", data.totals.adImpressions], ["Erros observados", data.totals.errors]].map(([label, value]) => <article key={label}><span>{label}</span><strong>{format(Number(value))}</strong></article>)}</div>
      {!data.totals.views && <div className="internal-empty">Ainda não há visualizações neste período. Os dados começam a aparecer a partir da ativação; visitas com sessão administrativa e preferências de não rastrear são excluídas.</div>}
      <section className="analytics-panel"><h3>Visualizações por dia</h3><p>Contagem de páginas carregadas; não representa pessoas únicas.</p><div className="analytics-chart" role="img" aria-label={data.daily.map(row => `${row.label}: ${row.total}`).join("; ")}>{data.daily.map(row => <div key={row.label} title={`${row.label}: ${format(row.total)}`}><span style={{ height: `${row.total ? Math.max(2, row.total / Math.max(1, ...data.daily.map(item => item.total)) * 100) : 0}%` }} /><small>{row.label.slice(8)}</small></div>)}</div><p>{dateLabel(data.start)} a {dateLabel(data.end)}</p></section>
      <div className="analytics-grid"><Ranking title="Páginas mais vistas" rows={data.pages} /><Ranking title="Caminhos entre páginas" rows={data.flows} /><Ranking title="Dispositivos" rows={data.devices} /><Ranking title="Origem dos acessos" rows={data.sources} /><Ranking title="Cliques por destino e página" rows={data.clicks} /><Ranking title="Horários de acesso" rows={data.hourly.filter(row => row.total > 0)} /><Ranking title="Erros observados" rows={data.errors} /></div>
      <section className="analytics-panel"><h3>Anúncios genéricos</h3><p>Uma exibição é contada quando pelo menos metade do anúncio fica visível. Cliques indicam interação com o exemplo; não representam receita.</p><div className="analytics-table-wrap"><table><thead><tr><th>Formato</th><th>Exibições</th><th>Interações</th><th>Fechamentos</th></tr></thead><tbody>{data.ads.map(ad => <tr key={ad.label}><th scope="row">{ad.label}</th><td>{format(ad.impressions)}</td><td>{format(ad.clicks)}</td><td>{format(ad.closes)}</td></tr>)}</tbody></table></div></section>
      <section className="internal-security-note"><strong>Privacidade por padrão</strong><p>Sem nomes, e-mails, IPs completos, cookies de identificação ou gravações de sessão. Conversas, pedidos de oração e administração ficam fora da coleta. Dispositivo e origem são categorias aproximadas; bloqueadores podem reduzir as contagens. <a href="/privacidade" target="_blank" rel="noreferrer">Ver informações de privacidade ↗</a></p></section>
    </>}
  </div>;
}
function Ranking({ title, rows }: { title: string; rows: AnalyticsRow[] }) {
  const max = Math.max(1, ...rows.map(row => row.total));
  return <section className="analytics-panel"><h3>{title}</h3>{rows.length ? <ol className="analytics-ranking">{rows.map(row => <li key={row.label}><div><span>{row.label}</span><strong>{format(row.total)}</strong></div><div className="analytics-track" aria-hidden="true"><span style={{ width: `${row.total / max * 100}%` }} /></div></li>)}</ol> : <p>Nenhum registro neste período.</p>}</section>;
}
function dateLabel(value: string) { return value.split("-").reverse().join("/"); }
