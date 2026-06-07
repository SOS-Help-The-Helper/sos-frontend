# Dashboard Audit — Detail Pages & Module Pages

Audited 2026-06-07. Scope: 4 detail pages, 5 module pages, plus `lib/api.ts` and
`lib/auth-context.tsx`. Findings are grouped by severity, then broken down per page
with line references.

---

## Cross-cutting issue (affects almost every page)

### ⛔ CRITICAL — Data fetches race the org-config resolution → wrong database

`lib/api.ts` keeps a single mutable connection (`efBaseUrl`, `efAnonKey`, lines 28–42).
On first paint it points at the **default SOS DB**. `auth-context.tsx` only re-points it
at the partner DB *after* an async chain completes: `loadSession()` → `/api/me` →
`resolveOrg()` → `/api/org-config` → `setOrgConfig()` (auth-context.tsx:102–115, 125–181).

Every detail page fires its fetch in a `useEffect` keyed on **`[id]` only**, so it runs on
mount — before `setOrgConfig` has run — and **never re-fires** once the partner DB is
resolved:

- `cases/[id]/page.tsx:168` deps `[id, isUmbrella]`
- `directory/person/[id]/page.tsx:64` deps `[id]`
- `directory/request/[id]/page.tsx:72` deps `[id]`
- `directory/browse/page.tsx:114` orgs effect deps `[]` (line 135)

Result: for partner orgs whose data lives in a non-default DB, the first (and only)
fetch hits the **SOS DB**, returns nothing/old data, and the page renders "not found"
or empty with no retry. `resource/[id]` (deps `[id, orgId]`, line 48) and the module
pages that key on `[orgId]` are the only ones that self-correct.

**Fix:** include `orgId`/`supabaseUrl` in the dependency arrays, or gate the fetch on
`!loading && orgId` from `useAuthContext()`, so the fetch waits for and re-runs after
org resolution.

### ⛔ CRITICAL — Cross-tenant data leak in `crmMatchesList`

`lib/api.ts:227–254` selects up to 500 matches with **no org filter** — the `.eq(...)`
is a `// TODO` (line 238). Any signed-in org sees every org's matches. Multi-tenant
isolation is not enforced here.

### 🔶 MAJOR — Auth failure can hang pages in a silent empty state

`auth-context.tsx:176–180`: if `/api/me` throws (network/500), the catch only sets
`loading=false`; `orgId` stays `null` and `signedOut` stays `false`. Pages that guard on
`if (!orgId) return` (transport.tsx:100/107, inventory via `[orgId]`) then sit on an
empty screen with no error and no spinner. There's no error surface for a failed session.

### 🔸 MINOR — Lost server error messages

`callEf` (api.ts:65–67) throws `EF <fn> failed: <status>` and discards the response body.
Pages can only show generic "Failed to load…" toasts; real validation messages from the
edge function never reach the user.

### 🔸 MINOR — Import casing inconsistency (Linux/Vercel build risk)

`cases/[id]/page.tsx` imports `@/components/crm/ai-summary` (line 9) and
`@/components/crm/detail-shell` (line 11, lowercase), while every other page imports
`@/components/crm/AiSummary` and `@/components/crm/DetailShell` (PascalCase). On the
case-insensitive dev FS this works; on Vercel's case-sensitive FS this is either a
duplicate component or a build break. Reconcile to one canonical path.

---

## Detail Pages

### `app/app/cases/[id]/page.tsx`

**Data loading**
- ⛔ Wrong-DB race (see cross-cutting). Fetch deps `[id, isUmbrella]` (line 168), no refetch.
- 🔶 Second effect `crmGetCaseNotes(id)` (line 244–250) catches with
  `toast.error("Failed to load case")` — wrong, misleading copy; it's a *notes* fetch and
  fires for every id, including request ids.
- 🔶 `umbrellaData.needs` is **never populated** from the API (only `timeline`, `requests`,
  `matches`, `citizen` are mapped, lines 174–238). The AI summary (line 337) and the
  unmet-needs logic read `needs`, so the summary always renders a broken sentence with
  empty taxonomy (`"spanning  across N orgs"`) and never shows unmet needs.
- 🔶 `handlePostNote` (line 252–269) posts the note but **does not refetch** timeline or
  `caseNotes`, and does no optimistic insert — it just clears the input. The note vanishes
  from the UI; the user can't tell it worked.
- 🔸 `CaseTabs` org effect (line 458–465) uses `orgId` but deps `[]`; runs once with a
  possibly-null `orgId`. Also catches with the same wrong `"Failed to load case"` copy.
- 🔸 Three different note-write paths with different params: `handlePostNote` →
  `add_note {request_id}` (258), `NotesTimeline` → `add_case_note {umbrella_id}` (809),
  `CommunicationTab` → `add_case_note {sos_id}` (953). At least one is wrong for the backend.

**Layout / UX**
- 🔶 `Kpi "Days open" value={3}` is **hardcoded** (line 329).
- 🔶 `module placeholder` consts `cases`, `orgs`, `matches` are empty arrays (lines 38–40).
  Timeline `orgs.find` (669, 684) and Requests `orgs.find` (534) always return undefined →
  org names/colors never render. `protoMatches` (444–445) is always empty.
- 🔸 `CommunicationTab` (930–1019) re-reads `crmGetCaseNotes` as "messages" — it's the same
  data as the Notes tab, so Notes and Communication show identical content.
- 🔸 Status pill (line 289–291) prints raw lowercase `status` instead of `STATUS_LABEL`.

**Missing editability / dead controls**
- 🔶 Header actions **Call**, **Message**, **Add need** (305–307) have no `onClick` — dead.
- 🔸 Admin items **Generate report** and **Flag for review** (630–631) are dead `AdminItem`s.
- 🔸 `handleCloseCase` / `handleAssignOrg` / `handleStatusChange` (467–506) fire the action
  but never refetch or navigate, so the page state goes stale after a successful write.

**Navigation** — Requests/Timeline links to `/app/directory/request/${id}` are fine.

---

### `app/app/directory/person/[id]/page.tsx`

**Data loading**
- ⛔ Wrong-DB race (deps `[id]`, line 64).
- 🔶 `saveEdit` (127–140) does three sequential `crmUpdatePerson` awaits and **never
  updates `apiData`** — after "Person updated" the displayed name/phone/email stay old
  until a full reload.
- 🔸 `person.scoreBreakdown` defaults to all-zero (105–109); if the EF doesn't return
  `*_score`, every person shows SOS score 0 with a 0-width bar (HeroLine 361–373).

**Layout / UX**
- 🔸 `useRouter` imported but unused (line 4).
- 🔸 `StewardshipBand onRequestChange={() => (() => {})()}` (322) — an obfuscated no-op.

**Missing editability — the big one**
- ⛔ The page *looks* inline-editable but isn't. Every `EditableCell`/`EditableSelect`
  (housing 200–206, role 223–228, phone 232–236, email 238–243, county 245–251) is passed
  `editable={false}` and `onCommit={() => {}}`. They render as editable-styled fields that
  do nothing. Real edits only happen through the separate modal (Edit button → 276–317),
  which only covers name/phone/email — **housing status, role, and county cannot be edited
  at all**.
- 🔶 Credentials "Add credential" (426–428) and the implied skills add are dead buttons.

---

### `app/app/directory/request/[id]/page.tsx`

**Data loading**
- ⛔ Wrong-DB race (deps `[id]`, line 72). On any error it renders a flat
  "Request not found" (105–112) with no retry.
- 🔶 `handleFindMatches` (57–70) calls `match-engine propose` and only toasts the count —
  it **never refreshes the candidate list**, so newly-scored matches never appear until reload.
- 🔸 AIRS/OCHA chip (178) renders `AIRS {r.airs} · OCHA {r.ocha}` even when both are
  undefined → literal "AIRS undefined".

**Missing editability / dead controls**
- 🔶 **Approve match** primary button (187) has no `onClick` — dead.
- 🔶 `MatchesList` Approve/Reject (387–411) are **placeholder `setTimeout(500)`** stubs that
  toast success but call no API and never flip `c.approved`. Nothing actually changes.
- 🔸 OverflowMenu actions Reassign/Share/Flag/Close (188–195) are all dead.
- 🔸 No way to edit request status, urgency, or assignment inline.

**Navigation — several dead links**
- 🔶 Avatar links to `href="#"` (133) even though `personId` exists — clicking the avatar
  goes nowhere (the name chip at 145 does link correctly, so this is inconsistent).
- 🔶 "Driver page" link `href="#"` (265) — dead, despite a real transport assignment.
- 🔸 Files-tab related-case links `href="#"` (363) — dead.

---

### `app/app/directory/resource/[id]/page.tsx`

This is the **healthiest** detail page — it refetches after edit (71–72) and keys on
`[id, orgId]` (48), avoiding the wrong-DB race.

**Data loading**
- 🔶 `api.crmResourceDetail(id, orgId)` is called with **two args** (45, 71) but the function
  takes one (`api.ts:361`); `orgId` is silently ignored, so the detail read is not org-scoped.
- 🔸 `r.history` (113) and `events` (115) are hardcoded empty arrays → Activity tab only ever
  shows matches, and HeroLine's "N events" (354) is always 0.

**Layout / UX**
- 🔶 `matchedTo.personName` uses `data.matches[0].request_person_id` (112) — a **UUID** — so
  the "matched to" hero line and Matches tab display a raw id instead of a person's name.
- 🔸 Status vocab is inconsistent: `statusColor` keys on `deployed`/`matched` (121–122) but
  the edit dropdown offers `available`/`reserved`/`fulfilled`/`unavailable` (308) — the two
  sets don't overlap, so an edited status loses its color.

**Missing editability / dead controls**
- 🔸 Owner link uses `(r as any).ownerId` which is never set (261) → owner always links to `#`.
- 🔸 Overflow Share/Flag/Retire (277–281) are dead.

---

## Module Pages

### `app/app/transport/page.tsx`

Overall the **best-built** page: robust `extractList` normalizer (50–81), real create/status/
issue writes with refetch, good loading + empty states, separate mobile-card and desktop-table
layouts.

- 🔶 **Map view is a permanent placeholder** ("Map view coming soon", 404–410) even though
  origin/destination/current lat-lng are fetched (74–79). The toggle implies a feature that
  doesn't exist.
- 🔸 Photos render as generic camera-icon tiles (560–564), never the actual photo URLs in
  `t.photos`.
- 🔸 `handleStatusChange` (140–150) updates optimistically but doesn't roll back the select on
  failure (only toasts) — the dropdown shows the new status while the server has the old one.

### `app/app/inventory/page.tsx`

- 🔶 `assetEvents` (line 22) and `orgs` (line 23) are hardcoded empty arrays. Consequences:
  the "Tracked assets" table's **Last event** column is always "—" (328), owner column is
  blank (366), facility-chip colors are absent (253), and the ResourceDrawer timeline is always
  empty (538–541).
- 🔶 The Condition `<select>` in the Resources table uses `defaultValue="good"` (372) — it is
  **uncontrolled and ignores the item's real condition**; every row shows "good" regardless of
  data, and there's no initial value wired from the API.
- 🔸 Two side-by-side tables both effectively labeled resources ("Tracked assets" 300 vs
  "Resources" 340) is confusing; the first is driven by `resources`, the second by `inventory`.
- 🔸 `handleConditionChange` (87–94) writes but never refetches — the change isn't reflected.
- 🔸 Facility filtering is fragile string matching on name/address substrings (134–140).
- 🔸 ResourceDrawer "Move to…" (528–530) and the Stars `n={4}` (535) are hardcoded/dead.
- 🔸 `FacilityChip`/`FacilityHeader` divide by `f.capacity` (438, 469, 267) with no zero guard.

### `app/app/reports/page.tsx`

- 🔶 **Half the page is permanent placeholder.** `SeverityDonut` (185–192) and
  `TrendSparkline` (194–204) always render "not available" — `data` is hardcoded empty.
- 🔶 KPI `delta` is always `""` (map fn 26–28), so each KPI card reserves an empty green line
  (125). The proto fallbacks (`orgs`/`cases`, lines 10–11) are empty arrays, so if the
  dashboard EF returns nothing the entire body is blank with no empty-state messaging.
- 🔸 **Export** button (95–98) is dead — no `onClick`.

### `app/app/calendar/page.tsx`

- ⛔ **Date matching is almost certainly broken.** Events are filtered with
  `items.filter(s => s.date === d.date)` (147, 236) where `d.date` is a **localized display
  string** like `"Jun 7"` (28–35). Unless the EF returns `date` in exactly that format,
  **no events ever render**. The form also stores `date` as that display string (459), which
  won't round-trip with a DB date column.
- 🔶 `orgs` is a hardcoded empty array (line 9). So: event left-border colors never show
  (168, 255); and in `EventFormDrawer` the **Organization picker renders nothing** (505–516) —
  `org` defaults to `''` (445) and there's no way to choose one.
- 🔶 `EventDrawer` (323–426) — a full drawer with filled +/- and slot controls — is **defined
  but never rendered**. The active UI uses `InlineEventEdit`, which only edits title/date/time
  (561–636). So slots, location, notes, and the filled count **can't be edited anywhere** in
  the live UI.
- 🔸 Week is hardcoded to the current week (27–35); there's no prev/next navigation.
- 🔸 Optimistic add uses `Math.random()` ids (69) — fine client-side, but combined with the
  date-format issue the created event may not appear in any column.

### `app/app/directory/browse/page.tsx`

Largely functional, with good table/card/mobile layouts, search, filters, and sort.

- 🔶 Orgs effect deps `[]` (135) but uses `orgId` — fetched **once** with the initial
  (possibly DEMO) org and never re-fetched on org switch; contributes to the wrong-DB race.
- 🔸 `DEMO_ORG_ID` hardcoded fallback (39) can silently load the demo org's directory for a
  real but unresolved session.
- 🔸 Org table **Service Area** column is always "—" (653).
- 🔸 Overlapping `loading`/`personsLoading` flags (85–86): the orgs effect also sets `loading`,
  so switching the People/Orgs tab can flash stale loading states.

---

## Recommended fix order (prioritized)

1. **Fix the org-config fetch race** (cross-cutting CRITICAL). Gate every detail-page fetch on
   resolved `orgId`/`supabaseUrl` and add it to the dep arrays:
   `cases/[id]` (168), `person/[id]` (64), `request/[id]` (72), `browse` orgs effect (135).
   This is the single change that unblocks the most "page won't load / not found" reports.
2. **Close the cross-tenant match leak** — implement the org filter in `crmMatchesList`
   (api.ts:238).
3. **Fix calendar date matching** (calendar CRITICAL) — normalize event dates to a stable key
   (ISO `YYYY-MM-DD`) on both read and write instead of localized display strings.
4. **Make "edit" actually edit** where it pretends to:
   - person: wire the inline `EditableCell`/`EditableSelect` (or drop them) and refetch after
     `saveEdit`; add housing/role/county to the editable set.
   - request: replace the `setTimeout` Approve/Reject stubs and the dead "Approve match" button
     with real `match-engine`/`crmCaseAction` calls; refresh candidates after Find matches.
   - resource: fix the `crmResourceDetail` arity and the UUID-as-name display.
5. **Refresh-after-write everywhere** — cases note posting, admin actions, inventory condition,
   so successful writes are reflected without a reload.
6. **Remove or implement dead controls** — header Call/Message/Add need (cases), Generate
   report/Flag (cases), OverflowMenu items (request/resource), Export (reports),
   ResourceDrawer Move (inventory), dead `href="#"` links (request avatar, driver page,
   related cases).
7. **Replace placeholder data sources** — empty `orgs`/`assetEvents`/`matches`/`needs` arrays
   in cases, inventory, calendar, reports — with real EF data or hide the dependent UI.
8. **Harden auth/error surfacing** — surface `/api/me` failures (auth-context 176–180) instead
   of an indefinite empty state; propagate EF response bodies through `callEf` (api.ts 65–67).
9. **Polish** — reconcile import casing (cases page), wire transport map/photos, add empty
   states to reports, fix status-vocab/zero-division/unused-import nits.
