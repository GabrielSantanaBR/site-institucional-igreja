export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<unknown[]>;
}

type RuntimeEnvironment = {
  DB?: D1Database;
  SUPER_ADMIN_EMAIL?: string;
  PRAYER_ENCRYPTION_KEY?: string;
  IP_HASH_SALT?: string;
};

export function getRuntimeEnvironment(): RuntimeEnvironment {
  return (globalThis as typeof globalThis & { __PIBRG_ENV__?: RuntimeEnvironment }).__PIBRG_ENV__ ?? {};
}

export function getD1(): D1Database {
  const database = getRuntimeEnvironment().DB;
  if (!database) throw new Error("O banco de dados ainda não está disponível.");
  return database;
}

let schemaReady: Promise<void> | null = null;

export function ensureDatabase(): Promise<void> {
  schemaReady ??= initializeDatabase().catch((error) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}

async function initializeDatabase() {
  const db = getD1();
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS content_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      subtitle TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL DEFAULT '',
      date TEXT NOT NULL DEFAULT '',
      time TEXT NOT NULL DEFAULT '',
      location TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_by TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS prayer_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      encrypted_payload TEXT NOT NULL,
      subject TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      source_ip_hash TEXT NOT NULL,
      submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_by TEXT
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_email TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL DEFAULT '',
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS submission_limits (
      ip_hash TEXT PRIMARY KEY,
      window_started_at INTEGER NOT NULL,
      submission_count INTEGER NOT NULL DEFAULT 0
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS content_items_kind_order_idx ON content_items(kind, sort_order)"),
    db.prepare("CREATE INDEX IF NOT EXISTS prayer_requests_status_date_idx ON prayer_requests(status, submitted_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at)"),
  ]);
}
