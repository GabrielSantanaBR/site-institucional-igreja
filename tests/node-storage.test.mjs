import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { snapshotDatabase } from '../scripts/backup-railway.mjs';
const directory=await mkdtemp(join(tmpdir(),'pibrg-volume-'));
try {
  const output=join(directory,'storage.mjs');
  await build({entryPoints:['db/node-storage.ts'],outfile:output,bundle:true,platform:'node',format:'esm'});
  const {openNodeDatabase,fileBucket}=await import(output);
  const path=join(directory,'pibrg.sqlite');
  let database=openNodeDatabase(path,resolve('drizzle'));
  await test('persistent SQLite adapter reopens data and rolls back failed batches',async()=>{
    await database.prepare("INSERT INTO site_settings (key,value,updated_by) VALUES ('qa','original','qa')").run();
    await assert.rejects(database.batch([
      database.prepare("UPDATE site_settings SET value='corrupt' WHERE key='qa'"),
      database.prepare('INSERT INTO missing_table (id) VALUES (1)'),
    ]));
    database=openNodeDatabase(path,resolve('drizzle'));
    assert.equal((await database.prepare("SELECT value FROM site_settings WHERE key='qa'").first()).value,'original');
  });
  await test('media persists on disk and refuses path traversal',async()=>{
    const key='1787565399948-06de2048-714f-487d-8615-66051ba61cb9.webp';
    const bucket=fileBucket(join(directory,'media'));
    await bucket.put(key,new Uint8Array([1,2,3]).buffer);
    const reopened=fileBucket(join(directory,'media'));
    const object=await reopened.get(key);
    assert.deepEqual(new Uint8Array(await new Response(object.body).arrayBuffer()),new Uint8Array([1,2,3]));
    await assert.rejects(bucket.get('../pibrg.sqlite'));
  });
  await test('database snapshot can be restored and contains committed records',async()=>{
    snapshotDatabase(directory);
    const files=await readdir(join(directory,'backups'));
    assert.equal(files.length,1);
    const snapshot=new DatabaseSync(join(directory,'backups',files[0]));
    assert.equal(snapshot.prepare("SELECT value FROM site_settings WHERE key='qa'").get().value,'original');
    assert.equal(snapshot.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
    snapshot.close();
  });
}finally{await rm(directory,{recursive:true,force:true});}
