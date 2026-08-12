// Build the downloadable tariff table PDF from the same tariffs.json the site
// renders — regenerated on every build, so the daily tariff sync keeps it
// current automatically. Searchers ask for "zesa tariffs table / pdf"; this is
// that artifact, served at /zesa-tariffs.pdf.
import PDFDocument from "pdfkit";
import fs from "node:fs";

const t = JSON.parse(fs.readFileSync(new URL("../src/data/tariffs.json", import.meta.url)));
const month = new Date(t.lastVerified + "T00:00:00Z").toLocaleString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
const fmt = (n, d = 2) => n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

const INK = "#18181b", DIM = "#52525b", VOLT = "#b45309", LINE = "#e4e4e7";
const BAND_COLORS = ["#1a9850", "#91cf60", "#d9ef8b", "#fee08b", "#fc8d59", "#d73027"];
const doc = new PDFDocument({ size: "A4", margins: { top: 54, bottom: 54, left: 54, right: 54 } });
doc.pipe(fs.createWriteStream(new URL("../public/zesa-tariffs.pdf", import.meta.url)));

// Brand header: volt-yellow band + wordmark, same identity as the site.
doc.rect(0, 0, doc.page.width, 30).fill("#f5b800");
doc.font("Helvetica-Bold").fontSize(12).fillColor("#16181d").text("VoltZW", 54, 9, { lineBreak: false });
doc.font("Helvetica").fontSize(9).fillColor("#16181d")
   .text("zesa.tapiwa.me", 54, 11, { width: doc.page.width - 108, align: "right" });
doc.x = 54; doc.y = 54;

doc.font("Helvetica-Bold").fontSize(20).fillColor(INK)
   .text(`ZESA Tariffs — ${month}`, { continued: false });
doc.moveDown(0.2);
doc.font("Helvetica").fontSize(10.5).fillColor(DIM)
   .text(`ZERA-approved ZETDC prepaid tariffs in ZiG (ZWG) and USD. Effective ${t.effectiveDate}, verified ${t.lastVerified}.`)
   .text(`Includes the ${t.reaLevyPct}% Rural Electrification (REA) levy. Monthly discounted quota: ${t.monthlyQuotaKwh} kWh.`);
doc.moveDown(1.2);

function table(headers, rows, widths, aligns, swatches) {
  const x0 = doc.x, startY = doc.y;
  doc.font("Helvetica-Bold").fontSize(9).fillColor(DIM);
  let x = x0;
  headers.forEach((h, i) => { doc.text(h.toUpperCase(), x, startY, { width: widths[i], align: aligns[i] }); x += widths[i]; });
  let y = startY + 16;
  doc.moveTo(x0, y - 4).lineTo(x0 + widths.reduce((a, b) => a + b), y - 4).strokeColor(LINE).lineWidth(1).stroke();
  rows.forEach((row, r) => {
    x = x0;
    if (swatches) doc.rect(x0 - 12, y + 1, 7, 7).fill(swatches[r] ?? swatches[swatches.length - 1]);
    row.forEach((cell, i) => {
      doc.font(i === 0 ? "Helvetica-Bold" : "Helvetica").fontSize(10).fillColor(i === 0 ? INK : DIM)
         .text(cell, x, y, { width: widths[i], align: aligns[i] });
      x += widths[i];
    });
    y += 20;
    doc.moveTo(x0, y - 5).lineTo(x0 + widths.reduce((a, b) => a + b), y - 5).strokeColor(LINE).lineWidth(0.5).stroke();
  });
  doc.x = x0; doc.y = y + 6;
}

doc.font("Helvetica-Bold").fontSize(13).fillColor(INK).text("Stepped bands (per calendar month)");
doc.moveDown(0.5);
table(
  ["Consumption band", "Base ZWG/unit", `Incl. ${t.reaLevyPct}% REA`, "~ USD/unit"],
  t.bands.map((b) => [b.label, fmt(b.baseZwg, 4), fmt(b.inclLevyZwg, 4), `$${fmt(b.usdApprox, 2)}`]),
  [170, 110, 110, 97], ["left", "right", "right", "right"], BAND_COLORS,
);

doc.moveDown(1);
doc.font("Helvetica-Bold").fontSize(13).fillColor(INK).text("What it costs, cumulatively (first purchase of the month)");
doc.moveDown(0.5);
const caps = [50, 100, 200, 300, 400];
let total = 0, prev = 0;
const cumRows = caps.map((cap) => {
  for (const b of t.bands) {
    const lo = Math.max(prev, b.from - 1), hi = Math.min(cap, b.to ?? Infinity);
    if (hi > lo) total += (hi - lo) * b.inclLevyZwg;
  }
  prev = cap;
  return [`${cap} units`, `ZWG ${fmt(total)}`, `~ $${fmt(total / t.zwgPerUsdApprox)}`];
});
table(["Buying up to…", "Total ZiG (ZWG)", "~ USD"], cumRows, [170, 160, 157], ["left", "right", "right"]);

doc.moveDown(1.2);
doc.font("Helvetica").fontSize(9.5).fillColor(DIM)
   .text(`USD figures are estimates at ~${t.zwgPerUsdApprox} ZWG/US$ — you pay in ZiG unless using a USD channel. `
       + `The quota resets on the 1st of each month; every unit above ${t.monthlyQuotaKwh} kWh in the same month is charged at the top rate.`);
doc.moveDown(0.8);
doc.fillColor(VOLT).font("Helvetica-Bold").fontSize(10)
   .text("Live calculator & daily-verified tariffs: zesa.tapiwa.me", { link: "https://zesa.tapiwa.me/", underline: false });
doc.font("Helvetica").fontSize(9).fillColor(DIM)
   .text("VoltZW is independent and not affiliated with ZESA Holdings or ZETDC. Free to share with attribution.");
doc.end();
console.log("wrote public/zesa-tariffs.pdf for", month);
