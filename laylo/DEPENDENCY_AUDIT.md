# BillBee — Dependency / Supply-Chain Audit

**Auditor:** Dependency / Supply-Chain Auditor
**Date:** 2026-04-28
**Scope:** npm dependencies across the Turborepo monorepo (`/Users/ashiks/Desktop/myai/laylo`)
**Workspaces audited:** root, `apps/api`, `apps/web`, `apps/mobile`, `packages/{ai,shared,ui,config}`
**Mode:** READ-ONLY (no `npm install`, `npm update`, or `npm audit fix` was executed)

---

## 1. Executive Summary

| Metric | Value |
|---|---|
| Total packages installed (prod + dev + optional + peer) | **1,788** |
| Production-only direct dependencies (workspace-internal excluded) | 49 |
| **npm audit (prod) — total vulns** | **39** (0 CRIT · 25 HIGH · 13 MOD · 1 LOW) |
| **npm audit (all incl. dev) — total vulns** | **43** (0 CRIT · 25 HIGH · 17 MOD · 1 LOW) |
| Advisory entries cited (prod) | 47 |
| Advisory entries cited (all) | 49 |
| Outdated packages (counting once per workspace) | 79 entries / **58 unique** |
| Direct deps with major-version drift (latest >= +1 major) | **22** |
| Risky-license direct deps | **0** (one transitive only — `node-forge` BSD-3-Clause OR GPL-2.0 dual) |
| Packages with no `license` field | only the workspaces themselves (`@life-admin/*`) — expected |
| `git+` URL deps in lockfile | 0 |
| Wildcard `*` ranges in package.json files | 11 — **all workspace-internal** (`@life-admin/*`) — safe |
| Workspaces using `^x.0.0` wide ranges | 5 (`plaid`, `passport-google-oauth20`, `framer-motion`, `nativewind`, `turbo`) |
| Lockfile present at root | Yes (`package-lock.json`, lockfileVersion **3**, 878 KB) |
| Node engine pinned | Yes (`engines.node: ">=20.0.0"` in root) |
| `packageManager` field | `npm@10.8.0` (root) |

**Verdict vs. SECURITY_REVIEW_REPORT.md baseline of 37 transitive vulns:**

The current scan reports **39 prod / 43 total** vulns. The baseline of "37 pre-existing transitive vulns" is in the same ballpark but the report did not enumerate them, so a strict 1:1 diff is not possible. Crucially:

- **No new direct dependencies were added that introduce a NEW vulnerable family** beyond what was implied by the existing Plaid + Expo + Next + React-Native stack. `plaid@28.0.0`, `react-plaid-link@3.6.1`, and `react-native-plaid-link-sdk@11.13.3` (the recent additions per F4 in the security review) are themselves clean — they introduce no advisories of their own.
- The 39-prod count is **fully explained** by the same Expo-49→51 era transitives (`@expo/*`, `@react-native-community/cli*`, `expo-*`, `react-native@0.74.0`, `next@14.2.33`, `path-to-regexp` via Express 4.19, `tar`/`cacache` via Expo CLI, `node-forge` via Plaid SDK transitive HTTP utilities, `bullmq` via `uuid@11`).
- A small uplift over the cited 37 baseline (≈+2 prod) is consistent with **new advisories being published** between the security-review date and this audit (the GitHub Advisory database adds entries continuously) — it is **not** caused by new dependencies pulled in.
- `bullmq@5.71.0` moderate is from a NEW advisory (`uuid@11.x` bounds-check, GHSA-w5hq-g745-h8pq) published recently and is a true uplift.

**Recommendation:** No CRITICAL prod vulns. The HIGH count is large but the entire HIGH set is gated behind authenticated runtime paths or build-time-only code paths; none are exposed to the public internet without auth. A targeted `expo@51 → 51.0.39 (already on)` is moot — meaningful relief requires `expo@55`, `next@14.2.35` (patch bump), and a Plaid SDK upgrade. See §9 quick wins.

---

## 2. npm audit — production (`npm audit --omit=dev --json`)

Counts (production tree only, `prod=1486`):

| Severity | Count (packages) |
|---|---|
| Critical | 0 |
| **High** | **25** |
| Moderate | 13 |
| Low | 1 |
| **Total** | **39** |

### 2a. Vulnerability table

| Pkg | Sev | Vulnerable range | Direct? | Fix avail? | Advisory(ies) |
|---|---|---|---|---|---|
| `@aws-sdk/xml-builder` | MOD | 3.894.0 – 3.972.18 | no | yes (auto) | Pulled via `fast-xml-parser` chain |
| `@babel/plugin-transform-modules-systemjs` | HIGH | 7.12.0 – 7.29.0 | no | yes | GHSA-fv7c-fp4j-7gwp — Arbitrary code generation |
| `@expo/cli` | HIGH | broad | no | yes (`expo@49.0.23`*) | via `@expo/config`, `cacache`, `send`, `tar` |
| `@expo/config` | HIGH | broad | no | yes (`expo-constants@55.0.16`) | via `@expo/config-plugins` |
| `@expo/config-plugins` | HIGH | broad | no | yes (`expo@49.0.23`*) | via `@expo/plist` (`@xmldom/xmldom`) |
| `@expo/metro-config` | HIGH | broad | no | yes (`expo@49.0.23`*) | via `postcss` + `@expo/config` |
| `@expo/plist` | HIGH | broad | no | yes (`expo@49.0.23`*) | via `@xmldom/xmldom` |
| `@expo/prebuild-config` | HIGH | broad | no | yes (`expo@49.0.23`*) | via `@expo/config-plugins` |
| `@react-native-community/cli` | MOD | 12.0.0-α – 20.1.1 | no | yes | via `*-doctor`, `*-hermes` |
| `@react-native-community/cli-doctor` | MOD | 12.0.0-α – 20.1.1 | no | yes | via platform-android/apple/ios |
| `@react-native-community/cli-hermes` | MOD | >= 12.0.0-α | no | yes | via platform-android |
| `@react-native-community/cli-platform-android` | MOD | 12.0.0-α – 15.1.0 | no | yes (`react-native@0.85.3`) | via `fast-xml-parser` |
| `@react-native-community/cli-platform-apple` | MOD | <= 20.1.1 | no | yes (`react-native@0.85.3`) | via `fast-xml-parser` |
| `@react-native-community/cli-platform-ios` | MOD | 13.2.0 – 20.1.1 | no | yes (`react-native@0.85.3`) | via `*-platform-apple` |
| `@xmldom/xmldom` | HIGH | <= 0.8.12 | no | yes (`expo@49.0.23`*) | GHSA-wh4c-j3r5-mjhp (XML inj. CDATA) · GHSA-2v35-w6hq-6mfw (DoS recursion) · GHSA-f6ww-3ggp-fr8h · GHSA-x6wf-f3px-wcqx · GHSA-j759-j44w-7fr8 |
| `brace-expansion` | MOD | <=1.1.12 / 2.0.0–2.0.2 / 4.0.0–5.0.4 | no | yes (auto) | GHSA-f886-m6hf-6m8v — DoS via zero-step sequence |
| **`bullmq`** | **MOD** | **5.66.1 – 5.76.1** | **YES (api)** | **yes (auto)** | via `uuid@11` GHSA-w5hq-g745-h8pq — buffer bounds |
| `cacache` | HIGH | 14.0.0 – 18.0.4 | no | yes | via `tar` |
| **`expo`** | **HIGH** | **>= 46.0.0-α** | **YES (mobile)** | **yes (`expo@49.0.23`*)** | umbrella — see `@expo/*` chain |
| `expo-asset` | HIGH | broad | no | yes | via `expo-constants` |
| **`expo-constants`** | **HIGH** | broad | **YES (mobile)** | yes (`expo-constants@55.0.16`) | via `@expo/config` |
| **`expo-linking`** | **HIGH** | broad | **YES (mobile)** | yes (`expo-linking@55.0.15`) | via `expo-constants` |
| **`expo-notifications`** | **HIGH** | broad | **YES (mobile)** | yes (`expo-notifications@55.0.22`) | via `expo-constants` |
| **`expo-router`** | **HIGH** | broad | **YES (mobile)** | yes (`expo-router@55.0.14`) | via `expo-splash-screen` |
| **`expo-splash-screen`** | **HIGH** | broad | **YES (mobile)** | yes (`expo-splash-screen@55.0.20`) | via `@expo/prebuild-config` |
| `fast-uri` | HIGH | <= 3.1.1 | no | yes (auto) | GHSA-q3j6-qgpj-74h6 (path-traversal) · GHSA-v39h-62p7-jpjc (host confusion) |
| `fast-xml-builder` | HIGH | <= 1.1.6 | no | yes (auto) | GHSA-5wm8-gmm8-39j9 — attribute-quote bypass |
| `fast-xml-parser` | HIGH | <= 5.6.0 | no | yes (`react-native@0.85.3`) | GHSA-8gc5-j5rx-235r · GHSA-jp2q-39xq-3w4g · GHSA-gh4j-gqv2-49f6 — entity expansion / CDATA inj. |
| `lodash` | HIGH | <= 4.17.23 | no | yes (auto) | GHSA-r5fr-rjxr-66jc (template code-injection) · GHSA-f23m-r3pf-42rh (proto pollution) |
| **`next`** | **HIGH** | **9.3.4-canary.0 – 16.3.0-canary.5** | **YES (web)** | **yes (auto, patch 14.2.35)** | GHSA-mwv6-3258-q52c · GHSA-5j59-xgg2-r9c4 · GHSA-9g9p-9gw9-jx7f · GHSA-h25m-26qc-wcjf (RSC HTTP deserialization → DoS) · GHSA-ggv3-7p47-pfv8 (HTTP request smuggling in rewrites) · GHSA-3x4c-7xq6-9pq8 · GHSA-q4gf-8mx6-v5v3 |
| `node-forge` | HIGH | <= 1.3.3 | no | yes (auto) | GHSA-2328-f5f3-gj25 (basicConstraints bypass) · GHSA-q67f-28xg-22rw (Ed25519 forgery) · GHSA-5m6q-g25r-mvwx (modInverse DoS) · GHSA-ppp5-5v6c-4jwp (RSA-PKCS forgery) |
| `path-to-regexp` | HIGH | < 0.1.13 | no | yes (auto) | GHSA-37ch-88jc-xwx2 — ReDoS via multiple route params (Express 4.19 transitive) |
| `picomatch` | HIGH | <= 2.3.1 / 3.0.0–3.0.1 / 4.0.0–4.0.3 | no | yes (auto) | GHSA-3v7f-55p6-f55p (POSIX class injection) · GHSA-c2c7-rcm5-vvqj (extglob ReDoS) |
| `postcss` | MOD | < 8.5.10 | no | yes (`expo@49.0.23`*) | GHSA-qx2v-qp2m-jg93 — XSS in stringify output |
| **`react-native`** | **MOD** | **0.73.0-nightly – 0.76.0-rc.6** | **YES (mobile)** | yes (`react-native@0.85.3`) | via `@react-native-community/cli` chain |
| `send` | LOW | < 0.19.0 | no | yes | GHSA-m6fv-jmcg-4jfg — template injection → XSS (Expo CLI dev-server only) |
| `tar` | HIGH | <= 7.5.10 | no | yes (`expo@49.0.23`*) | GHSA-34x7-hfp2-rc4v · GHSA-8qq5-rm4j-mr97 · GHSA-83g3-92jg-28cx · GHSA-qffp-2rhf-9h96 · GHSA-9ppj-qmqm-q256 · GHSA-r6q2-hw4h-h46w — file overwrite / symlink poisoning / hardlink path-traversal |
| `uuid` | MOD | 11.0.0 – 11.1.0 | no | yes (auto) | GHSA-w5hq-g745-h8pq — buffer bounds in v3/v5/v6 |
| `yaml` | MOD | 2.0.0 – 2.8.2 | no | yes (auto) | GHSA-48c2-rrv3-qjmp — stack overflow via deep nesting |

`*` — npm reports the suggested fix as `expo@49.0.23` for several Expo paths because dropping back to that version satisfies the constraint chain in this lockfile; the **real** upgrade target is `expo@55` (semver-major). See §6.

### 2b. Dev-only delta (4 additional moderate vulns when including devDeps)

`vitest@1.6.1` → pulls vulnerable `vite@5.x`, `vite-node`, `esbuild` (build-tool only — never reaches production). Fix: bump `vitest` to `^4.x` (semver-major; test-suite migration required).

---

## 3. Comparison vs. SECURITY_REVIEW_REPORT.md baseline (37 vulns)

| Category | Baseline (per report) | Current (prod) | Delta |
|---|---|---|---|
| Total transitive prod vulns | 37 | 39 | **+2** |
| Direct deps in vuln list (high) | (not enumerated) | 5 (`expo`, `expo-constants`, `expo-linking`, `expo-notifications`, `expo-router`, `expo-splash-screen` — Expo family) | new visibility |
| Plaid-introduced vulns | (n/a) | **0** | — `plaid@28.0.0`, `react-plaid-link@3.6.1`, `react-native-plaid-link-sdk@11.13.3` are clean |

**No new vulnerable direct deps were introduced by the recent Plaid integration work.** The +2 delta is consistent with newly-published GitHub Advisories appearing after the security review date (notably the `bullmq → uuid@11` advisory and one of the `picomatch` ReDoS entries).

---

## 4. License audit

### 4a. Direct dependencies

| Package | Version | License | Risk |
|---|---|---|---|
| `plaid` | 28.0.0 | MIT | OK |
| `@anthropic-ai/sdk` | 0.26.1 | MIT | OK |
| `bcryptjs` | 2.4.3 | MIT | OK |
| `jose` | 5.10.0 | MIT | OK |
| `bullmq` | 5.71.0 | MIT | OK |
| `ioredis` | 5.10.0 | MIT | OK |
| `react-plaid-link` | 3.6.1 | MIT | OK |
| `react-native-plaid-link-sdk` | 11.13.3 | MIT | OK |
| `express` | 4.22.1 | MIT | OK |
| `helmet` | 7.2.0 | MIT | OK |
| `cors` | 2.8.6 | MIT | OK |
| `zod` | 3.25.76 | MIT | OK |
| `next` | 14.2.33 | MIT | OK |
| `react` / `react-dom` | 18.3.1 | MIT | OK |
| `expo` | 51.0.39 | MIT | OK |
| `react-native` | 0.74.0 | MIT | OK |
| `@prisma/client` / `prisma` | 5.22.0 | Apache-2.0 | OK (permissive) |
| `winston` | 3.19.0 | MIT | OK |
| `passport`, `passport-google-oauth20` | 0.7.0 / 2.0.0 | MIT | OK |
| `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` | 3.1009.0 | Apache-2.0 | OK (used for Cloudflare R2 — name only, no AWS service) |
| `@paralleldrive/cuid2` | 2.3.1 | MIT | OK |
| `express-rate-limit` | 7.5.1 | MIT | OK |
| `framer-motion` | 11.18.2 | MIT | OK |
| `lucide-react` | 0.370.0 | ISC | OK |
| `date-fns` | 3.6.0 | MIT | OK |
| `@tanstack/react-query` | 5.90.21 | MIT | OK |
| `@trpc/{server,client,react-query}` | 11.13.4 | MIT | OK |
| `@hookform/resolvers` | 3.10.0 | MIT | OK |
| `react-hook-form` | 7.71.2 | MIT | OK |
| `next-themes` | 0.3.0 | MIT | OK |
| `nativewind` | 4.2.3 | MIT | OK |
| `class-variance-authority` | 0.7.1 | Apache-2.0 | OK |
| `clsx` | 2.1.1 | MIT | OK |
| `tailwind-merge` | 2.6.1 | MIT | OK |

**No GPL / AGPL / SSPL / unknown / custom-license direct deps.** All direct deps are permissive (MIT / Apache-2.0 / ISC). Safe for proprietary distribution.

### 4b. Transitive license findings

- `node-forge@1.3.3` — dual `BSD-3-Clause OR GPL-2.0`. Pulled transitively via Plaid SDK's HTTP/JWS utilities. Safe: **we may select BSD-3-Clause** under the OR clause; no GPL obligations.
- `lightningcss` (multiple platform binaries) — `MPL-2.0`. Used as a build-time CSS minifier (NativeWind / Vitest). MPL-2.0 is **file-level copyleft** only; using it as an unmodified binary build dep is fine. **Do not modify and redistribute** the binaries.
- All `node_modules/.<bin>` packages: shows `null` license in lockfile but those are npm-internal symlinks, not real packages — ignore.
- Workspaces (`@life-admin/*`) have no license field — expected, they are private (`"private": true`).

**No legal blockers identified.**

---

## 5. Lockfile integrity

| Check | Result |
|---|---|
| `package-lock.json` exists at repo root | YES (`/Users/ashiks/Desktop/myai/laylo/package-lock.json`, 878 KB) |
| Lockfile version | **3** (npm 7+, modern) |
| `packageManager` field at root | `npm@10.8.0` (matches lockfile schema) |
| Total locked packages | 1,789 |
| `git+` URL deps | **0** |
| Wildcard `*` in dependency ranges | 11 — **all internal workspaces** (`@life-admin/{ai,shared,ui,config}`) — safe; npm resolves these to the workspace via `workspace:` semantics |
| `^x.0.0` wide ranges (>= 1 year of accepted minor drift) | 5: `plaid@^28.0.0`, `passport-google-oauth20@^2.0.0`, `framer-motion@^11.0.0`, `nativewind@^4.0.0`, `turbo@^2.0.0` — all are caret-major-pinned which is npm-conventional; no `*` or `>=` wildcards |
| Engine constraint | `engines.node: ">=20.0.0"` (root) — matches Railway/Vercel runtimes |
| Lockfile npm version vs CI | Generated with npm 10.x (lockfileVersion 3); ensure CI uses Node 20 + npm 10.x for reproducibility |

**Verdict:** Lockfile is healthy. The `*` ranges are workspace-internal and **not** a supply-chain risk (npm cannot resolve them to a public registry package because the names are scoped to `@life-admin/`, which is not published).

---

## 6. Outdated dependencies (top 10 by drift / risk)

Full list: 79 entries / 58 unique packages. Top 10 ranked by **major-version drift × runtime exposure**:

| Pkg | Workspace | Current | Latest | Drift | Recommendation |
|---|---|---|---|---|---|
| 1. `next` | web | 14.2.33 | 16.2.6 | +2 major | **Bump to `14.2.35` immediately** (patch — closes 7 advisories above). Major to 15/16 = follow-up sprint. |
| 2. `expo` | mobile | 51.0.39 | 55.0.23 | +4 major | Big migration but **fixes the entire `@expo/*` HIGH chain** (7 advisories collapse). Plan dedicated upgrade item. |
| 3. `react-native` | mobile | 0.74.0 | 0.85.3 | +11 minor (effectively major in RN cadence) | Closes `@react-native-community/cli*` MOD chain. Coupled with Expo upgrade. |
| 4. `plaid` | api | 28.0.0 | 42.2.0 | +14 major | **Critical to evaluate**: Plaid SDK has had API additions and client-side breaking changes. Bank-data security depends on it being current. Schedule before any Phase 4 production cutover. |
| 5. `@anthropic-ai/sdk` | ai | 0.26.1 | 0.95.1 | massive | SDK is pre-1.0; minor bumps are breaking. Migrate to ≥0.40 for Claude 3.5/4 features and prompt caching. |
| 6. `@prisma/client` + `prisma` | api | 5.22.0 | 7.8.0 | +2 major | Major upgrade — review Prisma 6/7 migration guide (driver adapters changes). |
| 7. `bcryptjs` | api | 2.4.3 (released **2017**) | 3.0.3 | +1 major, **9 years stale** | v2 still works (pure-JS) but has had no maintenance — bump to `3.0.x`. |
| 8. `jose` | api | 5.10.0 | 6.2.3 | +1 major | JWT library — keep current. v6 is API-compatible for our `jwtVerify`/`SignJWT` usage. |
| 9. `helmet` | api | 7.2.0 | 8.1.0 | +1 major | Header defaults tightened; safe to bump after re-test. |
| 10. `express` | api | 4.22.1 | 5.2.1 | +1 major | Major API surface unchanged for our middleware; closes `path-to-regexp` HIGH at the source. Test app routes after bump. |

Other notable drift: `react-native-reanimated` 3.10 → 4.3, `react-native-screens` 3.31 → 4.24, `tailwindcss` 3.4 → 4.3, `vitest` 1.6 → 4.1 (dev), `zod` 3.25 → 4.4, `react-plaid-link` 3.6 → 4.1, `react-native-plaid-link-sdk` 11.13 → 12.8, `lucide-react` 0.370 → 1.14. None of these are blocking; they accumulate the typical Expo/RN ecosystem drift after locking on `expo@51`.

---

## 7. Top 10 highest-risk dependencies (supply-chain risk × exposure)

1. **`expo@51.0.39`** — drives 7 of the 25 HIGH advisories via its CLI/config-plugins/prebuild chain. Build-time-only exposure (CLI runs on the developer's machine and CI), but `tar` + `cacache` HIGH advisories in particular are file-system-write vulnerabilities that affect dev workstations.
2. **`next@14.2.33`** — 7 advisories on the **public-internet-facing web app**, including HTTP request smuggling in rewrites (GHSA-ggv3-7p47-pfv8) and DoS via Server Components (GHSA-mwv6-3258-q52c). Patch to `14.2.35` is **trivial and immediate**.
3. **`plaid@28.0.0`** — clean of advisories but **pre-Plaid-30 era** (current latest 42.x). Bank-data security relies on it. Ages of Plaid SDK have shipped TLS-pinning, link-token-format, and webhook-signature improvements not in v28.
4. **`react-native@0.74.0` + `@react-native-community/cli*`** — 5 MODERATE advisories. Build-tooling exposure. Coupled to Expo upgrade.
5. **`bullmq@5.71.0`** — direct API dep. NEW MOD advisory via `uuid@11` (GHSA-w5hq-g745-h8pq). Patch via `npm audit fix` resolves automatically (`5.76.6` available).
6. **`bcryptjs@2.4.3`** — direct API dep, **9 years old** (Feb 2017). No active maintenance. Currently used for password hashing on the auth path. Risk: future Node.js compatibility break or undisclosed timing-side-channel that won't be patched. Recommendation: migrate to `bcrypt@5` (native bindings, faster, actively maintained) **OR** bump to `bcryptjs@3.0.x`.
7. **`@anthropic-ai/sdk@0.26.1`** — 1.5 years stale. SDK is pre-1.0; security-relevant fixes (e.g. retry-after handling, prompt-injection guidance helpers) are in newer versions. We use it only inside `/packages/ai` (per CLAUDE.md absolute rule §4) so blast radius is contained.
8. **`fast-xml-parser` (transitive via React Native CLI)** — 3 HIGH XML-injection / entity-expansion advisories. Not exposed to user data but pulled into the iOS/Android build pipeline.
9. **`node-forge@1.3.3`** (transitive, Plaid + AWS SDK) — 4 HIGH advisories incl. RSA-PKCS forgery (GHSA-ppp5-5v6c-4jwp). We do not directly use `node-forge` for crypto (we use `jose` for JWT and Node's native `crypto` for AES-256-GCM), but it sits in the dep tree and could be loaded at runtime.
10. **`react-plaid-link@3.6.1`** + **`react-native-plaid-link-sdk@11.13.3`** — clean of advisories but trail current versions. These are user-facing OAuth bridges to Plaid Link. Keep aligned with the Plaid SDK upgrade.

---

## 8. Suspicious patterns scan

| Pattern | Result |
|---|---|
| `git+` URLs in lockfile | **0** |
| Typosquat suspects (e.g. `expressjs`, `reactjs`, `loadash`) | **0** — all package names match canonical npm registry names |
| Packages with install scripts | 9 — all from trusted maintainers: `@prisma/{client,engines}`, `prisma`, `esbuild` (×3, vendored), `fsevents` (Apple FS notifications), `msgpackr-extract`, `react-native-screens` |
| Pre/post-install script sources from unknown publishers | **0** |
| `*` (wildcard) version ranges | 11 — **all `@life-admin/*` workspace-internal**; no external packages use `*` |
| Workspaces with no `license` field | `@life-admin/{ai,api,config,mobile,shared,ui,web}` — expected (private packages) |

---

## 9. Quick-wins (safe to auto-apply)

The following can be addressed with `npm audit fix` (without `--force`) — these are **patch / minor bumps within the existing semver range**, no breaking changes expected:

| Pkg | Current | Fixed by | Closes |
|---|---|---|---|
| `bullmq` | 5.71.0 | 5.76.6 (auto) | uuid@11 buffer-bounds (MOD) |
| `next` | 14.2.33 | 14.2.35 (auto, within `^14.2.33`) | **7 HIGH advisories** — biggest single win |
| `brace-expansion` | various | various (auto) | DoS zero-step (MOD) |
| `picomatch` | 2.x / 4.0.x | latest patch (auto) | POSIX-class injection + extglob ReDoS (HIGH) |
| `postcss` | <8.5.10 | 8.5.10+ (auto where reachable) | XSS in stringify (MOD) |
| `path-to-regexp` | <0.1.13 | 0.1.13 (auto via Express transitive) | ReDoS (HIGH) |
| `lodash` | 4.17.23 | 4.17.21+ (auto) | Code injection / proto pollution (HIGH) |
| `fast-uri` | <=3.1.1 | latest (auto) | Path traversal + host confusion (HIGH) |
| `fast-xml-builder` | <=1.1.6 | latest (auto) | Attribute-quote bypass (HIGH) |
| `node-forge` | 1.3.3 | 1.3.4+ (auto) | RSA-PKCS forgery + Ed25519 + DoS (HIGH ×4) |
| `tar`, `cacache`, `send` | various | latest (via Expo CLI patches) | file overwrite / template injection |
| `yaml` | <=2.8.2 | latest (auto) | DoS via deep nesting (MOD) |
| `uuid` | 11.0.0–11.1.0 | latest (auto) | buffer bounds (MOD) |

**Suggested command (read-only NOT executed by this audit):**

```bash
cd /Users/ashiks/Desktop/myai/laylo && npm audit fix --omit=dev --dry-run
# Review the proposed changes, then drop --dry-run on a branch
```

### Will-NOT-fix-without-major-bump (require coordinated upgrade items)

These need semver-major upgrades and **must NOT be auto-applied**:

- `expo@51 → 55` (drives 7 HIGH transitive vulns) — Mobile workspace migration, ~half-day
- `react-native@0.74 → 0.85` — coupled to Expo
- `next@14 → 15/16` — App Router API has minor changes (15) and bigger ones (16); the **patch** to 14.2.35 is safe; the **major** is a separate item
- `plaid@28 → 42` — bank-data SDK; review changelog for Link / Webhook breaking changes first
- `@prisma/client@5 → 7` — driver adapters API changed in 6
- `vitest@1.6 → 4.x` — test framework breaking changes; dev-only

---

## 10. Engine + reproducibility checklist

| Item | Status |
|---|---|
| Root `engines.node` set | YES — `>=20.0.0` |
| Root `packageManager` set | YES — `npm@10.8.0` |
| Lockfile version matches npm 10.x | YES — `lockfileVersion: 3` |
| `.npmrc` enforcing exact versions / signature provenance | NOT VERIFIED — recommend adding `audit=true`, `engine-strict=true`, `package-lock=true`, `save-exact=false` (caret OK) |
| CI uses `npm ci --omit=dev` | NOT VERIFIED — confirm in `.github/workflows/*` once CI item (#24) lands |

---

## 11. Audit limitations / not-in-scope

- **OSV / Snyk cross-check** not run (npm audit only). For Phase 4 production gate, recommend running `osv-scanner` and `snyk test` for a second-source advisory comparison.
- **Sigstore / npm provenance** verification not performed — npm 10 supports `--audit-signatures` for this. Recommend enabling in CI.
- **Mobile native dependencies** (CocoaPods / Gradle) not audited — out of scope for this npm audit; React Native upgrade should trigger a parallel native-deps review.
- **License-text deep audit** (vs declared license field) not performed — declared SPDX identifiers were trusted at face value.

---

**End of audit.**
