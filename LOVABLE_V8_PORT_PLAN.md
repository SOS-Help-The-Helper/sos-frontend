# Lovable v8 → SOS Frontend Port Plan

> **Generated:** 2026-05-26
> **Rule:** NO citizen portal changes. All work is CRM/partner pages only.
> **Reference files:** `/tmp/lovable-v8/src/` (Lovable v8 source)
> **Our codebase:** `/home/clawdbot/clawd/projects/SOS/sos-frontend/`

---

## Task Index

| # | Task | Files | Est. | Status |
|---|------|-------|------|--------|
| 1 | DetailShell primitives | components/crm/DetailShell.tsx | 15 min | ⬜ |
| 2 | TopNav — avatar dropdown + category nav | components/shell/top-nav.tsx | 15 min | ⬜ |
| 3 | TopNav — ⌘K search trigger | components/shell/top-nav.tsx | 10 min | ⬜ |
| 4 | match-primitives — pill maps + ChainCard | components/match/match-primitives.tsx | 10 min | ⬜ |
| 5 | match-primitives — ScoreBreakdown + Timeline | components/match/match-primitives.tsx | 10 min | ⬜ |
| 6 | MatchPairView | components/match/MatchPairView.tsx | 10 min | ⬜ |
| 7 | ModalKit | components/crm/ModalKit.tsx | 10 min | ⬜ |
| 8 | ShareSitrepDialog | components/crm/sitrep/ShareSitrepDialog.tsx | 10 min | ⬜ |
| 9 | MapPinCard — entity variants (Case, Request, Resource) | components/map/map-pin-card.tsx | 15 min | ⬜ |
| 10 | MapPinCard — entity variants (Report, Event, Facility) | components/map/map-pin-card.tsx | 10 min | ⬜ |
| 11 | MapPinCard — mobile bottom sheet + AccentRing | components/map/map-pin-card.tsx | 10 min | ⬜ |
| 12 | Map page — heatmap toggle | app/app/map/page.tsx | 10 min | ⬜ |
| 13 | Map page — wire entity-specific pin cards | app/app/map/page.tsx | 10 min | ⬜ |
| 14 | Command detail — category stats + filter | app/app/command/[id]/page.tsx | 15 min | ⬜ |
| 15 | Command detail — org involvement + incident lead | app/app/command/[id]/page.tsx | 10 min | ⬜ |
| 16 | Command detail — low inventory + pinned items | app/app/command/[id]/page.tsx | 10 min | ⬜ |
| 17 | Match page — scoring algorithm | app/app/match/page.tsx | 15 min | ⬜ |
| 18 | Match page — SLA countdown + household | app/app/match/page.tsx | 10 min | ⬜ |
| 19 | Match page — accept/decline handlers | app/app/match/page.tsx | 10 min | ⬜ |
| 20 | Share incident — public sitrep page | app/share/incident/[id]/page.tsx | 15 min | ⬜ |
| 21 | Directory import wizard | app/app/directory/import/page.tsx | 15 min | ⬜ |
| 22 | Dashboard home page | app/app/page.tsx | 10 min | ⬜ |
| 23 | Typography sweep — font-serif on all headings | multiple files | 10 min | ⬜ |
| 24 | Color sweep — updated layer colors | multiple files | 5 min | ⬜ |
| 25 | Build + verify | — | 5 min | ⬜ |

---

## Task Details

### Task 1: DetailShell Primitives
**File:** `components/crm/DetailShell.tsx`
**Reference:** `/tmp/lovable-v8/src/components/crm/DetailShell.tsx`
**What to add:** Port these exported functions from Lovable (lines 350-615):
- `DetailTabs` — horizontal tab bar for detail pages (tabs with counts)
- `DetailTopBar` — breadcrumb bar with back nav + title + actions
- `HeroBlock` — large stat display (number + label + optional sparkline)
- `DetailLayout` — standard 2-column layout (main + sidebar)
- `ContextCard` — info card with label-value rows
- `ContextRow` — single label: value row inside ContextCard
- `DetailNotFound` — empty state for missing records
- `DetailError` — error state with retry button
**Instruction:** Read our DetailShell.tsx AND Lovable's. Append the 8 missing exported functions from Lovable to the bottom of our file. Adapt imports: replace `@tanstack/react-router` Link with `next/link`, replace `useRouterState` with `usePathname`. Keep all styling exactly as Lovable has it. Run `npx next build`.

### Task 2: TopNav — Avatar Dropdown + Category Nav
**File:** `components/shell/top-nav.tsx`
**Reference:** `/tmp/lovable-v8/src/components/shell/TopNav.tsx`
**What to add:**
- Avatar dropdown (click avatar → settings, logout, org switcher)
- Category-grouped navigation (Respond → cases/match/map, Coordinate → calendar/volunteers/transport/inventory, Network → directory/reports)
- `AvatarMenuItem` sub-component
**Instruction:** Read both files. Add the avatar dropdown JSX + state (`avatarOpen`, `avatarRef`). Add the category-grouped nav links. Replace `Link from @tanstack/react-router` with `Link from next/link`, replace `to=` with `href=`. Keep existing module enable/disable logic. Run `npx next build`.

### Task 3: TopNav — ⌘K Search Trigger
**File:** `components/shell/top-nav.tsx`
**Reference:** `/tmp/lovable-v8/src/components/shell/TopNav.tsx`
**What to add:**
- ⌘K keyboard shortcut listener (opens CommandPalette or shows search UI)
- Search icon button in the nav bar
- We already have CommandPalette.tsx (490 lines) — just wire the trigger
**Instruction:** Read TopNav. Add a useEffect for Cmd+K / Ctrl+K keydown that dispatches a custom event or toggles a state. Add the search icon button. Wire to CommandPalette if it's mounted. Run `npx next build`.

### Task 4: match-primitives — Pill Maps + ChainCard
**File:** `components/match/match-primitives.tsx`
**Reference:** `/tmp/lovable-v8/src/components/match/match-primitives.tsx`
**What to add:**
- `URGENCY_PILL` color map (critical→red, high→orange, medium→yellow, low→green)
- `RV_STATUS_PILL`, `DRIVER_STATUS_PILL`, `RESOURCE_STATUS_PILL` color maps
- `MatchCardShell` — wrapper with accent border based on match status
- `ChainCard` — shows a single link in a match chain (request→resource→logistics)
- `ChainArrow` — SVG arrow between chain cards
**Instruction:** Read both files. Append the missing exports from Lovable after our existing code. Keep all existing exports unchanged. Run `npx next build`.

### Task 5: match-primitives — ScoreBreakdown + Timeline
**File:** `components/match/match-primitives.tsx`
**Reference:** `/tmp/lovable-v8/src/components/match/match-primitives.tsx`
**What to add:**
- `ScoreBreakdownPanel` — collapsible panel showing service/county/capacity/speed scores
- `TimelinePanel` — collapsible timeline of match events
- `Bar` — horizontal bar chart primitive (value as % of max)
**Instruction:** Read both files. Append the 3 missing exports. Run `npx next build`.

### Task 6: MatchPairView
**File:** `components/match/MatchPairView.tsx` (CREATE NEW)
**Reference:** `/tmp/lovable-v8/src/components/match/MatchPairView.tsx`
**Instruction:** Copy Lovable's file. Replace `Link from @tanstack/react-router` with `Link from next/link`. Replace `to=` with `href=`. Replace any prototype-data imports with props. Run `npx next build`.

### Task 7: ModalKit
**File:** `components/crm/ModalKit.tsx` (CREATE NEW)
**Reference:** `/tmp/lovable-v8/src/components/crm/ModalKit.tsx`
**Instruction:** Copy Lovable's file verbatim. No router changes needed (it's pure React). Run `npx next build`.

### Task 8: ShareSitrepDialog
**File:** `components/crm/sitrep/ShareSitrepDialog.tsx` (CREATE NEW)
**Reference:** `/tmp/lovable-v8/src/components/crm/sitrep/ShareSitrepDialog.tsx`
**Instruction:** Copy Lovable's file. Replace router imports with next/link. Run `npx next build`.

### Task 9: MapPinCard — Entity Variants (Case, Request, Resource)
**File:** `components/map/map-pin-card.tsx`
**Reference:** `/tmp/lovable-v8/src/components/map/MapPinCard.tsx`
**What to add:** Replace our generic card with entity-specific variants:
- `CaseCard` — shows open needs count, linked requests/resources with drill-in
- `RequestCard` — urgency badge, county, taxonomy display
- `ResourceCard` — matched/available status, capacity, location
- `Variant` dispatcher function
- Shared sub-components: `Title`, `SubLine`, `Chip`, `StatusLabel`, `Primary`, `Empty`
**Instruction:** Read Lovable's MapPinCard.tsx (504 lines). Read our map-pin-card.tsx (132 lines). Rewrite ours to include: the shared sub-components (Title, SubLine, Chip, StatusLabel, Primary, Empty), the Variant dispatcher, and CaseCard + RequestCard + ResourceCard. Keep our centered overlay layout (backdrop blur + logomark). Replace prototype-data lookups with data passed via props (the map page passes feature properties). Replace Link from @tanstack/react-router with next/link. DO NOT import from prototype-data. Run `npx next build`.

### Task 10: MapPinCard — Entity Variants (Report, Event, Facility)
**File:** `components/map/map-pin-card.tsx`
**Reference:** `/tmp/lovable-v8/src/components/map/MapPinCard.tsx`
**What to add:**
- `ReportCard` — verified badge, inline comment input
- `EventCard` — RSVP button, fill ratio progress bar, slots count
- `FacilityCard` — capacity gauge, type badge
**Instruction:** Read the file from Task 9. Add ReportCard, EventCard, FacilityCard following the same pattern. All data from props, not prototype-data. Run `npx next build`.

### Task 11: MapPinCard — Mobile Bottom Sheet + AccentRing
**File:** `components/map/map-pin-card.tsx`
**Reference:** `/tmp/lovable-v8/src/components/map/MapPinCard.tsx`
**What to add:**
- `useIsNarrow` hook (matchMedia 640px)
- `AccentRing` component (pulsing accent circle with Logomark)
- Mobile: when narrow=true, render as fixed bottom sheet instead of positioned card
- Desktop: keep current positioned behavior
**Instruction:** Read both files. Add useIsNarrow hook. Add AccentRing (replaces our static logomark). Add conditional rendering: narrow → fixed bottom sheet with slide-in-from-bottom animation + safe-area padding. Desktop → current absolute positioning. Run `npx next build`.

### Task 12: Map Page — Heatmap Toggle
**File:** `app/app/map/page.tsx`
**Reference:** `/tmp/lovable-v8/src/routes/map.tsx`
**What to add:**
- Mode toggle: pins ↔ heatmap (state: `mode`)
- Heatmap layer definition (weight, intensity, color ramp, radius, opacity by zoom)
- Toggle button in the map controls area
**Instruction:** Read both files. Add `mode` state ("pins" | "heatmap"). Add heatmap source+layer to the MapboxEmbed component (use same GeoJSON sources). Add toggle button below the filter chips. When heatmap active, hide unclustered/cluster layers; when pins active, hide heatmap layer. Run `npx next build`.

### Task 13: Map Page — Wire Entity-Specific Pin Cards
**File:** `app/app/map/page.tsx`
**What to change:** Update the `onPinSelect` handler to pass additional feature properties (urgency, county, capacity, taxonomy, etc.) so MapPinCard entity variants can display them.
**Instruction:** Read the map page click handler for unclustered pins. Expand the pin data object to include all available feature properties from the GeoJSON. Update the MapPinCard import to use the new variant-aware version. Run `npx next build`.

### Task 14: Command Detail — Category Stats + Filter
**File:** `app/app/command/[id]/page.tsx`
**Reference:** `/tmp/lovable-v8/src/routes/command.$id.tsx`
**What to add:**
- Category breakdown section (housing, food, medical, etc. with request + resource counts per category)
- Category filter state + UI (pill buttons to filter the dashboard by category)
- Horizontal bar chart showing category distribution
**Instruction:** Read both files. Add `categoryFilter` state. Add `categoryStats` computation from existing request/resource data. Add the category breakdown UI section with bar charts. Add filter pills above the main content. Run `npx next build`.

### Task 15: Command Detail — Org Involvement + Incident Lead
**File:** `app/app/command/[id]/page.tsx`
**Reference:** `/tmp/lovable-v8/src/routes/command.$id.tsx`
**What to add:**
- Org involvement sidebar (list of orgs engaged, with count)
- Incident lead card (name, avatar, role)
- "X of Y orgs engaged" stat
**Instruction:** Read both files. Add the org involvement section and incident lead card to the sidebar area. Use data from the existing incident API response. Run `npx next build`.

### Task 16: Command Detail — Low Inventory + Pinned Items
**File:** `app/app/command/[id]/page.tsx`
**Reference:** `/tmp/lovable-v8/src/routes/command.$id.tsx`
**What to add:**
- Low inventory alerts (items below threshold)
- Pinned field reports dashboard (pin/unpin reports to incident)
- Show more/less toggle for the pinned section
**Instruction:** Read both files. Add low inventory section (filter inventory where qty < threshold). Add pinned items section with unpin handler. Run `npx next build`.

### Task 17: Match Page — Scoring Algorithm
**File:** `app/app/match/page.tsx`
**Reference:** `/tmp/lovable-v8/src/routes/match.tsx`
**What to add:**
- `scoreFor(case, org)` — composite score from service match, county proximity, capacity, response speed
- `scoreResourceForCase(resource, case)` — resource-level scoring
- Score breakdown display per match suggestion
**Instruction:** Read both files. Add the scoring functions from Lovable. Wire them into the match suggestion cards so each suggestion shows a score + breakdown. Run `npx next build`.

### Task 18: Match Page — SLA Countdown + Household
**File:** `app/app/match/page.tsx`
**Reference:** `/tmp/lovable-v8/src/routes/match.tsx`
**What to add:**
- `slaHoursLeft(daysOpen, urgency)` — SLA countdown based on urgency tier
- `householdFor(id)` — adults/kids/pets breakdown
- `householdSummary(id)` — human-readable summary
- `needSummary(taxonomy[])` — readable need description
- Display SLA countdown badge on each request card
**Instruction:** Read both files. Add the helper functions. Add SLA countdown to request cards (red when <24h, orange <48h, green >48h). Add household summary display. Run `npx next build`.

### Task 19: Match Page — Accept/Decline Handlers
**File:** `app/app/match/page.tsx`
**Reference:** `/tmp/lovable-v8/src/routes/match.tsx`
**What to add:**
- `handleAccept(orgName)` — toast + update match status
- `handleDecline(orgId, reason)` — toast + decline reason tracking
- Decline reason modal/dropdown
- `ModeButton` component for Requests/Resources toggle
**Instruction:** Read both files. Add the handlers. Wire to the existing approve/decline UI. Add ModeButton if not present. Run `npx next build`.

### Task 20: Share Incident — Public Sitrep Page
**File:** `app/share/incident/[id]/page.tsx`
**Reference:** `/tmp/lovable-v8/src/routes/share.incident.$id.tsx`
**What to add:** Lovable has a full public sitrep page (357 lines) with:
- Incident header with severity + priority
- ImpactStat cards (affected, fulfilled, orgs engaged)
- Request breakdown by category
- Map embed showing incident area
- "How to help" CTA section
**Instruction:** Read both files. Port the Lovable page to Next.js. Replace router with useParams. Replace prototype-data with API calls (or pass as server-side props). This is a public page (no auth). Run `npx next build`.

### Task 21: Directory Import Wizard
**File:** `app/app/directory/import/page.tsx`
**Reference:** `/tmp/lovable-v8/src/routes/directory/import.tsx`
**What to add:** Lovable has a 222-line CSV import wizard:
- File upload dropzone
- Column mapping step (CSV columns → SOS fields)
- Preview table with validation
- Import confirmation + progress
**Instruction:** Read Lovable's import.tsx. Rewrite our stub page with the wizard UI. Replace router. This is a client component ('use client'). Run `npx next build`.

### Task 22: Dashboard Home Page
**File:** `app/app/page.tsx`
**Reference:** `/tmp/lovable-v8/src/routes/index.tsx`
**What to add:** Currently our home page is 26 lines (redirects to command). Lovable has a 222-line landing:
- Stats overview (cases, requests, resources, matches)
- Quick action buttons (new request, new resource, view map)
- Recent activity feed
**Instruction:** Read Lovable's index.tsx. If it just redirects to /command, keep our redirect. If it has dashboard content, port the dashboard UI. Run `npx next build`.

### Task 23: Typography Sweep
**Files:** Multiple — all pages with headings
**What to change:** Lovable v8 uses `font-serif` (Playfair Display) on all major headings with larger sizes:
- Detail page titles: `text-[26px] md:text-[32px]` with `font-serif`
- Stat numbers: `font-serif text-[40px] md:text-[48px]`
- Eyebrow labels: `text-muted-foreground` instead of `text-white/45`
**Instruction:** Search all .tsx files in app/app/ for `font-semibold tracking-tight` on h1/h2 elements. Replace with `font-serif tracking-tight` and bump sizes per Lovable's pattern. Search for `text-white/45` on labels and replace with `text-muted-foreground`. Run `npx next build`.

### Task 24: Color Sweep
**Files:** Map page + MapPinCard
**What to change:** Lovable v8 softened some layer colors:
- Reports: `#FBBF24` → `#FCD34D`
- Events: `#A78BFA` → `#C4B5FD`
- Map pin fill colors slightly lighter (e.g. `#FF6B6B` for requests, `#9FD8F5` for resources)
**Instruction:** Update LAYER_META/LAYER_COLORS in map page and MapPinCard to match Lovable v8 values. Run `npx next build`.

### Task 25: Build + Verify
**Instruction:** Run `npx next build` and fix any type errors. Run `git diff --stat` to review all changes. Commit with message "feat: Lovable v8 port — DetailShell, TopNav, MapPinCard, Command, Match, and more".

---

## Execution Notes

- **Max 2-3 tasks per Claude Code run.** Each run = one commit.
- **Always read BOTH files** (ours + Lovable reference) before editing.
- **Never import from `@/lib/prototype-data`** — Lovable uses prototype data, we use real API data. Replace with props or API calls.
- **Router translations:** `Link from @tanstack/react-router` → `Link from next/link`; `to=` → `href=`; `useParams` → `useParams from next/navigation`; `useRouterState` → `usePathname from next/navigation`.
- **NO citizen portal changes.** Files in `app/(citizen)/` and `components/citizen-shell.tsx` are frozen.
- **Run `npx next build` after EVERY task** to catch type errors immediately.
