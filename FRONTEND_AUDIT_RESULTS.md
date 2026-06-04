# Frontend Audit — All 37 Pages

**Date:** 2026-06-03

This audit covers all 37 routes of the SOS `sos-frontend` Next.js application. The single most important finding is systemic and applies to nearly every authenticated page: the auth layer (`lib/auth-context.tsx`) is hardwired to a constant `DEMO_CTX` that pins every visitor to the ERV org as an admin, with no login, no role resolution, and no org scoping. Combined with the project's reliance on a `proxy.ts` route allowlist (rather than per-request auth) for gating, this means any visitor who can reach an authenticated route is treated as an ERV admin — exposing ERV PII and admin write controls, and in two cases (the Match board and the Directory browse Organizations tab) leaking data across *all* orgs because the org filter is silently dropped. Beyond auth, the audit surfaced a recurring "swallowed error → blank/empty UI indistinguishable from a real outage" pattern, several pages still driven by emptied mock arrays (rendering "not found" or crashing), a duplicate object key in `lib/api.ts` that silently rewrites an EF action, a cluster of detail-page back-links missing the `/app` prefix, and 10 effectively stale/orphaned routes.

**Aggregate stats**
- Pages audited: 37 / 37
- Status: `fail` = 26 · `warn` = 9 · `pass` = 2
- Total confirmed/unverified findings (false-positives excluded): 219
- Stale routes (10): `/app/command/[id]`, `/app/directory/volunteer/[id]`, `/app/onboard`, `/app/settings/org`, `/app/settings/people`, `/app/settings/profile`, `/c/feed`, `/c/profile`, `/home`, `/share/incident/[id]`

---

## Systemic / Cross-Cutting Issues

### 1. DEMO_CTX hardcoded-auth bypass (CRITICAL, systemic)
**What:** `lib/auth-context.tsx` hardwires `AuthProvider` to a constant `DEMO_CTX` (orgId pinned to ERV `9ad0f2ad-7789-47a8-bfba-0ae3382c86cc`, role `admin`, `isAdmin`/`isPartner` true, `loading` false). There is no real authentication, login, or org resolution. Every page that calls `useAuthContext()` receives the same ERV-admin identity regardless of who the visitor is.

**Where:** `lib/auth-context.tsx:16-33`; consumed by virtually every `/app/*` page and several detail pages.

**Impact:** Because route gating is enforced only by the `proxy.ts` allowlist (no redirect-on-unauthed in pages), any visitor reaching an authenticated route is treated as ERV admin. This exposes:
- ERV survivor/volunteer PII (names, phones, counties, household composition, exact lat/lng) on `/app/cases`, `/app/cases/[id]`, `/app/directory/browse`, `/app/directory/person/[id]`, `/app/directory/request/[id]`, `/app/transport`, `/app/volunteers`.
- ERV admin write controls (create/edit/delete cases, events, inventory, portal config, org profile, team membership) on `/app/cases`, `/app/calendar`, `/app/inventory`, `/app/settings`, `/app/settings/org`, `/app/settings/people`, `/app/directory/org/[id]`, `/app/directory/resource/[id]`.
- Org-scoped aggregates on `/app/command`, `/app/reports`, `/app/directory`, `/app/map`.

No page performs a real `isAdmin`/role check even where it surfaces admin-only tooling. Several pages also pass `orgId || ''` with a comment like "admin: proceed without org filter" — a latent unscoped-fetch path that never triggers today only because DEMO_CTX is always set.

**Fix:** Replace DEMO_CTX with real authentication; derive `orgId`/role from a verified session; gate admin surfaces on a real `isAdmin` check; have EFs enforce org scoping server-side; never fall back to an empty `org_id` (which implies all-org). Until real auth lands, treat every `/app/*` route as exposing ERV admin data and PII to anyone who can reach it.

### 2. Org scope silently dropped → cross-tenant data leak (CRITICAL)
**What:** Two reads ask for data with *no* org filter at all, leaking across every org rather than just ERV:
- `crmMatchesList(orgId)` (`lib/api.ts:165-191`) names its parameter `_orgId` and never uses it. It runs a **direct anon-key** `supabaseRead.from('matches')` join (requests/persons/resources), `limit(500)`, no org filter. The Match board (`/app/match`) therefore lists every org's matches including survivor `request_person_name`.
- `crmBrowseOrgs({limit:100})` (`lib/api.ts:201-202`) sends **no** `org_id`, so `/app/directory/browse?type=orgs` and `/app/directory` org counts reflect *all* organizations.

**Where:** `lib/api.ts:165-191`, `lib/api.ts:201-202`; consumers `app/app/match/page.tsx:96`, `app/app/directory/browse/page.tsx:112`, `app/app/directory/page.tsx:43`.

**Impact:** Combined with the DEMO_CTX bypass, any visitor sees cross-org match records (with PII) and a cross-tenant org directory. The only thing standing between a visitor and the data is whatever RLS is on the anon-key client / EF — which cannot be confirmed from the frontend and is clearly not relied on by intent.

**Fix:** Route match reads through an org-scoped EF (rename/use the `orgId` param, filter by org); pass an org/network filter to `browse_orgs` and enforce membership server-side. Stop using direct anon-key PostgREST for tenant data.

### 3. Duplicate `crmOrgMembers` key in `lib/api.ts` (HIGH)
**What:** The `api` object literal defines `crmOrgMembers` twice — `lib/api.ts:204-205` (`action:'list_org_members'`) and `lib/api.ts:288-289` (`action:'org_members'`). Per JS object-literal semantics the second definition wins, so every caller silently sends `action:'org_members'`, never `list_org_members`.

**Where:** `lib/api.ts:204-205` and `lib/api.ts:288-289`; consumers `app/app/directory/org/[id]/page.tsx:49,82`, `app/app/settings/people/page.tsx:42`.

**Impact:** If the deployed `crm-directory` EF only implements `list_org_members`, the member fetch returns non-2xx → `efCall` throws → caught and swallowed → empty member rosters on the org-detail and team-settings pages, with member counts/trust understated. Which action the EF actually implements cannot be confirmed from the frontend.

**Fix:** Remove the duplicate definition (keep exactly one) and align the action string with the deployed EF; stop silently swallowing the members fetch error.

### 4. Pervasive swallowed-error / no-loading-state pattern (HIGH, systemic)
**What:** `efCall` throws on any non-2xx (`lib/api.ts:27-29`) and never catches internally — callers must handle rejection. Many pages either swallow the error (`.catch(()=>null)`, `.catch(()=>{})`, empty `catch {}`), use `Promise.allSettled` (which never rejects, so the trailing `.catch` is dead and `useApiFetch`'s error path never fires), or omit a loading flag entirely. The result is a UI where a backend outage is indistinguishable from a genuinely empty dataset, often with no retry.

**Where (representative):** `app/app/map/page.tsx:243-245,355-363`; `app/app/cases/page.tsx:317,366` (allSettled dead `.catch`); `app/app/command/page.tsx:28-30`; `app/app/directory/page.tsx:42-53`; `app/app/directory/browse/page.tsx:108,129` (toast-only, no state); `app/app/inventory/page.tsx:109-121` (allSettled defeats `useApiFetch` error path); `app/app/reports/page.tsx:69` (error/refetch never destructured); `app/app/volunteers/page.tsx:66-73` (loading/error discarded); `app/app/calendar/page.tsx:50-58` (no loading; empty results discarded); `app/(citizen)/c/feed/page.tsx:29-51` (no try/catch → stuck spinner forever); `app/(citizen)/c/profile/page.tsx:32-44` (no try/catch → stuck spinner); `app/(citizen)/c/manage/page.tsx:51-62` (no try/catch; score await gates all data); `app/drive/[id]/page.tsx:84,90-96` (empty catch; "Trip not found" for loading/error/missing alike).

**Impact:** Silent blank/empty screens on transient failures; stuck loading spinners on the citizen feed/profile; misleading "no data" / "not found" states; no retry path. Several allSettled usages actively defeat error handling that `useApiFetch` would otherwise provide.

**Fix:** Standardize on try/catch (or let fetchers reject so `useApiFetch` surfaces `error`/`refetch`); add explicit loading flags and distinct error-with-retry vs empty-state UI; stop wrapping in `allSettled` when you want failures surfaced (or inspect `status==='rejected'`).

### 5. Pages bypassing `lib/api.ts` / direct PostgREST (MEDIUM–HIGH, project-rule violation)
**What:** CLAUDE.md mandates "All data fetches via edge functions, never direct PostgREST." Several paths bypass `lib/api.ts`:
- `app/app/match/page.tsx` Board mode → direct anon-key `supabaseRead.from('matches')` (via the unused-arg `crmMatchesList`, see #2).
- `app/(citizen)/c/match/page.tsx:87-95,118-123,146-151,185-201` → four raw `supabase.from('matches')` PostgREST joins + a realtime channel, pulling raw `location_text`/`latitude`/`longitude`/`organizations(name)`, bypassing the EF masking layer.
- `app/(citizen)/c/page.tsx` → raw `fetch()` POST to `sos-read` (`citizen-map-client.tsx:140-144`), reconstructing BASE_URL/Bearer inline; plus a direct realtime channel.
- `app/(citizen)/c/manage/page.tsx:72-80` → direct unscoped realtime subscription on `matches`.
- `app/app/directory/browse/page.tsx:70` and `app/app/volunteers/page.tsx:80-86` → raw `efCall('partner-write', …)` (no typed wrapper; EF deployment unconfirmed).

**Impact:** Data scoping/PII masking depends on RLS rather than the EF layer; key/URL changes in `api.ts` won't propagate; potential cross-person reads on the citizen match page if anon RLS is permissive (the `sos-person-id` cookie is unsigned).

**Fix:** Add EF-backed `api.ts` wrappers (e.g. `mapArea`, a match-read EF that returns masked fields) and route all reads through them; keep realtime as a trigger-to-refetch only, documented as a sanctioned exception.

### 6. Detail-page back-links missing the `/app` prefix → 404 (MEDIUM, systemic)
**What:** `DetailTopBar` renders `backTo` verbatim as a Next `<Link href>`. Multiple detail pages pass un-prefixed paths that have no route file and no `next.config.ts` rewrite, so the back arrow 404s: `/directory` (org/[id], person/[id], volunteer/[id]), `/reports` (report/[id]), `/cases`/`/inventory` (request/resource detail), `/command` (command/[id], in both loading and not-found states). The same un-prefixed `/cases/…` and `/directory/import` pattern appears in `command-palette.tsx`, `components/directory/Timeline.tsx`, and `components/directory/Sidebar.tsx`.

**Where:** `app/app/directory/org/[id]/page.tsx:142`; `app/app/directory/report/[id]/page.tsx:53,63,147`; `app/app/directory/volunteer/[id]/page.tsx:43,53,96`; `app/app/command/[id]/page.tsx:74,88`; `components/crm/DetailShell.tsx:64-65`.

**Fix:** Change all `backTo` values to the `/app`-prefixed routes (e.g. `/app/directory`, `/app/reports`, `/app/command`); audit `command-palette.tsx`, `Timeline.tsx`, `Sidebar.tsx` for the same.

### 7. Emptied mock arrays still driving render (HIGH, systemic)
**What:** `lib/directory-data.ts` was emptied 2026-05-24 (`people=[]`, `orgs=[]`), and several pages declare module-level empty constants that were never populated. Pages that still read from these render "not found", crash, or show permanently-empty UI: `/app/directory/person/[id]` (always "Person not found"; would also crash on undefined-field access and violates Rules of Hooks if fixed), `/app/volunteers` (detail drawer never opens, week-availability grid always empty), `/app/inventory` (`assetEvents`/`orgs` empty → blank columns), `/app/cases/[id]` (`orgs`/`matches`/`cases` placeholders → dead lookups), `/app/calendar` (`orgs=[]` → `orgs[0].id` crashes the New-event drawer), `/app/reports` (proto fallbacks always empty), `/app/map` (`cases=[]` dead SVG scaffolding).

**Fix:** Drive these pages from the real EF responses; remove the dead mock constants and the SVG/coverage scaffolding.

### 8. Cluster of stale / orphaned routes (10 routes)
**What:** Ten routes have zero (or non-functional) inbound references and are reachable only by typing a URL: `/app/command/[id]` (no incident links anywhere), `/app/directory/volunteer/[id]` (only linker omits the `[id]` segment; superseded by `person/[id]`), `/app/onboard` (no entry point), `/app/settings/org`, `/app/settings/people`, `/app/settings/profile` (settings index/layout provide no sub-nav), `/c/feed` (not in citizen nav), `/c/profile` (superseded by `/c/manage`), `/home` (not in `proxy.ts` allowlist → 404; superseded by `/home-v25.html`), `/share/incident/[id]` (only linker `ShareSitrepDialog` is never rendered).

**Impact:** Dead UI and unguarded surfaces (e.g. `/app/onboard` allows unauthenticated org creation; `/app/settings/org` exposes a live `updatePortalConfig` write if reached). `/home` returns 404 for real users.

**Fix:** For each, either wire a real entry point or delete the route. Several (settings sub-routes, `/c/profile`, `/c/feed`) overlap with live pages and should be consolidated. Touching `proxy.ts` requires explicit instruction (CLAUDE.md) — confirm intent before adding `/home`.

---

## Per-Page Results

| Route | Status | Stale | #Findings | Headline |
|---|---|---|---|---|
| /app | pass | no | 2 | Redirect-only index; blank flash + dead layout `orgId` read |
| /app/map | fail | no | 5 | Sidebar layer toggles dead (`__map` never set); ERV geodata exposed |
| /app/match | fail | no | 7 | Board leaks all orgs' matches + survivor PII; org scope dropped |
| /app/cases | fail | no | 7 | Cross-org SOS umbrellas + PII; deep links/columns broken |
| /app/cases/[id] | fail | no | 9 | Identity/status/summary never populate from API |
| /app/command | warn | no | 5 | Admin aggregates + agent exposed; errors swallowed to zeros |
| /app/command/[id] | warn | **yes** | 7 | Unreachable; `/command` back-link 404; pinned reports dead |
| /app/directory | warn | no | 4 | People/Orgs counts capped at 1; errors shown as 0 |
| /app/directory/browse | fail | no | 8 | Orgs tab leaks all orgs; people PII; no loading state |
| /app/directory/import | fail | no | 5 | Entire import flow is a mock; `/directory` links 404 |
| /app/directory/org/[id] | fail | no | 8 | Any visitor can view/edit any org; stuck loading if absent |
| /app/directory/person/[id] | fail | no | 9 | Always "Person not found"; crashes on undefined fields |
| /app/directory/report/[id] | fail | no | 4 | Back-link `/reports` 404; no org scoping; param-key mismatch |
| /app/directory/request/[id] | fail | no | 6 | Unguarded fields crash render; request PII unscoped |
| /app/directory/resource/[id] | fail | no | 6 | Zero org scoping on read+edit; dead owner link |
| /app/directory/volunteer/[id] | warn | **yes** | 4 | Orphaned dup of person/[id]; impact_score shown as "hours" |
| /app/calendar | fail | no | 6 | New-event drawer crashes on `orgs[0].id`; no loading state |
| /app/inventory | fail | no | 8 | Fetch failures swallowed; hardcoded condition/stars; PII-free but writable |
| /app/onboard | warn | **yes** | 4 | Orphaned; invites dropped; no validation on org create |
| /app/reports | fail | no | 6 | Severity donut + trend are hardcoded fake data |
| /app/settings | fail | no | 5 | Anyone can read+mutate ERV portal config; false success toasts |
| /app/settings/org | fail | **yes** | 5 | Orphaned; reads wrong response key → shows demo org; live Save |
| /app/settings/people | warn | **yes** | 7 | Orphaned; dup-key fetch; bare no-shell render |
| /app/settings/profile | warn | **yes** | 6 | Orphaned; all static demo content; unscoped save |
| /app/transport | fail | no | 6 | snake_case vs camelCase → driver/resource columns blank; driver PII |
| /app/volunteers | fail | no | 9 | Detail drawer/availability dead; loading/error discarded |
| /c | warn | no | 7 | Public map; raw `sos-read` fetch; pins always at US-center |
| /c/agent | warn | no | 6 | History saved but never restored; chat-history IDOR |
| /c/feed | fail | **yes** | 5 | Unreachable; no try/catch → stuck spinner; broken filter pills |
| /c/manage | fail | no | 6 | No error handling; match accept sends no `actor.id` |
| /c/match | fail | no | 7 | Direct PostgREST match reads; accept failure swallowed |
| /c/profile | fail | **yes** | 4 | Unreachable dup of /c/manage; stuck spinner; dead nav links |
| /join | fail | no | 5 | Join flow can never persist (tool not wired into chat) |
| /home | fail | **yes** | 5 | Not in proxy allowlist → 404; orphaned; GSAP-fail hides hero |
| /share/incident/[id] | fail | **yes** | 5 | Orphaned; consumed fields don't match EF shape → blank report |
| /erv/impact | pass | no | 3 | Public static impact page; hardcoded numbers, minor inconsistencies |

---

### /app — `app/app/page.tsx` — **pass**
**Purpose:** Pure client-side redirect from `/app` to `/app/cases`, preserving `?org=`. Renders no UI of its own.

**Data flow:** No data fetching. Reads `searchParams.get('org')` then `router.replace('/app/cases?org=…')` in a `useEffect`. `useSearchParams()` is correctly wrapped in Suspense with `fallback={null}`. Redirect target exists. **apiCalls:** none.

**Auth gating:** Does not call `useAuthContext()` (appropriate — loads no data). No hardcoded org id; org is forwarded from the query string. The wrapping layout (`app/app/layout.tsx:6`) destructures `orgId` and never uses it (harmless dead read).

**Findings:**
- `[LOW][other]` Redirect-only index renders a blank screen during the client-side hop — returns `null` + `fallback={null}`, then redirects in `useEffect` after hydration, so the user sees a blank frame (`app/app/page.tsx:11-25`). Fix: add a minimal centered loading indicator matching the dark theme, or use a server-side `redirect()` if route constraints allow.
- `[LOW][other]` Layout reads `orgId` from `useAuthContext` but never uses it — dead read suggesting incomplete org-gating intent (`app/app/layout.tsx:6`). Fix: remove the unused hook or implement the intended behavior.

### /app/map — `app/app/map/page.tsx` — **fail**
**Purpose:** CRM Map tab: Mapbox dark map of WNC with clustered/heatmap pins for cases/resources/facilities/events, sidebar counts, upcoming events, and `MapPinCard` deep-links.

**Data flow:** Single source `api.crmMapFeatures(orgId)` → `efCall('crm-map', {action:'get_features', org_id})` (POST), called **twice**: inside `MapboxEmbed`'s `map.on('load')` (`page.tsx:97`) and again at page level (`page.tsx:355`). The two sites normalize differently (page-level handles array OR `{features}`; embed reads only `data?.features`). A `'sos-map-cmd'` CustomEvent listener drives agent map behavior. No loading state, no user-facing error UI. **apiCalls:** `api.crmMapFeatures(orgId)` (POST, ×2).

**Auth gating:** `orgId` from DEMO_CTX (always ERV). Passes `orgId || ''` with an "admin: proceed without org filter" comment (latent unscoped path). Plots case county/status/title and resource locations — PII-adjacent survivor geodata exposed to any visitor under the bypass.

**Findings:**
- `[HIGH][broken-display]` Sidebar layer-toggle checkboxes are dead — handler reads `(.mapboxgl-map).__map` which Mapbox never sets and which is never assigned anywhere in the repo, so `map` is always undefined and toggles do nothing (`page.tsx:442-450`). Fix: expose the map via `onMapReady(map)` from `MapboxEmbed`, or reuse the existing `'sos-map-cmd'` filter path.
- `[MEDIUM][error-state]` Both `crm-map` fetches swallow errors with no user-facing state — failed EF renders a blank map + frozen 0 counts, indistinguishable from empty (`page.tsx:243-245,353-364,366`). Fix: track loading/error and render a retry overlay.
- `[MEDIUM][data-flow]` Features fetched twice and parsed differently — two POSTs per mount; if `crm-map` returns a bare array the sidebar populates but the map shows zero pins (`page.tsx:97-98 vs 355-359`). Fix: fetch once at page level and pass features down.
- `[MEDIUM][auth]` Org-scoped case geodata renders to any visitor under DEMO_CTX (`page.tsx:348,354-355,389`). Fix: scope by authenticated org/role; don't fall back to empty `org_id`.
- `[LOW][other]` Dead SVG-prototype scaffolding (`cases`, `counties`, `SVG_W/H`, `toSVG`, `activeCounty`/`setActive`, `countyCases`), `orgId` string|null passed as string, and decorative Filter/Drop-pin/taxonomy controls with no handlers (`page.tsx:6,300-320,349,367,59/389,376-381,400-406`). Fix: delete dead code; type `orgId` as string|null; wire or remove decorative controls.

### /app/match — `app/app/match/page.tsx` — **fail**
**Purpose:** Match page with a Kanban Board (matches grouped by status) and a Match Workbench (pick request → scored candidate orgs → accept/decline).

**Data flow:** Board: `api.crmMatchesList(orgId)` which **ignores the org arg** and runs a direct anon-key `supabaseRead.from('matches')` join, `limit(500)`, no org filter; grouped into 5 columns; has loading/error/Retry. Workbench: `api.crmCasesList(orgId,{status:'active'})` → `crm-cases list`; on select, `efCall('match-engine',{mode:'propose',request_id})`; accept/reject via `api.crmCaseAction('approve_match'|'reject_match', …)`. **apiCalls:** `crmMatchesList` (direct PostgREST), `crmCasesList`, `match-engine propose`, `crmCaseAction approve_match/reject_match`.

**Auth gating:** DEMO_CTX ERV admin; Board's `crmMatchesList` drops org scope entirely (see systemic #2), leaking all orgs' matches + survivor `request_person_name`.

**Findings:**
- `[CRITICAL][auth]` Board mode leaks all orgs' matches + survivor PII — `_orgId` unused, no filter, `limit(500)`, only anon RLS protects it (`page.tsx:96` → `lib/api.ts:165-191`). Fix: scope by org and route through an org-scoped EF.
- `[HIGH][data-flow]` Accept/Reject passes a candidate org_id where a match_id is expected — `candidate.id = c.org_id ?? c.id`, sent as `match_id` (`page.tsx:341,367,377`). Fix: confirm the `crm-case-action` contract; pass a real match id or rename the field.
- `[MEDIUM][broken-display]` "Score" button is decorative; empty state tells user to click it — candidates load automatically; the button has no `onClick` (`page.tsx:496-498,519-520`). Fix: wire Score to a manual re-fetch or remove it and reword.
- `[MEDIUM][error-state]` Workbench cases fetch swallows errors → failure looks like "No open requests" (`page.tsx:321,393-400`). Fix: add an error state mirroring the Board.
- `[LOW][broken-display]` Board cards almost always show "Unassigned" — `org_name` hardcoded null; `resource_name` often null (`page.tsx:219` → `lib/api.ts:186-188`). Fix: populate `org_name` via a resources→organizations join.
- `[LOW][broken-display]` Board loading skeleton renders a 5-column grid on mobile with no overflow/responsive wrapper (`page.tsx:139-153`). Fix: match the loaded board's responsive structure.
- `[LOW][data-flow]` `?match=` deep-link from notifications is never read (`page.tsx:762-800`). Fix: read the param and focus/open that match, or drop it from the notification link.

### /app/cases — `app/app/cases/page.tsx` — **fail**
**Purpose:** Kanban case management with three tabs (Cases/Requests/Resources), drag-to-change-stage boards, and a New-case modal.

**Data flow:** `Promise.allSettled` over 4 fetches: `crmSosesList({limit:200})` (NOT org-scoped), `crmRequestsList(orgId)`, `crmResourcesList(orgId)`, `efCall('crm-reports',{report_type:'impact_dashboard'})`. Each branch maps to cards only if `length>0`. Drag-drop optimistically rewrites `card.col` then calls `crmCaseAction('transition_status', …)` with no rollback. Modal → `efCall('partner-write', …)`. **apiCalls:** `crmSosesList`, `crmRequestsList`, `crmResourcesList`, `crm-reports impact_dashboard`, `crmCaseAction transition_status`, `partner-write`.

**Auth gating:** DEMO_CTX ERV; `crmSosesList` lists SOS umbrellas platform-wide (no org scope); renders person names, veteran/first-responder flags, home regions — PII with no role gate.

**Findings:**
- `[CRITICAL][auth]` Cross-org PII leak: case board lists all SOS umbrellas + ERV PII with no real auth (`page.tsx:298,318-320`). Fix: gate behind real auth + isAdmin; scope `crmSosesList`; don't render PII unauthorized.
- `[MEDIUM][data-flow]` Drag-to-change sends column/bucket ids (and umbrella id) as transition payload; no optimistic rollback — Requests-tab uses bucket ids not in the `RequestStatus` union; no `.catch` rollback (`page.tsx:394-407`). Fix: map bucket → concrete status; verify the EF accepts these; roll back on failure.
- `[MEDIUM][broken-display]` Closed cases and "available" resources fall into non-existent columns and disappear — `col:'closed'`/`'available'` match no column; tab counts won't match visible cards (`page.tsx:34-47,114,136,425-427,507`). Fix: add the missing columns or remap.
- `[MEDIUM][data-flow]` `?tab=` deep links ignored — page never uses `useSearchParams`; always opens Cases tab (`page.tsx:299,459`). Fix: initialize tab from the query param.
- `[MEDIUM][error-state]` Per-fetch EF failures swallowed — `allSettled` never rejects so the trailing `.catch` is dead; outage shows a silent empty board (`page.tsx:317,329-364,366`). Fix: inspect `status==='rejected'` per promise; render error/retry.
- `[LOW][other]` `reportCards`/`REPORT_COLS` are dead code (no Reports tab); `crm-reports` fetch is wasted work and uses mismatched col ids (`page.tsx:14,49-54,321,352-363,379`). Fix: wire a Reports tab or remove the fetch.
- `[LOW][other]` "New {label}" button is inert on Requests/Resources tabs — `onClick` only opens the modal when `tab==='cases'` (`page.tsx:443-449`). Fix: disable/hide on non-cases tabs or implement those flows.

### /app/cases/[id] — `app/app/cases/[id]/page.tsx` — **fail**
**Purpose:** Case (umbrella) detail: identity band, KPIs, AI summary, tabs (Timeline/Requests/Resources/Matches/Notes/Communication/Reports), admin actions.

**Data flow:** `useParams()` id. Three paths: `crmCasesDetail({person_id|request_id})` (`crm-cases detail`) but the `.then` maps ONLY `timeline`/`requests`/`matches` — never citizen/status/urgency/filedAt/id; `crmGetCaseNotes(id)` → `setCaseNotes`; `CaseTabs` mounts `crmBrowseOrgs({limit:50})`. CommunicationTab reads `umbrellaData.id` which is always `''`. Writes via `crmCaseAction` (add_note/close_case/assign_case/transition_status/add_case_note). **apiCalls:** `crmCasesDetail`, `crmGetCaseNotes`, `crmBrowseOrgs`, `crmCaseAction(×5)`.

**Auth gating:** `orgId` only (used as author_id/org_id in writes). No role gate; admin section + PII render unconditionally — though PII fields never actually populate (see critical), so the live leaked surface is admin write controls + notes.

**Findings:**
- `[CRITICAL][broken-display]` Citizen identity, status, urgency, filed date, AI summary never populate — `.then` maps only timeline/requests/matches, leaving `EMPTY_UMBRELLA` defaults rendered everywhere (`page.tsx:171-219 vs 264-350`). Fix: map citizen/case-level fields from the response.
- `[HIGH][data-flow]` `isUmbrella` branch effectively dead — `id.startsWith('U-')` never true for the UUIDs/umbrella ids that link here, so `crmCasesDetail` always queries `{request_id}` (`page.tsx:154,168-170`). Fix: align the param with the actual id format the linkers pass.
- `[HIGH][data-flow]` CommunicationTab fetches/posts notes for an always-empty `sos_id` — `umbrellaData.id` is `''` so the tab is permanently empty and sends post to `sos_id=''` (`page.tsx:565,896-925`). Fix: pass a real identifier and populate `umbrellaData.id`.
- `[MEDIUM][error-state]` Misleading "Failed to load case" toasts on note/org fetch failures (`page.tsx:230,445`). Fix: scope the messages.
- `[MEDIUM][auth]` Admin controls + PII rendered with no role gating under DEMO_CTX (`page.tsx:155,577-623`). Fix: gate admin actions on a real isAdmin; enforce EF org scoping.
- `[MEDIUM][broken-display]` "Days open" hardcoded to 3; fulfilled%/orgs derive from empty data; AI needs/unmet always empty (`page.tsx:310,255-257,318`). Fix: compute from real dates; populate needs.
- `[LOW][broken-display]` Leftover prototype placeholders (`orgs`/`matches`/`cases`) drive dead lookups → no org labels/colors (`page.tsx:38-40,425-426,515,649,665`). Fix: source org metadata from the API.
- `[LOW][broken-display]` NotesTimeline composer is `console.log`-only — Notes-tab notes are silently lost (`page.tsx:780-785`). Fix: wire it to `crmCaseAction('add_note')`.
- `[LOW][other]` Stale `/cases/…` links in command-palette and Timeline 404 (no `/app` prefix) (`components/command-palette.tsx:348,382`; `components/directory/Timeline.tsx:62`). Fix: prefix with `/app`.

### /app/command — `app/app/command/page.tsx` — **warn**
**Purpose:** Command center: a horizontal stats strip above a full-height agent chat panel.

**Data flow:** `Promise.all` of `crmRequestsList`, `crmResourcesList`, `crmBrowsePersons(orgId,{limit:1})`, each `.catch(()=>null)`, coalesced to a single `Stats` object with `|| 0` fallbacks. `AgentChat` posts to `/api/chat` with `x-org-id`/`x-org-type`. **apiCalls:** `crmRequestsList`, `crmResourcesList`, `crmBrowsePersons`, `getPortalConfig` (unused), `POST /api/chat`.

**Auth gating:** `orgId` from DEMO_CTX (ERV). Surfaces operational aggregates + a command agent scoped to ERV; no role check; `!orgId` spinner guard is dead.

**Findings:**
- `[MEDIUM][auth]` Org-scoped aggregates + command agent exposed to any visitor via DEMO_CTX — Command is an admin/insights surface, raising impact (`page.tsx:20-21,27-45`). Fix: gate on isAdmin/role and a resolved non-demo org.
- `[MEDIUM][error-state]` All three fetches swallow errors → failures render as zeros with no indication (`page.tsx:28-44`). Fix: track error state; show a "data unavailable" affordance.
- `[LOW][broken-display]` Right-edge fade gradient uses dark navy over the light CRM surface → dark smudge (`page.tsx:62`). Fix: fade from `var(--surface-app)`.
- `[LOW][data-flow]` `people` metric falls back to `reqSum.total` (a request count) if the EF omits `total` (`page.tsx:42`). Fix: confirm `total` exists; drop the misleading fallback.
- `[LOW][other]` `usePortalConfig().config` destructured but never used (`page.tsx:22`). Fix: remove or use it.

### /app/command/[id] — `app/app/command/[id]/page.tsx` — **warn** · **STALE**
**Purpose:** Incident command dashboard: priority header, KPI tiles, needs-vs-resources bars, case posture, pinned reports, org-load sidebar, action buttons.

**Data flow:** `useParams()` id. `crmCommandIncidents()` (`crm-command list_incidents`) then client-side `list.find(i=>i.id===id)`; `crmCommandSummary(id)` (`incident_summary`). Both `.catch` → toast. `useDashboard(id)` pinned ids are ignored. Action buttons are toast-only; hotline hardcoded. **apiCalls:** `crmCommandIncidents`, `crmCommandSummary`, `useDashboard` (localStorage, unused).

**Auth gating:** `orgId` destructured but never used; neither EF call is org-scoped. Renders incident-level aggregates to any visitor; severity moderated by zero inbound links.

**Findings:**
- `[LOW][stale]` Route unreachable — nothing links to `/app/command/[id]`; the list page is an agent-chat surface with no incident rows (whole file). Fix: wire incident rows to link here, or delete.
- `[MEDIUM][broken-display]` Back button links to `/command` (404) — should be `/app/command` (`page.tsx:74,88`). Fix: prefix with `/app`.
- `[MEDIUM][data-flow]` Loads the entire incidents list and filters client-side; if the incident isn't in the returned list → false "not found" (`page.tsx:55-63`). Fix: add a single-incident query.
- `[MEDIUM][auth]` No org scoping despite `useAuthContext`; relies on the EF (`page.tsx:38`). Fix: pass orgId / confirm EF scoping.
- `[MEDIUM][broken-display]` Pinned-reports feature dead — `useDashboard` result ignored, panel hardcoded empty (`page.tsx:8,39,241-243`). Fix: render from `pinnedIds` and wire `unpinReport`, or remove.
- `[LOW][broken-display]` Primary action buttons are toast-only placeholders; hotline hardcoded (`page.tsx:119,155-159`). Fix: implement or mark as demo; source hotline from config.
- `[LOW][error-state]` Both fetch failures show the identical toast; a summary-only failure renders silently zeroed (`page.tsx:61,68,98-117`). Fix: differentiate toasts; show an inline "stats unavailable" indicator.

### /app/directory — `app/app/directory/page.tsx` — **warn**
**Purpose:** Directory hub: search bar + four browse cards (People/Orgs/Requests/Resources) with live counts, New/Import, map CTA.

**Data flow:** `Promise.all` over `crmBrowsePersons(orgId,{limit:1})`, `crmBrowseOrgs({limit:1})` (no org_id), `crmRequestsList(orgId)`, `crmResourcesList(orgId)`, each `.catch(()=>null)`. Counts derived `total ?? persons.length ?? 0`. **apiCalls:** `crmBrowsePersons`, `crmBrowseOrgs`, `crmRequestsList`, `crmResourcesList`.

**Auth gating:** `orgId` from DEMO_CTX; `browse_orgs` is global (no org_id). Counts are aggregate, but cards link into PII-rendering `/browse`.

**Findings:**
- `[MEDIUM][broken-display]` People/Orgs counts capped at 1 if the EF omits `total` — derived from a `limit:1` result page (`page.tsx:42-49`). Fix: rely on a server-provided count; don't fall back to a `limit:1` length.
- `[MEDIUM][error-state]` Fetch failures silently shown as 0 (`page.tsx:42-53`). Fix: distinguish error/null from zero; render "—".
- `[MEDIUM][auth]` ERV-scoped counts (and global org count) exposed to any visitor; entry point to PII `/browse` (`page.tsx:34-54,26-27`). Fix: derive org from a real session; confirm `browse_orgs` scope.
- `[LOW][data-loading]` `if (!orgId)` spinner guard is dead under DEMO_CTX (`page.tsx:40,56`). Fix: gate on auth-context `loading` when real auth lands.

### /app/directory/browse — `app/app/directory/browse/page.tsx` — **fail**
**Purpose:** Browse People and Orgs with search/filter/sort, table/card views, inline Add-person, import/detail links.

**Data flow:** `crmBrowsePersons(orgId,{limit:200})` (org-scoped) and `crmBrowseOrgs({limit:100})` (NO org_id). Both map only if `length>0`; `.catch` toasts only. Add-person → raw `efCall('partner-write', …)` (drops `addRole`). Mock fallbacks (`usePeople`, `mockOrgs`) are empty. **apiCalls:** `crmBrowsePersons`, `crmBrowseOrgs` (no org_id), `partner-write` (raw).

**Auth gating:** `orgId = authOrgId || DEMO_ORG_ID` (always ERV). Renders person PII + sos case links; `browse_orgs` un-scoped (cross-tenant). No role gate on Add/Import.

**Findings:**
- `[CRITICAL][auth]` Organizations tab leaks ALL orgs cross-tenant — `crmBrowseOrgs` sends no `org_id` (`page.tsx:112`; `lib/api.ts:201-202`). Fix: scope to the viewer's org/network; enforce membership in the EF.
- `[CRITICAL][auth]` People PII exposed to any visitor via DEMO_CTX — names/phones/county/case ids rendered and deep-linked (`page.tsx:39-45,88-108,581-590`). Fix: gate behind real auth + server-side scoping; remove the `DEMO_ORG_ID` hardcode.
- `[HIGH][data-loading]` No loading state — shows "No results" while in flight; empty results never update state (`page.tsx:83-130,204-207,430-467`). Fix: add per-fetch loading; only show EmptyState when not loading.
- `[MEDIUM][error-state]` Fetch errors toast but leave the page silently empty with no retry (`page.tsx:108,129`). Fix: set an error state + Retry.
- `[MEDIUM][data-flow]` Add-person uses raw `partner-write`; `addRole` dropped; EF deployment unconfirmed (`page.tsx:61,70-74`). Fix: typed wrapper against a confirmed EF; include the role.
- `[LOW][data-flow]` `?q=` and `?add=1` deep links ignored (`page.tsx:42-48`). Fix: initialize query/showAddForm from the params.
- `[LOW][broken-display]` Org "Service Area" column hardcoded to "—" (`page.tsx:479,614`). Fix: populate or remove.
- `[LOW][data-flow]` Empty EF result never clears stale rows after add/refresh (`length>0` guard) (`page.tsx:91,115`). Fix: always set the mapped array; track loading/error separately.

### /app/directory/import — `app/app/directory/import/page.tsx` — **fail**
**Purpose:** CSV contact-import wizard — a static UI prototype. No real parsing, mapping, or backend import.

**Data flow:** Thin wrapper dynamically importing `components/directory/ImportPage.tsx` (ssr:false). All "data" is hardcoded (sample headers, `rows:52`, fake progress, fake completion stats). Zero `api.*`/`db.*`/fetch. **apiCalls:** none.

**Auth gating:** No `useAuthContext()`, no org id, no PII — non-functional rather than leaking. A real implementation would write under ERV via the bypass.

**Findings:**
- `[HIGH][data-flow]` Entire import flow is a non-functional mock — no upload/parse/mapping/persistence (`ImportPage.tsx:34-48,121-140,165-197`). Fix: parse CSV client-side, POST mapped rows via an org-scoped EF wrapper, render real counts; until then label as a prototype.
- `[HIGH][broken-display]` Internal links point to `/directory` (404) — header/Cancel/"View directory" use the un-prefixed path (`ImportPage.tsx:55,144,189`; same in `Sidebar.tsx:9,16`). Fix: change to `/app/directory`.
- `[MEDIUM][error-state]` No error handling for real file inputs (size/type/parse) despite advertised "max 10 MB"/`.csv` (`ImportPage.tsx:34-37,85,92`). Fix: validate size/type before advancing.
- `[LOW][broken-display]` "Export current directory" button is a no-op (`ImportPage.tsx:202`). Fix: wire or remove.
- `[LOW][data-flow]` Import interval not cleared on unmount; no cancel control (`ImportPage.tsx:39-48,155-163`). Fix: store the interval in a ref and clear in cleanup; add cancel.

### /app/directory/org/[id] — `app/app/directory/org/[id]/page.tsx` — **fail**
**Purpose:** Org detail: identity, trust/impact stats, member list, edit org fields, invite members.

**Data flow:** `crmBrowseOrgs()` (no args) then client-side `.find(o=>o.id===id)`, `setOrg` only if truthy (no else); `crmOrgStats(id)`; `crmOrgMembers(id)` (hits the dup-key → `org_members`). Mutations: `efCall('crm-directory',{action:'update_org'|'invite_member', …})`. **apiCalls:** `crmBrowseOrgs`, `crmOrgStats`, `crmOrgMembers` (dup-key), `update_org`, `invite_member`.

**Auth gating:** `orgId` read but only forwarded to `ChatPanel`; the page renders/edits whatever org is in the URL with no ownership/role check → cross-org read AND write under the bypass.

**Findings:**
- `[CRITICAL][auth]` Any visitor can view AND edit any org's data (member PII, contact info, invites) — no org/role gating (`page.tsx:24-50,61-88,259`). Fix: gate by authed org/role; hide Edit/Invite for non-owners; EF must enforce scope.
- `[HIGH][data-loading]` Org loaded via `crmBrowseOrgs()`+client `.find()` instead of `crmGetOrg` — stuck "Loading…" forever if org not in the returned list (`page.tsx:44-46,98`). Fix: use `crmGetOrg(id)`; setError on missing.
- `[MEDIUM][data-flow]` `crmOrgMembers` hits the duplicate-key bug → `org_members` not `list_org_members` (`page.tsx:49,82`; `lib/api.ts:204&288`). Fix: remove the dup key; align with the deployed EF.
- `[MEDIUM][error-state]` Stats and members fetch errors silently swallowed (`page.tsx:48-49,82`). Fix: toast/inline error; distinguish "no members" from "failed".
- `[LOW][broken-display]` `DetailTabs defaultKey='activity'` references a non-existent tab key (harmless fallback) (`page.tsx:257`). Fix: set `defaultKey='members'`.
- `[LOW][other]` Dead `CoverageTab` component (+`counties`, `CAP_COLORS`) defined but never rendered (`page.tsx:106,284-328`). Fix: wire or delete.
- `[LOW][broken-display]` Overflow Share/Flag actions are no-ops (`page.tsx:172-177`). Fix: wire or remove.
- `[MEDIUM][broken-display]` Back link `/directory` 404 — should be `/app/directory` (`page.tsx:142`). Fix: change `backTo`.

### /app/directory/person/[id] — `app/app/directory/person/[id]/page.tsx` — **fail**
**Purpose:** Person detail: identity band, SOS score, household, location map, AI summary, tabs, inline edit, entity chat.

**Data flow:** Two divergent sources. Real: `crmGetPerson(id)` feeds only `linkedRequests` + map pin coords. Mock: `seed = people.find(...)` from the **emptied** `directory-data` (always undefined) → `usePerson(seed.id) ?? seed`; every displayed identity field comes from this dead mock. Edit save calls `crmUpdatePerson` ×3; inline edits call mock `updatePerson` (no EF). **apiCalls:** `crmGetPerson`, `crmUpdatePerson`, mock store, `ChatPanel`.

**Auth gating:** `orgId` only forwarded to `ChatPanel`; edit gating uses mock `CURRENT_ORG_ID='emergency-rv'` (decorative). Currently always "Person not found", so no PII renders, but the intended surface is PII under the bypass.

**Findings:**
- `[CRITICAL][broken-display]` Always renders "Person not found" — `people` import is the emptied array, so `seed` is always undefined (`page.tsx:72-73`; `directory-data.ts:34`). Fix: render from `crmGetPerson(id)`.
- `[CRITICAL][broken-display]` Displayed Person reads many fields not on the `Person` type — `scoreBreakdown`, `household`, `phoneMask`, `housingStatus`, `credentials.*`, `skills.*` → would throw `TypeError` if `people` were non-empty (`page.tsx:114,321-336,108-114,276-303,406-415`). Fix: define one source-of-truth shape from the EF; guard nested access.
- `[HIGH][other]` `usePerson()` called conditionally after an early return — Rules of Hooks violation, masked only because `seed` is always undefined (`page.tsx:72-74`). Fix: call all hooks unconditionally before any early return.
- `[HIGH][data-flow]` Inline edits write only to a dead in-memory mock, not the backend (`page.tsx:160,183,192,199,206`). Fix: route all edits through `crmUpdatePerson`.
- `[MEDIUM][auth]` Edit gating uses hardcoded mock org constant unrelated to real auth (`page.tsx:101`). Fix: derive from real auth + the person's owning org.
- `[MEDIUM][error-state]` `crmGetPerson` failure only toasts; no inline error/loading state (`page.tsx:66-70,104-107,282-316`). Fix: add loading + error/retry.
- `[LOW][broken-display]` Static map `<img>` uses `NEXT_PUBLIC_MAPBOX_TOKEN` with no fallback (`page.tsx:305-315`). Fix: guard on token; add `onError`.
- `[LOW][other]` `orgId` from auth only forwarded to `ChatPanel`; chat always scoped to viewer's ERV org (`page.tsx:57,341`). Fix: pass the person's org where appropriate.
- `[LOW][data-flow]` `ChatPanel entityId={id}` is a real DB id while page identity is mock — entity chat unreachable today and context-mismatched once wired (`page.tsx:73,221,341`). Fix: source entityId and the rendered person from the same real data.

### /app/directory/report/[id] — `app/app/directory/report/[id]/page.tsx` — **fail**
**Purpose:** Single field/disaster report detail — identity band, presentational AI summary, Activity/Cases/Files tabs.

**Data flow:** `crmReportDetail(id)` → `efCall('crm-reports',{report_type:'report_detail', report_id})`. Tri-state (undefined=loading, null=not-found/catch, object=render). Cases/Files tabs hardcoded empty; reporter/disaster/corroborators stubbed. **apiCalls:** `crmReportDetail`.

**Auth gating:** No `useAuthContext()`; fetched purely by `report_id` with no org scoping. Doesn't assume a logged-in user, so the bypass doesn't break it — it simply provides no scoping.

**Findings:**
- `[HIGH][broken-display]` Back link `/reports` 404 — should be `/app/reports`, in all three render branches (`page.tsx:53,63,147`). Fix: change `backTo`.
- `[MEDIUM][auth]` No org scoping on the report fetch — cross-org report visible to any visitor with the UUID (`page.tsx:37-48`). Fix: pass orgId; enforce membership in the EF.
- `[MEDIUM][data-flow]` `crm-reports` param-key inconsistency: `report_type` here vs `action` elsewhere (`lib/api.ts:303 vs 233`). Fix: standardize the dispatch key.
- `[LOW][broken-display]` Hardcoded/stub fields (reporter, corroborators, Cases/Files tabs); location is a `description.slice(0,50)` chip though lat/lng exist (`page.tsx:69-77,136,141,167,176`). Fix: wire from the payload; use lat/lng.

### /app/directory/request/[id] — `app/app/directory/request/[id]/page.tsx` — **fail**
**Purpose:** Single aid-request detail — requester identity/household, status, map, AI summary, timeline, scored candidates with approve/reject, linked cases, chat.

**Data flow:** `crmCasesDetail({request_id:id})` (`crm-cases detail`), stored verbatim (no normalization). `handleFindMatches` → `match-engine propose`. ChatPanel → `crm-chat`. Render dereferences required-typed but server-optional fields with no guards. **apiCalls:** `crmCasesDetail`, `match-engine propose`, `crm-chat`.

**Auth gating:** `orgId` only forwarded to `ChatPanel`; `crmCasesDetail` gets `request_id` alone (no org scope). Renders name, county, household demographics, exact lat/lng, AIRS/OCHA ids — cross-org PII leak risk dependent on the EF.

**Findings:**
- `[CRITICAL][broken-display]` Unguarded access to required-typed but server-optional fields crashes render — `r.household.adults`, `r.taxonomy.toLowerCase()`, `r.assignedTo.replace`, `r.notes.map`, etc., with no normalization (unlike the sibling cases/[id]) (`page.tsx:104,159-160,188-189,239,318`). Fix: normalize before `setR` (default household/notes; coerce taxonomy/assignedTo).
- `[HIGH][auth]` Request PII fetched by `request_id` with no org scoping — leaks under DEMO_CTX (`page.tsx:73,202-213`). Fix: pass org scope; don't render exact lat/lng until gated; confirm EF authorization.
- `[HIGH][other]` Primary write actions (approve/reject/reassign/close/find matches) are non-functional placeholders — `setTimeout` stubs + missing handlers; `handleFindMatches` never refetches (`page.tsx:173-181,377,390`). Fix: wire to `crmCaseAction`/`respondMatch`; refetch after.
- `[MEDIUM][error-state]` Fetch failure and "not found" render identically (`page.tsx:72-98`). Fix: separate error state + retry.
- `[LOW][broken-display]` Avatar, Driver page, and linked-case links are dead `href="#"` (`page.tsx:119,131,251,348`). Fix: point to real routes; hide when id missing.
- `[LOW][data-flow]` `orgId` string|null passed to `ChatPanel` prop typed string (`page.tsx:52,218`). Fix: guard/coalesce.

### /app/directory/resource/[id] — `app/app/directory/resource/[id]/page.tsx` — **fail**
**Purpose:** Single inventory resource: identity/status/location/capacity, editable form, static map, AI summary, activity/matches/files tabs.

**Data flow:** `crmResourceDetail(id)` → `efCall('partner-read',{query_type:'resource_detail', resource_id})` (no org_id). `saveResource()` → `efCall('partner-update',{action:'update_resource', …})` (no org_id) then refetch. `orgId` only for `ChatPanel`. **apiCalls:** `crmResourceDetail`, `update_resource`, `ChatPanel`.

**Auth gating:** No org scoping on read or edit — the UUID is the only gate. Cross-org read (owner name/phone via persons join) AND unauthorized write under the bypass.

**Findings:**
- `[CRITICAL][auth]` Resource detail + edit have zero org scoping; UUID is the only gate (data leak + unauthorized write) (`page.tsx:44-48,58-77`; `lib/api.ts:300-301`). Fix: pass orgId; EF must verify ownership.
- `[MEDIUM][broken-display]` Owner link always points to `/app/directory/person/#` — `ownerId` never mapped (`person_id` not mapped into `r`) (`page.tsx:100-113,260`). Fix: map `ownerId: res.person_id`.
- `[MEDIUM][broken-display]` Matched person shows raw `request_person_id` UUID instead of a name (`page.tsx:111,182,237,347,359`). Fix: prefer `person_name`; fall back to a short id/"Matched".
- `[MEDIUM][error-state]` Fetch error silently rendered as "Resource not found" (`page.tsx:44-48,92-94`). Fix: separate error state + retry.
- `[LOW][broken-display]` Overflow Share/Flag/Retire are dead buttons (`page.tsx:275-281`). Fix: wire or remove.
- `[LOW][broken-display]` Edit-form status vocabulary mismatches the page's own status semantics (`page.tsx:120-121,181,307`). Fix: use one canonical enum; include the current status as an option.
- `[LOW][other]` CrmShell module is "Directory" in loading/not-found but "Cases" when loaded → nav highlight jumps (`page.tsx:81,93,240`). Fix: use a consistent module.

### /app/directory/volunteer/[id] — `app/app/directory/volunteer/[id]/page.tsx` — **warn** · **STALE**
**Purpose:** Single volunteer detail — a stripped-down duplicate of `person/[id]`.

**Data flow:** `crmGetPerson(id)` (`crm-directory get_person`), `.catch` → not-found. Only `display_name` + `impact_score` consumed; status/hours/skills/tabs hardcoded. **apiCalls:** `crmGetPerson`.

**Auth gating:** No `useAuthContext()`; sends only `person_id` (anon Bearer). Same systemic directory exposure; adds no protection.

**Findings:**
- `[MEDIUM][stale]` Route orphaned / superseded by `person/[id]` — the only linker (`volunteers/page.tsx:463`) omits the `[id]` segment (whole file). Fix: delete and point the volunteers link at `person/${id}`, or fix the link and build out the page.
- `[MEDIUM][broken-display]` `impact_score` mislabeled and displayed as "hours logged"; status hardcoded "active"; tabs hardcoded empty (`page.tsx:55-61,105,127-142`). Fix: source real hours/status or remove the framing.
- `[LOW][broken-display]` Back link `/directory` 404 (shared app-wide pattern) (`page.tsx:43,53,96`). Fix: `/app/directory`.
- `[LOW][auth]` No client-side auth/org gating on a PII detail page (`page.tsx:31-38`). Fix: EF must scope `get_person`; no frontend-only fix suffices.

### /app/calendar — `app/app/calendar/page.tsx` — **fail**
**Purpose:** Volunteer-shift / events calendar (Mon–Sun week grid desktop, single-day mobile) with create/inline-edit/delete.

**Data flow:** `crmEventsList(orgId)` (`crm-events list`); sets `items` only if `Array.isArray && length>0` (empty results discarded). `.catch` toasts. Mutations: `crmEventsCreate/Delete/Update` with optimistic updates. No loading state. Events render by exact locale-string date match (`s.date === d.date`, e.g. "Jun 3"). **apiCalls:** `crmEventsList/Create/Update/Delete`.

**Auth gating:** `orgId` from DEMO_CTX (ERV admin); no role check; full create/edit/delete exposed; "admin: proceed without org filter" comment but EF still gets the ERV id.

**Findings:**
- `[CRITICAL][broken-display]` EventFormDrawer crashes on open: `orgs[0].id` on an empty array — `orgs=[]`, `useState(initial?.org ?? orgs[0].id)` throws when "New event" is clicked (`page.tsx:9,416`). Fix: default org to `''`; drop the dead Organization field/`EventDrawer`.
- `[HIGH][data-loading]` No loading state; empty/in-flight indistinguishable from empty; empty API results silently discarded (`page.tsx:50-58`). Fix: add a loading flag; set `items` for any array; add an empty-state message.
- `[MEDIUM][data-flow]` Event visibility depends on exact locale date-string match — breaks across locales/timezones and any non-current week (`page.tsx:28-35,144,220`). Fix: store/compare by ISO date; format only for display.
- `[MEDIUM][auth]` Admin create/edit/delete controls shown with no role gating under DEMO_CTX (`page.tsx:38,52,117-124`). Fix: gate writes on isAdmin; EF authorizes org-scoped writes.
- `[LOW][other]` Dead `EventDrawer` component never rendered (also references `org.name` not on the local type) (`page.tsx:294-397`). Fix: delete.
- `[LOW][data-flow]` `addEvent` only persists when `orgId` truthy; would show false success otherwise (`page.tsx:65-90`). Fix: block/error when org missing.

### /app/inventory — `app/app/inventory/page.tsx` — **fail**
**Purpose:** Inventory/facilities management: facilities + capacity, low-stock alerts, tracked-assets and resources tables, add/condition/move actions.

**Data flow:** `useApiFetch` runs `Promise.allSettled` over `crmFacilitiesList(orgId)` and `queryInventory({org_id})`, each setting state only if `length`. Mutations: `writeInventory`, `inventoryUpdateCondition`, `inventoryMoveToFacility`. Module-level `assetEvents=[]`/`orgs=[]` are never populated. **apiCalls:** `crmFacilitiesList`, `queryInventory`, `writeInventory`, `inventoryUpdateCondition`, `inventoryMoveToFacility`.

**Auth gating:** `orgId` from DEMO_CTX (ERV); no role check; full write access to ERV inventory for any visitor (org-scoped operational data, not PII).

**Findings:**
- `[LOW][broken-display]` Undefined `prototypeInventory` referenced in type positions — TS2304 but `ignoreBuildErrors:true` + type-only positions mean no build/runtime break; inventory shape resolves to `any` (`page.tsx:77,102,117`). Fix: replace with the real inline item type or a named `InventoryItem`.
- `[HIGH][error-state]` Primary fetch failures silently swallowed — `allSettled` never rejects so `useApiFetch`'s `.catch` never runs; `error`/`refetch` ignored (`page.tsx:109-125`). Fix: let the fetcher reject (or inspect rejected settles) and render error/refetch.
- `[MEDIUM][error-state]` No empty-state for tables — empty/failed results render bare empty tables (`page.tsx:307-326,347-401`). Fix: add empty-state rows.
- `[MEDIUM][broken-display]` Hardcoded empty `assetEvents`/`orgs` make several columns permanently blank/default (Last event, owner org, facility color, drawer timeline) (`page.tsx:22-23,309,321,359,504`). Fix: fetch org/event data or remove the columns.
- `[MEDIUM][broken-display]` Condition column uncontrolled (`defaultValue="good"`) and Stars hardcoded to 4; no refetch after update (`page.tsx:319,365,528`). Fix: bind to real condition; compute Stars from `condition_rating`.
- `[MEDIUM][auth]` Privileged write actions on ERV inventory exposed to any visitor (`page.tsx:41,65-72,89,99`). Fix: gate mutations on a real role; resolve orgId from a real session.
- `[LOW][data-flow]` Facility filtering relies on brittle string matching between `location` and facility name/address (`page.tsx:127-133`). Fix: filter by `facility_id`.
- `[LOW][broken-display]` Loading skeleton and real content render simultaneously (content not gated on `!loading`) (`page.tsx:221-229`). Fix: gate the content div on `!loading`.

### /app/onboard — `app/app/onboard/page.tsx` — **warn** · **STALE**
**Purpose:** 3-step org onboarding wizard (type → modules → name/email/invites) that creates an org via `crm-onboard`.

**Data flow:** Pure client form; no read fetches. Only mutation: `crmOnboardOrg({org_type, modules, name, contact_email})` → `efCall('crm-onboard',{action:'create_org', …})` in try/catch/finally; success → `router.push('/app/cases')`. **apiCalls:** `crmOnboardOrg`.

**Auth gating:** No `useAuthContext()`, no org id; no read-side leak. But no auth gating or validation — under the bypass anyone can create orgs; reachable via the `/app/` proxy prefix.

**Findings:**
- `[MEDIUM][data-flow]` `invites` collected but never submitted (silent data loss) — payload omits invites (`page.tsx:35,147-153 vs 41-46`). Fix: pass invites or call an invite endpoint; or remove the textarea.
- `[MEDIUM][other]` No input validation before org creation — empty name/email and empty modules accepted (`page.tsx:38-53,175-181`). Fix: disable/short-circuit submit; validate server-side.
- `[LOW][stale]` Route orphaned — nothing links to `/app/onboard` (`page.tsx:28`; `proxy.ts:27`). Fix: add an entry point or delete the unguarded org-creation surface.
- `[LOW][data-flow]` `crmSetModules` wrapper unused; modules sent inline to `create_org` — persistence unconfirmed (`page.tsx:41-46`; `lib/api.ts:244-248`). Fix: confirm `create_org` persists modules or follow up with `crmSetModules`. *(unverified)*

### /app/reports — `app/app/reports/page.tsx` — **fail**
**Purpose:** Impact/analytics dashboard: KPIs, cases-by-org bars, taxonomy distribution, severity donut, 14-day trend.

**Data flow:** `useApiFetch` wrapping `crmImpactDashboard(orgId)` (`crm-reports impact_dashboard`); unwraps `data ?? res`; three mappers (KPIs/orgBars/taxList) with empty proto fallbacks. `SeverityDonut`/`TrendSparkline` do NOT use fetched data. Page destructures only `{data, loading}` — `error`/`refetch` ignored. **apiCalls:** `crmImpactDashboard`.

**Auth gating:** `orgId` from DEMO_CTX (ERV); analytics shown to any visitor; no role check. Aggregate (not per-person PII) → moderate.

**Findings:**
- `[HIGH][broken-display]` Severity donut and 14-day trend render hardcoded fake data presented as real metrics — fixed segments/array, unused `kpis` prop (`page.tsx:170-242`). Fix: drive from EF data or label as sample.
- `[MEDIUM][error-state]` Fetch error swallowed — `error`/`refetch` not destructured; failure shows empty/placeholder sections (`page.tsx:69`; `use-api-fetch.ts:19,26`). Fix: render an inline error + retry.
- `[MEDIUM][error-state]` No empty-state — empty/failed data renders blank cards (`page.tsx:9-11,61-87,102-163`). Fix: per-section empty-state messaging.
- `[MEDIUM][auth]` Org-scoped impact metrics shown to any visitor via DEMO_CTX (`page.tsx:58,69-70`). Fix: scope + gate on role when auth lands.
- `[LOW][broken-display]` "Export" button is a no-op (`page.tsx:95-97`). Fix: wire export or remove.
- `[LOW][broken-display]` Header subtitle ("Field reports…") mismatches the analytics content (`page.tsx:92-93`). Fix: update the subtitle.

### /app/settings — `app/app/settings/page.tsx` — **fail**
**Purpose:** Org admin settings: org profile (read-only inputs), module toggles, mobile-pin selection (max 4), org size; module/pin/size persist to portal_config.

**Data flow:** `efCall('crm-settings',{action:'get_settings', org_id})` → `org` state (.then/.catch). Module/pin/size via `usePortalConfig().updateConfig` → `updatePortalConfig` → `partner-update update_portal_config`. Profile inputs are uncontrolled `defaultValue` with no onChange and NO save action. **apiCalls:** `crm-settings get_settings`, `getPortalConfig`, `updatePortalConfig`.

**Auth gating:** `orgId` only; no role check despite editing org-wide config. Any visitor reads ERV profile and can mutate ERV portal_config.

**Findings:**
- `[CRITICAL][auth]` Anyone can read ERV org profile and mutate ERV portal config — no role gate (`page.tsx:21-40,51,79`). Fix: gate on real authed org + isAdmin; no writes for non-admins.
- `[HIGH][error-state]` Module/pin/size saves show a false success toast even when the DB write fails — `updateConfig` only `console.error`s and never re-throws, so the page's catch never fires (`page.tsx:50-57,77-83`; `use-portal-config.tsx:250-262`). Fix: re-throw (or return success) and roll back the optimistic state.
- `[HIGH][broken-display]` Org profile fields look editable but cannot be saved — uncontrolled inputs, no save path (`page.tsx:90-98,183-191`). Fix: make read-only or wire onChange + Save.
- `[LOW][data-loading]` No loading state for the profile fetch; shows placeholder "Organization" until resolved (`page.tsx:12,23,26-40,88`). Fix: add a loading indicator.
- `[LOW][data-flow]` `crm-settings` EF deployment cannot be confirmed from frontend (`page.tsx:28-39`). Fix: confirm deployment; add a typed wrapper. *(unverified)*

### /app/settings/org — `app/app/settings/org/page.tsx` — **fail** · **STALE**
**Purpose:** Org settings editor: Trust Score card + editable org profile form with Save/Discard.

**Data flow:** `getPortalConfig(orgId)` (`partner-read portal_config`) seeds the form; `crmOrgStats(orgId)` (empty-swallow catch) feeds activity tiles. `handleSave()` → `updatePortalConfig`. Form initializes to a hardcoded `DEFAULT_FORM` (fictional "Mountain Area Aid"). No loading/empty/error UI. **apiCalls:** `getPortalConfig`, `crmOrgStats`, `updatePortalConfig`.

**Auth gating:** `{orgId, orgName}` from DEMO_CTX (ERV); editable settings with a live Save and no role check. Orphaned but a write surface if reached.

**Findings:**
- `[HIGH][data-flow]` `getPortalConfig` response read from the wrong key — `res?.config ?? res` doesn't match the declared `{org_id, org_name, org_type, portal_config}`, so the form never hydrates and keeps showing the demo org (`page.tsx:57-70`; `lib/api.ts:91-94`). Fix: key off `portal_config`/the actual EF shape.
- `[MEDIUM][stale]` Route orphaned — nothing in the live app links to `/app/settings/org` (only `_lovable_ref`) (whole file). Fix: wire into settings nav and reconcile with `/app/settings`, or delete.
- `[MEDIUM][broken-display]` Hardcoded placeholder data renders as real org profile (no loading guard); service-area counties hardcoded and omitted from save; Discard resets to `DEFAULT_FORM` (`page.tsx:32-46,52,151,200-208,213`). Fix: initialize empty + loading skeleton; populate/save service area.
- `[LOW][error-state]` `crmOrgStats` failure silently swallowed (`page.tsx:72,106-108`). Fix: surface a subtle inline error.
- `[LOW][auth]` Editable settings + live Save with no real auth — anyone could overwrite ERV portal config (`page.tsx:49,79-101`). Fix: gate Save behind a verified admin; EF authorizes the mutation.

### /app/settings/people — `app/app/settings/people/page.tsx` — **warn** · **STALE**
**Purpose:** Org team management: list members, invite by email/role, change role, remove; static role-permissions reference.

**Data flow:** `crmOrgMembers(orgId)` (hits the dup-key → `org_members`) maps `res?.members ?? []`; `.catch` toasts. Mutations: `invite_member`, `remove_member` (confirm + optimistic), `change_role` (optimistic + rollback). `status`/`lastActive` hardcoded. **apiCalls:** `crmOrgMembers` (dup-key), `invite_member`, `remove_member`, `change_role`.

**Auth gating:** `orgId` only; renders member PII + destructive admin controls with no role check. Orphaned.

**Findings:**
- `[HIGH][data-flow]` Duplicate `crmOrgMembers` key silently changes the action to `org_members` (`page.tsx:42`; `lib/api.ts:204-205,288-289`). Fix: remove the dup; align with the deployed EF.
- `[MEDIUM][stale]` Orphaned — nothing links to `/app/settings/people` (only build artifacts + `_lovable_ref`) (whole file). Fix: add a settings sub-nav or delete.
- `[MEDIUM][broken-display]` Renders bare with no shell/header/back-nav (unlike sibling settings page) (`page.tsx:103`; `layout.tsx:1`). Fix: wrap in `CrmShell` + `PageHeader`.
- `[MEDIUM][data-loading]` No loading state — empty table during fetch indistinguishable from an empty org (`page.tsx:33,40-53,165-202`). Fix: add loading + empty-state.
- `[MEDIUM][broken-display]` Hardcoded `status`/`lastActive` make invited/Pending/last-active UI dead code; invite never appears (no refetch) (`page.tsx:49-50,99-100,110,172-176,191`). Fix: map real fields; refetch/append after invite.
- `[MEDIUM][auth]` Admin PII + destructive controls exposed under DEMO_CTX (`page.tsx:32,55-69,71-94`). Fix: gate page + handlers on real isAdmin/role.
- `[LOW][data-flow]` Member id can be empty string → unstable keys / wrong mutations (`page.tsx:45,167,75,88`). Fix: filter out members lacking an id or disable controls.

### /app/settings/profile — `app/app/settings/profile/page.tsx` — **warn** · **STALE**
**Purpose:** Personal "My Profile": SOS Score, share/referral, editable identity fields, notification toggles, security rows, sign out.

**Data flow:** Almost entirely static/hardcoded; no `useEffect`/fetch on mount. Only backend call: `handleSave()` → `efCall('crm-settings',{action:'update_profile', name, email, phone})`. `name/email/phone` controlled; `title`/`bio` uncontrolled (dropped on save). `PERSON_ID="p-melissa-hart"` literal. `useRouter` imported but unused. **apiCalls:** `crm-settings update_profile`.

**Auth gating:** No `useAuthContext()`; hardcoded identity; save sends no `person_id`/`org_id` — unscoped write under the bypass.

**Findings:**
- `[MEDIUM][stale]` Orphaned — nothing links to `/app/settings/profile` (`page.tsx` whole file; `layout.tsx:1`). Fix: wire a settings sub-nav or remove.
- `[MEDIUM][data-loading]` Entirely static demo content — no data loaded for the current user (`page.tsx:12-145`). Fix: load via `crmGetPerson`/`getScore` gated on auth; add loading/error.
- `[MEDIUM][auth]` No auth context; profile save unscoped (no person_id/org_id) (`page.tsx:12,44-45,52`). Fix: resolve the real user id; include it in the payload.
- `[LOW][broken-display]` Title and Bio uncontrolled → silently dropped on save (`page.tsx:97,103-107,52`). Fix: make controlled + include in payload.
- `[LOW][other]` Non-functional controls (Change photo, toggles, Password/2FA rows, Sign out); unused `useRouter` (`page.tsx:3,88-90,129,136-137,142-144`). Fix: wire or mark unavailable; remove dead sign-out.
- `[LOW][broken-display]` Missing `CrmShell` wrapper unlike sibling settings pages (`page.tsx:62`). Fix: wrap in `CrmShell`.

### /app/transport — `app/app/transport/page.tsx` — **fail**
**Purpose:** Transport module: list assignments with KPIs, inline create, per-row status updates, issue-report sheet, placeholder map, driver-page links.

**Data flow:** `transportList(orgId)` (`partner-read transport_assignments`) → `extractList()` picks `assignments|data|transports|[]` and casts **without field mapping**. Mutations: `transportCreate`, `transportUpdateStatus` (optimistic), `transportReportIssue`. `loading` cleared in finally. **apiCalls:** `transportList`, `transportCreate`, `transportUpdateStatus`, `transportReportIssue`.

**Auth gating:** `orgId` from DEMO_CTX (ERV); scoped to ERV. Renders driver name + phone (PII) and write actions to any visitor.

**Findings:**
- `[CRITICAL][broken-display]` List/table render camelCase fields but the EF returns snake_case — `extractList` does no mapping, so Driver/Resource columns are blank and ETA always "—" (`page.tsx:50-55,268-269,340-341,347`). Fix: map raw rows to the Assignment shape, mirroring `drive/[id]/page.tsx:32-56`.
- `[CRITICAL][auth]` Driver PII (name + phone) and transport write actions exposed to any visitor via DEMO_CTX (`page.tsx:60,525`). Fix: real auth + org/role scoping.
- `[MEDIUM][error-state]` Initial fetch failure falls through to empty-state, not error (`page.tsx:80-86,239-246`). Fix: separate error state + retry.
- `[LOW][data-loading]` If `orgId` were ever null the page would be stuck loading forever (`page.tsx:64,80-86`). Fix: set loading false / gate on auth loading.
- `[LOW][broken-display]` Map view is a non-functional "coming soon" placeholder despite a List/Map toggle (`page.tsx:147-154,377-384`). Fix: hide or label the toggle.
- `[LOW][data-flow]` `transportCreate/UpdateStatus/ReportIssue` EF actions assumed deployed; cannot confirm from frontend (mutations fail gracefully) (`lib/api.ts:254-261`). Fix: confirm during EF audit. *(unverified)*

### /app/volunteers — `app/app/volunteers/page.tsx` — **fail**
**Purpose:** Volunteer roster: list available volunteers, filter, change status, assign to case/event, add volunteers; (aspirational) availability grid, detail drawer, find-available sidebar.

**Data flow:** `useApiFetch(() => crmVolunteersAvailable(orgId).then(mapVolunteers(extractList(...))))`; page destructures only `{data, refetch}` (ignores loading/error). Mutations: `partner-write` (add), `crm-directory update_person` (status), `crm-cases assign_case`. Module-level `volunteerDetails=[]`/`orgs=[]`/`protoVolunteers=[]` never populated. **apiCalls:** `crmVolunteersAvailable`, `partner-write`, `update_person`, `assign_case`.

**Auth gating:** `orgId` from DEMO_CTX (ERV); volunteer names on cards are the live PII; add/status/assign mutations exposed.

**Findings:**
- `[CRITICAL][broken-display]` Detail drawer can never open — `drawer = volunteerDetails.find(...)` over the always-empty constant (`page.tsx:21,127,222,350`). Fix: fetch detail when `drawerId` is set, or pass the loaded list row.
- `[HIGH][broken-display]` Week-availability table and Find-available sidebar permanently empty / non-functional — map over the empty constant; static date/buttons with no handlers (`page.tsx:214-254,282-347`). Fix: wire to real data/handlers or remove.
- `[HIGH][data-loading]` `loading`/`error` from `useApiFetch` discarded — no spinner, no error UI, no empty-state (`page.tsx:66-73`; `use-api-fetch.ts:10-26`). Fix: destructure and render all three states.
- `[MEDIUM][data-flow]` Inconsistent status vocabulary across mapper/per-card select/filter; "on assignment" count from empty `volunteerDetails` (`page.tsx:47,119-120,195-201,258-268`). Fix: one canonical set; compute from live volunteers.
- `[MEDIUM][broken-display]` "Has CDL" / "Available today" toggles do nothing — never used in filtering (`page.tsx:63-64,123-125,202-209`). Fix: implement or remove.
- `[MEDIUM][auth]` PII display + mutations scoped only to bypassed DEMO_CTX org (`page.tsx:53,80-86,98-117,231,400`). Fix: gate by org membership/role.
- `[LOW][other]` Assign uses `window.prompt` for a raw Case/Event id with no validation (`page.tsx:108-117`). Fix: searchable picker + validation.
- `[LOW][broken-display]` Drawer "Open full record" link is static `/app/directory/volunteer` (no id) (`page.tsx:463`). Fix: target the volunteer's actual detail route.
- `[LOW][data-flow]` Assign action does not refetch the roster after success (`page.tsx:108-117`). Fix: call `refreshVolunteers()` after `assign_case`.

### /c — `app/(citizen)/c/page.tsx` — **warn**
**Purpose:** Public citizen map: full-screen Mapbox of nearby requests/resources/reports, weather alerts, GPS, deep-linking, agent sheet, AI map commands.

**Data flow:** Server component sets OG metadata via raw PostgREST fetch (service-role key). Client `CitizenMapPage` loads inside `map.on('load')`: `getAlerts(lat,lng)` and a **raw fetch** POST to `sos-read` (`scope:'area'`), both in `Promise.all` with `.catch` fallbacks. Reports from a Mapbox vector tileset. Realtime channel on requests/resources/matches. GPS flies the camera but does NOT re-run the area fetch. **apiCalls:** `getAlerts`, raw `sos-read` POST, raw PostgREST OG fetch, Google geocode, direct realtime, Mapbox tileset.

**Auth gating:** No `useAuthContext()`, no org id — intentional public map (only public/`map_visible` data). DEMO_CTX irrelevant.

**Findings:**
- `[MEDIUM][data-flow]` Primary map-pin fetch bypasses `lib/api.ts` with a raw `fetch()` to `sos-read` (`citizen-map-client.tsx:140-144`). Fix: add an `api.mapArea(...)` wrapper and call it in try/catch.
- `[MEDIUM][data-loading]` `loading` state set but never rendered — no skeleton/spinner; blank dark map until GeoJSON arrives (`citizen-map-client.tsx:39,371,646`). Fix: render a spinner while loading, set false after sources added.
- `[MEDIUM][data-loading]` Area pin/alerts fetch always uses default US-center coords — data effect has empty deps and never re-runs after GPS resolves (`citizen-map-client.tsx:34-35,139,143,376`). Fix: re-fetch on resolved coordinates.
- `[LOW][auth]` `generateMetadata` reads arbitrary `?pin` row with `SERVICE_ROLE_KEY` for OG tags (`page.tsx:25-47`). Fix: use the anon key / a public-read EF; select only public columns.
- `[LOW][broken-display]` `selectedPin.id` read before string-parse normalization (`citizen-map-client.tsx:273-275`; same at 433). Fix: parse props once, then read `.id`.
- `[LOW][other]` Unreachable dead guard in GPS flyTo block (`citizen-map-client.tsx:80-81`). Fix: remove the redundant guard.
- `[LOW][data-flow]` Direct supabase-js realtime subscription bypasses the api/db layer (legit, cleaned up; no-op matches handler) (`citizen-map-client.tsx:338-368`). Fix: acceptable; remove the no-op handler; document as sanctioned.

### /c/agent — `app/(citizen)/c/agent/page.tsx` — **warn**
**Purpose:** Full-screen citizen SOS agent chat streaming via `/api/chat`, running intake/match/report/score flows with inline tool cards; accepts `?q=`.

**Data flow:** AI SDK `useChat` + `DefaultChatTransport` → `/api/chat` (POST), sending `x-person-id`/`x-authenticated`. `saveChatHistoryDebounced` → POST `/api/chat-history`. `loadChatHistory`/`getPersonContext` imported but never called. **apiCalls:** `useChat → /api/chat`, `saveChatHistoryDebounced → /api/chat-history`, `getPersonId`.

**Auth gating:** No `useAuthContext()` — anonymous citizen page. Identity is a self-issued `sos-person-id` cookie; `x-authenticated` is unverified.

**Findings:**
- `[HIGH][data-flow]` Chat history saved but never restored — `loadChatHistory`/`getPersonContext` imported but never invoked; `useChat` initialized with no messages (`page.tsx:10-11,74-77`). Fix: call `loadChatHistory(personId)` on mount and seed `useChat`.
- `[MEDIUM][auth]` chat-history persistence keys only on a client-supplied `person_id` with the service-role key → IDOR (`page.tsx:36-37,76` → `chat-history/route.ts:4-45`). Fix: gate reads/writes behind a verified session.
- `[MEDIUM][data-flow]` Transport omits `x-user-lat/lng` and `x-erv-flow` headers the chat API expects — "near me" search has no location; ERV flows can't be entered via headers (`page.tsx:33-39`). Fix: pass GPS headers; document ERV/JOIN markers.
- `[MEDIUM][error-state]` Error UI hides while a request is in flight; Retry sends a literal "continue" (`page.tsx:187-195`). Fix: use `reload()`/`regenerate()`; keep the error visible.
- `[LOW][broken-display]` `personId` computed via `typeof window` guard → SSR/client divergence; transport headers captured at first render only (`page.tsx:30,33-39`). Fix: resolve in `useEffect` into state; use `prepareRequest`.
- `[LOW][broken-display]` Tool part parse failures silently swallowed → renders nothing (`page.tsx:159-181`). Fix: render a fallback when JSON parse fails or `__tool` is absent.

### /c/feed — `app/(citizen)/c/feed/page.tsx` — **fail** · **STALE**
**Purpose:** Citizen activity feed of community messages/reports/agent responses with filter pills.

**Data flow:** Single `api.getMessages('community')` → `efCall('community-messages',{channel_id:'community'}, {method:'GET'})`, mapped into `FeedItem[]`. Loading spinner + empty-state; goes through `lib/api.ts`. **apiCalls:** `getMessages('community')`.

**Auth gating:** No `useAuthContext()`, no org id — fixed global channel; likely intended public.

**Findings:**
- `[HIGH][error-state]` Primary fetch has no try/catch — `efCall` rejection leaves the page stuck on the spinner forever (`setLoading(false)` never runs) (`page.tsx:29-51`). Fix: try/catch/finally + error/retry UI.
- `[HIGH][broken-display]` Filter pills "Alerts"/"Needs"/"Reports" never match — plural pill keys vs singular `FeedItem.type`; map only emits `report`/`community` (`page.tsx:8,12,38,53,68`). Fix: align keys; populate or drop dead categories.
- `[MEDIUM][stale]` Route unreachable — not in citizen nav, zero inbound links (`page.tsx` whole file; `citizen-shell.tsx:8-12`). Fix: add a Feed tab or delete.
- `[LOW][auth]` Community message bodies exposed with no auth gating (likely-intended public feed; `person_id` held in state but not rendered) (`page.tsx:31,43,100`). Fix: confirm public intent; drop unused `person_id`.
- `[LOW][broken-display]` Dead ternary branch (`agent_response` → `community`) and unused `distance` field (`page.tsx:17,38`). Fix: give agent_response its own type; remove/populate `distance`.

### /c/manage — `app/(citizen)/c/manage/page.tsx` — **fail**
**Purpose:** Citizen self-service Manage tab: own SOS score, requests, resource offers, matches, with edit/pause/resume/close and accept/decline.

**Data flow:** `getPersonId()` → `loadData(pid)`: `efCall('sos-read', {actor:{citizen,id}, scope:'my_records', include:['matches']})` THEN `getSOSScore(pid)`; only after BOTH resolve does it `setState`. Realtime channel on `matches` re-runs `loadData`. Mutations: `sos-update` (update); `respondMatch` for accept/decline (no try/catch, no `actor.id`). **apiCalls:** `sos-read my_records`, `getScore`, `sos-update`, `respondMatch`, direct realtime.

**Auth gating:** No `useAuthContext()` — identity is the `sos-person-id` cookie; server-scoped to `actor.id`. Documented unauthenticated-citizen model.

**Findings:**
- `[HIGH][error-state]` `loadData` has no error handling and couples score failure to all other data — `getSOSScore` rejection prevents `setState`, blanking requests/resources/matches even when `sos-read` succeeded; no loading flag (`page.tsx:51-62,64-82`). Fix: try/catch + error state; `Promise.allSettled`; add loading.
- `[HIGH][data-flow]` Match accept/decline sends `sos-update` with no `actor.id` — `respondMatch` omits the person id (`page.tsx:417-436`; `lib/api.ts:59-60`). Fix: forward the person id; verify the EF contract.
- `[MEDIUM][error-state]` Accept/decline not wrapped in try/catch — unhandled rejection, no feedback (`page.tsx:417-437`). Fix: wrap + reuse showError/showFlash; disable while in flight.
- `[LOW][data-loading]` Minimal handling for null `personId` (generic guidance, no CTA); null-actor path effectively unreachable (`page.tsx:64-82,213-215`). Fix: clearer CTA; guard handlers defensively.
- `[LOW][broken-display]` Recent Activity sort assumes `created_at` present — `new Date(undefined)` is NaN; renders "Invalid Date" (`page.tsx:203,208,241,250,330,403`). Fix: coalesce; guard date rendering.
- `[LOW][data-loading]` Realtime subscription not scoped to the visitor's matches → excessive refetches (`page.tsx:72-80`). Fix: scope/debounce.

### /c/match — `app/(citizen)/c/match/page.tsx` — **fail**
**Purpose:** Citizen swipe UI for reviewing match proposals tied to the person's own requests/resources; accept calls `respondMatch`.

**Data flow:** `getPersonId()`. Step 1: `efCall('sos-read',{actor:{citizen,id}, scope:'my_records'})` → request/resource ids. Steps 2/3: **direct** `supabase.from('matches')` joins `.in(...).eq('status','proposed')`; plus accepted/connected/fulfilled queries. Realtime channel on `matches`. `handleDecision('accept')` → `respondMatch` then advance (advance is OUTSIDE try/catch). **apiCalls:** `sos-read my_records`, 4× direct `supabase.from('matches')`, direct realtime, `respondMatch`, Mapbox static img.

**Auth gating:** No `useAuthContext()`; identity from the `sos-person-id` cookie. Direct anon-key queries pull PII-ish joined fields, bypassing EF masking — exposure depends on RLS.

**Findings:**
- `[HIGH][data-loading]` Project-rule violation: 4 direct `supabase.from('matches')` PostgREST queries + realtime, anon key, raw location/org fields (`page.tsx:87-95,118-123,146-151,185-201`). Fix: route match reads through a masking EF.
- `[HIGH][error-state]` Accept failure swallowed and the card still advances (false success) — advance runs outside try/catch (`page.tsx:217-228`). Fix: only advance on success; surface error; keep the card.
- `[MEDIUM][error-state]` `loadProposals` failures render as benign "No match proposals yet" — try/catch only console.errors; `{error}` never checked (`page.tsx:118-123,207-211,293-303`). Fix: add error state; check `{error}`; render retry.
- `[MEDIUM][broken-display]` SwipeCard uses light-theme classes clashing with the dark design (`swipe-card.tsx:148,153,165,180`). Fix: pass theme-aware classes / restyle to the dark palette.
- `[MEDIUM][data-flow]` Accepted-matches label collapses to generic "Match"; direction not tracked (`page.tsx:185-205,402-414`). Fix: track direction; pick the counterpart label.
- `[LOW][broken-display]` Stale `currentIndex` possible if realtime/refresh shrinks the list mid-review (`page.tsx:177,227,89-93`). Fix: clamp index after reloads.
- `[LOW][other]` Mapbox static-map img has no `onError` fallback; missing token → broken image (`page.tsx:316-329`). Fix: add `onError`; guard empty token.

### /c/profile — `app/(citizen)/c/profile/page.tsx` — **fail** · **STALE**
**Purpose:** Citizen profile: SOS Score, readiness checklist, match/report counts, nav links. Identity from a locally stored person id.

**Data flow:** `getPersonId()`; if present, `Promise.all` of `getScore`, `sos-read my_records include:['matches']`, `sos-read include:['community_messages'] filters:{message_type:'report'}` — NO try/catch. Spinner while loading; safe defaults when score null. **apiCalls:** `getScore`, two `sos-read` calls.

**Auth gating:** No `useAuthContext()`; all calls scoped to the cookie person id (`my_records`). Doesn't depend on DEMO_CTX.

**Findings:**
- `[HIGH][error-state]` No try/catch on the primary load — any EF rejection leaves the page stuck on the spinner forever (`setLoading(false)` unreached) (`page.tsx:32-44`). Fix: try/catch/finally; consider `allSettled`; use `getSOSScore` for defaulting.
- `[MEDIUM][broken-display]` Nav buttons point to non-existent routes (`/matches`, `/invite`, `/leaderboard`, `/auth`) → 404 (`page.tsx:122,136-138,150`). Fix: repoint to real routes or delete the page.
- `[LOW][stale]` Route unreachable and duplicates `/c/manage` (which already renders the SOS Score) (`page.tsx:1-162`). Fix: delete (and its dead links) or add to the citizen nav.
- `[LOW][data-loading]` matches/reports responses only counted; EF/query-type support unconfirmed (defensively guarded) (`page.tsx:36-41`). Fix: align include/filters with `/c/manage`; surface unexpected shapes once error handling exists. *(unverified)*

### /join — `app/(citizen)/join/page.tsx` — **fail**
**Purpose:** Public anonymous AI-chat onboarding for joining the SOS community; intended to save the visitor as a community volunteer.

**Data flow:** `useChat` + `DefaultChatTransport` → `/api/chat`. Auto-sends `[JOIN_SOS]` sentinel, detected server-side → `joinFlow=true`, selecting `JOIN_PROMPT`. `?ref` persisted to localStorage. **HOWEVER** `route.ts:252` attaches NO tools when `joinFlow`, so `submit_join_person` is never available → join data never saved. **apiCalls:** `useChat → /api/chat`; `submit_join_person` tool defined but not wired.

**Auth gating:** No `useAuthContext()`, no org id — intentionally public (`proxy.ts:9`). Renders no PII; the only credential is server-side service-role inside the EF.

**Findings:**
- `[HIGH][data-flow]` Join flow can never persist the person — `submit_join_person` is not wired into the join chat (tools omitted when `joinFlow`) while the prompt instructs the model to call it (`route.ts:252` vs `:235`; tool at `chat-tools.ts:319`). Fix: attach a restricted toolset containing `submit_join_person` in the join branch.
- `[LOW][broken-display]` `[JOIN_SOS]` sentinel can leak into the UI if echoed by a non-user message — filter is user-role-scoped (`page.tsx:94`). Fix: strip the token from any rendered text regardless of role.
- `[MEDIUM][error-state]` Auto-sent seed has no error/retry surface — a failed first request shows a blank dark screen with a generic error (`page.tsx:121-127,32-37`). Fix: add Retry; consider a static fallback greeting.
- `[LOW][other]` Entire page styled with inline styles instead of the Tailwind dark-theme system (`page.tsx:55-177`). Fix: migrate to Tailwind tokens.
- `[LOW][other]` Input bar uses `safe-area-inset-top` for top padding on a bottom element (likely copy-paste typo) (`page.tsx:140`). Fix: use a plain `12px` top; keep `safe-area-inset-bottom`.

### /home — `app/home/page.tsx` — **fail** · **STALE**
**Purpose:** Static marketing/landing page with a scripted GSAP hero animation. No data, no auth, no PII.

**Data flow:** No fetching. A single `useEffect` dynamically imports GSAP + ScrollTrigger and runs imperative DOM animations. All copy/stats hardcoded. **apiCalls:** none.

**Auth gating:** No `useAuthContext()`, no org id — correct for a public page. Not in `proxy.ts` allowlist → proxy returns 404 (unreachable rather than leaking).

**Findings:**
- `[CRITICAL][stale]` `/home` is not in the `proxy.ts` allowlist — route returns 404 in production; the entire page is unreachable (`proxy.ts:5-23`). Fix: delete the page (likely superseded by the allowlisted `/home-v25.html`) or add `/home` to `PUBLIC_PATHS` (requires explicit instruction per CLAUDE.md).
- `[LOW][stale]` Route orphaned — zero inbound links anywhere (`page.tsx` whole file). Fix: confirm `/home-v25.html` replaced it; delete dead code if so.
- `[HIGH][broken-display]` Hero CTAs, nav, and tagline stay invisible (opacity:0) if the GSAP dynamic import fails — no try/catch and no no-JS fallback for the hero (`page.tsx:13-16,459`; `home.css:20,534-576`). Fix: wrap `initGSAP` in try/catch and force-reveal the hero on failure.
- `[MEDIUM][broken-display]` "I want to help" CTA links to `/volunteer`, which does not exist (404) (`page.tsx:844`). Fix: point to an existing allowlisted route (e.g. `/c?flow=give-help`).
- `[LOW][other]` Animation listeners and a self-perpetuating rAF loop are never cleaned up on unmount (`page.tsx:36-52,56-59,81`). Fix: return a cleanup that removes listeners, disconnects the observer, cancels the rAF, and kills ScrollTrigger instances.

### /share/incident/[id] — `app/share/incident/[id]/page.tsx` — **fail** · **STALE**
**Purpose:** Public, PII-redacted situation report for a single incident: status, declared date, county, KPI counts, per-category breakdown. Shared via `ShareSitrepDialog`.

**Data flow:** `crmCommandSummary(id)` (`crm-command incident_summary`), `.catch(()=>{})` (swallowed), `.finally` clears loading. Result stored raw (`any`). Render reads `cases/total_cases`, `fulfilled/...`, `capacity/...`, `categories`, etc. `redactName` imported but unused. **apiCalls:** `crmCommandSummary`.

**Auth gating:** No `useAuthContext()`, no org id — intentionally public; fields consumed are non-PII aggregates. No per-org gating → incident summaries enumerable by id.

**Findings:**
- `[HIGH][data-flow]` Consumed field names don't match the `incident_summary` EF shape — the page reads `cases/fulfilled/capacity/name/county/categories`, but the EF returns `open_cases/fulfilled_pct/requests_by_category/...` (per the sibling command consumer), so KPIs/categories render empty/zero (`page.tsx:64-71,125-130`; cross-ref `command/[id]:45-69`). Fix: consume the real keys (or fetch metadata like the command page does); type the response.
- `[MEDIUM][stale]` Route effectively unreachable — the only linker (`ShareSitrepDialog`) is never rendered, and its "Open public page" link uses invalid TanStack syntax (`href="/share/incident/$id" params={{id}}`) (`ShareSitrepDialog.tsx:32,123-129`). Fix: wire the dialog in and fix the link, or remove the orphaned route.
- `[MEDIUM][broken-display]` `countyOnly()` hardcodes ", NC" for every incident; "Unknown County County, NC" on missing county (`page.tsx:104,65`; `redact-for-public.ts:16-18`). Fix: pass real state; don't double-append "County".
- `[LOW][error-state]` Fetch errors silently swallowed (`.catch(()=>{})`) → outage looks like "not found" (`page.tsx:30-33,49-62`). Fix: distinguish error vs empty; at least console.error.
- `[LOW][other]` Unused `redactName` import; response typed `any` (hides the shape mismatch) (`page.tsx:11,25`). Fix: remove the import; type the state.

### /erv/impact — `app/erv/impact/page.tsx` — **pass**
**Purpose:** Public static marketing/impact report for Emergency RV: 16 months of relief stats as a single-scroll narrative with OG/Twitter metadata.

**Data flow:** No runtime data flow — every figure is a hardcoded module-level constant or inline literal. Pure server component; no state/fetch/params. Imports resolve; assets present. **apiCalls:** none.

**Auth gating:** No `useAuthContext()`, no org id — intentionally public (`proxy.ts:28` allowlists `/erv/`). Only aggregate published marketing numbers; no PII.

**Findings:**
- `[LOW][other]` Hardcoded data with no source-of-truth or last-updated provenance — will silently go stale; current-tense claims hand-entered (`page.tsx:26-66,159,352`). Fix: back with a build-time/revalidated fetch or centralize constants + a single "data as of" date.
- `[LOW][other]` Internal numbers are mutually inconsistent (families totals, "55 states" vs 8 rows, helper sum vs headline) — cosmetic credibility issue (`page.tsx:123,262-267,288,314-327`). Fix: reconcile the totals/copy.
- `[LOW][broken-display]` Uses `<img>` instead of `next/image` for a ~432KB logo (`page.tsx:84`). Fix: use `next/image` or add width/height/loading.

---

## Prioritized Fix List

### P0 — Critical / systemic (do first)
1. **Replace the DEMO_CTX hardcoded-auth bypass with real authentication and org/role resolution.** Gate every `/app/*` route and every admin write surface; have EFs enforce org scoping server-side; never fall back to empty `org_id`. *(lib/auth-context.tsx; blast radius: ~all `/app/*` pages + several detail pages.)* This unblocks the auth findings on map, match, cases, cases/[id], directory, directory/browse, directory/org/[id], directory/request/[id], directory/resource/[id], command, calendar, inventory, reports, settings, settings/org, settings/people, transport, volunteers.
2. **Add org scoping to `crmMatchesList`** (rename `_orgId`, filter the matches query, or route through an org-scoped EF) to stop the cross-org match + survivor-PII leak. *(lib/api.ts:165-191; /app/match.)*
3. **Scope `crmBrowseOrgs` to the viewer's org/network** and enforce membership in the EF to stop the cross-tenant org-directory leak. *(lib/api.ts:201-202; /app/directory/browse, /app/directory.)*
4. **Add org scoping to resource detail read + edit** (`crmResourceDetail`, `update_resource`) so a UUID is not the only gate. *(lib/api.ts:300-301; /app/directory/resource/[id].)*
5. **Gate org-detail view/edit and team-management by ownership/role** so a visitor cannot read/edit arbitrary orgs or rosters. *(/app/directory/org/[id], /app/settings/people.)*
6. **Gate `/app/settings` portal-config reads/writes behind a real admin check.** *(/app/settings.)*
7. **Fix `/home` reachability** — delete the orphaned page (likely superseded by `/home-v25.html`) or, with explicit instruction, add `/home` to `proxy.ts` `PUBLIC_PATHS`. *(proxy.ts; app/home/page.tsx.)*
8. **Remove the duplicate `crmOrgMembers` key in `lib/api.ts`** and align the action with the deployed EF. *(lib/api.ts:204-205,288-289; /app/directory/org/[id], /app/settings/people.)*

### P1 — High
9. **Map `/app/transport` rows from snake_case to the Assignment shape** so Driver/Resource/ETA columns render (mirror `drive/[id]:32-56`). *(/app/transport.)*
10. **Fix the driver page mapper** (`drive/[id]`) — remove the empty-prototype fallback; map directly from `raw` with literal defaults; add safe defaults/guards for coordinator/vehicle/distance/notes; resolve the transport by id (ideally server-side per spec). *(/drive/[id].)*
11. **Render `/app/directory/person/[id]` from `crmGetPerson`** — drop the emptied mock store, reconcile rendered fields to one EF shape, and move all hooks before the early return (Rules of Hooks). *(/app/directory/person/[id].)*
12. **Fix `/app/calendar` New-event crash** — default org to `''` instead of `orgs[0].id`; remove the dead Organization field/`EventDrawer`. *(/app/calendar.)*
13. **Populate `/app/cases/[id]` identity/status/summary** from the detail response; fix the `request_id` vs umbrella/SOS-id param mismatch; pass a real id to CommunicationTab. *(/app/cases/[id].)*
14. **Add error handling that surfaces failures** across the swallowed-error pages: let fetchers reject (or inspect `allSettled` results), destructure/render `error`+`refetch`, and add try/catch where missing — especially the stuck-spinner pages. *(/app/inventory, /app/reports, /app/volunteers, /c/feed, /c/profile, /c/manage, /drive/[id]; also command, map, cases, directory, directory/browse.)*
15. **Wire `submit_join_person` into the join chat** so the join flow actually persists. *(app/api/chat/route.ts:252; /join.)*
16. **Restore citizen agent chat history** — call `loadChatHistory(personId)` on mount and seed `useChat`. *(/c/agent.)*
17. **Forward `actor.id` on citizen match accept/decline** (`respondMatch`) and decouple score failure from the rest of `/c/manage` load. *(/c/manage.)*
18. **Stop swallowing the accept failure on `/c/match`** (only advance on success) and route the direct `supabase.from('matches')` reads through a masking EF. *(/c/match.)*
19. **Fix `/share/incident/[id]` to consume the real `incident_summary` keys** (or fetch metadata like the command page) and type the response. *(/share/incident/[id].)*
20. **Reveal the `/home` hero on GSAP-import failure** (try/catch + force opacity:1 fallback). *(/home.)*
21. **Implement or disable `/app/directory/request/[id]` write actions** and normalize the detail response to prevent render crashes. *(/app/directory/request/[id].)*
22. **Replace the `/app/directory/import` mock with a real org-scoped import flow** (or clearly label it a prototype) and fix the `/directory` 404 links. *(/app/directory/import, components/directory/Sidebar.tsx.)*
23. **Fix `/app/settings/org` config hydration** (read `portal_config`/the real key) and surface a false-success/save risk. *(/app/settings/org; lib/api.ts:91-94.)*
24. **Make `/app/settings` module/pin/size saves report real failures** — have `updateConfig` re-throw (or return success) and roll back optimistic state. *(/app/settings; lib/use-portal-config.tsx.)*

### P2 — Medium
25. **Fix all detail-page back-links** to the `/app`-prefixed routes and audit command-palette/Timeline/Sidebar for the same. *(directory org/report/person/volunteer detail, command/[id], components/crm/DetailShell.tsx.)*
26. **Honor deep-link query params** — `?tab=` on /app/cases, `?q=`/`?add=1`/`?type=` on /app/directory/browse, `?match=` on /app/match. *(those routes.)*
27. **Fix the `/app/map` dead layer-toggle checkboxes** (expose the map instance or use the existing filter CustomEvent) and de-duplicate the double `crm-map` fetch. *(/app/map.)*
28. **Wire the `/app/command/[id]` actions** — fix the `/command` back-link, fetch a single incident by id, render pinned reports, and pass orgId. *(/app/command/[id].)*
29. **Add empty/loading states distinct from errors** on tables/boards (inventory, directory/browse, settings/people, transport, cases). *(those routes.)*
30. **Drive `/app/reports` severity donut + trend from EF data** (or label them as sample) and add empty-state messaging. *(/app/reports.)*
31. **Replace `/app/volunteers` dead UI** (detail drawer, availability grid, find-available sidebar) with real data/handlers and unify the status vocabulary. *(/app/volunteers.)*
32. **Map `/app/cases` drag buckets to concrete statuses, add rollback, and add the missing 'closed'/'available' columns.** *(/app/cases.)*
33. **Re-center the `/c` area/alerts fetch on resolved GPS** and add a loading indicator; add an `api.mapArea` wrapper to replace the raw `sos-read` fetch. *(/c.)*
34. **Gate chat-history reads/writes behind a verified session** (IDOR) and pass GPS/ERV headers from the agent transport. *(/c/agent; app/api/chat-history/route.ts.)*
35. **Add validation + persist invites on `/app/onboard`** (or remove the invites textarea). *(/app/onboard.)*
36. **Add error/retry on the `/join` auto-sent seed message.** *(/join.)*
37. **Restyle `/c/match` SwipeCard to the dark theme** and track accepted-match direction for correct labels. *(/c/match, components/swipe-card.tsx.)*
38. **Fix `countyOnly()` to use the real state** instead of hardcoded ", NC". *(lib/redact-for-public.ts; /share/incident/[id].)*

### P3 — Low / cleanup / stale removal
39. **Resolve the stale routes** — delete or wire entry points for: `/app/command/[id]`, `/app/directory/volunteer/[id]` (consolidate with `person/[id]`), `/app/onboard`, `/app/settings/org`, `/app/settings/people`, `/app/settings/profile` (add a settings sub-nav), `/c/feed`, `/c/profile` (consolidate with `/c/manage`), `/share/incident/[id]`.
40. **Remove dead code/scaffolding** — `EventDrawer` (calendar), `CoverageTab` (org detail), `reportCards`/`REPORT_COLS` (cases), SVG-prototype constants (map), empty `assetEvents`/`orgs` (inventory), proto fallbacks (reports), unused imports (`redactName`, `useRouter`, `useMemo`, `usePortalConfig().config`), and the no-op realtime matches handler (/c). 
41. **Wire or remove no-op controls** — Export buttons (reports, import), Overflow Share/Flag/Retire menus (org/resource detail), command action buttons + hotline, CDL/available-today toggles (volunteers), Notes-tab composer (cases/[id]), settings/profile photo/toggles/sign-out, request-detail `href="#"` links.
42. **Fix display/type polish** — `prototypeInventory` type (inventory), uncontrolled Title/Bio drop (settings/profile), `defaultKey='activity'` (org detail), CrmShell module inconsistency (resource detail), command gradient color, `people`-metric fallback (command), `orgId` string|null → ChatPanel props, owner/matched-person label fixes (resource detail), Mapbox token guards (person detail, c/match), member empty-id keys (settings/people), `created_at` date guards (/c/manage), `[JOIN_SOS]` token stripping (/join), join input safe-area typo, `<img>`→`next/image` and number reconciliation (/erv/impact).
43. **Add unmount cleanup** for intervals/listeners — `/home` (rAF + listeners), `/drive/[id]` (location interval), `/app/directory/import` (progress interval).
44. **Add a minimal loading indicator** to the `/app` redirect index.
