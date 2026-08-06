import type { Metadata } from "next";
import Link from "next/link";
import { requireChatGPTUser, chatGPTSignOutPath } from "../chatgpt-auth";
import { getAdminIdentity } from "../../lib/internal-auth";
import { InternalDashboard } from "../components/InternalDashboard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Gestão interna",
  robots: { index: false, follow: false, nocache: true },
};

export default async function InternalAccessPage() {
  const signedIn = await requireChatGPTUser("/acesso-interno");
  const identity = await getAdminIdentity();

  if (!identity) {
    return <main className="internal-gate">
      <section>
        <span className="internal-lock" aria-hidden="true">×</span>
        <p className="internal-kicker">Área restrita</p>
        <h1>Este usuário não possui acesso.</h1>
        <p>Você entrou como <strong>{signedIn.email}</strong>. Peça ao proprietário do site para cadastrar exatamente este e-mail.</p>
        <div className="internal-gate-actions">
          <Link href={chatGPTSignOutPath("/acesso-interno")}>Entrar com outra conta</Link>
          <Link href="/">Voltar ao site</Link>
        </div>
      </section>
    </main>;
  }

  return <InternalDashboard identity={identity} signOutPath={chatGPTSignOutPath("/")} />;
}
