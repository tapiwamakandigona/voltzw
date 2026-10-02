# Google AdSense on VoltZW

Ads are wired into the static export but **off by default until the site is
approved in AdSense**. This documents what ships in the code and the two
human/account steps that are outside it.

## What the code does

- **Publisher ID** `ca-pub-5182383335652302` lives in `src/lib/ads.ts`. It is a
  public value (it ships in the ad tag), so it is committed. Override or disable
  with `NEXT_PUBLIC_ADSENSE_CLIENT` (set to `""` to turn every ad off).
- **Loader** (`src/app/layout.tsx`) injects `adsbygoogle.js` once, site-wide,
  only when a publisher ID is set.
- **`<Ad slot=…/>`** (`src/components/Ad.tsx`) is one responsive in-content
  unit: labelled "Advertisement", reserves height (no layout shift), and renders
  **nothing** until its slot ID is set — so there are never empty ad boxes.
- **`public/ads.txt`** authorises Google to sell this site's inventory.
- **CSP** (`scripts/stamp-csp.mjs`) now allow-lists the Google ad domains.
  ⚠️ This is a deliberate loosening of an otherwise strict policy: `frame-src`
  went from `'none'` to the AdSense safeframe/doubleclick origins, and ad
  scripts/images/beacons are permitted. Everything else stays locked to `self`.

## Placement (kept tasteful)

One unit each, mid-content, on the **informational** pages only:

| Page | Env var for the slot |
|---|---|
| `/units/[slug]/` (amount + unit-count pages) | `NEXT_PUBLIC_ADS_SLOT_UNITS` |
| `/zesa-tariffs/` | `NEXT_PUBLIC_ADS_SLOT_TARIFFS` |
| `/retrieve-zesa-token/` | `NEXT_PUBLIC_ADS_SLOT_RETRIEVE` |

**No ads** on the calculator home (it's the tool), the `/buy/*` conversion
flow, or `/admin` and `/login` (which are `noindex`). Drop more `<Ad/>`s in
wherever you like — the component is safe to reuse.

## To actually serve ads (account steps)

1. **Get the site approved.** In AdSense → *Sites*, make sure `tapiwa.me`
   (or `zesa.tapiwa.me`) is added and shows *Ready*. Until then ads render
   blank, regardless of the code.
2. **Pick one serving mode:**
   - **Auto ads (zero config):** AdSense → *Ads* → toggle Auto ads on for the
     site. The loader is already present, so ads start placing automatically.
   - **Manual units (the neat, controlled option):** create a *Display* ad unit
     per slot in AdSense → *Ads → By ad unit*, copy each `data-ad-slot` value
     into the matching `NEXT_PUBLIC_ADS_SLOT_*` build env var (set in the deploy
     workflow / Appwrite), and the hand-placed `<Ad/>`s light up.

Set the env vars where the site builds (GitHub Actions `deploy.yml` env or
Appwrite build settings), since `NEXT_PUBLIC_*` is inlined at build time.
