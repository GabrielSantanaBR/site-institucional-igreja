import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
export function snapshotDatabase(directory) {
  const source = join(directory, 'pibrg.sqlite');
  if (!existsSync(source)) return;
  const folder = join(directory, 'backups');
  mkdirSync(folder, {recursive:true,mode:0o700});
  const name = 'pibrg-' + new Date().toISOString().replace(/[:.]/g,'-') + '.sqlite';
  const destination = join(folder, name);
  const database = new DatabaseSync(source);
  try { database.exec('PRAGMA busy_timeout=5000'); database.exec("VACUUM INTO '" + destination.replaceAll("'", "''") + "'"); }
  finally { database.close(); }
  const previous = readdirSync(folder).filter(name => /^pibrg-.*\.sqlite$/.test(name)).sort().reverse();
  for (const old of previous.slice(7)) unlinkSync(join(folder,old));
}
