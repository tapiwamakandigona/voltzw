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

const html = await (await fetch(SOURCE, { headers: UA })).text();
const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

const scraped = BANDS.map((re, i) => {
  const m = text.match(re);
  if (!m) fail(`could not parse band ${i + 1}`);
  return { baseZwg: +m[1], inclLevyZwg: +m[2], usdApprox: +m[3] };
});

const em = text.match(EFFECTIVE);
if (!em) fail("could not parse effective date");
const month = MONTHS.indexOf(em[2].toLowerCase()) + 1;
if (!month) fail(`unknown month "${em[2]}"`);
const effectiveDate = `${em[3]}-${String(month).padStart(2, "0")}-${String(+em[1]).padStart(2, "0")}`;

const current = JSON.parse(readFileSync(FILE, "utf8"));

// Sanity: monotonic non-decreasing bands, plausible magnitudes, no wild jumps.
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
