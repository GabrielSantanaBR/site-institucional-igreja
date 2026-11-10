import test from 'node:test';
import assert from 'node:assert/strict';
import { transform } from 'esbuild';
import { readFile } from 'node:fs/promises';
const {code}=await transform(await readFile('lib/request-security.ts','utf8'),{loader:'ts',format:'esm'});
const {clientIp}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
test('Railway rate limits ignore spoofed Cloudflare and forwarded IP headers',()=>{
  const previous=process.env.APP_RUNTIME;
  try {
    process.env.APP_RUNTIME='node';
    for(let index=0;index<12;index++) {
      assert.equal(clientIp(new Request('https://example.invalid',{headers:{'x-real-ip':'203.0.113.1','cf-connecting-ip':`198.51.100.${index}`,'x-forwarded-for':`192.0.2.${index}`}})),'203.0.113.1');
    }
    assert.equal(clientIp(new Request('https://example.invalid',{headers:{'cf-connecting-ip':'198.51.100.1'}})),'unknown');
    assert.equal(clientIp(new Request('https://example.invalid',{headers:{'x-real-ip':'203.0.113.1, 192.0.2.1'}})),'unknown');
    process.env.APP_RUNTIME='worker';
    assert.equal(clientIp(new Request('https://example.invalid',{headers:{'cf-connecting-ip':'198.51.100.1'}})),'198.51.100.1');
  } finally {
    if(previous===undefined) delete process.env.APP_RUNTIME; else process.env.APP_RUNTIME=previous;
  }
});
