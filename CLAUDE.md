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
1. `proxy.ts` blocks new routes — add to PUBLIC_PATHS/PUBLIC_PREFIXES. The bare
   partner prefixes (/cases/, /match/, …) were REMOVED in Wave 3 — partner pages
   live only under the session-gated /app/*; do not re-add them
2. Next.js 16 params are Promises — must `await params` in server components
3. Clerk imports crash with proxy.ts — use client-side hooks only
4. Match engine is on SOS DB, not ERV DB
5. ~~Dynamic routes return 404 on Vercel~~ FALSE (13 dynamic routes live, incl. /api/ef/[fn], /api/db/[...path], /drive/[id]) — gotcha removed 2026-06-12
6. Git author: do NOT override the developer's configured git identity. Use `info@sos-help.org` only when the actual human committer is that shared org account (e.g. automation under the SOS bot). Otherwise let the local `user.email` / `user.name` stand so commits reflect the real author.

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
- Hardcode API keys or tokens (gitleaks CI enforces this; HEAD is secret-free
  as of 2026-06-12)

## Phase 1 Acceptance Criteria
- [ ] PartnerShell tabs: Map | Match | Manage (routes: /app, /app/match, /app/manage)
- [ ] Old tabs (People, Assets, Deliveries) removed from nav
- [ ] AppCommandContext created in lib/app-command-context.tsx
- [ ] useAppCommand hook exported and functional
- [ ] AppCommandContext wired into layout-client.tsx
- [ ] No TypeScript errors in changed files

## Multi-Tenant Partner Portal (Phase 2)

### Architecture
- `?org=` query param (default: 'erv') resolves org from SOS DB `organizations` table
- Org record has `metadata.partner_config`: `{ db_url, anon_key, api_key }`
- `?disaster=` query param (optional) scopes all 3 tabs to a specific disaster
- Layout (server component) fetches org config using SUPABASE_SERVICE_ROLE_KEY
- Client gets partner config via PartnerProvider context — never sees service role key

### SOS DB org lookup (server-side in layout.tsx)
```ts
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const { data: org } = await supabase
  .from('organizations')
  .select('id, name, slug, metadata')
  .eq('slug', orgSlug)
  .maybeSingle();
// org.metadata.partner_config = { db_url, anon_key, api_key }
```

### Partner context shape
```ts
interface PartnerConfig {
  dbUrl: string;
  anonKey: string;
  apiKey: string;
}

interface PartnerContext {
  orgId: string;
  orgName: string;
  orgSlug: string;
  partnerConfig: PartnerConfig;
  disaster?: { id: string; name: string; slug: string; lat: number; lng: number; };
}
```

### ERV org in SOS DB
- slug: 'erv'
- id: da86c92f-d52d-4b13-a474-30e1be8fb808
- metadata.partner_config.db_url: https://xbtrtztzaokeodarqvpr.supabase.co

## Driver Page Build

### Spec: product/specs/DRIVER_PAGE_SPEC.md

### Route: app/drive/[id]/page.tsx
- Server component fetches transport + org config
- Transport lookup: partner-read on the org's DB (from org.metadata.partner_config)
- Org lookup: SOS DB organizations table by org_id from transport

### Key patterns
- CitizenHeader + SOSBottomSheet (same as /c and /app)
- No auth — transport_id UUID is the auth token
- Config-driven: status pipeline, photo stages, onboarding fields from org config
- proxy.ts already allows /drive/ prefix

### Transport data shape (from partner-read transport_assignments query)
```json
{
  "id": "uuid",
  "match_id": "uuid",
  "resource_id": "uuid",
  "request_id": "uuid",
  "driver_person_id": "uuid or null",
  "status": "accepted",
  "origin": "Ocala, FL",
  "destination": "Atlanta, GA",
  "resource_description": "2022 Forest River Avenger",
  "driver_name": "John Smith",
  "current_lat": null,
  "current_lng": null
}
```

## Post-remediation notes (2026-06-12)
- Citizen data: `api.queryMyRecords()` / `api.updateMyRecord()` /
  `api.respondMatch()` — citizen session token in `x-citizen-token`
  (typed in types/api.ts). Never send a body actor; the EF asserts identity.
- Portal data: efCall + supabase-client route through the session-gated
  `/api/ef` and `/api/db` server proxies on /app/* — the browser never needs
  broad anon-key DB access. Requires SUPABASE_SERVICE_ROLE_KEY in Vercel env.
- Realtime channels were replaced with polling (anon postgres_changes dies at
  the Wave 4b lockdown).
- CI: tsc ratchet (.typecheck-baseline) + gitleaks; error count may only drop.
- Backend lockdown activation after this branch deploys:
  sos-core/WAVE4_ACTIVATION.md.
