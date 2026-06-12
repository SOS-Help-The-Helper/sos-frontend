# Full-Stack Audit — sos-frontend + sos-core
**Date:** 2026-06-12 · **Scope:** `sos-help-the-helper/sos-frontend` and `sos-help-the-helper/sos-core` · **Method:** static analysis only, no code modified. Every finding cites file:line. Claims that could not be verified from the repos (live DB state, deployed EF versions) are explicitly marked **UNVERIFIED**.

---

## 1. Executive Summary

**Overall health: D+.** The product architecture is genuinely good — a modern Next.js 16 frontend, a sensible domain-routed edge-function consolidation, and well-designed auth primitives — but the system handling disaster-survivor PII currently has **no enforced authorization layer**: every consolidated edge function accepts the *public* anon key as its only credential (`_shared/auth.ts:16-22`), so anyone on the internet can read and write CRM data, including survivor names, phones, and emails. Compounding this, **live service-role keys for both Supabase projects are committed to git** (`sos-core/scripts/erv_import.py:20,23`, `scripts/erv_audit.mjs:5`). There is **zero CI and effectively zero test coverage** across both repos, so none of this would be caught by automation, and at least one citizen-facing flow (match accept/decline) appears silently broken by an auth-contract mismatch. Top 3 risks: (1) public exposure of survivor PII and open write access via the EF surface, (2) committed service-role credentials, (3) dual old/new EF stacks providing duplicate, divergently-patched write paths to the same tables. Top 3 opportunities: (1) `lib/api.ts` is a single choke point — fixing frontend auth is one file, not fifty; (2) the correct auth helpers (`requireUser`, `requirePortalRole`) already exist, are documented, and are tested — they just aren't wired in; (3) the EF consolidation is ~80% done, so deleting the 30+ legacy functions yields a huge complexity reduction for little effort. With a focused 2–3 week effort on Milestones 0–1 below, this moves from D+ to a solid B.

---

## 2. Repo Map

### Purpose
SOS ("Help the Helper") is a disaster-relief coordination platform: citizens submit needs (SOS requests), partner orgs (e.g. ERV — RV donations) offer resources, a match engine pairs them, and drivers deliver. Users: disaster survivors (citizen portal `/c`), partner org staff (partner portal `/app`), drivers (`/drive/[id]`), and the public (`/vote`, `/share`, map demos). Maturity: **production service in active pivot** — real data (2,007 households per `sos-core/CLAUDE.md`), deployed on Vercel + two Supabase projects (SOS DB `rtduqguwhkczexnoawej`, ERV DB `xbtrtztzaokeodarqvpr`), but built at prototype velocity, largely by AI agents working from CLAUDE.md build plans.

### Stack
| Layer | Tech |
|---|---|
| Frontend | Next.js 16.2.1 (App Router, Turbopack), React 19.2.4, Tailwind 4, Mapbox GL 3, Vercel |
| AI | Vercel AI SDK 6 + `@ai-sdk/anthropic` (citizen intake chat with DB-writing tools), separate "OpenClaw" gateway at a hardcoded IP |
| Backend | ~46 Deno edge functions on Supabase; `_shared/` helper layer; SQL migrations |
| Auth | Supabase Auth sessions (partner portal), custom OTP flows (`citizen-auth`, `vote-otp`), API-key headers for partner EFs |

### Architecture sketch
```
Browser ──(anon key!)──> Supabase Edge Functions ──> SOS DB (Postgres)
   │                        ├─ NEW: sos-coordination / -intake / -matching /
   │                        │        -inventory / -intelligence / -events
   │                        └─ OLD: 30+ legacy EFs (crm-*, sos-read/write/update,
   │                                 partner-*, match-engine…) still deployed
   ├──> Next API routes (/api/chat AI intake, /api/pin, /api/map/tiles…)
   └──> direct PostgREST reads (lib/api.ts `db.*`, anon key + RLS)
proxy.ts (middleware): route allowlist + /app session gate + chat rate limit
```

### Key directories
| Path | What it is |
|---|---|
| `sos-frontend/app/app/` | Partner portal (CRM): cases, directory, match, map, transport, reports… |
| `sos-frontend/app/(citizen)/c/` | Citizen portal: agent chat intake, match responses, feed |
| `sos-frontend/app/api/` | Server routes: AI chat, public pin/tile APIs, webhooks, debug |
| `sos-frontend/lib/api.ts` | **The** EF client — every data call funnels through here (453 lines) |
| `sos-frontend/components/` | ~120 components; `crm/`, `partner/`, `citizen/`, `tools/` |
| `sos-frontend/_archive/`, `_lovable_ref/`, `lib/*.backup.ts` | Dead code (~200 files) |
| `sos-core/supabase/functions/` | 46 EFs: 6 new consolidated + 30+ legacy + `_shared/` helpers |
| `sos-core/supabase/migrations/` | 30 SQL files in three conflicting naming schemes |
| `sos-core/scripts/` | Ad-hoc ops scripts and standalone `.cjs` API servers — **contains committed secrets** |

### Surprises found during mapping
- The "consolidation" never deleted anything: old and new EFs both serve traffic against the same tables.
- Comments and docs systematically contradict code (e.g. `sos-coordination/index.ts:40` says "Auth: service role only" above a call that accepts the public anon key; `sos-frontend/CLAUDE.md` says "Dynamic routes return 404 on Vercel — use static routes only" while 14+ dynamic routes are live).
- The frontend repo contains its own divergent copy of DB migrations (`sos-frontend/supabase/migrations/`).
- Both `package-lock.json` and `pnpm-lock.yaml` exist, divergent in size and content.

---

## 3. Audit Report

Severity legend: 🔴 Critical · 🟠 High · 🟡 Medium · ⚪ Low. "Fact" = verified in code; "Judgment" = assessment.

### 3.1 Security — the ugly part; this is where the fire is

**🔴 S1. Committed service-role keys for both production databases** *(Fact)*
- `sos-core/scripts/erv_import.py:20,23` and `sos-core/scripts/erv_audit.mjs:5` contain live JWTs whose decoded payloads are `"role":"service_role"` for both the SOS and ERV Supabase projects (verified by decoding). Also anon keys in `scripts/resource-search-api.cjs:43`, `scripts/resource-search.sh:14`, `agents/intake/TOOLS.md:6`.
- Why it matters: service_role bypasses all RLS — anyone with repo read access has full admin over both production databases, including all survivor PII. Keys live in git history even if the files are fixed.
- Action: **rotate both projects' keys today**, then remove from files; history purge is secondary to rotation.

**🔴 S2. The entire consolidated EF surface accepts the public anon key — authorization layer effectively absent** *(Fact)*
- `_shared/auth.ts:13-25` — `requireAuth()` validates against a list that includes `SUPABASE_ANON_KEY` (line 18). All five consolidated EFs use it: `sos-coordination/index.ts:41`, `sos-matching/index.ts:47`, `sos-inventory/index.ts:29`, `sos-intelligence/index.ts:32`, `sos-events/index.ts:29`. The anon key ships in every browser bundle by design (`lib/api.ts:22`).
- Consequence: anyone on the internet can call `directory.browse_persons`, `cases.list` (any `org_id` — org scope is a client-supplied parameter, never checked against an identity), `cases.add_note`, `delivery.update_status`, `write.adjust` (inventory), match commits, etc. Reads of survivor PII **and** writes are both open.
- The codebase *knows* this is wrong: `requireServiceAuth()`'s own doc comment (`auth.ts:73-75`) says it exists to "close the hole in requireAuth() where any caller holding the (publicly shipped) anon key could authenticate", `sos-core/CLAUDE.md` mandates `requireServiceAuth()` on all consolidated EFs, and `sos-intelligence/index.ts:14` claims "Auth: service-role only (requireServiceAuth)" two paragraphs above the `requireAuth` call (line 32).
- Important nuance: this is **not** fixable by a one-line swap to `requireServiceAuth` — the frontend deliberately calls these EFs from the browser with the anon key (`lib/api.ts:26,65`), so a strict swap bricks the partner portal. The fix is a real auth model (see Strategy, Theme 1).

**🔴 S3. `partner-read` explicitly accepts the anon key and returns survivor PII** *(Fact)*
- `partner-read/index.ts:113-121`: `authenticated = (partnerKey…) || (serviceKey…) || (anonKey && bearerToken === anonKey)` — the public anon key is a valid credential. The select list at line 105 includes `persons!person_id(id, display_name, phone, email)` plus medical/insurance/housing fields (`has_medical_needs`, `has_insurance`, `intake_narrative`...). Same pattern in `partner-update/index.ts:506-512` and `partner-write/index.ts:131-137` — so partner **writes** are anon-key-accessible too.

**🔴 S4. RLS appears absent on core PII tables** *(Fact for migrations; UNVERIFIED for live DB)*
- Across all 30 files in `sos-core/supabase/migrations/`, the only policy touching core data is `service_role_all` on `person_locations` (`0020_person_360.sql:34`). No `ENABLE ROW LEVEL SECURITY` or policies exist for `persons`, `requests`, `resources`, `matches`, `soses`. `vote_otp_codes` (`20260607_004_vote_otp_codes.sql`) has neither RLS nor policies.
- The frontend performs direct PostgREST reads with the anon key on `persons` (including `phone_hash`, score data — `lib/api.ts:439`), `matches`, `resources` (`lib/api.ts:223-273, 405-453`) and evidently expects them to succeed — strong evidence the live tables are anon-readable. **Verify against the live DB; if confirmed, this is the same Critical as S2 via a second door.**

**🟠 S5. Citizen AI intake chat trusts spoofable identity headers and assembles prompts from user-controlled data** *(Fact)*
- `app/api/chat/route.ts:26-29` reads `x-person-id` / `x-authenticated` headers with zero validation; tools in `lib/chat-tools.ts:208-310` then write SOS requests/registrations to the DB attributed to that `personId`. Anyone can submit records impersonating any person.
- The system prompt is selected/augmented by user-controlled headers (`x-org-id`, `x-erv-flow`, `x-transport-id`…) and interpolates transport data fetched via the user-supplied `x-transport-id` (`route.ts:57-109,262-270`) — a prompt-injection vector into a tool-wielding model.
- The only abuse control is an in-memory per-isolate rate limiter (`proxy.ts:74-91`) which resets on every cold start and is per-instance on Vercel — ineffective against distributed abuse, and it meters Anthropic API spend.

**🟠 S6. PostgREST filter injection in search** *(Fact)*
- `sos-coordination/modules/search.ts:149,156,237,254` interpolate raw user input into `.or(\`display_name.ilike.%${query}%\`)` filter strings. Crafted input (commas, parentheses, operators) injects additional filter clauses — e.g. turning a name search into an `email.ilike` or `phone.ilike` probe, or breaking queries. Not classic SQL injection (PostgREST parameterizes underneath), but attacker-controlled query logic over a PII table. Same pattern flagged in legacy `crm-search`.

**🟠 S7. Wildcard CORS on everything** *(Fact)*
- `_shared/cors.ts:2`: `"Access-Control-Allow-Origin": "*"` is used by all EFs, including OTP/session endpoints (`citizen-auth`, `vote-otp`). Combined with S2/S3 (API-key-only auth), any website can call these APIs from a visitor's browser.

**🟠 S8. OTP brute-force protections are racy and lack lockout** *(Fact)*
- `citizen-auth/index.ts:57-65`, `vote-otp/index.ts:57-69`: per-phone hourly counters are check-then-update (raceable) with no exponential backoff or `locked_until`. 6-digit codes at 5 attempts/hr/phone is fine for one phone, weak across many phones. Mitigated by good hashing design (see Strengths).

**🟠 S9. Public debug and demo-identity routes** *(Fact)*
- `app/api/agent/debug/route.ts:6-12` — public (proxy.ts:52 whitelists all of `/api/`), leaks gateway token length+prefix and probes a hardcoded raw-IP gateway `https://159.203.70.230` (line 3).
- `app/api/user/route.ts:4-6` — public, unconditionally returns `{ id: "demo-admin" }`; any consumer trusting it gets a free identity.

**🟡 S10. Hardcoded anon keys scattered through frontend** *(Fact)*
- `app/vote/page.tsx:12`, `app/api/pin/[id]/route.ts:4`, `app/api/map/tiles/[z]/[x]/[y]/route.ts:4` (+ `/org/` variant), and 5 static files in `public/maps/*.html`. The anon key is public by design, so this is 🟡 *in isolation* — but because the backend treats the anon key as an auth credential (S2/S3), every hardcoded copy is effectively a hardcoded master key, and rotation now requires code changes in 8+ places instead of one env var.

**🟡 S11. Internal error details returned to clients** *(Fact)*
- EF modules return raw DB errors: e.g. `sos-coordination/modules/cases.ts:112,228,787,826`, `directory.ts:314,411,548`, `command.ts:24,51-53,80`, `facilities.ts:37,63` (`Query failed: ${err.message}` → leaks table/column names). Frontend mirrors this: `app/app/error.tsx:8-11` renders `error.message` **and `error.stack`** to end users.

### 3.2 Architecture & design

**🟠 A1. Dual EF stacks: every domain has 2–3 live write paths to the same tables** *(Fact)*
- The 6 consolidated EFs absorbed 30+ legacy EFs, but per `sos-core/CLAUDE.md` ("NEVER delete old EFs yet") all remain deployed. Example: case logic exists in `crm-cases/index.ts` (367 lines), `sos-read/modules/cases.ts` (386 lines), and `sos-coordination/modules/cases.ts` (846 lines) — the first two ~95% copy-paste of each other. Security patches (e.g. fixing S6) must be applied in 2–3 places or the unpatched door stays open. This multiplies the S2 attack surface: legacy EFs are also anon-key-callable.

**🟠 A2. Frontend↔backend auth contracts are mismatched — citizen flows appear broken** *(Fact, behavior UNVERIFIED against prod)*
- `lib/api.ts:99-106` calls `sos-update` with the anon key for match accept/decline/consent, but `sos-update/index.ts:46` strictly `requireServiceAuth`s → every such call should 403. `api.queryMatches` → `sos-read` (`lib/api.ts:97`) hits a user-JWT-or-service gate (`sos-read/index.ts:524-553`) that rejects the anon key too. Either these citizen features are silently dead in production, or traffic goes through some path not visible in these repos. Either way: the two repos disagree about the auth contract, and nothing (no types, no tests) enforces it.

**🟡 A3. Legacy routing layered inside new EFs** *(Judgment)*
- `sos-coordination/index.ts:46-56` dynamically imports `modules/legacy.ts` to emulate old `sos-read`/`sos-update` calling conventions — the consolidation absorbed the old interface as a permanent appendix rather than migrating callers. Acceptable as transition scaffolding, dangerous as steady state.

**🟡 A4. Org scoping is a parameter, not a property of identity** *(Fact)*
- Throughout the EF surface, "which org's data" is whatever `org_id` the client sends (`lib/api.ts:197-376` passes it everywhere; EF modules filter by it without verifying the caller belongs to that org). Multi-tenancy exists in the UI only. `requirePortalRole()` (`auth.ts:165-215`) was built to solve exactly this and is unused by the portal data path.

### 3.3 Code quality

**🟠 Q1. Duplicate components with case-variant names** *(Fact)* — `components/crm/DetailShell.tsx` (542 lines, used by `/app/directory/*`) vs `components/crm/detail-shell.tsx` (204 lines, used by `/app/cases/*`); `AiSummary.tsx` vs `ai-summary.tsx`. Different implementations of the same concept; on case-insensitive dev machines (macOS) these can shadow each other at checkout.

**🟡 Q2. Dead code ≈ 40% of frontend file count** *(Fact)* — `_lovable_ref/` (~190 files), `_archive/`, `lib/prototype-data.backup.ts` (869 lines), `lib/directory-data.backup.ts`, `app/(citizen)/c/page.tsx.fix`, `components/agent-chat.tsx.patch`, `app/app/map/page.production.tsx`. No live imports found of `_archive`/`_lovable_ref` (grep-verified; dynamic imports not exhaustively excluded). Cost: every search/refactor/audit wades through it; agents (the main "devs" here) keep reading it as context.

**🟡 Q3. Type-safety erosion at the data boundary** *(Fact)* — ~55 `any` usages concentrated exactly where types matter most: EF responses (`lib/api.ts:133,213,260`, `lib/chat-tools.ts:19,164,260`). `tsconfig.json` is strict (good), but every EF payload enters as `any`, so backend shape changes (frequent here — see A2) surface as runtime `undefined`s. Recent fix commits ("UrgencyBadge crash when urgency is undefined", `14c5bda`) are this exact failure mode.

**🟡 Q4. God files** *(Fact)* — `sos-coordination/modules/cases.ts` 846 lines; `lib/chat-tools.ts` 866 lines; several 500+ line page components. Judgment: tolerable individually; the trend matters more than any single file.

**⚪ Q5. Custom ESLint rules exist but are not wired in** *(Fact)* — `eslint-rules/no-tanstack-patterns.js`, `no-link-without-href.js` are referenced nowhere in `eslint.config.mjs`. Dead config.

### 3.4 Error handling
Covered by S11 (leaky), plus: silent `catch (_e) {}` on analytics (`sos-coordination/modules/cases.ts:49-65`); no root `app/error.tsx` or `app/global-error.tsx` — citizen/public routes have no error boundary at all (only `app/app/error.tsx` exists); multiple components fetch without `.catch()` (`components/partner/dashboard-overlay.tsx:17` et al.). 🟡 overall.

### 3.5 Testing — one sentence each, because there is almost nothing to audit
- **sos-core:** exactly one test file, `_shared/auth.test.ts` (257 lines, genuinely good — asserts behavior incl. anon-key rejection edge cases), covering helpers that production EFs don't use; 0 tests on routing, modules, OTP, matching. 🟠
- **sos-frontend:** zero test files, no test runner, no `test` script in `package.json`. 🟠
- **CI: none in either repo** — no `.github/workflows/` anywhere; nothing runs `tsc`, eslint, or `deno check` before deploy. Given the team ships via AI agents at high velocity, the absence of any automated gate is the single biggest *process* risk. 🟠

### 3.6 Performance
Healthy enough for current scale; two real items: the per-isolate in-memory rate-limit `Map` (`proxy.ts:74`) grows unboundedly per instance and doesn't actually rate-limit (🟡, see S5); `search.ts` fires sequential queries per entity type and `Promise.all` is used inconsistently (⚪). The matches query rework (`5d6ec16`) shows the team already fixes scale issues when they bite. No N+1 patterns worth flagging beyond lighter-reviewed areas noted in §3.9.

### 3.7 Dependencies
Current and healthy: Next 16.2.1 / React 19.2.4 / Tailwind 4 / supabase-js 2.100 are recent; no known-CVE pins spotted. Issues: **two divergent lockfiles** (`package-lock.json` 297KB + `pnpm-lock.yaml` 175KB — nondeterministic installs depending on which PM a dev/CI uses, 🟡); package is still named `my-app` (`package.json:2`, ⚪); `@chenglou/pretext@0.0.2` is a 0.x single-maintainer dep (⚪).

### 3.8 DevEx, operations, documentation
- **🟠 D1. Migration ordering is nondeterministic** *(Fact)* — three naming schemes in `sos-core/supabase/migrations/`: `0006_…`–`0020_…`, `20260607_…`, and bare `signal_v2.sql` / `inventory_rpcs.sql` / `resolve_sos_rpc.sql`. Lexicographic application order on a fresh `supabase db push` interleaves them incorrectly; disaster-recovery rebuild of the DB is currently not reproducible. The frontend repo's own `supabase/migrations/` copy (`0001`, `0002`) adds drift.
- **🟡 D2. Docs actively contradict code** *(Fact)* — `sos-frontend/CLAUDE.md` gotcha #5 ("Dynamic routes return 404 on Vercel — use static routes only") vs 14+ live dynamic routes; CLAUDE.md's "ERV partner key / x-partner-key" architecture vs `lib/api.ts`'s "There is exactly one database: SOS" (lines 9-14); EF comments claiming service-only auth (S2). For an agent-driven codebase this is worse than missing docs: **wrong CLAUDE.md content gets injected into every future agent run as ground truth.**
- **🟡 D3. Root-level doc sprawl** *(Fact)* — 16 audit/plan MDs at frontend root (one 96KB), 8+ at core root, mostly stale snapshots of past agent runs.
- **⚪ D4.** `scripts/*.cjs` standalone API servers (`x-intel-api.cjs`, `nanoclaw-api.cjs`, `citizen-proxy-server.js`) look like ad-hoc production services living outside any deploy story; `match-transport/.env` is a tracked (empty) file that invites a secret to be committed into a path `.gitignore` doesn't cover.

### 3.9 Lighter-reviewed areas
Depth went to the auth/data path (the core 20%). Received lighter review: individual partner/citizen UI components, Mapbox map internals, `sos-intake`/`sos-matching` module logic beyond auth, `agents/` prompt content, the `.cjs` script servers' internals, and `_archive`/`_lovable_ref` (skimmed for imports only).

### 3.10 Strengths — worth preserving
1. **The new auth helpers are exactly right and tested** — `requireServiceAuth`/`requireUser`/`requirePortalRole` (`auth.ts:80-215`) with thoughtful doc comments and a 257-line behavioral test suite. The fix for S2 is mostly "use the thing you already built."
2. **`lib/api.ts` as a single data choke point** — all frontend data access funnels through one typed surface; the auth migration and response-typing work have one home.
3. **OTP privacy design** — phones and codes stored only as SHA-256 hashes; session tokens from `crypto.getRandomValues` (`citizen-auth/index.ts:42-45`); no PII in OTP tables.
4. **Curated public API surfaces** — `app/api/pin/[id]/route.ts:13-17` explicitly whitelists safe fields for public pins; `lib/pii-sanitizer.ts` scrubs SSN/CC before LLM calls; `lib/redact-for-public.ts` exists for share pages.
5. **The consolidation architecture itself** — action-routed domain EFs with shared helpers is the right shape; commit history shows disciplined, well-described increments.
6. **Modern, current stack** — strict TS, latest Next/React/Tailwind, no legacy framework baggage.

---

## 4. Improvement Strategy

### Theme 1 — Authorization is declared, not enforced *(explains S2, S3, S4, A2, A4, S5)*
The system has three real caller types — public citizens, logged-in portal users, internal services — but the API layer authenticates only API keys, one of which is public. **Target state:** every EF declares one of three guards: `public` (rate-limited, minimal surface), `requireUser`+`requirePortalRole` (browser callers; org scope derived from the caller's affiliation, never from a client-supplied `org_id`), or `requireServiceAuth` (internal). The frontend sends the user's Supabase session JWT (it already has one — `proxy.ts:98-143` proves it) instead of the anon key. **Principle:** identity must come from a verifiable token; scope must be derived from identity. The building blocks already exist (`auth.ts:165-215`); this is wiring, not invention.

### Theme 2 — Two of everything *(explains A1, Q1, Q2, lockfiles, dup migrations)*
Old EFs + new EFs, `DetailShell` + `detail-shell`, npm + pnpm locks, two migration dirs, live code + `_archive`/`_lovable_ref`/`.backup`. Each pair is a place where a fix lands on one side and a bug (or attacker) uses the other. **Target state:** one canonical implementation per concern; legacy EFs get an access-log-verified cutover then deletion; dead trees deleted from `main` (git history keeps them). **Principle:** deletion is the cheapest security patch and the cheapest documentation.

### Theme 3 — No safety net under high-velocity agent development *(explains testing/CI findings, A2)*
This codebase is written mostly by agents executing CLAUDE.md plans — exactly the workflow that most needs mechanical gates, and it has none. A2 (frontend and backend disagreeing about auth) is the canonical failure: each side individually "worked." **Target state:** CI on both repos failing on type errors, lint, secret patterns, and a small contract-test suite that calls each consolidated EF action against a staging project asserting both *behavior* and *authz* (anon key rejected, wrong-org rejected). **Principle:** don't aim for coverage %, aim for "the contract between the two repos is executable."

### Theme 4 — Docs as injected falsehoods *(explains D2, D3, comment/code mismatches)*
CLAUDE.md files are this team's compiler directives — agents obey them. Stale ones (wrong auth claims, wrong routing constraints, superseded architectures) actively generate future bugs. **Target state:** one current CLAUDE.md per repo describing the *post-fix* auth model and canonical paths; historical plans moved to `docs/archive/`; code comments that state security properties ("service role only") must be true or absent.

### Theme 5 — Secret hygiene *(explains S1, S10, S9)*
**Target state:** zero literal credentials in either repo (env vars only), both Supabase projects' keys rotated, gitleaks (or GitHub secret scanning push protection) in CI, debug/demo endpoints removed or auth-gated.

### Explicitly NOT recommended now (trade-offs)
- **Don't purge git history** as the primary secret response — rotation makes leaked keys worthless; history rewriting on shared repos costs coordination it isn't worth this week. Do it opportunistically later.
- **Don't refactor god files or chase the 55 `any`s as a project** — type the EF response boundary (one `types.ts` per domain) and let the rest improve incrementally.
- **Don't build enterprise observability** (Sentry/OTel everywhere) yet — fix generic-error responses + Vercel/Supabase built-in logs first; revisit after M2.
- **Don't unify into a monorepo** — appealing, but the contract-test suite (M0) gets you the cross-repo safety for 5% of the disruption.
- **Don't rewrite the in-memory rate limiter into Redis infra** — move chat abuse control to platform features (Vercel WAF/rate limiting or Supabase) instead of new moving parts.

### Definition of done (measurable)
1. Calling any consolidated or partner EF with the anon key returns 401/403 (except explicitly-public endpoints) — asserted by CI contract tests.
2. Supabase dashboards show **0 traffic to legacy EFs for 14 days**, then legacy EFs deleted.
3. `git grep -E 'eyJ[A-Za-z0-9_-]{30,}'` returns nothing in either repo; both projects' keys rotated; CI secret-scan gate green.
4. CI exists in both repos and fails on: `tsc --noEmit`, `eslint`, `deno check` of all EFs, contract tests, secret scan.
5. RLS enabled with explicit policies on `persons`, `requests`, `resources`, `matches`, `soses`, `vote_otp_codes` (verified live, not just in migrations).
6. Fresh `supabase db push` on an empty project succeeds in order (migration renumber done).
7. One lockfile, one detail-shell, no `_lovable_ref`/`_archive`/`.backup`/`.fix`/`.patch` files on `main`.

---

## 5. Task Plan

### Milestone 0 — Safety net (do before touching behavior) · ~3–4 days
| # | Task | Files/areas | Acceptance criteria | Effort | Risk | Deps |
|---|---|---|---|---|---|---|
| 0.1 | **Rotate both Supabase projects' API keys** (service_role + anon, SOS & ERV); update Vercel/Supabase env vars; verify app still works | Supabase dashboards, Vercel env, EF secrets | Old keys return 401 against both projects; app functional with new keys | **S** | Med (coordinated swap; brief downtime window) | — |
| 0.2 | Strip all literal keys from code → env vars | `sos-core/scripts/*` (erv_import.py, erv_audit.mjs, resource-search-api.cjs, resource-search.sh), `agents/intake/TOOLS.md`, `sos-frontend/app/vote/page.tsx:12`, `app/api/pin/[id]/route.ts:4`, both tile routes, `public/maps/*.html`, delete tracked `match-transport/.env` | `git grep 'eyJ'` clean (excl. lockfiles); scripts read `process.env`/`os.environ` | **S** | Low | 0.1 |
| 0.3 | Bootstrap CI in both repos: frontend `tsc --noEmit` + `eslint` + single-lockfile check; core `deno check` all EFs + `deno test`; gitleaks/secret-scan job in both | `.github/workflows/ci.yml` ×2 | PRs blocked on red; secret scan green | **M** | Low | — |
| 0.4 | EF **contract test suite** against a staging Supabase project: for each consolidated EF, happy-path per module + "anon key rejected" + "cross-org rejected" assertions (the authz ones red until M1 lands — encode them as the spec) | `sos-core/supabase/functions/tests/` | Suite runs in CI; behavior of top ~15 actions pinned before refactor | **L** | Low | 0.3 |
| 0.5 | Pick one package manager (pnpm), delete the other lockfile, enforce via CI | `sos-frontend/package-lock.json` or `pnpm-lock.yaml` | One lockfile; CI install uses it frozen | **S** | Low | 0.3 |

### Milestone 1 — Critical security & correctness · ~1–1.5 weeks
| # | Task | Files/areas | Acceptance criteria | Effort | Risk | Deps |
|---|---|---|---|---|---|---|
| 1.1 | **EF authorization overhaul** (sketch below): consolidated + partner EFs require user JWT w/ `requirePortalRole` (browser) or service key (internal); org scope from affiliation, not request body | `sos-coordination/index.ts:41`, `sos-matching:47`, `sos-inventory:29`, `sos-intelligence:32`, `sos-events:29`, `partner-read:113`, `partner-update:506`, `partner-write:131`, module signatures | Contract tests from 0.4 green: anon → 401/403, wrong-org → 403, portal user → 200 | **XL** (broken into 1.1a–c below) | **High** — touches every data path; staged rollout required | 0.4 |
| 1.2 | **Frontend sends session JWT** instead of anon key; fix the dead citizen calls (A2) to match real EF contracts | `lib/api.ts:22-66` (one choke point), `lib/citizen-api.ts`, supporting auth context | Portal works logged-in; logged-out `/app` API calls fail; citizen match accept/decline verified working | **M** | Med | 1.1 (staged together) |
| 1.3 | Enable RLS + explicit policies on `persons`, `requests`, `resources`, `matches`, `soses`, `vote_otp_codes`; decide fate of frontend direct PostgREST reads (`lib/api.ts db.*`) — either user-JWT-scoped policies or move behind EFs | new migration; `lib/api.ts:405-453` | Anon PostgREST read of `persons` returns 0 rows (verified live) | **L** | **High** (can break reads everywhere — needs 0.4 + staging soak) | 0.4 |
| 1.4 | Sanitize search input: strip/escape PostgREST filter metacharacters; share one `escapeFilter()` helper | `sos-coordination/modules/search.ts:149,156,237,254`, `crm-search` (or kill it via 2.1) | Injection probe inputs return safe results; unit tests | **S** | Low | — |
| 1.5 | CORS allowlist (prod domains + localhost) replacing `*` | `_shared/cors.ts:2`, `handleCors` in `response.ts` | Cross-origin from random domain blocked; app + partner embeds work | **S** | Med (find all legit origins first) | — |
| 1.6 | Chat route hardening: derive identity from session/citizen token server-side (drop trust in `x-person-id`/`x-authenticated`), validate `x-transport-id` ownership, allowlist org/flow values | `app/api/chat/route.ts:26-55,57-109`, `lib/chat-tools.ts:208-310` | Spoofed-header request can't attribute records to arbitrary person | **M** | Med | 1.2 |
| 1.7 | Remove/gate `app/api/agent/debug/route.ts` and `app/api/user/route.ts` demo bypass; stop rendering `error.stack` to users | those files + `app/app/error.tsx:8-11` | Routes 404/401 in prod; error page shows generic message | **S** | Low | — |
| 1.8 | Generic client errors in EFs: central `errorResponse` logs detail, returns "Internal error" + request id | `_shared/response.ts`, ~20 call sites in `sos-coordination/modules/*` | No DB error text reaches clients | **S** | Low | — |
| 1.9 | OTP hardening: `locked_until` column + exponential backoff; make counter update atomic (single UPDATE … RETURNING) | `citizen-auth/index.ts:57-65`, `vote-otp/index.ts:57-69`, migration | 5 fails → 15-min lock; race test passes | **M** | Low | — |

### Milestone 2 — High-leverage structural work · ~1–2 weeks
| # | Task | Files/areas | Acceptance criteria | Effort | Risk | Deps |
|---|---|---|---|---|---|---|
| 2.1 | **Legacy EF decommission**: log invocations 7–14 days, migrate stragglers to consolidated EFs, then delete the ~30 legacy functions (incl. `crm-*`, `sos-read/write/update` once `legacy.ts` callers migrate) | `supabase/functions/` (~30 dirs), Supabase deploy | 0 legacy traffic 14 days → deleted from repo & platform | **L** | Med (hidden callers — that's what the logging window is for) | 1.1 |
| 2.2 | Migration renumber/squash: adopt `YYYYMMDDHHMMSS_name.sql`, fold bare files into sequence, document baseline; delete frontend's `supabase/migrations/` copy | `sos-core/supabase/migrations/`, `sos-frontend/supabase/` | Fresh `db push` on empty project succeeds | **M** | Med (never edit applied history — add a baseline) | — |
| 2.3 | Dedupe components: merge `DetailShell.tsx`/`detail-shell.tsx` and `AiSummary.tsx`/`ai-summary.tsx`; add lint rule banning case-twin filenames | `components/crm/*` + importers | One file per concept; both portals render correctly | **M** | Med (UI regression — eyeball both portals) | — |
| 2.4 | Type the EF boundary: response interfaces per domain in `lib/api-types.ts`; remove `any` from `lib/api.ts` / `lib/chat-tools.ts` | `lib/api.ts`, `lib/chat-tools.ts` | `tsc` clean with no `any` in those two files | **M** | Low | 1.2 |
| 2.5 | Error handling baseline: root `app/error.tsx` + `app/global-error.tsx`; shared fetch wrapper with toast-on-error for the unhandled component fetches | `app/`, `components/partner/dashboard-overlay.tsx:17` et al. | Crash on any route shows branded fallback; no silent fetch failures | **S** | Low | — |
| 2.6 | Replace in-memory chat rate limit with platform-level limiting (Vercel WAF rule or equivalent); keep proxy check as fallback | `proxy.ts:74-91`, Vercel config | Limit survives cold starts & multi-instance | **S** | Low | — |

### Milestone 3 — Quality & polish · opportunistic
| # | Task | Areas | Effort |
|---|---|---|---|
| 3.1 | Delete dead code: `_lovable_ref/`, `_archive/`, `*.backup.ts`, `page.tsx.fix`, `agent-chat.tsx.patch`, `page.production.tsx`, unused `eslint-rules/` (or wire them in) | frontend | **S** |
| 3.2 | Docs consolidation: rewrite both CLAUDE.md to post-fix reality (fix gotcha #5, auth model, "one DB" truth); move stale audits/plans to `docs/archive/` | both repos | **M** |
| 3.3 | Rename package from `my-app`; README with real setup steps | frontend | **S** |
| 3.4 | Move `vote-otp` candidate list to DB table; decide fate of `scripts/*.cjs` ad-hoc servers (adopt into deploy story or delete) | sos-core | **M** |
| 3.5 | Timing-safe key comparisons in partner EF auth (use constant-time compare) | `partner-*/index.ts` | **S** |

### Quick wins (high impact, S effort — start today)
1. **0.1 Rotate keys** — single highest risk-reduction-per-hour available.
2. **1.7 Delete debug + demo-user routes** — two file deletions.
3. **1.8 Generic EF error messages** — one shared function change.
4. **1.5 CORS allowlist** — one constant.
5. **0.5 Kill the second lockfile.**
6. **1.4 Search input sanitizer** — one helper + four call sites.

### Implementation sketches — top 3 tasks

**0.1/0.2 Key rotation + scrub.** In Supabase dashboard (both projects): generate new JWT secret / rotate `service_role` and `anon` keys. Order of operations: (1) add new keys to Vercel env + EF secrets as parallel vars, (2) deploy reading new vars (the `LEGACY_*` envelope in `auth.ts:19-20,47-48` exists for exactly this — put old keys there during the window), (3) flip rotation in Supabase, (4) remove `LEGACY_*` after confirmation. Gotchas: the hardcoded anon key in `public/maps/*.html` and `app/vote/page.tsx:12` dies at rotation — do 0.2 in the same deploy; ERV partner integrations holding the old ERV key need notice.

**1.1 EF authz overhaul (break the XL down):**
- *1.1a (S):* Add `requirePortalUser()` = `requireUser` → `requirePortalRole(['admin','coordinator',…])`, returning `{orgId, personId, role}`. Already 90% built (`auth.ts:165-215`).
- *1.1b (M):* In each consolidated EF router, replace `requireAuth(req)` with: try service key → `ctx = {type:'service'}`; else `ctx = requirePortalUser(req)`. Pass `ctx` into module handlers; where `ctx.type==='portal'`, **override** any client-sent `org_id` with `ctx.orgId` (one line per module entry point — don't rewrite handlers).
- *1.1c (M):* Frontend: `lib/api.ts` `callEf` pulls the session access token from the Supabase browser client (`lib/supabase-client.ts`) and sends it as the Bearer; anon key stays only in the `apikey` header that Supabase's gateway requires. Deploy 1.1b/1.1c together behind a short window; contract tests from 0.4 are the gate. Gotchas: `requirePortalRole` resolves persons **by email** (`auth.ts:176-179`) — verify portal users' `persons.email` rows exist before cutover, or logins will 403; internal/cron callers (e.g. `cron-process-notifications`, agent scripts) must hold the service key — inventory them during the 2.1 logging window; citizen (non-portal) flows keep using citizen session tokens via `sos-read`'s existing user path.

**0.3/0.4 CI + contract tests.** Frontend workflow: `pnpm install --frozen-lockfile && pnpm tsc --noEmit && pnpm lint`, plus `gitleaks detect`. Core workflow: `deno check supabase/functions/**/index.ts`, `deno test supabase/functions/`, gitleaks. Contract tests: a Deno test file per consolidated EF hitting a **staging** Supabase project (secrets via GitHub Actions env) — for each module: one happy path asserting response shape, one `anon key → expect 401/403`, one `org A user requests org B data → expect 403/empty`. Gotcha: don't point tests at prod; if no staging project exists yet, creating one (and making migrations runnable — task 2.2) is the prerequisite, which is itself a finding: today the DB cannot be rebuilt from the repo.

---

## 6. Open Questions (need a human)

1. **Is the live DB's RLS state what the migrations imply (none on core tables)?** Run: anon-key PostgREST `GET /rest/v1/persons?select=phone&limit=1` against prod. If rows return, S4 is Critical-confirmed and task 1.3 jumps to the front.
2. **Are citizen match accept/decline/consent flows actually used in production?** They appear broken (A2). If users depend on them, 1.2 is urgent; if not, delete the dead wrappers instead.
3. **Who calls the legacy EFs?** Any external consumers (ERV systems, the `.cjs` script servers, cron, Slack bots) outside these repos? Determines the 2.1 logging window length.
4. **What is the OpenClaw gateway (`159.203.70.230`)** in `app/api/agent/*` — production dependency or experiment? Decides delete vs. harden (TLS cert on raw IP is suspect either way).
5. **Is `/vote` (LA-election OTP voting) still a live product?** It's hardcoded to one election (`vote-otp/index.ts:31-36`) and shares infra with disaster relief — candidate for extraction or deletion.
6. **Repo visibility:** are these repos private, and who has had access? Determines whether committed service keys (S1) should be treated as "exposed to insiders" or "exposed, period" — rotation is mandatory either way, but incident response differs.
7. **Is there a staging Supabase project?** Required for 0.4/1.3; if not, approve creating one.
8. **`?org=` multi-tenant roadmap** (frontend CLAUDE.md Phase 2, partner_config with per-org DBs): is that still the plan? It conflicts with `lib/api.ts`'s "exactly one database" doctrine and changes how 1.1's org-scoping should be designed.
