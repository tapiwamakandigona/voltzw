#!/usr/bin/env node
/**
 * ZESA tariff sync — scrapes zimpricecheck.com and updates src/data/tariffs.json
 * when published rates differ. Prints "changed" or "unchanged" and exits 0;
 * exits 1 on parse failure or implausible data (so CI fails loudly instead of
 * publishing garbage).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const SOURCE = "https://zimpricecheck.com/price-updates/zesa-tariffs/";
const FILE = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "data", "tariffs.json");
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) VoltZW-tariff-sync" };

// [label regex] per band, in the same order as tariffs.json bands.
// Captures: base ZiG, incl-levy ZiG, USD estimate.
const NUM = String.raw`([\d.]+)\s*ZiG\s+([\d.]+)\s*ZiG\s+US\$([\d.]+)`;
const BANDS = [
  new RegExp(String.raw`First\s*50\s*Units\s*${NUM}`, "i"),
  new RegExp(String.raw`51\s*[-–]\s*100\s*${NUM}`, "i"),
  new RegExp(String.raw`101\s*[-–]\s*200\s*${NUM}`, "i"),
  new RegExp(String.raw`201\s*[-–]\s*300\s*${NUM}`, "i"),
  new RegExp(String.raw`301\s*[-–]\s*400\s*${NUM}`, "i"),
  new RegExp(String.raw`401\s*and\s*above\s*${NUM}`, "i"),
];
const EFFECTIVE = /Latest\s+ZESA\s+Tariffs\s+\w+,?\s+(\d{1,2})\s+(\w+)\s+(\d{4})/i;
const MONTHS = ["january","february","march","april","may","june","july","august","september","october","november","december"];

function fail(msg) {
  console.error(`tariff-sync: ${msg}`);
  process.exit(1);
}

// The WP REST API endpoint is friendlier to CI/datacenter IPs than the HTML
// page (which sits behind bot protection), so try it first.
const REST_SOURCE = "https://zimpricecheck.com/wp-json/wp/v2/price_updates/9870?_fields=content";

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

function parseBands(text) {
  if (!text) return null;
  const out = [];
  for (let i = 0; i < BANDS.length; i++) {
    const m = text.match(BANDS[i]);
    if (!m) {
      console.error(`tariff-sync: could not parse band ${i + 1} (text ${text.length} chars)`);
      return null;
    }
    out.push({ baseZwg: +m[1], inclLevyZwg: +m[2], usdApprox: +m[3] });
  }
  return out;
}

let text = await fetchText("wp-rest", REST_SOURCE, (raw) => JSON.parse(raw).content.rendered);
let scraped = parseBands(text);
if (!scraped) {
  console.error("tariff-sync: falling back to HTML page");
  text = await fetchText("html", SOURCE);
  scraped = parseBands(text);
}
if (!scraped) fail("all sources failed");

const em = text.match(EFFECTIVE);
if (!em) fail("could not parse effective date");
const month = MONTHS.indexOf(em[2].toLowerCase()) + 1;
if (!month) fail(`unknown month "${em[2]}"`);
const effectiveDate = `${em[3]}-${String(month).padStart(2, "0")}-${String(+em[1]).padStart(2, "0")}`;

const current = JSON.parse(readFileSync(FILE, "utf8"));

// Sanity: monotonic non-decreasing bands, plausible magnitudes, no wild jumps.
// NOTE: inclLevyZwg is kept verbatim as published (the source mixes rounding
// and truncation in the 4th decimal — e.g. 2.278576→2.2786 but 7.405372→7.4053).
// We deliberately do NOT recompute it from baseZwg × (1 + levy) — see
// `bandsNote` in src/data/tariffs.json. Impact ≤ 0.0001 ZWG/unit.
for (let i = 0; i < scraped.length; i++) {
  const s = scraped[i];
  if (!(s.baseZwg > 0.1 && s.baseZwg < 100)) fail(`band ${i + 1} base rate implausible: ${s.baseZwg}`);
  if (s.inclLevyZwg < s.baseZwg) fail(`band ${i + 1} incl-levy below base`);
  if (i > 0 && s.baseZwg < scraped[i - 1].baseZwg) fail(`band ${i + 1} lower than band ${i}`);
  const old = current.bands[i].baseZwg;
  if (s.baseZwg > old * 5 || s.baseZwg < old / 5) fail(`band ${i + 1} jumped >5x (${old} -> ${s.baseZwg}) — refusing, check manually`);
}

const changed =
  current.effectiveDate !== effectiveDate ||
  scraped.some((s, i) =>
    s.baseZwg !== current.bands[i].baseZwg ||
    s.inclLevyZwg !== current.bands[i].inclLevyZwg ||
    s.usdApprox !== current.bands[i].usdApprox
  );

if (!changed) {
  console.log("unchanged");
  process.exit(0);
}

current.effectiveDate = effectiveDate;
current.lastVerified = new Date().toISOString().slice(0, 10);
current.zwgPerUsdApprox = +(scraped[0].inclLevyZwg / scraped[0].usdApprox).toFixed(1);
current.bands = current.bands.map((b, i) => ({ ...b, ...scraped[i] }));

writeFileSync(FILE, JSON.stringify(current, null, 2) + "\n");
console.log(`changed effective=${effectiveDate} bands=${scraped.map((s) => s.baseZwg).join(",")}`);
