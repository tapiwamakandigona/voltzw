# Progress — append only

## 2026-09-18 — dependency maintenance plan
VERIFIED baseline main814618e1ca408da27bc2a8b7d0e7ba8e62540c7b;92 tracked
files,14 test-file paths hashed before edits. Existing rules read; canonical
state templates copied rather than reconstructed. `npm ci` succeeded:
420 packages added;7 npm audit findings (3moderate/3high/1critical).
GitHub separately reports13 open alert entries because manifest/lock and
advisory aggregation differ. No finding dismissed. Full baseline checks next.

VERIFIED baseline:137/137 tests in13 Vitest files, lint clean,48 generated
static routes and39 CSP-stamped HTML pages; original11 wrapper checks pass.
Installed Next static-export guide read fully. SSR npm audit reports4 moderate
package findings. Baseline build alone regenerates the tracked OG image due
to environment rendering; restore it before commit rather than include an
unrelated binary change.

Selected verified patch releases: Next/eslint-config-next16.3.5 (current npm
audit suggested patch, above the16.3.3 first-patched advisory floor),
sharp^0.35.4, Vitest^4.1.11, Express^4.22.3 (stay on4.x),
esbuild^0.25.12 (first patched minor line, no jump to latest0.28).
Refresh transitive locks within ranges without --force or audit suppressions.

Dependency resolver failure (npm10.9.8):
`Cannot read properties of null (reading 'edgesOut')`.
Stack points to npm Arborist optional-peer resolution, not application tests.
One retry uses npm12.0.2 solely to generate the lock; its published Node
requirement includes this Node22.23.2. Validate resulting lock with the original
npm10.9.8 `npm ci` and all unchanged checks. No --legacy-peer-deps/--force.

Retry failed:
`npm error code EALLOWREMOTE`
`npm error Fetching packages of type "remote" have been disabled`
`npm error Refusing to fetch "https://registry.npmjs.org/@tailwindcss/oxide-wasm32-wasi/-/oxide-wasm32-wasi-4.3.2.tgz"`.
VERIFIED both lockfiles remain byte-identical to baseline. Respect the single
retry limit: root dependency update is deferred, root manifest restored, npm
remote-fetch restrictions unchanged. Continue only independently verifiable
SSR maintenance; F1 remains false until root findings are resolved as well.

VERIFIED SSR subset: Express4.22.3, body-parser1.20.8, qs6.16.0,
esbuild0.25.12. Unforced transitive lock refresh and original npm10.9.8
`npm ci` succeeded. SSR npm audit changed4 findings to0; root remains7.
All137 Vitest tests in13 files, original11 wrapper checks, lint and static
build pass;48 routes generated,39/39 HTML pages CSP-stamped.
The exact esbuild CJS artifact returns200 + DENY + tariff JSON, true404 and
path/query-preserving www301; copied export payload is byte-identical.
esbuild reports the existing `import.meta` CJS warning; the source's
`__dirname` fallback is unchanged and the actual bundle starts/passes.
Only2 of92 original tracked paths change (SSR manifest and lock).
All original tests, workflows, app source, tariffs, root manifest/lock and
tracked OG image preserved. Lock's stale portfolio-ssr name normalizes to
the existing zesa-ssr package name. Partial PR next; F1 is not complete.


## 2026-09-18 — renewed root maintenance, VERIFIED locally
- Prior blocked root work was not shipped. Renewed owner mandate authorized
  a bounded resolution from mergedSSR baseline d1db36f.
- Clean npm10.9.8 failed: `Cannot read properties of null (reading 'edgesOut')`.
  One retry with verified-compatible npm11.19.1 generated the lock; unforced
  audit fix updated compatible transitive dependencies. No guard/suppression,
  legacy-peer, forced major, tests or workflow change.
- Next/eslint-config16.3.5, sharp0.35.4, Vitest/mocker4.1.11,
  js-yaml4.3.2, browserslist4.29.0, baseline-browser-mapping2.11.25.
- Original npm10 ci succeeds without lock mutation; lint,137tests/13files,
 48-route build/39-pageCSP,11wrapper and exactCJS artifact smoke pass.
  Root/SSR/vend audits0. Original application/tariff/test/workflow bytes intact.
- Existing bundle import.meta fallback warning and future Vite config-loader
  warning are not suppressed. Build-generated OG restored to tracked source.
- F1 verified true. F2 remains false until exact checked revision deploys and
  fresh default-branch alerts/live routes are read. Local www301 is not DNS.


## 2026-10-02 — AdSense integration + indexing review (new owner mandate)
Owner authorized a new scope beyond dependency maintenance: add ads "in a neat
way", review/fix indexing, improve the site. This supersedes the "not a
redesign" scope for this work only; F1/F2 are untouched.

VERIFIED indexing review (GSC property is `sc-domain:tapiwa.me`, whole estate):
200 known pages = 126 indexed + 74 not. Drilled every not-indexed reason to
example URLs. Of the 74, only ~5 are zesa.tapiwa.me and all are benign:
3 `/api/v1/*` data endpoints (deliberately public via Dataset schema — correct
not to index), the thin `/zesa-tariffs/2026-07/` archive (already hub-linked;
needs authority/time), one stale `_next` font-hash 404 and `/login` (already a
noindex 200 stub). The other ~69 belong to sibling subdomains (zldc, markpath,
tapride, news, ledgerfarm, fps, zimbet, stubcheck, conn) or are normal Google
behaviour (redirects, intentional canonicals, markpath's robots-blocked /app,
noindex). CONCLUSION: zesa itself has no real indexing defect — private pages
already noindex, API already Dataset-schema'd, month hub already internal-links
every archive. No zesa SEO code change was warranted; reported instead of
inventing a fix.

VERIFIED AdSense integration (branch feat/adsense, this PR):
- Real public publisher id ca-pub-5182383335652302 (from the owner's live
  AdSense account) in src/lib/ads.ts; env-overridable, disableable with "".
- Loader via next/script (layout), `<Ad slot/>` component (renders nothing
  until a slot id is set → no empty boxes, reserves height, "Advertisement"
  label). public/ads.txt added. Placements: /units/[slug] (both templates),
  /zesa-tariffs/, /retrieve-zesa-token/ only — NOT the calculator home, /buy/*,
  /admin or /login.
- SPEC CHANGE (reported, not silent): scripts/stamp-csp.mjs now allow-lists the
  Google ad domains and `frame-src` moved from 'none' to the AdSense
  safeframe/doubleclick origins. stamp-csp.test.ts updated to encode the new
  intended policy; the bare-`*` and default-src 'self' invariants are kept.
  This is a real loosening of a deliberately strict CSP — owner ratifies by
  merging.
- Evidence: npm run lint clean; npm test 137/137 (incl. 8 stamp-csp); npm run
  build 49 routes + 40/40 CSP-stamped. Built output: loader + ads.txt present;
  CSP frame-src/script-src/img-src/connect-src carry the ad domains; dummy-slot
  build renders `<ins>` on units/tariffs/retrieve and none on home/buy.
- NOT verified (out of repo scope): ads actually serving. That needs the site
  approved in AdSense and either Auto ads on or real slot ids set (docs/adsense.md).


## 2026-10-02 (later) — AdSense registration + privacy policy (owner approved all)
- PR #20 merged (440e9c9) — owner ratified the CSP tradeoff. CI + Deploy site
  (static + SSR jobs) green. VERIFIED live: zesa.tapiwa.me/ads.txt 200
  text/plain with the Google line; adsbygoogle loader on /zesa-tariffs/; CSP
  frame-src/script-src/img-src/connect-src carry the ad domains.
- AdSense: the existing pub-5182383335652302 account was AdMob-only (no Sites
  menu). Ran the AdSense sign-up with that account ("Continue with this
  account") → AdSense for content enabled. AdSense sites are root domains, so
  the site is **tapiwa.me** (covers zesa.tapiwa.me). Root ads.txt + ownership
  meta tag shipped in portfolio PR #45 (merged ee570de, deploy green, live
  readback OK). Ownership VERIFIED in AdSense ("Your site is verified").
- Gap found before requesting review: neither site had a privacy policy, which
  AdSense requires (third-party ad-cookie disclosure). This PR adds /privacy/
  written from what the code actually does (BuyFlow fields, functions/vend
  processors Hot Recharge/Paynow/EcoCash on Appwrite, localStorage order ref,
  consent-first analytics.js, AdSense disclosures + opt-out links), a footer
  link and a sitemap entry. analytics.js consent copy said "Ads and
  personalisation are off" — inaccurate once ads run; now "Analytics ad
  features and personalisation are off" + a link to /privacy/.
- Evidence (local): eslint clean; npm test 137/137; build 50 routes, stamp-csp
  41/41; out/privacy/index.html has title, canonical, CSP and the disclosure;
  home footer links /privacy/; sitemap lists it; no ad unit on /privacy/.
