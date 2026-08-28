"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

export function AdminLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/internal/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: data.get("username"), password: data.get("password") }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível entrar.");
      window.location.reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível entrar.");
      setLoading(false);
    }
  }

  return <main className="admin-login-page">
    <section className="admin-login-card" aria-labelledby="admin-login-title">
      <div className="admin-login-brand"><span>PIBRG</span><div><strong>Área administrativa</strong><small>Conteúdo e comunicação</small></div></div>
      <p className="internal-kicker">Acesso reservado</p>
      <h1 id="admin-login-title">Atualize o site com segurança.</h1>
      <p>Entre para publicar agenda, sermões, devocionais, postagens, liderança e fotos.</p>
      <form onSubmit={submit}>
        <label>Usuário<input name="username" autoComplete="username" required maxLength={80} autoFocus /></label>
        <label>Senha<div className="password-field"><input name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required maxLength={160} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? "Ocultar" : "Mostrar"}</button></div></label>
        {error && <div className="admin-login-error" role="alert">{error}</div>}
        <button className="admin-login-submit" type="submit" disabled={loading}>{loading ? "Verificando…" : "Entrar no painel"}</button>
      </form>
      <Link href="/">← Voltar ao site</Link>
      <small className="admin-login-note">Esta página não aparece nos menus públicos nem nos mecanismos de busca.</small>
    </section>
  </main>;
}
