"use client";

import Link from "next/link";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="admin-route-error">
      <section role="alert">
        <span aria-hidden="true">!</span>
        <p>Área administrativa</p>
        <h1>Não foi possível abrir o painel agora.</h1>
        <p>Nenhuma alteração foi perdida. Verifique sua conexão e tente carregar novamente.</p>
        <div>
          <button type="button" onClick={reset}>Tentar novamente</button>
          <Link href="/">Voltar ao site</Link>
        </div>
      </section>
    </main>
  );
}
