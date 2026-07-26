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

## Operating the vend function

The site is static; everything transactional lives in the `vend` Appwrite
function (`functions/vend/`), reachable at `https://voltzw-vend.appwrite.network`.
`GET /health` reports the live configuration and is what the frontend now trusts:

```json
{"ok":true,"configured":true,"paymentMode":"coming_soon","feePct":10}
```

| Env var | Meaning |
|---|---|
| `PAYMENT_MODE` | `coming_soon` (waitlist only) · `semi_auto` (customer pays the Hot Recharge wallet, reconciler vends) · `paynow` (hosted checkout) |
| `HR_ACCESS_CODE`, `HR_ACCESS_PASSWORD` | Hot Recharge agent credentials (meter lookup + vend) |
| `HR_WALLET_CURRENCY` | Currency of the HR wallet; `semi_auto` only accepts orders in it |
| `HOT_PAY_INSTRUCTIONS` | JSON array of payment steps shown in `semi_auto`, `{amount}` placeholder |
| `PAYNOW_ID_USD` / `_KEY_USD`, `PAYNOW_ID_ZWG` / `_KEY_ZWG` | Paynow integration pairs |
| `SERVICE_FEE_PCT` | Fee taken out of the gross amount (default 10) |
| `ALERT_URL` | Webhook for vend failures, FX-bound breaches and Paynow hash mismatches |
| `FX_MIN` / `FX_MAX` | Sanity envelope for the published ZWG/USD rate (defaults 5 / 500) |
| `ADMIN_KEY` | Gates `/poll`, `/wallet` and the admin order views |

Three things to check whenever payments are touched:

1. **`PAYMENT_MODE` is the source of truth.** The frontend reads it from `/health`
   at runtime (`src/components/payment-mode.ts`), so the site can no longer
   advertise live purchasing while the function refuses orders — but a mode that
   is live still needs the matching credentials, or `/order` and `/initiate`
   answer 503.
2. **`semi_auto` needs the schedule.** Tokens are only delivered when the
   function's cron trigger fires the reconciler (`x-appwrite-trigger: schedule`);
   Appwrite's minimum interval is one minute. Without a schedule set on the
   function, customers pay and never receive. `POST /poll` with `ADMIN_KEY` is the
   manual trigger.
3. **Nobody sees an alert that goes nowhere.** The function already alerts on
   every money-critical failure path; set `ALERT_URL` to a webhook that reaches a
   human. For reference, Paynow's own ZESA biller charges roughly 5% or a flat
   ZW$10, so a `SERVICE_FEE_PCT` of 10 sits well above market.

## Tariff data

Tariffs live in [`src/data/tariffs.json`](src/data/tariffs.json) as versioned config with
effective dates and sources. When ZERA publishes new rates, update that one file.

---

*VoltZW is an independent tool and is not affiliated with ZESA Holdings or ZETDC.*
