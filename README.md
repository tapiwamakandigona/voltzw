# VoltZW ⚡

**The fastest, smartest way to manage prepaid electricity (ZESA) in Zimbabwe.**

Live at **[zesa.tapiwa.me](https://zesa.tapiwa.me)**

## What it does today

- **ZESA calculator** — money → units and units → money with the current ZERA-approved
  stepped tariffs, the 6% REA levy, and full awareness of the 400 kWh monthly quota
  (including "units already bought this month").
- **Current tariffs** — all six bands, cumulative cost tables, and a plain-language
  explanation of how the stepped tariff and monthly quota actually work.
- **Token retrieval guide** — the definitive "my token never arrived" page covering
  EcoCash, banks, online vendors, the ZETDC self-service portal and in-person options.

## What's coming

- 🔌 **Token vending** — buy ZESA tokens with EcoCash (ZWG) or Visa/Mastercard (USD),
  delivered on screen, by WhatsApp and SMS. Per-meter purchase history, no login.
- 💬 **WhatsApp bot** — buy, retrieve and calculate in chat.
- 🌍 **Diaspora auto top-up** — keep a family meter charged from anywhere.
- 📊 **Quota advisor** — "buy X units before the 1st, save Y" alerts.

## Stack

Next.js 16 (App Router, static export) · TypeScript · Tailwind CSS v4

```bash
npm install
npm run dev    # develop
npm run build  # static export to out/
```

## Tariff data

Tariffs live in [`src/data/tariffs.json`](src/data/tariffs.json) as versioned config with
effective dates and sources. When ZERA publishes new rates, update that one file.

---

*VoltZW is an independent tool and is not affiliated with ZESA Holdings or ZETDC.*
