"use client";

export async function requestJson<T>(url: string, init: RequestInit | undefined, fallback: string, timeoutMs = 15_000): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, cache: "no-store", credentials: "same-origin", signal: controller.signal });
    const data = await response.json().catch(() => ({})) as T & { error?: string };
    if (!response.ok) throw new Error(data.error || fallback);
    return data;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("A conexão demorou demais. Verifique sua internet e tente novamente.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
