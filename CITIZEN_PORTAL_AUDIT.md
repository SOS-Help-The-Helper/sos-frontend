# Citizen Portal Audit — `app/(citizen)/c/page.tsx`

Audited: 843 lines. Date: 2026-05-04.

---

## 1. Data Sources

### Edge Function calls
| EF name | Location | Notes |
|---|---|---|
| `map-data` | L139 | Initial load — hardcoded `lat=39&lng=-98` (US center), NOT user GPS |
| `map-data` | L227 | Zoom detail fetch — uses actual map center; fires on every `moveend` at zoom ≥ 10 |

Both calls use `NEXT_PUBLIC_SUPABASE_URL/functions/v1/map-data` with anon key in `Authorization` header.

`getAlerts()` (L137) is called from `@/lib/citizen-api` — not an EF call from this file directly.

### Direct `db.from()` / Supabase realtime subscriptions
No `db.from()` queries. Three direct realtime subscriptions (L389–418):
- `requests` table, `INSERT` where `map_visible=eq.true` (L391)
- `resources` table, `INSERT` where `map_visible=eq.true` (L403)
- `matches` table, `INSERT` — **handler is empty** (L415–417)

These subscriptions **bypass any EF filtering logic**. They hit the tables directly; correctness depends entirely on RLS policies.

### Mapbox sources
- `reports-source`: vector tileset `mapbox://sosconnect.sos-reports-v2`, source-layer `sos-map-v2` (L205–215) — static tileset, no EF involved.
- `disasters-source`: GeoJSON, always empty `[]` (L271–276) — placeholder, never populated.

---

## 2. Dead / Stale Code

**L81 — unreachable null guard:**
```ts
if (mapInstance.current) {       // L80 — truthy guard
  if (!mapInstance.current) return;  // L81 — can never be true
```
The inner check at L81 is dead. The outer guard at L80 already guarantees `mapInstance.current` is set.

**L415–417 — empty `matches` realtime handler:**
```ts
.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches' }, (_payload: any) => {
  // For future use
})
```
Registers a subscription, allocates a channel slot, delivers no behavior. Either implement it or remove it.

**L670–672 — `bookmark` command stub:**
```ts
if (cmd.type === 'bookmark' && cmd.bookmarkId) {
  // Visual feedback — star animation on the pinned resource (TODO: find pin and add star)
}
```
Dead. Never executes any code.

**L271–276 — `disasters-source` always empty:**
Added to the map but never populated with real data. Adds a layer for nothing.

**L536–546 — duplicate `filter` handler:**
Lines 514–516 handle `cmd.type === 'filter'` with `cmd.filterCategory`. Lines 536–546 handle the same `cmd.type === 'filter'` again with `(cmd as any).category`. Both run on every filter command. Different property names (`filterCategory` vs `category`) means they likely target different command shapes — but the duplication is confusing and error-prone.

**L43 — `DetailMode` type includes `'expanded'` but it's never set:**
```ts
type DetailMode = 'card' | 'expanded' | 'match';
```
Only `'card'` is ever assigned (L327, L381, L486, L682, L755). `'expanded'` is dead. `'match'` is also never actually assigned to `detailMode` — `matchMode` boolean is used instead. The `detailMode` state drives nothing visible in the JSX.

---

## 3. Compaction Opportunities

**L145–159 and L232–258 — duplicated `mapData` processing:**
The logic to iterate `mapData.requests`, `mapData.resources`, `mapData.organizations` and push into feature arrays is copy-pasted between the initial load and the `moveend` detail fetch. Extract a helper:
```ts
function ingestMapData(mapData, seenIds, requestFeaturesRef, resourceFeaturesRef): boolean
```
This would cut ~40 lines and fix the fact that the two copies have subtly different property spreads.

**L174–202 — repeated cluster layer pattern:**
Requests and resources each get the same four layers (glow, cluster circle, hit target, point) with only color and source name differing. A helper `addClusteredSource(map, name, color, features)` would reduce ~30 lines of copy-paste to two calls.

**L463–467 and L495–500 — `cmd.results` filtered twice:**
```ts
const resultFeatures = cmd.results.filter(r => r.lng != null && r.lat != null).map(...)  // L464
const validResults = cmd.results.filter(r => r.lng != null && r.lat != null)              // L495
```
Compute `validResults` once and reuse.

**L430–675 — 245-line monolithic map command effect:**
The `onMapCommand` subscription handles 11 command types inline. Each type (`show_results`, `show_route`, `show_gaps`, `show_activity`, `show_risk`, `track_sos`, `filter`, `focus`, `show_nearby`, `show_disaster`, `bookmark`) could be a named handler function, making the effect a dispatcher of ~15 lines.

**L684–687 — `timeSince` function defined but never called:**
```ts
function timeSince(d: string) { ... }
```
It's not referenced anywhere in this file's JSX or logic. Dead utility.

---

## 4. Security

**L397 — `person_id` exposed in realtime map features:**
```ts
properties: { ..., person_id: r.person_id }
```
The `person_id` cookie value gets broadcast to all connected clients via the realtime channel and stored in `requestFeaturesRef`. Any citizen viewing the map can read `person_id` values from other citizens' requests via browser devtools. If `person_id` maps to anything user-identifiable (profile, session), this is a PII leak. The `map-data` EF should be checked to see if it strips this field — the realtime path does not.

**L391–413 — direct realtime table access bypasses EF:**
The realtime subscriptions to `requests` and `resources` land raw `payload.new` rows (all columns including any non-public fields) on the client. Whatever RLS does NOT exclude will be visible. The EF `map-data` presumably selects only safe columns; the realtime path has no such guarantee. Verify RLS policies on both tables explicitly limit columns available to `anon`.

**L89 — `NEXT_PUBLIC_GOOGLE_MAPS_KEY` in client bundle:**
Used for reverse geocoding at L91. Standard practice for client-side Google Maps, but the key must have HTTP referrer restrictions in the Google Cloud console. No code issue here; flag for ops review.

**L14, L135–136, L225–226 — public env vars:**
`NEXT_PUBLIC_MAPBOX_TOKEN`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — all appropriately public. No secrets in this file.

**No direct mutations:** All writes go through `SOSBottomSheet`. This file is read-only from a data-mutation perspective.

---

## 5. Connection to Current Backend

**EF name `map-data`:** Used at L139 and L227. Verify this matches the deployed function name exactly (check `supabase/functions/` directory). No old names (`needs`, `offers`, `intake-ef`, etc.) appear here.

**Old data model (`needs`/`offers`):** Not present. The file uses `requests`/`resources` consistently — both in the EF response shape (L145, L149) and realtime table names (L391, L403). Aligned with current schema.

**Initial load uses wrong coordinates (L139):**
```ts
fetch(`${API_BASE}/functions/v1/map-data?lat=39&lng=-98&radius=3000`)
```
This is hardcoded to the US centroid. The GPS `useEffect` (L73–104) runs in parallel and updates `lat`/`lng` state, but by the time `map.on('load')` fires, the state values captured in the closure are still `39`/`-98`. The map never re-fetches with the user's actual GPS coords at initial load — only the `moveend` detail fetch (L227) uses live coordinates. This means the initial nationwide load is intentional (large radius = 3000km) but the comment at L130 says "Load requests + resources from EF" as if it should be user-centric.

**`matches` table name (L415):** Confirm the realtime table is named `matches` not `match_events` or similar in the deployed schema.

**Reports tileset `sos-reports-v2` / source-layer `sos-map-v2` (L205–215):** Static Mapbox tileset — not connected to live DB writes. Any new reports won't appear until the tileset is republished. This is a known architectural constraint but worth flagging if reports are expected to be near-realtime.

---

# Citizen Portal Audit — `app/(citizen)/c/manage/page.tsx`

Audited: 622 lines. Date: 2026-05-04.

---

## 1. Data Sources

### Edge Function calls
| EF name | Location | Notes |
|---|---|---|
| `query-matches` | L68, L73 | Called via `api.queryMatches()` — **NOT in deployed list** |

`getSOSScore(pid)` at L52 is from `@/lib/citizen-api` — presumably delegates to `score-compute` EF (not traceable from this file alone).

### Direct `db.from()` queries (all bypass EFs)
| Table | Operation | Location | Comment in code |
|---|---|---|---|
| `requests` | SELECT | L55 | `// KEEP: needs dedicated EF` |
| `resources` | SELECT | L57 | `// KEEP: needs dedicated EF` |
| `requests` | UPDATE (status) | L116 | `// KEEP: needs dedicated EF` |
| `resources` | UPDATE (status) | L116 | `// KEEP: needs dedicated EF` |
| `requests` | UPDATE (details, urgency, household_size) | L130 | `// KEEP: needs dedicated EF` |
| `resources` | UPDATE (details, capacity_available) | L149 | `// KEEP: needs dedicated EF` |

All six are acknowledged as temporary with TODO comments, but they are live in production code today.

### Raw `fetch()` to EF
`match-respond` is called twice via raw fetch (L449, L465) for Accept/Decline actions on proposed matches — NOT via `api.*`. **`match-respond` is not in the deployed EF list.**

### Realtime subscriptions
- `supabase.channel('manage-matches')` — listens to `*` events on the `matches` table (L91–97). Triggers a full `loadData()` reload on any change.

---

## 2. Dead / Stale Code

**`api` import used only for `queryMatches` (L8):** `api` is imported from `@/lib/api`. The only call is `api.queryMatches()`, which resolves to a non-deployed EF (`query-matches`). If this EF doesn't exist, both calls at L68 and L73 silently return `[]`, meaning the Matches tab will always be empty.

**`supabase` import (L9):** Imported from `@/lib/supabase-client` and used only for the realtime channel (L91). The data queries all use `db` instead. Consistent — not dead — but the two-client pattern (`db` vs `supabase`) is worth consolidating.

**Hardcoded `locationName="United States"` and `status="safe"` on `CitizenHeader` (L174):** These are not derived from actual user data.

---

## 3. Compaction Opportunities

**Accept/Decline inline fetch duplicated:** The raw `fetch()` to `match-respond` is copy-pasted at L445–455 (Accept) and L462–471 (Decline) with only the `response` field differing. Extract to a shared `respondToMatch(matchId, response: 'accept' | 'decline')` function.

**`updateStatus` is generic but edit saves are separate:** `updateStatus` (L112) handles status transitions for both `requests` and `resources` tables. `saveRequestEdit` (L126) and `saveResourceEdit` (L145) each call `db.from(table).update()` independently with the same boilerplate (setSaving, error handling, flash, reload). A single `patchRow(table, id, patch)` helper would consolidate all six `db.from()` calls.

**`showFlash` / `showError` pattern (L102–110):** Both are identical timeout-then-clear patterns. Could be one `flashState(setter, id, ms)` utility, though this is minor.

---

## 4. Security

**Direct mutations bypass EFs (HIGH):** All status updates and field edits call `db.from(table).update()` directly. There is no server-side:
- Validation that the requesting `person_id` owns the row (relies entirely on RLS)
- Audit log of the change
- Business logic (e.g., preventing a `closed` request from being re-opened)

The `// KEEP: needs dedicated EF` comments acknowledge this, but until the EFs exist, the client enforces all invariants.

**`match-respond` called with anon key in Authorization header (L448, L465):**
```ts
headers: { 'apikey': anon, 'Authorization': `Bearer ${anon}`, ... }
```
Using the anon key as a bearer token is the standard Supabase pattern for unauthenticated EF calls. However, `actor_id: personId` (a cookie value) is the only identity proof — there is no JWT verification. Any caller who knows a `match_id` and `person_id` can accept or decline on behalf of another person.

**No PII in SELECT columns:** The `requests` query at L55 selects `id, category, details_sanitized, urgency, status, household_size, created_at` — no `latitude`, `longitude`, or raw address. The `resources` query is similarly scoped. Clean.

---

## 5. Connection to Current Backend

**`query-matches` — NOT in deployed list:** `api.queryMatches()` (L68, L73) calls a function named `query-matches`. This name does not appear in the deployed EF list. The Matches tab will be permanently empty until this is resolved. Likely candidate replacement: `sos-read` with a `type: 'matches'` parameter, or a new dedicated EF.

**`match-respond` — NOT in deployed list:** Called at L449 and L465. Not deployed. Accept/Decline actions silently fail with a 404. The `if (!res.ok)` guard logs the error but shows no UI feedback to the user.

**`score-compute`:** Assumed to back `getSOSScore()`. If deployed and working, the Score card in the Overview tab is functional.

**Table names `requests`/`resources`/`matches`:** All consistent with current schema — no legacy `needs`/`offers` references.

---

---

# Citizen Portal Audit — `app/(citizen)/c/match/page.tsx`

Audited: 438 lines. Date: 2026-05-04.

---

## 1. Data Sources

### Edge Function calls
None via `api.*`. The only EF call is a raw `fetch()`:

| EF name | Location | Notes |
|---|---|---|
| `match-respond` | L218 | Raw fetch, anon key in header — **NOT in deployed list** |

### Direct Supabase queries (all bypass EFs)
| Table | Operation | Location | Notes |
|---|---|---|---|
| `requests` | SELECT id | L98 | via `db` — get citizen's request IDs |
| `resources` | SELECT id | L99 | via `db` — get citizen's resource IDs |
| `matches` | SELECT + join | L114–119 | via `supabase` — proposed matches on request_ids |
| `matches` | SELECT + join | L143–148 | via `supabase` — proposed matches on resource_ids |
| `matches` | SELECT + join | L183–187 | via `supabase` — accepted matches on request_ids |
| `matches` | SELECT + join | L192–197 | via `supabase` — accepted matches on resource_ids |

The 4 `matches` queries select joined data from `resources`, `requests`, and `organizations` tables via PostgREST foreign-key relationships. Correctness depends entirely on RLS policies across all three tables.

### Realtime subscriptions
- `supabase.channel('matches-realtime')` — `INSERT` on `matches` table (L83–91). Triggers full `loadProposals()` reload. No filter on `person_id` — fires for every new match inserted globally, not just the citizen's.

---

## 2. Dead / Stale Code

**`supabase` used but never imported (CRITICAL BUG):** The file imports `db` from `@/lib/api` (L2) but uses the bare `supabase` identifier at L84, L114, L143, L181, L191. `supabase` is not imported anywhere in this file. This is either a build error caught at compile time, or `supabase` is somehow re-exported/globally available via `@/lib/api`'s side effects. If it compiles, the match page works; if not, the entire page crashes. Must verify the module resolution chain.

**`db` import used inconsistently (L2, L98–99):** `db` is used only for the two initial ID lookups at L98–99. The 4 heavier `matches` queries all use `supabase` directly. There is no functional reason for the split — it reflects an in-progress migration. Consolidate to one client.

**`getCardCoords` returns `null` silently (L269–273):** If neither direction has coordinates, the Mapbox static image `<img>` simply doesn't render (returns `null` from the IIFE at L333). No placeholder or fallback — the map area shows as the dark `#1A3850` background with no explanation. This is a UX gap, not dead code, but worth noting.

**`match_reasoning` rendered but field may be null (L403–405):** Rendered with `line-clamp-2` — handles null gracefully via the `&&` guard. Not dead, just defensive.

---

## 3. Compaction Opportunities

**Four `matches` queries with identical SELECT string (L116, L144, L183, L192):** The full join select `'id, match_score, match_summary_masked, match_reasoning, status, created_at, request_id, resource_id, resources(...), requests(...)'` is copy-pasted verbatim. Extract as a `MATCH_SELECT` constant.

**`requestMatches` and `resourceMatches` map functions (L120–136, L148–164) are identical:** Both produce the same shape with only `direction` differing. A helper `normalizeMatch(m, direction)` would replace ~30 duplicated lines.

**Accepted-matches section (L176–201) duplicates the proposed-matches pattern:** Same two-query fan-out (request_ids, then resource_ids), same deduplication, same sort. The 6-query `loadProposals` function could be restructured around a shared `queryMatchesByIds(requestIds, resourceIds, statuses)` helper.

**`getCardCategory` / `getCardDescription` / `getCardLocation` / `getCardCoords` (L256–273):** Four small pure functions that each switch on `direction`. Could be consolidated into a single `getCardData(proposal)` that returns all four values at once, avoiding 4 repeated direction checks per render.

---

## 4. Security

**`match-respond` called with anon key as bearer (L216–231):** Same pattern as `manage/page.tsx`. No JWT — identity relies solely on `actor_id: personId` (cookie). Any actor who knows a valid `match_id` can accept on behalf of another person.

**Realtime subscription unfiltered (L83–91):** `INSERT` on `matches` fires globally. On a high-volume event, every connected citizen receives a channel event and triggers a full `loadProposals()` reload. At scale this is a DoS-by-legitimate-use problem. Filter to `person_id` in the subscription filter clause, or throttle/debounce the reload.

**Mapbox token in `<img src>` URL (L339):**
```ts
src={`https://api.mapbox.com/...?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`}
```
Standard client-side Mapbox pattern. Token is public (`NEXT_PUBLIC_`). Ensure the Mapbox token has URL restrictions in the Mapbox console.

**Joined `organizations.name` in match display (L384):** Organization names are shown to citizens. If an organization name contains PII or is sensitive, it becomes visible to the citizen being matched. Not a bug — this is intentional UX — but the RLS policy on `organizations` should confirm which columns `anon` can read.

**No error UI on accept failure (L232–238):** If `match-respond` returns non-OK, the error is logged to the console only. The card is advanced regardless (`setCurrentIndex(prev => prev + 1)` at L242 runs unconditionally). The citizen has no indication the accept failed.

---

## 5. Connection to Current Backend

**`match-respond` — NOT in deployed list:** The Accept action (L218) calls this EF. Not deployed. Every acceptance silently 404s. Citizens cannot accept match proposals. This is the highest-priority fix for this file.

**`query-matches` — NOT referenced here:** This page bypasses `api.queryMatches()` and queries `matches` directly. That's why proposals load (unlike `manage/page.tsx` which uses `api.queryMatches()` and gets empty results). The two pages use different strategies to fetch the same data — inconsistency that should be unified.

**`supabase` client missing import:** If the build succeeds, either `@/lib/api` re-exports `supabase` as a side effect or there is a global shim. If not, this page fails to compile. Verify immediately.

**`matches` join to `resources` → `organizations`:** Relies on the FK chain `matches.resource_id → resources.id → resources.org_id → organizations.id` being present and accessible under `anon` RLS. If `resources` rows are citizen-owned (not org-owned), `organizations` will be `null` for all citizen-resource rows — confirmed by the optional-chaining at L129, L384.

**`status` values `'connected'` (L185, L193):** Accepted-matches query includes `'accepted', 'connected', 'fulfilled'`. `'connected'` is not a status confirmed in the deployed schema — verify it exists, or remove it from the filter to avoid silently excluding rows.

---

---

# Citizen Portal Audit — `lib/api.ts`, `lib/citizen-api.ts`, `lib/person-cookie.ts`, `c/agent`, `c/feed`, `c/profile`

Audited: 6 files. Date: 2026-05-04.

---

## 1. lib/api.ts — EF Call Inventory

**Deployed EF list (reference):** sos-write, sos-read, sos-update, sos-notify, sos-sync, match-request, match-transport, erv-match-propose, resource-search, address-autocomplete, alerts-feed, fema-check, image-analyze, sitrep-write, score-compute, community-messages, partner-onboard, referral-track, inventory-query, inventory-write, sms-intake, cron-process-notifications

| `api.*` method | EF name called | Status | Notes |
|---|---|---|---|
| `queryMatches` | `query-matches` | **DEAD** | No deployed EF with this name |
| `respondMatch` | `respond-match` | **DEAD** | No deployed EF with this name |
| `fulfillMatch` | `fulfill-match` | **DEAD** | No deployed EF with this name |
| `consentFlow` | `consent-flow` | **DEAD** | No deployed EF with this name |
| `ervQuery` | `erv-query` | **DEAD** | No deployed EF with this name |
| `ervUpdate` | `erv-update` | **DEAD** | No deployed EF with this name |
| `ervMatchPropose` | `erv-match-propose` | **LIVE** | Exact match in deployed list |
| `submitIntake` | `submit-intake` | **DEAD** | Deployed name is `sms-intake` (different function) |
| `searchResources` | `resource-search` | **LIVE** | Exact match in deployed list |
| `submitSitrep` | `submit-sitrep` | **DEAD** | Deployed name is `sitrep-write` |
| `queryPartner` | `query-partner` | **DEAD** | No deployed EF with this name |
| `onboardPartner` | `onboard-partner` | **DEAD** | Deployed name is `partner-onboard` (reversed order) |
| `partnerReferral` | `partner-referral` | **DEAD** | Deployed name is `referral-track` |
| `getAlerts` | `get-alerts` | **DEAD** | Deployed name is `alerts-feed` |
| `checkFema` | `check-fema` | **DEAD** | Deployed name is `fema-check` |
| `analyzeImage` | `analyze-image` | **DEAD** | Deployed name is `image-analyze` |
| `getMessages` | `get-messages` | **DEAD** | Deployed name is `community-messages` |
| `postMessage` | `post-message` | **DEAD** | No deployed EF with this name |
| `queryInventory` | `query-inventory` | **DEAD** | Deployed name is `inventory-query` |
| `writeInventory` | `write-inventory` | **DEAD** | Deployed name is `inventory-write` |
| `getNotifications` | `get-notifications` | **DEAD** | No deployed EF with this name; `cron-process-notifications` is a cron trigger, not a read endpoint |

**Summary: 2 LIVE, 19 DEAD.** The majority of `lib/api.ts`'s named surface calls nonexistent EFs. The root cause is a naming convention mismatch — the frontend uses verb-noun order (`get-alerts`, `check-fema`, `analyze-image`) while the deployed functions use noun-verb order (`alerts-feed`, `fema-check`, `image-analyze`). This is a systematic rename problem, not 19 individual bugs.

**CRITICAL OMISSION — `api.getScore` is missing entirely:** `citizen-api.ts:43` and `profile/page.tsx:36` both call `api.getScore(personId)`. This method does not exist anywhere in `lib/api.ts`. Every call is a runtime `TypeError: api.getScore is not a function`. The SOS Score feature is broken across all /c/* pages that use it. The deployed EF `score-compute` is the intended backend — a wrapper is simply missing.

**`db` export (L146–191):** The `db` object creates a direct Supabase client using `NEXT_PUBLIC_SUPABASE_ANON_KEY`. This is intentionally read-only and RLS-protected. It also exposes `db.from(table)` as a raw escape hatch (`efCall` has an equivalent `api.efCall`). Fine architecturally, but pages using `db.from()` directly for writes (as seen in manage/page.tsx) are a security concern noted in prior audits.

---

## 2. lib/citizen-api.ts — What It Does

**Mechanism:** Thin wrapper around `lib/api`. All calls delegate to `api.*` — no direct Supabase queries. Comment at L4 states this explicitly ("Never calls Supabase directly for operational data"). Clean architectural intent.

**Broken calls:**
- `getSOSScore` (L42): calls `api.getScore(personId)` — **`api.getScore` does not exist**. Returns the hardcoded fallback object every time (zero scores, generic next_action). The fallback silently masks the bug.
- `getAlerts` (L22): calls `api.getAlerts()` → `get-alerts` EF → **DEAD** (deployed: `alerts-feed`). Returns `[]` always.
- `getCommunityPreview` (L103): calls `api.getMessages('local')` → `get-messages` EF → **DEAD**. Also calls `api.queryInventory()` → `query-inventory` EF → **DEAD**. Returns `{ messages: [], memberCount: 0, helperCount: 0 }` always.
- `getExternalResources` (L119): calls `api.searchResources()` → `resource-search` EF → **LIVE**. This function works.
- `checkFEMA` (L139): calls `api.checkFema()` → `check-fema` EF → **DEAD** (deployed: `fema-check`). Returns error/undefined.

**Live calls:** Only `searchResources` / `getExternalResources` works end-to-end.

**Dead code:**
- `queryWithTaxonomy` (L80–89): A generic Supabase query helper. Nothing in this file calls it. It is exported but not referenced in any of the audited files. Likely vestigial from a refactor.
- `haversine` (L129–135): Used only by `getExternalResources`. Not dead — but if `searchResources` already returns distance-sorted results from the EF, the client-side haversine filter at L125–126 is redundant double-filtering.

**TODO comment (L1):** `// TODO: migrate all queries to use taxonomy_code as primary filter, category as fallback` — this is a file-level instruction that has not been acted on. The `queryWithTaxonomy` helper exists for this purpose but is unused.

---

## 3. lib/person-cookie.ts — Citizen Identity

**Mechanism:** Dual-write identity — `localStorage` primary, `document.cookie` as fallback. Both are keyed by `'sos-person-id'`. On `getPersonId()`, localStorage is checked first; if missing, the cookie is read and backfilled into localStorage. The cookie has `max-age=365 days`, `path=/`, `SameSite=Lax`.

**Security issues:**

1. **No `HttpOnly` flag.** The cookie is readable by JavaScript. Since the entire identity system is client-side by design (localStorage + JS-readable cookie), this is consistent — but it means XSS in any page of the app can exfiltrate the person_id and impersonate the user. There is no HttpOnly backstop.

2. **No `Secure` flag.** The cookie can be transmitted over HTTP. In production on HTTPS this is harmless, but in development or a misconfigured environment it leaks over plaintext.

3. **No server-side session.** `person_id` is a self-asserted opaque ID. There is no token, no signature, and no expiry on the value itself. Any caller who knows a `person_id` can pass it as `x-person-id` in the chat API header (as done in `agent/page.tsx:37`) and act as that person. The security model relies entirely on `person_id` being unguessable (UUID) and not being leaked — which the earlier audit found IS being leaked via realtime map features.

4. **`clearPersonId` does not clear the localStorage key before deleting the cookie** — actually it does (`localStorage.removeItem(KEY)` at L21). No bug, but both branches should be verified on sign-out.

5. **`SameSite=Lax` is appropriate** for a same-origin app. No cross-site submission concern.

**No `Secure` + no `HttpOnly` = the cookie provides convenience but not security. The identity model is "privacy by obscurity of UUID" — acceptable for a low-stakes profile but not for anything financial or medical.**

---

## 4. c/agent/page.tsx — Chat Agent

**What it is:** A streaming chat UI using `@ai-sdk/react`'s `useChat` hook with a `DefaultChatTransport` pointed at `/api/chat` (a Next.js route handler, not a Supabase EF). Renders AI tool call results via `AIToolRenderer`. Supports chat persistence via `lib/chat-persistence`.

**API it hits:** `POST /api/chat` — an internal Next.js API route. The `person_id` from the cookie is forwarded as `x-person-id` and `x-authenticated` headers (L35–38). The route handler itself is not audited here, but the transport layer is clean.

**What renders:** Text messages (user + assistant), tool call loading states, tool result cards via `AIToolRenderer`. Quick chips for common actions. Mobile keyboard avoidance via `visualViewport`.

**Dead code:**
- `loadChatHistory` is imported (L10) but never called — chat history is saved (`saveChatHistoryDebounced` at L76) but never loaded. On page load, chat always starts empty. Either the load was removed or was never wired up.
- `getPersonContext` is imported (L11) but never called anywhere in the component. Dead import.

**Data loads:** No direct data fetches. All data goes through the `/api/chat` route handler which presumably calls EFs. This page itself is stateless beyond the chat messages.

**Actions work:** Sending messages works (assuming `/api/chat` is deployed). The quick chip actions (`help`, `offer`, `report`, `score`) work by injecting text into `sendMessage`. Tool call rendering works if the route handler emits `__tool`-shaped JSON.

**Connected to current backend:** Yes, via `/api/chat`. Not dependent on the EF naming issues in `lib/api.ts`. However, `x-authenticated` is set based on cookie presence alone (L37) — no actual auth verification. The route handler must treat this as untrusted.

---

## 5. c/feed/page.tsx — Feed

**Data source:** Calls `api.getMessages('community')` on mount (L31). This resolves to the `get-messages` EF → **DEAD** (deployed name: `community-messages`). The feed always loads empty.

**What renders:** Filter pills (all/alerts/community/needs/reports), list of feed items mapped from community messages. The `alerts`, `needs`, and `reports` filter categories are never populated — the only data source is community messages, and that source is broken. Even if fixed, there is no `needs` data source anywhere in this page.

**Data loads:** **No.** `api.getMessages` calls a nonexistent EF name and will throw or return an error, causing `feedItems` to stay `[]`. The catch is missing — an unhandled rejection would bubble to the React error boundary.

**Actions work:** No write actions in this page. SOS bottom sheet is wired but not part of feed data. Read-only page that reads nothing.

**Connected to current backend:** **No.** Fix: rename `get-messages` → `community-messages` in `lib/api.ts`.

---

## 6. c/profile/page.tsx — Profile

**Data sources:**
1. `api.getScore(personId)` (L36) — **`api.getScore` does not exist**. Runtime TypeError. The entire `load()` function throws, `setLoading(false)` is never reached, the page spins forever.
2. `db.from('matches').select(...)` (L38) — **`db` is not imported**. The file imports `{ supabase }` from `@/lib/supabase-client` and `{ api }` from `@/lib/api`, but `db` is not in either import. This is a compile-time or runtime ReferenceError.
3. `db.from('community_messages').select(...)` (L40) — same missing import.

**What renders:** If the page loads at all (it crashes at load), it would show SOS score ring, readiness checklist, match/report counts, nav links, and sign-out. Score data comes from `getScore` (broken). Counts come from `db` (broken import). Readiness checklist items are hardcoded constants (fine).

**Data loads:** **No.** Two separate bugs prevent any data from loading — missing `api.getScore` method and missing `db` import.

**Actions work:** Readiness checklist buttons route to `/c/agent` (works). Sign-out calls `clearPersonId()` (works). Stats card routes to `/matches` (works). The data-dependent parts are broken.

**Connected to current backend:** **No.** Two fixes required: (1) add `api.getScore` wrapper calling `score-compute` EF, (2) add `{ db }` to the import from `@/lib/api`.

---

## 7. Compaction Opportunities Across All Files

**EF name mismatches (systematic):** 17 of 19 dead EF calls in `lib/api.ts` have a deployed equivalent with a different name. A single find-replace pass fixing the naming convention (noun-verb → verb-noun or vice versa) restores most of the API surface. The full mapping:

| Current name | Correct deployed name |
|---|---|
| `get-alerts` | `alerts-feed` |
| `check-fema` | `fema-check` |
| `analyze-image` | `image-analyze` |
| `get-messages` | `community-messages` |
| `query-inventory` | `inventory-query` |
| `write-inventory` | `inventory-write` |
| `submit-sitrep` | `sitrep-write` |
| `onboard-partner` | `partner-onboard` |

The remaining dead calls (`query-matches`, `respond-match`, `fulfill-match`, `consent-flow`, `erv-query`, `erv-update`, `submit-intake`, `query-partner`, `partner-referral`, `post-message`, `get-notifications`) have no obvious deployed equivalent and need either new EF deployment or replacement with `sos-read`/`sos-write` calls.

**`api.getScore` is missing** — add one method to `lib/api.ts`:
```ts
getScore: (personId: string) =>
  efCall('score-compute', { person_id: personId }),
```

**`queryWithTaxonomy` in citizen-api.ts** — exported but unused in audited files. Either wire it up to the `db.*` query helpers in `lib/api.ts` or remove it.

**`loadChatHistory` in agent/page.tsx** — imported but never called. Either wire it up on mount (load history for returning users) or remove the import.

**`getPersonContext` in agent/page.tsx** — imported but never called. Likely intended as context injection for the chat API headers. Remove or use.

**`timeSince` defined in both feed/page.tsx (L55) and the map page (L684)** — same function copy-pasted. Extract to a shared utility.

---

## 8. Summary Table — All /c/* Routes

| Route | Renders? | Data loads? | Actions work? | Connected to current backend? |
|---|---|---|---|---|
| `/c` (map) | ✅ Yes | ✅ Partial — `map-data` EF works; realtime works; `get-alerts` dead | ✅ Partial — map renders; SOSBottomSheet writes work; filter panel broken (`get-alerts` dead) | ✅ Partial — map-data live; alerts dead |
| `/c/manage` | ✅ Yes | ⚠️ Partial — score loads if `score-compute` live; requests/resources load via `db` (direct); matches tab empty (`query-matches` dead) | ❌ Broken — Accept/Decline call `match-respond` (dead EF); edits work via direct `db` | ❌ No — `query-matches` and `match-respond` not deployed |
| `/c/match` | ⚠️ Uncertain — `supabase` import missing; may fail to compile | ⚠️ Partial — proposals load via direct DB queries; accepted matches load | ❌ Broken — Accept calls `match-respond` (dead EF) | ❌ No — `match-respond` not deployed |
| `/c/agent` | ✅ Yes | ✅ Yes — chat streams from `/api/chat` | ✅ Yes — send/receive works; tool renders work | ✅ Yes — hits internal Next.js route, not EF layer |
| `/c/feed` | ✅ Yes (empty state) | ❌ No — `api.getMessages` calls dead EF `get-messages` | N/A — read-only page | ❌ No — EF name mismatch; fix: rename to `community-messages` |
| `/c/profile` | ❌ No — crashes on load | ❌ No — `api.getScore` missing (TypeError); `db` not imported (ReferenceError) | ❌ No — page never finishes loading | ❌ No — two separate bugs block all data |
