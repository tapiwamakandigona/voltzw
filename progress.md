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

- F4 VERIFIED live (PR #21 dc8106e, deploy green): /privacy/ 200 with the
  disclosure; footer link; corrected analytics.js copy served. Portfolio twin
  /privacy/ live via portfolio PR #46. AdSense review REQUESTED for tapiwa.me
  (SubmitSite RPC 200; Sites page: "Getting ready"; ads.txt status still "Not
  found" until Google re-crawls the now-live root file). Optional EEA consent
  (Google CMP) step left unselected on purpose — would need CSP allow-listing of
  fundingchoicesmessages.google.com and a second banner; owner decision.

## 2026-10-02 — CTR title pass (F6), data-driven
GSC baseline, zesa.tapiwa.me only, last 3 months to 2026-09-29 (page filter
"+zesa.tapiwa.me"): 2.12k clicks, 84.4k impressions, CTR 2.5%, avg pos 7.
Pages (clicks / impr / CTR / pos):
- /                     631 / 25,415 / 2.5% / 6.6
- /zesa-tariffs/        632 / 25,273 / 2.5% / 5.9
- /retrieve-zesa-token/ 530 / 16,690 / 3.2% / 8.3
- /units/                35 /  3,711 / 0.9% / 7.5
Top queries: zesa calculator 146/3,991/3.7%/9.0 · zesa view token
60/2,506/2.4%/9.4 · zesa token calculator 47/660/7.1%/6.4 · view zesa token
free 42/465/9%/7.4 · zesa tariffs in zig 2026 41/2,078/2.0%/6.0 · zesa tariffs
29/1,533/1.9%/8.6 · zesa tariffs in usd 28/1,178/2.4%/6.0 · zesa tariffs in zig
today 17/823/2.1%/6.2 · how to retrieve zesa token 6/390/1.5%/8.8 · retrieve
zesa token 5/322/1.6%/9.7 · zesa calculator free 12/103/11.7%/3.0.
Changes (titles only; H1s, descriptions, canonicals untouched):
- / : "ZESA Calculator Zimbabwe (Free) — Token & Units in ZiG & USD, 2 Oct 2026"
  (was "... — ZiG (ZWG) & USD to Units, ZETDC Tariffs 2026-10-02").
- /zesa-tariffs/ : "ZESA Tariffs in ZiG & USD Today — October 2026 ZETDC
  Table, ZWG 2.27/unit" (contiguous "zesa tariffs in zig" + "today").
- /retrieve-zesa-token/ : "View or Retrieve a ZESA Token (Free) — Not
  Received? EcoCash, Banks & ZETDC Portal".
- /units/ : "How Many ZESA Units Do I Get? ZiG & USD Amounts to kWh (2 Oct
  2026)" + pageMeta (own OG card).
- New TARIFF_DAY_LABEL (en-GB "2 Oct 2026") + its own test (new file; no
  existing test touched).
Evidence (local): eslint clean; npm test 138/138 (14 files); build, stamp-csp
41/41; out/ titles as above. Re-measure the same GSC view ~4 weeks after deploy.
- F6 VERIFIED live (PR #22 a43c6df, CI + deploy green): all four new titles
  served. F5 stays false until AdSense shows tapiwa.me as Ready; follow-up
  check scheduled 2026-10-05, CTR re-measure 2026-10-30.


## 2026-10-02 (evening) — security maintenance delivered; F2 VERIFIED
Owner said "go ahead" to fixing the open Dependabot alerts.
- PR #24 (e24e964): functions/vend undici ^6.28.0 -> ^6.28.1
  (GHSA-3wwx-pv8p-q78v). vend audit 1 -> 0; root tests 138/138; Dependabot
  #18 fixed. The live vend function was NOT redeployed. Appwrite shows only
  manual deployments (latest 2026-07-26, no Git link), and the advisory is a
  WebSocket permessage-deflate DoS. vend and node-appwrite load undici only
  for Agent/FormData/File/fetch, never WebSocket (grep), so it is not reachable.
  The fix ships with the next manual deploy.
- New critical alert #25: next >=16.2.0 <16.3.6 (GHSA-vcvr-r3jv-pc5j, RCE
  in next/og ImageResponse). next/og and ImageResponse are not imported in
  src/ or scripts/, and the site is a static export, so it was not reachable.
  Patched anyway, together with dev-only transitive brace-expansion (#20-#24).
- PR #25 (34eb425, same tree as the tested 1cee199): next and
  eslint-config-next 16.3.6; brace-expansion 1.1.21 and 5.0.12.
  - An npm 10.9.8 install churned the lock (dropped libc fields, added dev
    flags). Following the 09-18 precedent, the lock was regenerated with
    npm 11.19.1 (its generator) plus an unforced audit fix.
  - The lock delta is semantic-only: the next family and two brace-expansion
    copies. Full evidence is in F2.
- Estate view (another repo): portfolio PR #47 (0a1e430) moved ssr qs to
  6.16.0 via express 4.22.3 and body-parser 1.20.8. ssr audit 3 -> 0; SSR
  tests 22/22; bundle smoke 200 + DENY; deploy green.
- Fresh Dependabot API (not local audit): voltzw 0 open, portfolio 0 open.
- tariff-sync red on 09-24 and 10-01 were false failures. Appwrite's
  build logs (read-only console API) show both deployments ready. Edge
  distribution started 5m38s and 5m29s after creation, about 25-40s past
  the workflow's 5-min poll cap; normal deployments take about 20s.
  Production got those tariff updates about 6 min late. Workflows are
  immutable here, so the fix (poll up to 15 min) is PR #26, opened but NOT
  merged, awaiting owner.
