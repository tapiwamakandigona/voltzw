/**
 * Stamp a Content-Security-Policy into every exported HTML page.
 *
 * Why a <meta> tag and not a response header: this site is a Next static export
 * served by Appwrite Sites' static adapter, which has no custom-header support.
 * A meta policy is enforced by the browser exactly like a header, with two
 * documented exceptions - `frame-ancestors` and `sandbox` are ignored in meta
 * form. Clickjacking protection therefore still needs a real header and is not
 * attempted here.
 *
 * Why hashes and not 'unsafe-inline': Next emits the hydration payload as
 * inline <script> blocks, and their contents differ per page. Allowing inline
 * script wholesale would make the policy decorative, so each page gets the
 * sha256 of its own inline blocks. Because this runs as `postbuild`, the hashes
 * are always computed from the exact markup that ships.
 *
 * Run: node scripts/stamp-csp.mjs   (wired to npm `postbuild`)
 */
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const OUT = path.resolve(process.argv[2] ?? "out");
const MARKER = "<!-- Content-Security-Policy (see scripts/stamp-csp.mjs) -->";

// Everything the site actually uses, and nothing else.
const DIRECTIVES = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  // The consent panel injects a single <style> element, and Next/Tailwind emit
  // inline style attributes, so inline styles stay allowed.
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob: https://www.google-analytics.com https://www.googletagmanager.com",
  "media-src 'self'",
  // voltzw-vend.appwrite.network backs meter checks, orders and payment status,
  // so omitting it here would silently break the vending flow.
  "connect-src 'self' https://voltzw-vend.appwrite.network " +
    "https://www.google-analytics.com https://analytics.google.com " +
    "https://region1.google-analytics.com https://www.googletagmanager.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "frame-src 'none'",
  "upgrade-insecure-requests",
];

// Matches inline <script> blocks only: any element carrying src= is external.
const SCRIPT_RE = /<script(?![^>]*\ssrc=)([^>]*)>([\s\S]*?)<\/script>/g;
const STAMP_RE = new RegExp(
  `\\s*${MARKER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*<meta http-equiv="Content-Security-Policy"[^>]*>`,
  "g",
);

export function inlineHashes(html) {
  const hashes = [];
  for (const [, attrs, body] of html.matchAll(SCRIPT_RE)) {
    // JSON-LD is data, not script: browsers do not evaluate it and do not
    // require a hash for it.
    if (attrs.includes("ld+json") || !body.trim()) continue;
    const digest = createHash("sha256").update(body, "utf8").digest("base64");
    const source = `'sha256-${digest}'`;
    if (!hashes.includes(source)) hashes.push(source);
  }
  return hashes;
}

export function policyFor(html) {
  const scriptSrc = [
    "script-src 'self' https://www.googletagmanager.com",
    ...inlineHashes(html),
  ].join(" ");
  return [...DIRECTIVES.slice(0, 4), scriptSrc, ...DIRECTIVES.slice(4)].join("; ");
}

async function htmlFiles(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await htmlFiles(full)));
    else if (entry.name.endsWith(".html")) found.push(full);
  }
  return found;
}

export const CSP_MARKER = MARKER;

export function stamp(html) {
  const cleaned = html.replace(STAMP_RE, "");
  if (!cleaned.includes("<head>")) return null;
  const meta = `${MARKER}\n<meta http-equiv="Content-Security-Policy" content="${policyFor(cleaned)}" />`;
  return cleaned.replace("<head>", `<head>\n${meta}`);
}

async function main() {
  const files = await htmlFiles(OUT);
  let stamped = 0;
  for (const file of files) {
    const stamped_html = stamp(await readFile(file, "utf8"));
    if (stamped_html === null) {
      console.warn(`stamp-csp: no <head> in ${path.relative(OUT, file)} - skipped`);
      continue;
    }
    await writeFile(file, stamped_html);
    stamped += 1;
  }
  console.log(`stamp-csp: stamped ${stamped}/${files.length} pages in ${path.relative(process.cwd(), OUT)}`);
  if (stamped === 0) {
    console.error("stamp-csp: nothing was stamped - refusing to pass silently");
    process.exit(1);
  }
}

// Only run when invoked directly, so tests can import the pure helpers.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error("stamp-csp failed:", err);
    process.exit(1);
  });
}
