// SSR wrapper for the zesa.tapiwa.me static export.
//
// The static Appwrite adapter cannot send custom response headers and serves
// the 404 page with status 200 (soft 404), so this thin server does exactly
// those jobs and otherwise serves the byte-identical Next.js export from
// ./site.
//
// Design notes:
// - The per-page hash-based CSP stays in each page's <meta> tag (stamped by
//   scripts/stamp-csp.mjs at build). The CSP *header* below carries only
//   `frame-ancestors`, the one directive meta CSP is forbidden to express.
//   Multiple policies combine by intersection, and a policy containing only
//   frame-ancestors restricts nothing else, so the meta policies keep full
//   effect.
// - Host redirect is an exact match on www.<apex>: preview hosts, localhost
//   and the apex itself must never redirect.
// - /_next/static/* is content-hashed by Next -> immutable cache. /api/* are
//   the static tariff data files refreshed by the daily sync -> always
//   revalidate so new prices show immediately.
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Works both as ESM source (node server/index.mjs) and inside the esbuild CJS
// bundle, where import.meta.url is undefined but __dirname is real.
const HERE = typeof __dirname !== 'undefined'
  ? __dirname
  : path.dirname(fileURLToPath(import.meta.url));
// Bundle layout puts site/ next to server.js; the source tree keeps it one up.
const SITE_DIR = process.env.SITE_DIR
  ? path.resolve(process.env.SITE_DIR)
  : [path.join(HERE, 'site'), path.join(HERE, '../site')]
      .find(p => fs.existsSync(path.join(p, '404.html')));
if (!SITE_DIR) throw new Error('site directory with 404.html not found');
const APEX = process.env.APEX_HOST || 'zesa.tapiwa.me';
const WWW = `www.${APEX}`;

const app = express();
app.set('trust proxy', true);
app.disable('x-powered-by');

// Headers the static adapter could never send. Set before any route so they
// apply to pages, assets, data files, redirects and the 404 alike.
app.use((_req, res, next) => {
  res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Permissions-Policy',
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()');
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  next();
});

// True 301, path and query preserved, exact host match only.
app.use((req, res, next) => {
  const host = (req.headers.host || '').toLowerCase().replace(/:\d+$/, '');
  if (host === WWW) {
    return res.redirect(301, `https://${APEX}${req.originalUrl}`);
  }
  next();
});

// Next fingerprints everything under /_next/static -> safe to cache hard.
// Tariff data under /api must always revalidate so daily price updates land.
app.use((req, res, next) => {
  if (req.path.startsWith('/_next/static/')) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (/^\/(media|images)\//.test(req.path)) {
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
  } else {
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  }
  next();
});

app.use(express.static(SITE_DIR, { extensions: [], redirect: true }));

// Anything unmatched gets the site's own 404 page with a real 404 status.
app.use((_req, res) => {
  res.status(404).sendFile(path.join(SITE_DIR, '404.html'));
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`zesa-ssr listening on :${port}, serving ${SITE_DIR}`));
