import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, renameSync, unlinkSync } from 'node:fs';
import { resolve, join } from 'node:path';
import type { D1Database, D1PreparedStatement, D1Result, R2Bucket, RuntimeEnvironment } from './runtime';

class Statement implements D1PreparedStatement {
  constructor(readonly db: DatabaseSync, readonly query: string, readonly values: SQLInputValue[] = []) {}
  bind(...values: unknown[]) {
    return new Statement(this.db, this.query, values.map(value => {
      if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint' || value instanceof Uint8Array) return value;
      if (typeof value === 'boolean') return Number(value);
      throw new Error('Unsupported SQL parameter');
    }));
  }
  async first<T>() { return (this.db.prepare(this.query).get(...this.values) ?? null) as T | null; }
  async all<T>() { return { results: this.db.prepare(this.query).all(...this.values) as T[] }; }
  execute<T>(): D1Result<T> {
    const result = this.db.prepare(this.query).run(...this.values);
    return { success: true, results: [], meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } };
  }
  async run<T>() { return this.execute<T>(); }
}

export function openNodeDatabase(path: string, migrationsDirectory = resolve('drizzle')): D1Database {
  mkdirSync(resolve(path, '..'), { recursive: true, mode: 0o700 });
  const database = new DatabaseSync(path);
  database.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  database.exec('CREATE TABLE IF NOT EXISTS _node_migrations (name TEXT PRIMARY KEY, hash TEXT NOT NULL, applied_at TEXT DEFAULT CURRENT_TIMESTAMP)');
  for (const name of readdirSync(migrationsDirectory).filter(name => name.endsWith('.sql')).sort()) {
    const sql = readFileSync(join(migrationsDirectory, name), 'utf8');
    const hash = createHash('sha256').update(sql).digest('hex');
    const existing = database.prepare('SELECT hash FROM _node_migrations WHERE name = ?').get(name);
    if (existing) {
      if (existing.hash !== hash) throw new Error('Applied migration changed: ' + name);
      continue;
    }
    database.exec('BEGIN IMMEDIATE');
    try {
      database.exec(sql);
      database.prepare('INSERT INTO _node_migrations (name, hash) VALUES (?, ?)').run(name, hash);
      database.exec('COMMIT');
    } catch (error) { database.exec('ROLLBACK'); throw error; }
  }
  return {
    prepare: query => new Statement(database, query),
    async batch<T>(statements: D1PreparedStatement[]) {
      database.exec('BEGIN IMMEDIATE');
      try {
        const results = statements.map(statement => {
          if (!(statement instanceof Statement) || statement.db !== database) throw new Error('Invalid batch statement');
          return statement.execute<T>();
        });
        database.exec('COMMIT');
        return results;
      } catch (error) { database.exec('ROLLBACK'); throw error; }
    },
  };
}

const mediaPattern = /^[0-9]+-[0-9a-f-]+\.(jpg|png|webp|avif)$/i;
const mediaTypes: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif' };
export function fileBucket(directory: string): R2Bucket {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  function location(key: string) {
    if (!mediaPattern.test(key)) throw new Error('Invalid media key');
    return join(directory, key);
  }
  return {
    async put(key, value) {
      const bytes = value instanceof ArrayBuffer ? new Uint8Array(value) : new Uint8Array(await new Response(value).arrayBuffer());
      const destination = location(key);
      const temporary = destination + '.tmp-' + crypto.randomUUID();
      writeFileSync(temporary, bytes, { mode: 0o600 });
      renameSync(temporary, destination);
    },
    async get(key) {
      const destination = location(key);
      if (!existsSync(destination)) return null;
      const bytes = readFileSync(destination);
      return { body: new Response(bytes).body!, httpMetadata: { contentType: mediaTypes[key.split('.').pop()!.toLowerCase()] }, etag: '"' + createHash('sha256').update(bytes).digest('hex') + '"' };
    },
    async delete(key) { const destination = location(key); if (existsSync(destination)) unlinkSync(destination); },
  };
}

type NodeGlobal = typeof globalThis & { __PIBRG_NODE_ENV__?: RuntimeEnvironment };
export function getNodeEnvironment(): RuntimeEnvironment {
  const shared = globalThis as NodeGlobal;
  if (!shared.__PIBRG_NODE_ENV__) {
    const directory = process.env.DATA_DIR;
    if (!directory) throw new Error('DATA_DIR must point to persistent storage');
    shared.__PIBRG_NODE_ENV__ = {
      ...process.env,
      DB: openNodeDatabase(join(directory, 'pibrg.sqlite')),
      BUCKET: fileBucket(join(directory, 'media')),
    };
  }
  return shared.__PIBRG_NODE_ENV__;
}
