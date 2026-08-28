export default function AdminLoading() {
  return (
    <main className="admin-route-loading" aria-live="polite" aria-busy="true">
      <section>
        <span className="admin-loading-mark">PIBRG</span>
        <div>
          <strong>Preparando a área administrativa</strong>
          <p>Carregando permissões e ferramentas de edição…</p>
        </div>
      </section>
    </main>
  );
}
