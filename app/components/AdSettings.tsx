"use client";
import { adFormats, adIsEnabled } from "../../lib/ad-formats";
import type { SiteSettings } from "../../lib/site-settings";
import { GenericAdSample } from "./GenericAds";

export function AdSettings({ settings, onChange }: { settings: SiteSettings; onChange: (key: keyof SiteSettings, value: string) => void }) {
  return <section className="settings-panel"><header><div><p className="settings-kicker">Publicidade de demonstração</p><h2>Anúncios no site</h2></div><span>3 formatos</span></header>
    <div className="ad-settings-intro"><p>Ative os modelos que deseja demonstrar e clique em “Salvar informações gerais”. São apenas exemplos: não exibem anúncios reais nem geram receita.</p><p>Sem rastreadores, vídeos, scripts externos ou pop-ups. Fechar a faixa inferior vale até o fim da sessão do visitante.</p></div>
    <div className="ad-settings-list">{adFormats.map(({ key, id, title, description }) => <div className="ad-settings-item" key={id}>
      <label><input type="checkbox" checked={adIsEnabled(settings[key])} onChange={(event) => onChange(key, String(event.target.checked))} /><strong>{title}</strong><span>{adIsEnabled(settings[key]) ? "Ativo após salvar" : "Desativado"}</span></label>
      <p>{description}</p><GenericAdSample format={id} />
      <input type="hidden" name={key} value={settings[key]} />
    </div>)}</div>
  </section>;
}
