import { AsyncLocalStorage } from "node:async_hooks";

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run<T = unknown>(): Promise<D1Result<T>>;
}

export interface D1Result<T = unknown> {
  success: true;
  results: T[];
  meta: {
    changes: number;
    last_row_id: number;
    [key: string]: unknown;
  };
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
}

export interface R2ObjectBody {
  body: ReadableStream;
  httpMetadata?: { contentType?: string };
  etag?: string;
}

export interface R2Bucket {
  put(key: string, value: ArrayBuffer | ReadableStream, options?: { httpMetadata?: { contentType?: string; cacheControl?: string }; customMetadata?: Record<string, string> }): Promise<unknown>;
  get(key: string): Promise<R2ObjectBody | null>;
  delete(key: string): Promise<void>;
}

export type RuntimeEnvironment = {
  DB?: D1Database;
  BUCKET?: R2Bucket;
  SUPER_ADMIN_EMAIL?: string;
  PRAYER_ENCRYPTION_KEY?: string;
  IP_HASH_SALT?: string;
  PRAYER_NOTIFICATION_EMAIL?: string;
  CONTACT_NOTIFICATION_EMAIL?: string;
  BREVO_API_KEY?: string;
  BREVO_SENDER_EMAIL?: string;
  ADMIN_USERNAME?: string;
  ADMIN_PASSWORD?: string;
  ADMIN_SESSION_SECRET?: string;
  /** URL canônica pública usada em links, SEO e dados estruturados. */
  PUBLIC_SITE_URL?: string;
};

type RuntimeExecutionContext = {
  waitUntil(promise: Promise<unknown>): void;
};

type RuntimeScope = {
  environment: RuntimeEnvironment;
  executionContext: RuntimeExecutionContext;
};

const runtimeGlobal = globalThis as typeof globalThis & { __PIBRG_RUNTIME_SCOPE__?: AsyncLocalStorage<RuntimeScope> };
const runtimeScope = (runtimeGlobal.__PIBRG_RUNTIME_SCOPE__ ??= new AsyncLocalStorage<RuntimeScope>());

export function runWithRuntimeScope<T>(environment: RuntimeEnvironment, executionContext: RuntimeExecutionContext, callback: () => T): T {
  return runtimeScope.run({ environment, executionContext }, callback);
}

export function getRuntimeEnvironment(): RuntimeEnvironment {
  return runtimeScope.getStore()?.environment ?? {};
}

export function scheduleBackground(promise: Promise<unknown>) {
  const executionContext = runtimeScope.getStore()?.executionContext;
  if (!executionContext) return false;
  executionContext.waitUntil(promise);
  return true;
}

export function getD1(): D1Database {
  const database = getRuntimeEnvironment().DB;
  if (!database) throw new Error("O banco de dados ainda não está disponível.");
  return database;
}

export function ensureDatabase(): Promise<void> {
  // O esquema é aplicado pelas migrações versionadas durante a publicação.
  // Aqui apenas validamos o binding, evitando dezenas de comandos DDL em cada
  // novo processo do Worker e reduzindo a latência das páginas e do painel.
  getD1();
  return Promise.resolve();
}
