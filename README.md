# SOS Help — Disaster Response Coordination Platform

A mobile-first web platform that connects **survivors**, **volunteers**, **partner organizations**, **drivers**, and **government coordinators** during disasters. Citizens request help (housing, food, supplies, transport) through a conversational AI agent; partner orgs dispatch matches from a Map / Match / Manage portal; drivers run deliveries with a tokenless link; gov agencies see cross-org gaps in real time.

## What This Platform Does

- **Citizens** open `/c`, talk to an AI agent, and submit SOS requests or offer help — the agent collects details conversationally instead of via forms.
- **Partner organizations** (ERV, FHM, AA, etc.) operate a multi-tenant portal at `/app` to triage survivors, propose matches, and run a Kanban-style operations board.
- **Drivers** receive a `/drive/[id]` link (no login — the transport UUID *is* the auth token), see their assignment, navigate to drop-off, and upload delivery proof.
- **Government coordinators** view `/gov/map` with cross-org needs/resources/gaps layered together for situational awareness.
- **EMS / first responders** flip their shift status and submit sitreps at `/ems`.
- **Platform admins** review agent learnings, trust flags, and system health at `/admin`.

## Use Case Example

1. A hurricane hits Florida. ERV (Emergency RV) is the partner org coordinating RV deliveries to displaced families.
2. A displaced family opens `/c` on their phone. The AI agent walks them through category → household size → circumstances → location → submits a `HOUSING.TEMPORARY` request.
3. An ERV operator opens `/app?org=erv&disaster=hurricane-x`, sees the new request on the Map tab, and proposes a match against an available donated RV.
4. A volunteer driver receives a `/drive/<uuid>` link via text. They onboard (name, vehicle, hitch type), get turn-by-turn navigation to pickup, then drop-off, and upload a delivery photo.
5. The family marks the match fulfilled. The driver's docs get uploaded. The whole chain shows up in the partner's Manage Kanban as "Delivered."

---

## Features

### Citizen Experience (`/c`)

- **Mapbox Map (`/c`)** — Dark-theme map with three clustered layers: **Requests** (red), **Resources** (blue), and **Reports** (Mapbox tileset).
  - Real-time updates: subscribed to `requests` and `resources` Postgres changes via Supabase Realtime.
  - Filter pills (All / Survivors / Volunteers / RVs) toggle layer visibility.
  - Top status badge: 🔴 Active (extreme NOAA alert), 🟡 Watch (moderate), 🟢 Safe — driven by `getAlerts()` against NWS.
  - Pin tap opens a detail card with name, location, urgency/status badges, and quick actions.
  - Auto-centers on user GPS, falls back to US center (39°N, 98°W).
- **Agent Chat (`/c/agent`)** — Full-screen conversational AI (Claude Sonnet via Vercel AI SDK).
  - Quick-action chips: "I Need Help", "I Can Help", "Report", "My Score".
  - Persistent chat history per `person_id` in IndexedDB.
  - Tool-driven UI: agent renders selectable widgets (categories, counters, phone input, GPS picker) inline.
  - PII sanitizer strips SSN / credit card / bank numbers before they hit the LLM, logged to `signal_traces`.
- **Match Swiping (`/c/match`)** — Tinder-style swipe interface for match proposals.
  - Cards show match score, summary, reasoning, direction (you need / you help), urgency.
  - Filter tabs: All / For Me / I Help.
  - Right-swipe accepts (calls `match-respond` edge function); left-swipe rejects.
  - Separate "Accepted Matches" tab with timestamps.
- **Community Feed (`/c/feed`)** — Chronological feed of community messages, alerts, needs, and reports.
  - Filter pills: All / Alerts / Community / Needs / Reports.
  - Relative timestamps (5m ago, 2h ago, 3d ago).
- **Manage (`/c/manage`)** — Self-service for your own requests, resources, and matches.
  - Tabs: Overview / Requests / Resources / Matches.
  - Overview shows SOS Score gauge with readiness/community/impact breakdown.
  - Edit form updates `details_sanitized`, `urgency`, `capacity_available` via partner-update.
  - Real-time match updates via Supabase channel subscription.
- **Profile (`/c/profile`)** — Readiness checklist and SOS Score breakdown.
  - 8 readiness items (Emergency Contacts 1 & 2, Evacuation Route, Go-Bag, Home Location, Risk Profile, Pet Plan, Insurance) weighted 0–40 points.
  - Score gauge color-codes: green ≥70, blue ≥40, red <40.
  - Logout clears the `person_id` cookie.
- **Leaderboard (`/leaderboard`)** — Top 20 SOS scores. Shows your rank, medals for top 3.

### Agent Tools (SOSBottomSheet + `/api/chat`)

The Claude agent has 15+ callable tools that render structured UI inline. Defined in `lib/chat-tools.ts`.

- **`show_categories`** — Multi-select: Housing, Food, Supplies, Power, Volunteer, Donate.
- **`show_counter`** — Household size: Just me / 2–3 / 4–6 / 7+.
- **`show_circumstances`** — Special needs: Children, Elderly, Pets, Accessibility, Medical Equipment.
- **`get_location`** — GPS pick or address search; supports "for self" vs "for someone else."
- **`show_phone_input`** — Phone collection for anonymous users.
- **`search_resources`** — Keyword search (shelter / food / medical / etc.) with lat/lng fallback to GPS or Asheville NC default. Returns ≤20 results, logs traces to `signal_traces`.
- **`show_score`** — Renders the user's SOS Score with breakdown.
- **`show_sos_confirmation`** — Summary card the user must explicitly tap to submit.
- **`submit_sos`** — Creates the help request, fires `run_matching_v2` RPC, focuses map on submitted location.
- **`submit_helper`** — Registers a volunteer with skills, availability, distance radius.
- **`submit_join_person`** — Saves a prospective team member (name, phone, skills, org, motivation).
- **`capture_photo`** — Triggers photo capture for the report flow.
- **`show_danger_check`** — Immediate-danger Yes/No (report flow).
- **`check_fema`** — Looks up FEMA disaster declarations by state.
- **`escalate_to_platform`** — Flags complex coordination to the platform agent, persists to `signal_traces`.

### Agent Flows (Conversational, No Forms)

The chat agent runs different flows based on context. Triggered by message tags like `[ERV_INTAKE:type:for]`.

- **General SOS flow** — categories → household size → circumstances → location → phone (if anonymous) → confirmation → submit.
- **Helper/Volunteer flow** — skills → availability → location → distance radius → submit.
- **JOIN flow** — Warm conversational intake (no widgets) collecting name, organization, motivation for prospective team members.
- **ERV Survivor flow** — Housing intake with priority scoring (veterans +25, first responders +25, single parents +20, etc.) → `HOUSING.TEMPORARY` request.
- **ERV Donor flow** — RV type, year/make/model, condition, delivery preference, optional VIN → `DONATION.ASSET.RV` request.
- **ERV Volunteer flow** — How to help (Drive/Tow, Social Media, Admin, Fundraising) → vehicle specs if driver → `TRANSPORT.RV_TOW`.
- **On-behalf mode** — When `[ERV_INTAKE:type:someone]` is set, collects beneficiary info instead of the user's own.
- **Driver-specific prompt** — When `x-transport-id` header is present, the agent focuses on delivery details, onboarding, and route problem-solving. Survivor address is hidden until pickup is confirmed.

### Partner Portal V2 (`/app`) — Map / Match / Manage

Multi-tenant portal scoped by `?org=<slug>` (default `erv`) and optionally `?disaster=<slug>`.

- **Map Tab (`/app`)** — Dispatch view with dark-theme Mapbox.
  - Three clustered pin layers: **Survivors** (red `#EF4E4B`), **Volunteers** (yellow `#FFCA28`), **RVs** (blue `#89CFF0`).
  - Filter pills toggle each layer; clusters show count badges and glow effects.
  - Pin detail card with Find Match / Update / Details actions.
  - Centers on the disaster's lat/lng when `?disaster=` is set; otherwise defaults to Orlando (29.19°N, 82.14°W).
  - Top-left dashboard overlay shows org name, active filters, and counters.
- **Match Tab (`/app/match`)** — Active Matches & Find Matches views.
  - Active Matches lists each match with status pill (proposed → accepted → connected → in_progress → fulfilled → rated), driver name, delivery date, match score.
  - **Copy Driver Link** button generates a `/drive/<chain_id>` URL for tokenless driver access.
  - Find Matches view supports proposing new survivor↔resource pairings.
- **Manage Tab (`/app/manage`)** — Three Kanban boards: **Survivors**, **Volunteers**, **RVs**.
  - **Survivors board:** Pending (orange) → Approved (blue) → On Hold (purple) → Delivered (green) → Completed (gray) → Declined (red). Drag-drop respects allowed status transitions.
  - **RV board:** Pending → Screening → Received → Available → Deployed → Repair / Cleaning / Sold.
  - **Volunteers board:** Active / New / Assigned / Inactive.
  - Cards show name, location (City, State), date, urgency badge (from `triage_score`), matched indicator.
  - Click a card to open a detail modal with full info.

### Driver Page (`/drive/[id]`)

The transport UUID is the auth token — no login required. Spec: `product/specs/DRIVER_PAGE_SPEC.md`.

- **Apple-quality frosted-glass card layout** with progress rail.
- **6-step status pipeline:** 📋 Assigned → 📦 Picked Up → 🚗 En Route → 📍 Arrived → ✅ Delivered → 📄 Docs Done.
- **Driver onboarding** — If `driver_person_id` is null, the agent collects name, phone, vehicle, tow capacity, hitch types via chat.
- **Navigation** — Deep-link button opens Google Maps to the drop-off lat/lng.
- **Proof of delivery** — Camera-enabled photo capture after the Delivered step.
- **Document upload** — Multi-file upload (PDFs, images) for delivery paperwork.
- **Caravan view** — Other drivers in the same run, their slot number, cargo, and status.
- **Config-driven** — Status pipeline and photo stages come from `org.metadata.transport_config` so different orgs can run different workflows.

### Multi-Tenant Org Support

- **`?org=<slug>` query param** — Routes the portal to a specific partner (erv, fhm, aa, gg, endurant, …). Defaults to `erv`.
- **`?disaster=<slug>` query param** — Optional. Scopes all three tabs to a specific disaster event and centers the map on its lat/lng.
- **Server-side org lookup** — `app/app/layout.tsx` queries SOS DB `organizations` with `SUPABASE_SERVICE_ROLE_KEY`, never exposed to the client.
- **Per-org partner config** — Each org row carries `metadata.partner_config = { db_url, anon_key, api_key }`. The client gets it via `PartnerProvider` context; the service role key stays server-side.
- **Per-org transport config** — Optional `metadata.transport_config` lets each org customize its driver pipeline (status names, required photo stages, onboarding fields).
- **ERV is the reference tenant** — Slug `erv`, ID `da86c92f-d52d-4b13-a474-30e1be8fb808`, hosted on `https://xbtrtztzaokeodarqvpr.supabase.co`.

### Government Coordination (`/gov`)

- **`/gov/map`** — Cross-org coordination map with three layers: **Needs** (red), **Resources** (green), **Gaps** (yellow).
  - Filters: Category (shelter / food / medical / transportation / utilities), Severity (critical / urgent / standard), Layer toggle.
  - Disaster dropdown switches scope to a specific event from the SOS DB `disasters` table.
  - Markers size/color-coded by type and count.
- **`/gov/gaps`** and **`/gov/reports`** — Routes scaffolded for gap analysis and citizen-report review.

### EMS Routes (`/ems`)

- **`/ems/status`** — Shift status selector: 🟢 On Shift / 🟡 Available / ⚫ Off Shift. Activity summary shows sitrep count, verified count, on-shift hours.
- **`/ems/sitrep`** — Situation report submission.
- **`/ems/verify`** — Verification endpoint for confirming reports on the ground.

### Admin (`/admin`)

- **`/admin/health`** — System health dashboard.
  - Division cards: SOS, Harmony, Grunt — each with agent count, trace count, learning count, cost, status.
  - Agent table lists Citizen Agent, Platform Brain, Aid Arena, Emergency RV, Free Hot Meals with last-active time, session count, trace count, and active/idle/error status.
  - DB stats: total tables, rows, size — pulled from SOS Supabase (and optionally Henry Brain DB).
- **`/admin/approvals`** — Review queue with four tabs:
  - **Learnings** — Pending system learnings (`signal_traces.status = 'proposed'`). Approve sets them active; reject discards.
  - **Trust** — Orgs flagged with `trust_score < 0.4` (warning) or `< 0.2` (critical).
  - **Skills** — Pending skill registrations.
  - **Orgs** — Pending org registrations.
- **`/admin/intelligence`**, **`/admin/config`**, **`/admin/preview`** — Routes scaffolded for upcoming admin features.

### ERV Public Routes (`/erv`)

- **`/erv/map`** — Public-facing ERV map centered on Ocala, FL.
  - Survivor requests (red clusters), available RVs (green pins), drivers (yellow pins).
  - Stats panel: Families served, RVs deployed, Active drivers, Total people housed.
  - Deep-link via `?pin=<id>&type=request|resource|driver` to surface a specific pin.
  - Queries ERV DB directly via `ervQuery()` with hardcoded ERV credentials.

### Authentication & Identity

- **Person cookie** — `lib/person-cookie.ts` exposes `getPersonId()` / `setPersonId(id)` / `clearPersonId()`. Browser-persisted.
- **Test mode** — `?pid=<id>` URL param sets the person_id for QA.
- **Phone auth via TextBubbles** — `/api/textbubbles/send`, `/api/textbubbles/messages`, `/api/webhook/textbubbles` handle SMS sending, message retrieval, and inbound webhooks.
- **No middleware** — Auth and route allowlisting are handled by `proxy.ts` (Vercel rewrites). New routes must be added to `PUBLIC_PATHS` or `PUBLIC_PREFIXES`.

### API Routes

- **`/api/chat`** — Streaming chat endpoint backed by Claude Sonnet via Vercel AI SDK.
  - Dynamic system prompt based on flow (general / ERV / JOIN / driver).
  - Context via headers: `x-person-id`, `x-authenticated`, `x-user-lat`, `x-user-lng`, `x-transport-id`, `x-erv-flow`, `x-erv-for`.
  - 30 req/min per-IP rate limit.
- **`/api/agent/chat`** — Partner-side agent route.
- **`/api/agent/debug`** — Agent debugging endpoint.
- **`/api/chat-export`** — Export chat history.
- **`/api/chat-history`** — Load/save chat history.
- **`/api/user`** — User profile lookup.
- **`/api/ems/sitrep`** and **`/api/ems/verify`** — EMS form submissions.

### Backend Integration (Edge Functions)

- **`partner-read`** (on the partner's DB, e.g. ERV) — 16 query types including `resource_summary`, `available_resources`, `priority_queue`, `transport_assignments`, etc. Authed via `x-partner-key` header.
- **`partner-update`** (on the partner's DB) — 11 action types: `record_status`, `match_status`, `person_update`, etc.
- **`match-engine`** (on the SOS DB, not ERV) — Three modes: `score`, `propose`, `commit`.
- **Direct PostgREST calls are forbidden** — All data flows through edge functions.

### Design System

- **Dark theme** by default — Background `#0F1E2B`, header `#1A3850`, cards `bg-white/5 border border-white/10`.
- **Accent palette** — SOS red `#EF4E4B`, light blue `#89CFF0`, yellow `#FFCA28`.
- **Status pills** — `text-[10px] px-2 py-0.5 rounded-full` with category-specific colors.
- **Mobile-first** — 390×844 iPhone 13 baseline, safe-area inset handling on bottom navs.
- **Icons** — Lucide React for UI chrome, emoji for categories (🏠 housing, 🍞 food, 🚗 transport).

### Real-Time & Live Data

- Citizen map subscribes to Postgres changes on `requests` and `resources` tables.
- Citizen Manage page subscribes to `matches` channel for live status updates.
- Match swipe deck refreshes on accept/reject.
- Driver page polls transport status (eligible for realtime upgrade).

---

## Known Limitations & In-Progress Work

These are intentionally surfaced so the README stays honest:

- **Matches realtime handler is a stub** in `app/(citizen)/c/page.tsx` — the subscription fires but doesn't update state yet.
- **Disasters GeoJSON layer** is created on the citizen map but the source stays empty.
- **Location-scoped leaderboard** is not implemented — `/leaderboard` shows top 20 globally.
- **`/gov/gaps`** and **`/gov/reports`** are scaffolded routes without finished UIs.
- **Payouts admin UI** for any cash-out flows is planned, not built.
- **Clerk auth** is intentionally not wired in — `proxy.ts` blocks the relevant routes; org scope is hardcoded to `erv` until Clerk lands.

---

## Architecture at a Glance

- **Framework:** Next.js 16 (App Router, Turbopack), deployed to Vercel.
- **Styling:** Tailwind, mobile-first, dark theme.
- **Maps:** Mapbox GL JS (dark-v11 style).
- **AI:** Anthropic Claude Sonnet via Vercel AI SDK streaming.
- **Backend:**
  - SOS Supabase — `organizations`, `disasters`, `matches`, `signal_traces`, `people`, agent learnings.
  - ERV Supabase (per-partner) — `requests`, `resources`, `transport_assignments`, etc.
- **Auth:** `x-partner-key` header for ERV DB; Bearer for SOS DB; `person_id` cookie for citizens; transport UUID for drivers.
- **Routing:** `proxy.ts` allowlist (no `middleware.ts` — Clerk's middleware crashes with this setup).

### Key Files

- `app/app/layout.tsx` — Server layout; resolves org config from SOS DB.
- `app/app/layout-client.tsx` — Client wrapper with `CitizenHeader` + `SOSBottomSheet` + `PartnerProvider`.
- `app/app/page.tsx` — Partner Map tab.
- `app/drive/[id]/page.tsx` — Driver page (server) + client component.
- `components/partner/partner-shell.tsx` — Bottom nav shell for the partner portal.
- `components/sos-bottom-sheet.tsx` — Conversational agent surface used across `/c`, `/app`, and `/drive`.
- `lib/partner-context.tsx` — `PartnerProvider` exposing `orgId`, `orgName`, `orgSlug`, `partnerConfig`, optional `disaster`.
- `lib/chat-tools.ts` — Agent tool definitions.
- `proxy.ts` — Route allowlist (**critical** — no `middleware.ts` allowed).

---

## Getting Started

Install the dependencies:

```bash
npm install
```

Set up the .env:

```bash
cp .env.example .env
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Useful Routes

| Persona | URL |
|---|---|
| Citizen map | `/c` |
| Citizen agent | `/c/agent` |
| Citizen match deck | `/c/match` |
| Citizen profile | `/c/profile` |
| Partner portal (ERV) | `/app` |
| Partner portal (other org) | `/app?org=<slug>` |
| Partner portal (disaster-scoped) | `/app?org=erv&disaster=<slug>` |
| Driver page | `/drive/<transport_uuid>` |
| Government map | `/gov/map` |
| EMS status | `/ems/status` |
| Admin health | `/admin/health` |
| Admin approvals | `/admin/approvals` |
| Leaderboard | `/leaderboard` |
