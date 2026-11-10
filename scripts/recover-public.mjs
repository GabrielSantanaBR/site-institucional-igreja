// Reads public HTML snapshots only. Never evaluates scripts from the source site.
import { readFile, writeFile } from 'node:fs/promises';
import { readdir } from 'node:fs/promises';
const directory = process.argv[2] || 'qa/public-backup';
const items = new Map(), groups = new Map(); let settings;
function visit(value) {
  if (!value || typeof value !== 'object') return;
  if (Number.isInteger(value.id) && ['post','sermon','event','devotional','leader','gallery'].includes(value.kind) && typeof value.title === 'string') items.set(value.id, value);
  if (Number.isInteger(value.id) && typeof value.name === 'string' && Object.hasOwn(value,'coverImageUrl')) groups.set(value.id,value);
  if (typeof value.heroTitle === 'string' && typeof value.address === 'string') settings = value;
  for (const child of Object.values(value)) visit(child);
}
for (const name of await readdir(directory)) {
  if (!name.endsWith('.html')) continue;
  const html = await readFile(directory + '/' + name, 'utf8');
  for (const match of html.matchAll(/self\.__VINEXT_RSC_CHUNKS__\.push\(("(?:[^"\\]|\\.)*")\)/g)) {
    const chunk = JSON.parse(match[1]);
    for (const line of chunk.split('\n')) {
      const colon = line.indexOf(':'); if (colon < 0) continue;
      const raw = line.slice(colon+1); if (!['[','{'].includes(raw[0])) continue;
      try { visit(JSON.parse(raw)); } catch { /* Flight records can include non-JSON references. */ }
    }
  }
}
const backup = { source: 'https://pibrg-guadalupe.tudoido521.workers.dev', capturedAt: new Date().toISOString(), settings, items: [...items.values()], groups: [...groups.values()] };
await writeFile(directory + '/recovered.json', JSON.stringify(backup, null, 2));
console.log(JSON.stringify({ publicItems:items.size,groups:groups.size,settings:!!settings }));
