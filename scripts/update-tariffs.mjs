#!/usr/bin/env node
/**
 * ZESA tariff sync — scrapes zimpricecheck.com and updates src/data/tariffs.json.
 *
 * Every successful run writes `lastVerified` (that is the whole point of the
 * "verified daily, not monthly" promise on the site: it must advance on days
 * when ZESA does *not* move, otherwise the title, the meta description and the
 * sitemap's lastmod silently go stale). Rates themselves are only rewritten
 * when the published schedule differs.
 *
 * Prints `changed …` or `unchanged verified=<date>` and exits 0; exits 1 on
 * parse failure or implausible data (so CI fails loudly instead of publishing
 * garbage — and, importantly, does not claim a verification that never happened).
 *
 * The source table has been re-cut twice. Both layouts are still parsed:
 *   CURRENT (since 2026-08-25) — "1–50 units | US$0.0800 | US$0.0848 | ZiG 2.2581"
 *     i.e. USD base, USD incl. levy, ZiG incl. levy. `baseZwg` is no longer
 *     published, so it is derived as inclLevyZwg / 1.06 (verified to reproduce
 *     every previously published base rate to 4 d.p.).
 *   LEGACY (until 2026-08-24) — "First 50 Units | 2.1303 ZiG | 2.2581 ZiG | US$0.08"
 * A layout change is what broke this job silently for six days; keeping both
 * readers plus the parser tests is the guard against a repeat.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const SOURCE = "https://zimpricecheck.com/price-updates/zesa-tariffs/";
// The WP REST API endpoint is friendlier to CI/datacenter IPs than the HTML
// page (which sits behind bot protection), so try it first.
const REST_SOURCE = "https://zimpricecheck.com/wp-json/wp/v2/price_updates/9870?_fields=content";
const FILE = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "data", "tariffs.json");
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) VoltZW-tariff-sync" };
const LEVY = 1.06;

const BAND_LABELS = [
  String.raw`1\s*[-–—]\s*50\s*units`,
  String.raw`51\s*[-–—]\s*100\s*units`,
  String.raw`101\s*[-–—]\s*200\s*units`,
  String.raw`201\s*[-–—]\s*300\s*units`,
  String.raw`301\s*[-–—]\s*400\s*units`,
  String.raw`401\s*units\s*and\s*above`,
];
const LEGACY_BAND_LABELS = [
  String.raw`First\s*50\s*Units`,
  String.raw`51\s*[-–—]\s*100`,
  String.raw`101\s*[-–—]\s*200`,
  String.raw`201\s*[-–—]\s*300`,
  String.raw`301\s*[-–—]\s*400`,
  String.raw`401\s*and\s*above`,
];

// Captures: USD base, USD incl. levy, ZiG incl. levy.
const CURRENT_NUM = String.raw`US\$\s*([\d.]+)\s+US\$\s*([\d.]+)\s+ZiG\s*([\d.]+)`;
// Captures: ZiG base, ZiG incl. levy, USD base.
const LEGACY_NUM = String.raw`([\d.]+)\s*ZiG\s+([\d.]+)\s*ZiG\s+US\$\s*([\d.]+)`;

const round4 = (n) => +n.toFixed(4);

const FORMATS = [
  {
    name: "current",
    patterns: BAND_LABELS.map((l) => new RegExp(`${l}\\s*${CURRENT_NUM}`, "i")),
    band: (m) => {
      const inclLevyZwg = +m[3];
      return { baseZwg: round4(inclLevyZwg / LEVY), inclLevyZwg, usdApprox: +m[1] };
    },
  },
  {
    name: "legacy",
    patterns: LEGACY_BAND_LABELS.map((l) => new RegExp(`${l}\\s*${LEGACY_NUM}`, "i")),
    band: (m) => ({ baseZwg: +m[1], inclLevyZwg: +m[2], usdApprox: +m[3] }),
  },
];

// "ZESA electricity tariffs as of 31 August 2026" (current) or
// "Latest ZESA Tariffs Monday, 24 August 2026" (legacy).
const DATE_PATTERNS = [
  /tariffs\s+as\s+of\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/i,
  /Latest\s+ZESA\s+Tariffs\s+\w+,?\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/i,
];
const MONTHS = ["january","february","march","april","may","june","july","august","september","october","november","december"];

/** Parse all six bands out of the de-tagged source text. Returns null if no known layout matches. */
export function parseBands(text) {
  if (!text) return null;
  for (const fmt of FORMATS) {
    const out = [];
    let ok = true;
    for (const re of fmt.patterns) {
      const m = text.match(re);
      if (!m) { ok = false; break; }
      out.push(fmt.band(m));
    }
    if (ok) return { format: fmt.name, bands: out };
  }
  return null;
}

/** Parse the date the source says the schedule was published/confirmed. Returns "YYYY-MM-DD" or null. */
export function parseSourceDate(text) {
  if (!text) return null;
  for (const re of DATE_PATTERNS) {
    const m = text.match(re);
    if (!m) continue;
    const month = MONTHS.indexOf(m[2].toLowerCase()) + 1;
    if (!month) continue;
    return `${m[3]}-${String(month).padStart(2, "0")}-${String(+m[1]).padStart(2, "0")}`;
  }
  return null;
}

/** Reject implausible scrapes rather than publishing garbage. Returns an error string or null. */
export function validateBands(scraped, currentBands) {
  for (let i = 0; i < scraped.length; i++) {
    const s = scraped[i];
    if (!(s.baseZwg > 0.1 && s.baseZwg < 100)) return `band ${i + 1} base rate implausible: ${s.baseZwg}`;
    if (s.inclLevyZwg < s.baseZwg) return `band ${i + 1} incl-levy below base`;
    if (i > 0 && s.baseZwg < scraped[i - 1].baseZwg) return `band ${i + 1} lower than band ${i}`;
    const old = currentBands[i].baseZwg;
    if (s.baseZwg > old * 5 || s.baseZwg < old / 5) {
      return `band ${i + 1} jumped >5x (${old} -> ${s.baseZwg}) — refusing, check manually`;
    }
  }
  return null;
}

function fail(msg) {
  console.error(`tariff-sync: ${msg}`);
  process.exit(1);
}

async function fetchText(label, url, extract) {
  try {
    const res = await fetch(url, { headers: UA });
    const raw = await res.text();
    if (!res.ok) {
      console.error(`tariff-sync: ${label} HTTP ${res.status} (${raw.length} bytes)`);
      return null;
    }
    const html = extract ? extract(raw) : raw;
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  } catch (e) {
    console.error(`tariff-sync: ${label} fetch failed: ${e.message}`);
    return null;
  }
}

async function main() {
  let text = await fetchText("wp-rest", REST_SOURCE, (raw) => JSON.parse(raw).content.rendered);
  let parsed = parseBands(text);
  if (!parsed) {
    console.error(`tariff-sync: wp-rest did not parse (${text ? text.length : 0} chars) — falling back to HTML page`);
    text = await fetchText("html", SOURCE);
    parsed = parseBands(text);
  }
  if (!parsed) fail("all sources failed");
  const scraped = parsed.bands;
  console.error(`tariff-sync: parsed with the ${parsed.format} layout`);

  const sourceDate = parseSourceDate(text);
  if (!sourceDate) fail("could not parse the source date");

  const current = JSON.parse(readFileSync(FILE, "utf8"));

  // NOTE: inclLevyZwg is kept verbatim as published (the source mixes rounding
  // and truncation in the 4th decimal — e.g. 2.278576→2.2786 but 7.405372→7.4053).
  // See `bandsNote` in src/data/tariffs.json. Impact ≤ 0.0001 ZWG/unit.
  const bad = validateBands(scraped, current.bands);
  if (bad) fail(bad);

  // The source date now advances every day the page is re-confirmed, so it is
  // NOT a change signal on its own: only a moved rate is. effectiveDate is
  // stamped from the source date at the moment the rates actually move.
  const changed = scraped.some((s, i) =>
    s.baseZwg !== current.bands[i].baseZwg ||
    s.inclLevyZwg !== current.bands[i].inclLevyZwg ||
    s.usdApprox !== current.bands[i].usdApprox
  );

  // A successful scrape *is* a verification, whether or not the numbers moved.
  current.lastVerified = new Date().toISOString().slice(0, 10);

  if (changed) {
    current.effectiveDate = sourceDate;
    current.zwgPerUsdApprox = +(scraped[0].inclLevyZwg / scraped[0].usdApprox).toFixed(1);
    current.bands = current.bands.map((b, i) => ({ ...b, ...scraped[i] }));
  }

  writeFileSync(FILE, JSON.stringify(current, null, 2) + "\n");

  console.log(
    changed
      ? `changed effective=${current.effectiveDate} verified=${current.lastVerified} bands=${scraped.map((s) => s.baseZwg).join(",")}`
      : `unchanged verified=${current.lastVerified}`,
  );
}

// Only run when invoked directly, so tests can import the pure helpers.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(`tariff-sync failed: ${err.message}`);
    process.exit(1);
  });
}
