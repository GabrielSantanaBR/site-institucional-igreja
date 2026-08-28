"use client";

import { useState } from "react";
import { ContactChat } from "./ContactChat";
import { PrayerForm } from "./ClientWidgets";

type Channel = "contact" | "prayer";

const channelContent = {
  contact: {
    eyebrow: "Central de contato",
    title: <>Estamos aqui<br />para ouvir você.</>,
    description: "Converse com a secretaria sobre agenda, visitas, ministérios e informações gerais. A resposta aparecerá no mesmo dispositivo.",
    badges: ["Dados protegidos", "Resposta no mesmo dispositivo", "Canal da secretaria"],
  },
  prayer: {
    eyebrow: "Canal de intercessão",
    title: <>Podemos orar<br />com você.</>,
    description: "Compartilhe seu pedido com a equipe de intercessão. Ele ficará em uma área confidencial, separada das conversas gerais.",
    badges: ["Recebimento confidencial", "Nada será publicado", "Equipe autorizada"],
  },
} as const;

export function ContactChannelExperience() {
  const [channel, setChannel] = useState<Channel>("contact");
  const content = channelContent[channel];
  return <section className={`contact-page-hero contact-channel-hero is-${channel}`}>
    <div className="container contact-channel-shell">
      <div className="contact-channel-switch" role="tablist" aria-label="Escolha o canal de atendimento">
        <button type="button" role="tab" aria-selected={channel === "contact"} aria-controls="contact-channel-panel" id="contact-channel-tab" onClick={() => setChannel("contact")}><span aria-hidden="true">✦</span> Fale Conosco</button>
        <button type="button" role="tab" aria-selected={channel === "prayer"} aria-controls="prayer-channel-panel" id="prayer-channel-tab" onClick={() => setChannel("prayer")}><span aria-hidden="true">♡</span> Pedido de Oração</button>
      </div>
      <div className="contact-page-intro">
        <div className="contact-channel-copy" key={`copy-${channel}`}>
          <p className="eyebrow">{content.eyebrow}</p>
          <h1>{content.title}</h1>
          <p>{content.description}</p>
          <div className="contact-trust-row">{content.badges.map((badge) => <span key={badge}>{badge}</span>)}</div>
          <div className="contact-channel-separation"><span aria-hidden="true">i</span><p><strong>Os canais continuam separados.</strong> {channel === "contact" ? "Esta mensagem vai para a secretaria, não para a intercessão." : "Este pedido vai para a intercessão, não para a caixa de mensagens gerais."}</p></div>
        </div>
        <div className="contact-page-chat contact-channel-stage" key={`form-${channel}`} role="tabpanel" id={`${channel}-channel-panel`} aria-labelledby={`${channel}-channel-tab`}>
          {channel === "contact" ? <ContactChat /> : <div className="contact-prayer-inline">
            <header><div><span className="contact-prayer-heart" aria-hidden="true">♡</span><small>Pedido de oração</small><h2>Como podemos orar?</h2></div><p>Envie com liberdade. Seu pedido não aparecerá no bate-papo nem será publicado.</p></header>
            <div className="contact-prayer-form"><PrayerForm /></div>
          </div>}
        </div>
      </div>
      <p className="contact-switch-hint" aria-live="polite">Canal ativo: <strong>{channel === "contact" ? "Fale Conosco" : "Pedido de Oração"}</strong></p>
    </div>
  </section>;
}
