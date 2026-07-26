#!/usr/bin/env node
/**
 * Appends the current src/data/tariffs.json snapshot to
 * src/data/tariff-history.json, keyed by effectiveDate (last write wins for a
 * given day). Run right after update-tariffs.mjs so the public rate series
 * grows on every sync. Prints "appended <date>", "updated <date>" or
 * "unchanged"; exits non-zero only on unreadable/invalid input.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const TARIFFS = join(root, "src", "data", "tariffs.json");
const HISTORY = join(root, "src", "data", "tariff-history.json");

const t = JSON.parse(readFileSync(TARIFFS, "utf8"));
if (!t.effectiveDate || !Array.isArray(t.bands) || t.bands.length !== 6) {
  console.error("build-history: tariffs.json is not in the expected shape");
  process.exit(1);
}

const snapshot = {
  d: t.effectiveDate,
  base: t.bands.map((b) => b.baseZwg),
  incl: t.bands.map((b) => b.inclLevyZwg),
  fx: t.zwgPerUsdApprox,
};

const history = JSON.parse(readFileSync(HISTORY, "utf8"));
const existing = history.findIndex((s) => s.d === snapshot.d);
let verb;
if (existing === -1) {
  history.push(snapshot);
  verb = "appended";
} else if (JSON.stringify(history[existing]) !== JSON.stringify(snapshot)) {
  history[existing] = snapshot;
  verb = "updated";
} else {
  console.log("unchanged");
  process.exit(0);
}

history.sort((a, b) => a.d.localeCompare(b.d));
const body = "[\n" + history.map((r) => "  " + JSON.stringify(r)).join(",\n") + "\n]\n";
writeFileSync(HISTORY, body);
console.log(`${verb} ${snapshot.d} (${history.length} schedules)`);
