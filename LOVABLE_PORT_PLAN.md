# Lovable v5 Port Plan — SOS Frontend

## Source
- Lovable export: `/tmp/lovable-audit/` (TanStack Router + Vite + prototype-data)
- Target: `sos-frontend` (Next.js App Router + real EF APIs)

## Translation Rules (EVERY file)
- `createFileRoute` → `'use client'` + Next.js default export
- `<Link to=...>` → `<Link href=...>` (ESLint rule enforces this)
- `import.meta.env` → `process.env`
- `useNavigate()` → `useRouter()` from `next/navigation`
- `useSearch()` → `useSearchParams()`
- `prototype-data` imports → `api.*` calls + useState/useEffect
- `@tanstack/react-router` imports → remove entirely
- Route params: `Route.useParams()` → Next.js `params` prop or `useParams()`

## Chunk Sequence

### Chunk 1: Match Scoring Breakdown (match.tsx → match/page.tsx)
**What:** Port Lovable's 864-line match page with org-level scoring breakdown
**Files:** `src/routes/match.tsx` → `app/app/match/page.tsx`
**New components:** `components/match/match-primitives.tsx` (pill styles, MatchCardShell, ScoreBar)
**Data wiring:** 
- `scoreFor()` → already have `match-engine` EF in 'score' mode
- `householdFor()` → requests table has household_size, has_children, has_elderly, has_disabled, has_pets
- `slaHoursLeft()` → compute client-side from days_open + urgency
**Backend tweak:** match-engine score response needs `breakdown` field (service/county/capacity/speed)

### Chunk 2: Case Detail — Notes + Activity (cases.$id.tsx → cases/[id]/page.tsx)  
**What:** Port notes timeline, activity feed, context cards
**Files:** `src/routes/cases.$id.tsx` → `app/app/cases/[id]/page.tsx`
**Data wiring:**
- Case notes → `api.crmGetCaseNotes(id)` ✅ exists
- Case detail → `api.crmCasesDetail(id)` ✅ exists
- Activity timeline → construct from notes + status changes
- Linked requests/resources → already in crmCasesDetail response
**Backend tweak:** None — APIs exist

### Chunk 3: Command Dashboard Pinning (command.$id.tsx → command/[id]/page.tsx)
**What:** Port useDashboard hook, pinned reports, Sparkline + Donut per disaster
**Files:** `src/routes/command.$id.tsx` → `app/app/command/[id]/page.tsx`
**New files:** `lib/dashboard-store.ts` (localStorage pinning)
**Data wiring:**
- Incidents → `api.crmCommandIncidents()` ✅
- Summary → `api.crmCommandSummary(incId)` ✅
- Sparkline/Donut data → already returned by summary EF
- Pins → localStorage (no backend needed)
**Backend tweak:** None

### Chunk 4: Directory Detail Pages (person, request, resource, org)
**What:** Add household display, inline map, activity timeline to detail pages
**Files:**
- `src/routes/directory/person.$id.tsx` → `app/app/directory/person/[id]/page.tsx`
- `src/routes/directory/request.$id.tsx` → `app/app/directory/request/[id]/page.tsx`
- `src/routes/directory/resource.$id.tsx` → `app/app/directory/resource/[id]/page.tsx`
- `src/routes/directory/org.$id.tsx` → `app/app/directory/org/[id]/page.tsx`
**Data wiring:**
- Person → `api.crmGetPerson(id)` ✅
- Request → `api.crmRequestsList()` + filter (or add crmRequestDetail)
- Household → fields already on requests table
- Map → static Mapbox image with lat/lng from request
**Backend tweak:** Add household fields to crmCasesDetail response (~5 min)

### Chunk 5: TopNav + Mobile Menu Redesign
**What:** Port Lovable's improved TopNav (hamburger menu, avatar, better dropdowns)
**Files:** `src/components/shell/TopNav.tsx` → `components/shell/top-nav.tsx`
**Data wiring:** None — pure UI
**Backend tweak:** None

### Chunk 6: Map Heatmap + Filter Panel (OPTIONAL)
**What:** Add heatmap layer, cluster improvements, filter panel
**Files:** `src/routes/map.tsx` → `app/app/map/page.tsx`  
**Data wiring:** `api.crmMapFeatures()` ✅ — already returns GeoJSON
**Backend tweak:** None — heatmap is a Mapbox layer style, not new data
**Note:** Lower priority — our cluster map works. Port if time permits.

## Backend Tweaks Summary
1. `match-engine` EF: Add `breakdown` field to score response (~15 min)
2. `crm-directory` EF: Include household fields in case/request responses (~5 min)
Total backend work: ~20 min

## Acceptance Criteria (per chunk)
- [ ] Page renders with real data (no prototype-data imports)
- [ ] `npx next build` passes
- [ ] No `<Link to=...>` patterns (ESLint catches)
- [ ] No `@tanstack` imports
- [ ] Mobile responsive
- [ ] Pushed to main, deployed to Vercel
