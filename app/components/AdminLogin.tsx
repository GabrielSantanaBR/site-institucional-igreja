"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";

export function AdminLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const submitting = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setLoading(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch("/api/internal/login", {
        method: "POST",
        credentials: "same-origin",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: data.get("username"), password: data.get("password") }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível entrar.");
      window.location.replace("/alteracao-de-dados");
    } catch (reason) {
      setError(reason instanceof DOMException && reason.name === "AbortError"
        ? "A conexão demorou demais. Tente entrar novamente."
        : reason instanceof TypeError ? "Não foi possível conectar ao site. Verifique sua conexão e tente novamente."
        : reason instanceof Error ? reason.message : "Não foi possível entrar.");
    } finally {
      window.clearTimeout(timeout);
      submitting.current = false;
      setLoading(false);
    }
  }

  return <main className="admin-login-page">
    <section className="admin-login-card" aria-labelledby="admin-login-title">
      <div className="admin-login-brand"><span>PIBRG</span><div><strong>Área administrativa</strong><small>Conteúdo e comunicação</small></div></div>
      <p className="internal-kicker">Acesso reservado</p>
      <h1 id="admin-login-title">Atualize o site com segurança.</h1>
      <p>Entre para publicar agenda, sermões, devocionais, postagens, liderança e fotos.</p>
      <form onSubmit={submit} aria-busy={loading}>
        <label>Usuário<input name="username" autoComplete="username" required maxLength={254} autoFocus /></label>
        <label>Senha<div className="password-field"><input name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required maxLength={160} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? "Ocultar" : "Mostrar"}</button></div></label>
        {error && <div className="admin-login-error" role="alert">{error}</div>}
        <button className="admin-login-submit" type="submit" disabled={loading}>{loading ? "Verificando…" : "Entrar no painel"}</button>
      </form>
      <Link href="/">← Voltar ao site</Link>
      <small className="admin-login-note">Esta página não aparece nos menus públicos nem nos mecanismos de busca.</small>
    </section>
  </main>;
}
