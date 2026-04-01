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

## DO NOT
- Change the taxonomy structure (84 entries, carefully designed)
- Remove `category` column (backward compat needed alongside `taxonomy_code`)
- Change AI SDK from v6 patterns (streamText, convertToModelMessages, msg.parts)
- Add `maxSteps` to streamText (not supported in our version)
- Use `msg.content` anywhere (v6 uses msg.parts only)
