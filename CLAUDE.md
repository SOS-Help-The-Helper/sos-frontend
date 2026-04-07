# SOS Connect — Codebase Audit Briefing

## What This Is
SOS Connect is a disaster coordination platform. Citizens find help, partners provide it, government monitors it. Built with Next.js 16 + Supabase + Mapbox + Vercel AI SDK.

## Your Mission
Audit and fix the codebase for consistency, correctness, and production readiness. Five phases.

---

## CRITICAL CONTEXT

### Taxonomy System
We have a hierarchical taxonomy in the `taxonomy` Supabase table (84 entries):
- Level 1: 12 need domains (HOUSING, FOOD, HEALTH, etc.) + 6 service domains
- Level 2: 46 need categories + 20 service categories
- Each has: `code` (e.g., HOUSING.EMERGENCY), `aliases` text array, `airs_code` (211 mapping)

ALL requests and resources MUST have `taxonomy_code` populated. The flat `category` field (e.g., "food_water") exists for backward compatibility but `taxonomy_code` is canonical.

There's a `category_aliases` table (23 entries) mapping common terms to canonical categories: "food" → "food_water", "shelter" → "housing", etc.

### Unified Resources Table
As of today, `external_resources` table is GONE. All resources (SOS, 211, partner, citizen) live in ONE `resources` table with a `source` field: 'web', 'manual', 'migration', '211', 'partner', 'citizen', 'government'.

### SOS Umbrella
Every request/resource belongs to a `soses` record (the umbrella). One SOS can have multiple requests + multiple resources. `soses.disaster_id` is nullable — null = non-disaster community need.

### AI SDK v6
- `/api/chat` route uses `streamText` + `convertToModelMessages` + Sonnet
- Client uses `useChat` from `@ai-sdk/react` with `DefaultChatTransport`
- Messages render from `msg.parts` NOT `msg.content` (v6 breaking change)
- `sendMessage({ text })` format
- Tool results return JSON with `__tool` field → `AIToolRenderer` renders the component

### Supabase
- Project: rtduqguwhkczexnoawej
- Edge functions deployed via `supabase functions deploy`
- Direct REST API for reads, edge functions for writes
- PII sanitizer runs pre-LLM in `/api/chat` route

---

## PHASE 1: Category Unification

### Problem
The search EF, map queries, and tools all use different category representations:
- Some use flat `category` ("food_water", "housing")
- Some use `taxonomy_code` ("FOOD.MEALS", "HOUSING.EMERGENCY")
- The search EF uses `ilike` on text — doesn't leverage `category_aliases` or `taxonomy` tables

### Tasks
1. Audit every Supabase query in the codebase that filters by category. List them all.
2. Verify every query also searches by `taxonomy_code` (not just flat `category`)
3. The `resource-search` EF (in `sos-core/supabase/functions/resource-search/`) should use `category_aliases` to expand search terms. Verify it does.
4. The map page queries (`app/(citizen)/c/page.tsx`) should load resources regardless of whether they use flat category or taxonomy_code.
5. Remove any references to `external_resources` table (it's been dropped).

---

## PHASE 2: Data Integrity

### Tasks
1. Verify all requests have: `sos_id` (not null), `taxonomy_code` (not null), `source` (not null)
2. Verify all resources have: `taxonomy_code` (not null), `source` (not null)
3. Check for any orphaned records (requests without SOS, resources without valid category)
4. Verify the `soses` table has `disaster_id` column (nullable)
5. Verify `community_messages` has `disaster_id` column (nullable)

---

## PHASE 3: EF Reconciliation

### Problem
19 edge functions deployed. Some may have stale code that doesn't match local source.

### Tasks
1. List all EF directories in `sos-core/supabase/functions/`
2. For each: verify the import style uses `Deno.serve` (not old `serve` from std)
3. For each: verify it imports `corsHeaders` from `../_shared/cors.ts`
4. Verify `resource-search` reads URL query params (not `req.json()`)
5. Verify `intake-write` has PII validation (rejects SSN/CC patterns)
6. Verify all EFs that write to `requests`/`resources` include `taxonomy_code`

---

## PHASE 4: Frontend-Backend Contract

### Problem
Tool results from `/api/chat` return inconsistent JSON shapes. The `AIToolRenderer` expects specific fields.

### Tasks
1. Define TypeScript interfaces for every tool result shape in `/api/chat/route.ts`
2. Verify `AIToolRenderer` (`components/ai-tool-renderer.tsx`) handles every `__tool` type
3. Verify search results have consistent fields: `id, name, description, category, lat, lng, source`
4. Verify the `SearchResults` component in AIToolRenderer emits `MapCommand` correctly
5. Check that tool invocation state handling works for both `call` and `result` states
6. Remove any remaining `msg.content` references (v6 uses `msg.parts` only)

---

## PHASE 5: Agent Flow Validation

### Tasks
1. Trace the "I need help" flow: chip tap → sendMessage → API route → tool calls → render
2. Trace the "Find shelters" flow: sendMessage → search_resources tool → EF → results → map update
3. Trace the "Match" flow: pin tap → JSON context → sendMessage → create_match tool → EF
4. Verify the bottom sheet (`components/sos-bottom-sheet.tsx`) properly renders tool invocations
5. Verify the agent tab (`app/(citizen)/c/agent/page.tsx`) properly renders tool invocations
6. Check that the agent doesn't narrate instead of calling tools (system prompt should force tool calls)

---

## FILES TO READ FIRST
- `app/api/chat/route.ts` — AI SDK route with 15+ tools
- `components/sos-bottom-sheet.tsx` — map agent bottom sheet
- `components/ai-tool-renderer.tsx` — renders tool results
- `app/(citizen)/c/page.tsx` — main map page
- `app/(citizen)/c/agent/page.tsx` — agent tab
- `lib/citizen-api.ts` — Supabase queries
- `lib/map-commands.ts` — map command emitter
- `lib/pii-sanitizer.ts` — PII stripping

## SUPABASE ACCESS
- URL: https://rtduqguwhkczexnoawej.supabase.co
- Anon key: in .env.local or NEXT_PUBLIC_SUPABASE_ANON_KEY env var
- Edge functions: in `../sos-core/supabase/functions/`

## Active Build Plans

- **ERV_BUILD_PLAN.md** — 8-phase build plan for ERV partner portal (persona system, filters, fleet, queue, drivers, 3-way match, referrals, security)
- **PARTNER_PORTAL_VISION.md** — Canonical partner portal vision (map tabs, persona toggles, filter dimensions)
- **ERV_PORTAL_AUDIT.md** — Current state audit with gap analysis

Read the build plan BEFORE making any ERV-related changes. Each phase has exact specs: SQL migrations, component designs, data flow, wireframes.

## Acceptance Criteria (for auditing Claude Code's work)

Every phase must pass these checks before being considered done:

### General
- [ ] No TypeScript errors (`npx tsc --noEmit` passes)
- [ ] No `any` types introduced (use proper interfaces)
- [ ] All new components have proper prop types
- [ ] Mobile-responsive (works at 375px width)
- [ ] Dark theme compatible (partner portal uses dark theme)
- [ ] No hardcoded org_ids in new code (use context/props)
- [ ] Loading states for all async data
- [ ] Error states for failed queries
- [ ] Empty states when no data matches filters

### Phase 1 (Persona System)
- [ ] Migration runs cleanly on Supabase
- [ ] PersonaToggle component renders 3 buttons
- [ ] Multi-select works (can select any combo, minimum 1)
- [ ] URL params update on toggle (`?persona=survivor,driver`)
- [ ] Map pins filter based on persona selection
- [ ] Match list filters based on persona selection
- [ ] Existing map functionality not broken (tabs, disaster filter, pin clicks)

### Phase 2 (Filter Panel)
- [ ] Panel slides out on desktop (right), bottom sheet on mobile
- [ ] All 7 universal dimensions present with multi-select
- [ ] Distance slider works with location picker
- [ ] "Save as tab" creates map_view with filter_config
- [ ] Restoring a saved tab applies both viewport AND filters
- [ ] "Clear" resets to defaults
- [ ] Active filter count badge shows on filter button
- [ ] Filters apply to both map pins AND data queries

### Phase 3 (Fleet Page)
- [ ] `/partner/fleet` route exists and loads
- [ ] Shows all ERV resources (housing category)
- [ ] Status tab filters work (available/matched/maintenance/sold)
- [ ] Search by VIN, description, location works
- [ ] Sort by date/capacity/location/status works
- [ ] Detail modal shows full metadata + match history + notes
- [ ] Status change buttons work (calls erv-update EF)
- [ ] "Propose Match" navigates to match flow

### Phase 4 (Priority Queue)
- [ ] `/partner/queue` route exists and loads
- [ ] Sorted by priority score descending
- [ ] Shows name, score, flags (veteran/FR/medical), household, location, disaster
- [ ] Score breakdown visible (shows component values)
- [ ] Filters work: veteran, FR, medical, FEMA, disaster, location
- [ ] "Propose Match" button opens match flow
- [ ] Pagination works (20 per page)

### Phase 5 (Driver Registry)
- [ ] `/partner/drivers` route exists and loads
- [ ] Shows all 127 drivers with vehicle details
- [ ] Filter by: hitch type, availability, CDL, travel range
- [ ] "Assign to Run" action works
- [ ] Driver detail shows specs + delivery history

### Phase 6 (Three-Way Match)
- [ ] 3-step wizard: Survivor → RV → Driver
- [ ] Each step shows ranked candidates by compatibility
- [ ] Hitch compatibility flagged (⚠️ for mismatches)
- [ ] Creates linked chain matches with chain_id
- [ ] Match chain visualization shows all 3 legs
- [ ] New `erv-match-propose` EF deployed and functional

### Phase 7 (Referrals)
- [ ] `referring_org_id` column exists on requests
- [ ] Referral section in priority queue shows grouped counts
- [ ] erv-intake accepts referring_org_name
- [ ] erv-query supports `referral_summary` query type

### Phase 8 (Security)
- [ ] `org_scoped_matches` view or org_id column exists
- [ ] `getScopedMatches()` uses server-side filtering
- [ ] `buildContext()` uses server-side filtering
- [ ] No client-side match filtering remains

## DO NOT
- Change the taxonomy structure (84 entries, carefully designed)
- Remove `category` column (backward compat needed alongside `taxonomy_code`)
- Change AI SDK from v6 patterns (streamText, convertToModelMessages, msg.parts)
- Add `maxSteps` to streamText (not supported in our version)
- Use `msg.content` anywhere (v6 uses msg.parts only)
