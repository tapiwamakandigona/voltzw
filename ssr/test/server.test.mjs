// End-to-end tests against a real listening instance of the wrapper.
// Run from ssr/ with a populated site/ directory (CI rsyncs the built export
// there; locally: SITE_DIR=../out node test/server.test.mjs).
import { spawn } from 'child_process';
import assert from 'assert';
import http from 'http';

const PORT = 4178;
const srv = spawn('node', ['server/index.mjs'], {
  env: { ...process.env, PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'pipe'],
});
await new Promise((ok, no) => {
  srv.stdout.on('data', d => d.toString().includes('listening') && ok());
  srv.stderr.on('data', d => process.stderr.write(d));
  setTimeout(() => no(new Error('server did not start')), 8000);
});

let pass = 0, fail = 0;
async function check(name, fn) {
  try { await fn(); pass++; console.log('PASS ', name); }
  catch (e) { fail++; console.log('FAIL ', name, '-', e.message); }
}
// fetch/undici refuses to send a custom Host header, so host-spoofed requests
// must go through node:http directly.
function get(path, host) {
  return new Promise((ok, no) => {
    const req = http.request({
      host: '127.0.0.1', port: PORT, path,
      headers: host ? { Host: host } : {},
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => ok({
        status: res.statusCode,
        headers: res.headers,
        body: Buffer.concat(chunks).toString(),
      }));
    });
    req.on('error', no);
    req.end();
  });
}

const HEADERS = {
  'content-security-policy': "frame-ancestors 'none'",
  'x-frame-options': 'DENY',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-resource-policy': 'same-origin',
  'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
};
function assertHeaders(h) {
  for (const [k, v] of Object.entries(HEADERS)) {
    assert.strictEqual(h[k], v, `header ${k}: ${h[k]}`);
  }
  assert.ok(h['permissions-policy'], 'permissions-policy missing');
}

// Real routes of the export.
for (const p of ['/', '/buy/', '/zesa-tariffs/', '/retrieve-zesa-token/']) {
  await check(`${p} -> 200 + headers + meta CSP`, async () => {
    const r = await get(p);
    assert.strictEqual(r.status, 200);
    assertHeaders(r.headers);
    assert.ok(r.body.includes('http-equiv="Content-Security-Policy"'),
      'meta CSP missing');
  });
}

await check('a /units/ page -> 200 + headers', async () => {
  // Discover one real units page from the site dir instead of hardcoding.
  const fs = await import('fs');
  const path = await import('path');
  const siteDir = process.env.SITE_DIR || 'site';
  const unitsDir = path.join(siteDir, 'units');
  const first = fs.readdirSync(unitsDir).find(d =>
    fs.existsSync(path.join(unitsDir, d, 'index.html')));
  assert.ok(first, 'no units pages found');
  const r = await get(`/units/${first}/`);
  assert.strictEqual(r.status, 200);
  assertHeaders(r.headers);
});

await check('tariff data /api/tariffs.json -> 200 + revalidate cache', async () => {
  const r = await get('/api/tariffs.json');
  assert.strictEqual(r.status, 200);
  assert.ok(JSON.parse(r.body), 'not valid JSON');
  assert.strictEqual(r.headers['cache-control'], 'public, max-age=0, must-revalidate');
  assertHeaders(r.headers);
});

await check('/_next/static asset -> immutable cache', async () => {
  const fs = await import('fs');
  const path = await import('path');
  const siteDir = process.env.SITE_DIR || 'site';
  const staticDir = path.join(siteDir, '_next', 'static');
  let sample = null;
  (function walk(d, rel) {
    for (const f of fs.readdirSync(d)) {
      if (sample) return;
      const full = path.join(d, f);
      if (fs.statSync(full).isDirectory()) walk(full, `${rel}/${f}`);
      else sample = `${rel}/${f}`;
    }
  })(staticDir, '/_next/static');
  assert.ok(sample, 'no static asset found');
  const r = await get(sample);
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.headers['cache-control'], 'public, max-age=31536000, immutable');
});

await check('unknown path -> real 404 + own 404 page + headers', async () => {
  const r = await get('/definitely-not-a-page/');
  assert.strictEqual(r.status, 404);
  assertHeaders(r.headers);
  assert.ok(r.body.length > 500, '404 body suspiciously small');
});

await check('www host -> 301 apex, path+query preserved', async () => {
  const r = await get('/buy/?units=50', 'www.zesa.tapiwa.me');
  assert.strictEqual(r.status, 301);
  assert.strictEqual(r.headers.location, 'https://zesa.tapiwa.me/buy/?units=50');
  assertHeaders(r.headers);
});

await check('apex host does NOT redirect', async () => {
  const r = await get('/', 'zesa.tapiwa.me');
  assert.strictEqual(r.status, 200);
});

await check('preview/localhost hosts do NOT redirect', async () => {
  for (const h of ['localhost:4178', 'x.appwrite.network']) {
    const r = await get('/', h);
    assert.strictEqual(r.status, 200, `host ${h} got ${r.status}`);
  }
});

srv.kill();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
