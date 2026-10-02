# PROJECT.md — VoltZW dependency maintenance

<!-- The resume point for any fresh agent. Keep it current; keep it short. -->

## Goal

Update vulnerable root and SSR dependencies without changing calculator,
tariff, payment, page or serving behavior. Existing lint/tests/static build
and wrapper/exact-bundle smoke checks must pass unchanged. Record exact
versions, before/after advisory evidence and delivered revision.

## Session-start ritual

1. Read this file, `features.json`, and the tail of `progress.md`.
2. Run `npm ci && npm run lint && npm test && npm run build`; then install
   SSR dependencies and run its existing listening-server tests against `out`.
3. Pick the single most important unfinished feature; work only on that.

## Standing decisions

<!-- Decisions already made. An agent may not re-litigate these; a needed
     change is reported, not silently applied. -->

- Keep static export, unoptimized images, headers, canonical/robots and daily
  tariff workflows unchanged; this is dependency maintenance, not a redesign.
  (2026-09-18)
- Existing AGENTS/CLAUDE rules and all tests/checks/workflows remain immutable.
  Source/progress baseline is the main commit
  `814618e1ca408da27bc2a8b7d0e7ba8e62540c7b`. (2026-09-18)
- First patched versions come from current advisory/package metadata, never
  invented values. No audit suppressions, forced major upgrades or fake green.
  (2026-09-18)
- Ads are allowed on VoltZW per owner request (2026-10-02): Google AdSense,
  tasteful in-content units on informational pages only (never the calculator
  home, /buy/*, /admin or /login), env-gated and disableable. This required
  relaxing the strict CSP (frame-src from 'none'; Google ad domains
  allow-listed) — a deliberate, owner-ratified tradeoff, shipped via PR, not to
  main directly. (2026-10-02)

- /privacy/ must describe exactly what the site collects. Any change to data
  collection, processors, cookies or ad placement updates /privacy/ in the same
  PR. (2026-10-02)

## Constraints

- One executor; plan → act → verify → commit. One retry per failure, then
  report/descope. No secret values, private account findings or spending.
- Preserve all original tracked files except dependency manifests/locks and
  the build-generated OG image only if a verified dependency change requires it.
- Deploy only the tested change through existing reversible website workflow;
  check actual run/source and served responses independently.

## Current phase

2026-10-02: monetisation. AdSense code live (PR #20). AdSense for content
enabled on pub-5182383335652302; site tapiwa.me added + ownership verified;
review to be requested once the privacy policy (F4) is live. F5 flips only when
AdSense shows the site as Ready. Earlier dependency-maintenance work (F1/F2) is
unchanged — F2 still awaits its own delivery readback (record:
docs/root-dependency-maintenance-2026-09-18.json).

Template copied from canonical subagent-toolkit v3.0.1, then adapted.
