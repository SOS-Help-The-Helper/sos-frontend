# Partner Portal V2 — Build Context

## Project
SOS Frontend — Next.js 16, Turbopack, Vercel, Mapbox GL JS, Supabase Edge Functions

## Current Build: Partner Portal V2 (Map / Match / Manage)
Spec: `product/specs/PARTNER_PORTAL_V2_SPEC.md` (COMPLETE reference — read it for full details)

## Architecture
- **Frontend:** `app/app/` routes (static, auth-gated via proxy.ts)
- **Backend:** Edge functions on ERV Supabase (`partner-read`, `partner-update`) + SOS Supabase (`match-engine`)
- **Auth:** `x-partner-key` header for ERV DB calls. Bearer token for SOS DB calls.
- **Org scope:** Hardcoded `erv` until Clerk auth wired
- **Agent chat:** SOSBottomSheet component with `/api/chat` route

## Key Files
- `app/app/layout.tsx` — Server layout, fetches org from DB
- `app/app/layout-client.tsx` — Client wrapper: CitizenHeader + SOSBottomSheet + PartnerProvider
- `app/app/page.tsx` — Map tab (Mapbox dark theme)
- `components/partner/partner-shell.tsx` — Bottom nav shell
- `lib/partner-context.tsx` — React context (orgId, orgName, orgSlug)
- `proxy.ts` — Route allowlist (CRITICAL — no middleware.ts allowed)

## ERV Data API
- `partner-read` on ERV DB: 16 query types (resource_summary, available_resources, priority_queue, etc.)
- `partner-update` on ERV DB: 11 action types (record_status, match_status, person_update, etc.)
- `match-engine` on SOS DB: 3 modes (score, propose, commit)
- ERV partner key: `process.env.NEXT_PUBLIC_ERV_PARTNER_KEY`
- SOS anon key: `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Design Rules
- Dark theme: `bg-[#0F1E2B]`, white text, `white/5` card backgrounds
- Accent: `#EF4E4B` (SOS red)
- Mobile-first: iPhone 13 viewport (390×844)
- Status pills: `text-[10px] px-2 py-0.5 rounded-full`
- Cards: `bg-white/5 rounded-lg p-3` with `border border-white/10`

## Known Gotchas
1. `proxy.ts` blocks new routes — add to PUBLIC_PATHS/PUBLIC_PREFIXES
2. Next.js 16 params are Promises — must `await params` in server components
3. Clerk imports crash with proxy.ts — use client-side hooks only
4. Match engine is on SOS DB, not ERV DB
5. Dynamic routes return 404 on Vercel — use static routes only
6. Git author: ALWAYS `info@sos-help.org` for commits

## Coding Standards
- TypeScript strict
- Use existing component patterns (check partner/ components)
- All data fetches via edge functions, never direct PostgREST
- `'use client'` directive on all interactive components
- Tailwind for styling, match existing dark theme

## DO NOT
- Create middleware.ts (proxy.ts handles this)
- Run `next build` (no node_modules in this env)
- Deploy edge functions (we deploy manually after audit)
- Touch proxy.ts allowlist without explicit instruction
- Hardcode API keys or tokens

## Phase 1 Acceptance Criteria
- [ ] PartnerShell tabs: Map | Match | Manage (routes: /app, /app/match, /app/manage)
- [ ] Old tabs (People, Assets, Deliveries) removed from nav
- [ ] AppCommandContext created in lib/app-command-context.tsx
- [ ] useAppCommand hook exported and functional
- [ ] AppCommandContext wired into layout-client.tsx
- [ ] No TypeScript errors in changed files
