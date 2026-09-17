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
