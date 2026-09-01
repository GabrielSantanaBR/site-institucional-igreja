import type { Metadata } from "next";
import { PrayerForm } from "../components/ClientWidgets";
export const metadata: Metadata = {
  title: "Pedido de Oração",
  description: "Envie um pedido de oração à equipe de intercessão da PIBRG com cuidado e confidencialidade.",
  alternates: { canonical: "/pedido-de-oracao" },
};
export default function PedidoOracaoPage() { return <main className="prayer-page"><section className="prayer-intro"><div className="container prayer-grid"><div className="prayer-copy"><p className="eyebrow eyebrow-light">Pedido de oração</p><h1>Você não precisa carregar tudo sozinho.</h1><p>Nossa equipe está pronta para orar com respeito, cuidado e confidencialidade. Compartilhe seu pedido no formulário.</p><div className="prayer-promise"><span aria-hidden="true">♡</span><p><strong>Seu pedido será tratado com cuidado.</strong>Nenhuma mensagem será publicada no site.</p></div></div><div className="prayer-form-card"><PrayerForm /></div></div></section></main>; }
