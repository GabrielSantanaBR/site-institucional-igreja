import type { Metadata } from "next";
import { ContactChannelExperience } from "../components/ContactChannelExperience";

export const metadata: Metadata = { title: "Fale Conosco", description: "Converse com a secretaria da PIBRG sobre agenda, visitas, ministérios e informações gerais." };

export default function FaleConoscoPage() {
  return <main className="contact-page">
    <ContactChannelExperience />
    <section className="section contact-options"><div className="container"><div className="section-heading"><p className="eyebrow">Dois canais, o cuidado certo</p><h2>Cada mensagem chega à equipe responsável.</h2></div><div className="contact-option-grid"><article><span>01</span><h3>Fale Conosco</h3><p>Para dúvidas, programação, visitas, ministérios, secretaria e outras informações. A equipe responde pelo próprio bate-papo.</p><strong>Atendimento da secretaria</strong></article><article className="prayer"><span>02</span><h3>Pedido de oração</h3><p>Para compartilhar um pedido confidencial com a equipe de intercessão. Ele não aparece no bate-papo nem é publicado.</p><strong>Recebimento pela intercessão</strong></article></div></div></section>
  </main>;
}
