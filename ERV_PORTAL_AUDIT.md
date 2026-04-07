# ERV Partner Portal Audit — 2026-04-07

> Scope: Emergency RV partner experience only. What exists, what works, what's missing vs PARTNER_PORTAL_VISION.md.

---

## Executive Summary

The ERV (Emergency RV) partner portal is **partially functional** with strong intake flows and a working matching dashboard, but **falls significantly short of the vision**. The three-way matching concept (Survivor ↔ RV ↔ Volunteer Driver) exists in the data model but has no dedicated UI. The partner map exists but lacks all universal filter dimensions and persona toggles. Drive mode works for assigned drivers but has no driver registry or route optimization.

**Verdict:** ~40% of the ERV vision is implemented. Intake is the strongest area (~80%). Map filtering and persona-specific views are the biggest gaps (~5%).

---

## 1. What Exists for ERV

### ERV-Specific Pages

| Route | File | Status | Purpose |
|-------|------|--------|---------|
| `/erv` | `app/erv/page.tsx` | **FUNCTIONAL** | Public intake: survivor, donor, volunteer (3 flows) |
| `/partner/erv` | `app/(partner)/partner/erv/page.tsx` | **REDIRECT STUB** | Sets view context to ERV org_id, redirects to `/matching` |
| `/drive` | `app/(citizen)/drive/page.tsx` | **FUNCTIONAL** | Driver delivery workflow (6-stage pipeline) |
| `/drive/chat` | `app/(citizen)/drive/chat/page.tsx` | **FUNCTIONAL** | Real-time caravan messaging |

### Generic Partner Pages ERV Uses

| Route | File | Status | ERV-Specific Behavior |
|-------|------|--------|----------------------|
| `/matching` | `app/(partner)/matching/page.tsx` | **FUNCTIONAL** | Swipe/List/Map/Admin modes; match cards show `multi_step` type with steps: request→unit→driver |
| `/map` | `app/(partner)/map/page.tsx` | **FUNCTIONAL** | Org-scoped pins, custom tabs, disaster filter only |
| `/management` | `app/(partner)/management/page.tsx` | **FUNCTIONAL** | Resources tab shows fleet; capacity editing |
| `/reporting` | `app/(partner)/reporting/page.tsx` | **FUNCTIONAL** | Fulfillment rate, response time, impact metrics |
| `/agent` | `app/(partner)/agent/page.tsx` | **FUNCTIONAL** | Routes to `sos-erv` OpenClaw agent |
| `/runs` | `app/(partner)/runs/page.tsx` | **FUNCTIONAL** | Delivery run creation with multi-slot assignment |
| `/view` | `app/(partner)/view/page.tsx` | **FUNCTIONAL** | Admin perspective switcher (includes ERV option) |
| `/onboard` | `app/(partner)/onboard/page.tsx` | **FUNCTIONAL** | Agent-driven partner signup |
| `/register` | `app/(partner)/register/page.tsx` | **FUNCTIONAL** | Form-based signup; `transport_housing` org type available |

### ERV-Specific API Routes

| Route | File | Purpose |
|-------|------|---------|
| `/api/chat` | `app/api/chat/route.ts` | Detects `[ERV_INTAKE:flow:forWhom]` → routes to ERV system prompts |
| `/api/agent/chat` | `app/api/agent/chat/route.ts` | Maps ERV org_id → `sos-erv` OpenClaw agent |

### ERV-Specific Edge Functions (in `sos-core/supabase/functions/`)

| Function | Purpose | Scoping |
|----------|---------|---------|
| `erv-intake` | Person upsert + request/resource creation for 3 flow types | Hard-codes `ERV_ORG` |
| `erv-query` | 14 query types: fleet_status, priority_queue, survivors_list, donors_list, volunteers_list, matches_pending, matches_fulfilled, etc. | All queries `.eq("org_id", ERV_ORG)` |
| `erv-update` | Status changes, notes, person flag updates | Ownership verification before write |

### ERV-Specific Components & Config

| File | Purpose |
|------|---------|
| `lib/view-context.tsx` | Maps ERV org_id → `transport_housing` type, `Emergency RV` name, `sos-erv` agent |
| `lib/portal-config.ts` | ERV config: labels (Fleet, Deployments, Housing Matches), multi_step match cards, chain support |
| `components/view-switcher.tsx` | Quick-switch dropdown includes ERV |
| `components/match-swipe-content.tsx` | ERV-aware action labels for transport_housing org type |

### Hardcoded ERV org_id References

`da86c92f-d52d-4b13-a474-30e1be8fb808` appears in **5 files, 8 references**:

1. `app/api/agent/chat/route.ts` — ORG_AGENT_MAP + ORG_NAMES (2x)
2. `app/(partner)/partner/erv/page.tsx` — setCurrentView (1x)
3. `app/(partner)/view/page.tsx` — VIEWS array (1x)
4. `lib/view-context.tsx` — VIEW_ORG_TYPE_MAP + VIEW_ORG_NAME_MAP + VIEW_AGENT_MAP (3x)
5. `components/view-switcher.tsx` — VIEWS array (1x)

---

## 2. What Works End-to-End

### Can Julia (ERV admin) do these things?

| Task | Verdict | Details |
|------|---------|---------|
| **See her match queue** | YES | `/matching` loads org-scoped matches via `getScopedMatches(orgId)`. Swipe, List, Map, Admin modes all work. |
| **View fleet status** | PARTIAL | `/management` → Resources tab shows ERV resources with capacity bars. `erv-query` EF supports `fleet_status` query (by_source, by_status, total_available, total_sleep_capacity). **But no dedicated fleet dashboard page.** |
| **See survivors sorted by priority** | PARTIAL | `erv-query` EF supports `priority_queue` with ERV scoring (veteran +25, first_responder +25, medical +15, etc.). **But no dedicated priority queue UI — data is available via agent chat only.** |
| **Accept/decline matches** | YES | Match cards have Accept/Decline/Refer buttons. `match-respond` EF handles status transitions. Swipe mode has gesture-based accept/decline. |
| **Create delivery runs** | YES | `/runs` page creates runs with multi-slot assignments. Drivers see assignments at `/drive`. |
| **Manage drivers** | PARTIAL | `erv-query` supports `volunteers_list` with hitch_type, tow_rating, availability, travel_range, tow_vehicle. **But no driver management UI page — data only via agent chat or raw query.** |
| **See referring partner cases** | NO | `partner-referral` EF exists (ERV can refer TO other partners). But no UI shows cases referred FROM other partners (Endeavors, FEMA, Volunteer Florida). No `referring_partner_id` column on requests. |
| **Filter by persona (Survivors/Donors/Drivers)** | NO | Zero persona concept in UI. No toggles, no persona-specific filters, no request_type field in schema. |

### Intake Flows (Strongest Area)

All three ERV intake flows work end-to-end:

**Survivor flow** (`/erv` → "I need help"):
- 10-question conversational intake with show_chips for structured choices
- Collects: disaster type, veteran/first_responder status, medical needs, household size, insurance, duration, location
- Calculates priority score (veteran +25, first_responder +25, single_parent +20, medical +15, children +10, elderly +10)
- Calls `submit_sos` → creates SOS + request with `org_id = ERV_ORG`
- On-behalf-of support (submitter ≠ beneficiary)

**Donor flow** (`/erv` → "I want to donate"):
- 10-question intake: RV type, year/make/model, sleeping capacity, location, condition, delivery capability, VIN (optional), recipient preference, tax letter info
- Accepted types: 5th wheels, motorhomes, teardrops, travel trailers, toy haulers, sprinter vans
- Calls `submit_sos` with intent=donate

**Volunteer flow** (`/erv` → "I want to volunteer"):
- 7-question intake: help type (drive/social media/admin/fundraising), vehicle specs (if driver), Class A experience, location, availability, experience, contact
- System prompt emphasizes "drivers are the bottleneck"

### Drive Mode

Fully functional 6-stage pipeline:
```
Assigned → Picked Up → En Route → Arrived → Delivered → Docs Done
```

Features: Google Maps navigation, delivery photo upload, document upload, caravan member visibility, real-time status sync, caravan chat.

### Matching Dashboard

Works with 4 view modes:
- **Swipe**: Card-by-card with gesture accept/decline
- **List**: Checkboxes + batch actions (UI exists, backend partial)
- **Map**: Visual connection lines between matches
- **Admin**: Manual assignment (unmatched requests ↔ partners)

Match scoring algorithm (0-100): taxonomy match (30), distance (25), urgency (15), capacity (10), triage (10), recency (10), trust (-20 to +10), price tier bonus (+15 max). Fast-path auto-consent for score >90 with high trust.

---

## 3. Map Assessment

### Does the partner map exist?

**Yes**, at `/partner/map`. It renders Mapbox GL with org-scoped request and resource pins.

### Current Capabilities

| Feature | Status | Details |
|---------|--------|---------|
| Org-scoped data | YES | Queries filter by `eq('org_id', effectiveOrgId)` |
| Request pins | YES | Red, sized by triage_score, pulse animation if ≥80 |
| Resource pins | YES | Color-coded: green=available, yellow=limited, red=at_capacity, gray=paused |
| Match lines | YES | Dashed lines connecting matched request↔resource |
| Custom pin creation | YES | Long-press (600ms) → label → yellow marker |
| Custom tab saving | YES | Full CRUD on `map_views` table: name, viewport, disaster_id, pins, layers |
| Tab persistence | YES | Per-org via Supabase, restores center/zoom/layers |
| Disaster filter | YES | Dropdown in "All" tab, filters request pins by disaster_id |

### What's Missing from Vision

| Vision Requirement | Status | Gap |
|--------------------|--------|-----|
| **Status filter** (active, matched, fulfilled, closed) | MISSING | Data loaded but no filter UI |
| **Urgency filter** (critical/high/standard) | MISSING | Data loaded but no filter UI |
| **Time filter** (24h, 7d, 30d, all) | MISSING | No created_at filtering |
| **Distance filter** (radius from point) | MISSING | No radius-based filter |
| **Category filter** (multi-select from taxonomy) | AGENT-ONLY | `map-filter.ts` supports agent-driven category filter, no UI toggle |
| **Record type toggle** (requests/resources/matches/reports) | MISSING | No way to toggle what pin types show |
| **Persona toggles** (Survivors/Donors/Drivers) | MISSING | Zero persona concept anywhere |
| **Persona-specific filters** (priority score, household size, RV type, hitch type, CDL, etc.) | MISSING | None implemented |
| **Filter save/restore** | MISSING | Custom tabs save viewport + disaster_id only, not filter config |
| **Multi-select on filter dimensions** | MISSING | Only single-select disaster dropdown exists |

### Map Verdict

**~20% complete** relative to vision. Foundation is solid (Mapbox, org scoping, tab system). But the entire filter layer — which is the core of the ERV partner map experience — does not exist.

---

## 4. Data Flow Assessment

### Auth → Org Scoping Chain

```
Clerk (auth) → users table (clerk_id) → affiliations table (person_id → org_id, role)
→ useAuthContext() provides { orgId, orgName, orgType, role }
→ useViewContext() allows admin view-as override via localStorage
→ effectiveOrgId used in all partner queries
```

### Data Scoping Strength

| Layer | Mechanism | Strength |
|-------|-----------|----------|
| Edge functions (erv-*) | Hard-coded `ERV_ORG` constant | **STRONG** — cannot be overridden |
| Frontend resource/request queries | Server-side `.eq('org_id', orgId)` | **STRONG** |
| Frontend match queries | Client-side filtering by resource ownership | **WEAK** — `getScopedMatches()` fetches ALL matches, filters locally |
| Agent context building | Client-side match filtering | **WEAK** — `buildContext()` fetches all matches, filters by resource_id ownership |
| RLS policies | Not visible in codebase | **UNKNOWN** — no RLS statements found |

### Key Gap: Client-Side Match Filtering

`getScopedMatches()` in `lib/scoped-queries.ts`:
```typescript
// Fetches ALL matches (no org_id filter), then filters client-side
const { data } = await query; // NO org_id in WHERE clause
const orgResourceIds = new Set(orgResources.map(o => o.id));
return data.filter(m => orgResourceIds.has(m.resource_id));
```

This means the `matches` table either lacks an `org_id` column or it isn't used. All match data transits to the client before filtering. Same pattern in `buildContext()` for agent chat.

**Recommendation:** Add `org_id` to `matches` table (or use a server-side join) and filter before response serialization.

### ERV Data Flow Diagram

```
INTAKE                          PARTNER DASHBOARD
──────                          ─────────────────
/erv page                       /matching
  ↓ [ERV_INTAKE:survivor:myself]    ↓ useAuthContext() → orgId
/api/chat                           ↓ getScopedMatches(orgId)
  ↓ ERV system prompt               ↓ Supabase (client-side filter)
Claude Sonnet (intake questions)     ↓ Render match cards
  ↓ submit_sos tool call
intake-write EF                 /map
  ↓ Creates SOS + request           ↓ Supabase .eq('org_id', orgId)
  ↓ org_id = ERV_ORG                ↓ Render pins + match lines
  ↓
match-trigger EF (auto)         /agent
  ↓ Scores candidates               ↓ /api/agent/chat
  ↓ Creates match (proposed)         ↓ buildContext(orgId)
  ↓                                  ↓ OpenClaw → sos-erv agent
notify-partner EF                    ↓ Agent uses erv-query EF
  ↓ partner_notifications
  ↓ OpenClaw agent notification  /drive
                                     ↓ delivery_assignments query
                                     ↓ Status pipeline UI
                                     ↓ Photo/doc upload
```

---

## 5. What's Missing vs the Vision

### ERV-Specific Features Gap Analysis

| Vision Feature | Current State | Gap Severity |
|----------------|---------------|--------------|
| **Three persona toggles** (Survivors/Donors/Drivers) | Not implemented. No `request_type` field in schema. | **CRITICAL** — core ERV UX |
| **Persona-specific filters** (priority score, household size, RV type, hitch type, CDL, etc.) | Not implemented. No filter UI beyond disaster. | **CRITICAL** — core ERV UX |
| **Three-way match proposals** (Survivor ↔ RV ↔ Driver) | Data model supports via `chain_id/chain_sequence/chain_role`. Chain visualization exists in match cards. **But no UI to create/propose three-way matches.** | **HIGH** — data ready, UI missing |
| **Fleet management dashboard** | `erv-query` EF returns fleet_status (by_source, by_status, total_available, sleep_capacity). Management page shows resources. **But no dedicated per-RV-unit dashboard.** | **HIGH** — backend ready, dedicated UI missing |
| **Driver coordination + delivery run creation** | `/runs` page creates runs. `/drive` shows driver view. `erv-query` returns volunteers_list with vehicle specs. **But no driver registry page, no vehicle-to-run matching.** | **HIGH** — pieces exist, not connected |
| **Priority queue sorted by ERV scoring** | `erv-query` EF supports `priority_queue`. Priority scoring implemented (veteran +25, etc.). **But no dedicated priority queue page — only accessible via agent chat.** | **MEDIUM** — backend complete, UI missing |
| **Referring partner visibility** (Endeavors, FEMA, Volunteer Florida) | `partner-referral` EF allows ERV to refer OUT. **But no mechanism to track cases referred IN by other partners. No `referring_partner_id` on requests.** | **MEDIUM** — requires schema change |
| **Combination views** (Survivors+Drivers for delivery planning, etc.) | Not implemented. No persona concept to combine. | **HIGH** — blocked by persona system |
| **Intake pages** (survivor, RV donation, volunteer driver) | **IMPLEMENTED** at `/erv` with 3 conversational flows. | DONE |
| **Match queue with accept/decline** | **IMPLEMENTED** via `/matching` with swipe/list modes. | DONE |

### Universal Partner Features Gap Analysis

| Vision Feature | Current State | Gap |
|----------------|---------------|-----|
| **Map with ALL data, filterable** | Map shows all org data. Only disaster filter works. | 6 of 7 universal filter dimensions missing |
| **Saveable custom tabs** | Full CRUD on map_views table, tab UI works. | Tabs don't save filter state (only viewport + disaster_id) |
| **Match queue** | Swipe/List/Map/Admin modes work. | Batch accept backend incomplete (TODO comments) |
| **Agent chat with per-partner personality** | Routes to `sos-erv` via OpenClaw. Portal config provides ERV-specific welcome/suggestions. | No typed partner tools (relies on web_fetch to EFs) |
| **Capacity management** | Management page has resource editing with capacity bars. | Works |
| **Impact reporting** | Reporting page with fulfillment rate, response time, match score, people reached. | Works |
| **Notification panel** | `partner_notifications` table + realtime subscriptions + browser notifications. Unread badge on matching. | Works but no dedicated notification panel page |

---

## 6. Agent Integration Assessment

### Does partner agent chat work for ERV?

**Yes, the routing works:**
1. `/partner/agent` page renders `<AgentChat>` component
2. Component sends to `/api/agent/chat` with `x-org-id: da86c92f-...`
3. Route maps org_id → `sos-erv` agent via `ORG_AGENT_MAP`
4. `buildContext()` pre-fetches: org metadata, active offers, pending/active/fulfilled matches
5. Context + user message sent to OpenClaw gateway at `https://159.203.70.230/v1/responses`
6. Agent receives org-scoped context and responds

### Does it route to sos-erv?

**Yes.** Mapping chain:
```
org_id: da86c92f-d52d-4b13-a474-30e1be8fb808
  → VIEW_AGENT_MAP → 'sos-erv'
  → ORG_AGENT_MAP → 'sos-erv'
  → x-openclaw-agent-id header → OpenClaw gateway
```

### Can it query ERV data?

**Yes, via edge functions.** The `sos-erv` agent can call:
- `erv-query` — 14 query types (fleet_status, priority_queue, survivors_list, donors_list, volunteers_list, matches_pending, matches_fulfilled, person_lookup, etc.)
- `erv-update` — status changes, notes, person flag updates
- `erv-intake` — create new intake records

**But:** These are accessed via `web_fetch` tool on the OpenClaw side, not typed MCP/NanoClaw tools. No formal tool schema definitions exist in the frontend for partner agents.

### Agent Integration Gaps

| Gap | Impact |
|-----|--------|
| No typed partner tools | Agent relies on web_fetch; no structured tool schemas for match acceptance, fleet queries, capacity updates |
| No capacity-update tool | Partners can't update resource availability via agent — must use management dashboard |
| No automated match notifications to agent | Partners must check dashboard manually or ask agent to poll |
| No partner-specific system prompts in frontend | OpenClaw handles this; frontend only injects context data, not behavioral guidance |
| Context injection fetches all matches | `buildContext()` pulls all matches then filters client-side (same gap as scoped-queries) |

---

## 7. Security & Data Isolation Notes

### Strengths
- Clerk authentication required for all `/partner` routes
- Edge functions hard-code `ERV_ORG` — cannot be overridden by client
- `erv-update` verifies org_id ownership before every write
- PII sanitizer active in `/api/chat` (strips SSN, CC, bank info)
- Service-role keys used in all edge functions

### Concerns
- `getScopedMatches()` fetches all matches to client, filters locally
- `buildContext()` same pattern — all matches transit before filtering
- No RLS policies visible in codebase (relies entirely on app-level filtering)
- View-as mechanism stored in localStorage (admin override not validated per-request on backend)
- No audit logging for data access queries

---

## 8. Implementation Priority Recommendations

### P0 — Critical (Blocks ERV core experience)

1. **Persona toggle system** — Add `request_type` enum to requests/resources schema. Build three-way toggle UI (Survivors/Donors/Drivers) for map and matching pages.

2. **Universal filter panel** — Build filter UI for Status, Urgency, Time, Distance, Category, Record type. Store filter config in `map_views` table. Apply filters to both map pins and match list.

3. **Fleet management page** — Dedicated `/partner/fleet` page showing per-RV-unit status, using `erv-query` fleet_status data. Grid/table view with status badges, sleep capacity, condition.

### P1 — High (Core workflows incomplete)

4. **Priority queue page** — Dedicated view showing survivors sorted by ERV priority score. The backend (`erv-query` priority_queue) is ready; needs UI.

5. **Driver registry page** — Browse/filter volunteer drivers by vehicle type, hitch, CDL, availability, travel range. Backend data exists via `erv-query` volunteers_list.

6. **Three-way match creation UI** — Use existing `chain_id/chain_sequence/chain_role` schema. Build UI to propose Survivor ↔ RV ↔ Driver match chains.

7. **Server-side match filtering** — Add org_id to matches table (or use join). Remove client-side filtering from `getScopedMatches()` and `buildContext()`.

### P2 — Medium (Enhanced experience)

8. **Referring partner tracking** — Add `referring_partner_id` to requests table. Build visibility into partner dashboard.

9. **Persona-specific filters** — When viewing Survivors: priority score, household size, veteran toggle, medical toggle, FEMA replacement. When viewing Donors: RV source, sleep capacity, RV type, condition, hitch type. When viewing Drivers: hitch type, tow rating, availability, CDL toggle.

10. **Typed partner agent tools** — Define MCP/NanoClaw tool schemas for match acceptance, fleet queries, capacity updates so the sos-erv agent has structured tool access.

11. **Batch accept backend** — Wire up the "Accept Selected" button in list mode to call `match-respond` EF for each selected match.

### P3 — Lower (Nice to have)

12. **Combination views** (Survivors+Drivers for delivery planning)
13. **Route optimization** for delivery runs
14. **Real-time GPS tracking** for drivers
15. **Notification panel page** (dedicated, not just badge on matching)
16. **Audit logging** for data access

---

## Appendix: Key File Reference

### ERV-Specific
| File | Lines | Purpose |
|------|-------|---------|
| `app/erv/page.tsx` | ~263 | Public intake (3 flows) |
| `app/(partner)/partner/erv/page.tsx` | ~20 | Redirect stub |
| `app/(citizen)/drive/page.tsx` | ~307 | Driver delivery UI |
| `app/(citizen)/drive/chat/page.tsx` | ~167 | Caravan chat |
| `app/api/chat/route.ts` (lines 186-232) | ~46 | ERV system prompts |
| `app/api/agent/chat/route.ts` | ~202 | Partner agent gateway |

### Partner Generic
| File | Lines | Purpose |
|------|-------|---------|
| `app/(partner)/matching/page.tsx` | ~527 | Match dashboard |
| `app/(partner)/map/page.tsx` | ~500 | Partner map |
| `app/(partner)/management/page.tsx` | ~400+ | Org/resource management |
| `app/(partner)/reporting/page.tsx` | ~350+ | Impact reporting |
| `app/(partner)/runs/page.tsx` | ~200+ | Delivery run management |

### Data Layer
| File | Purpose |
|------|---------|
| `lib/scoped-queries.ts` | Org-scoped data fetching (matches, requests, offers, stats) |
| `lib/match-queries.ts` | Match queries, status colors, chain role icons |
| `lib/map-views.ts` | Custom tab CRUD |
| `lib/map-queries.ts` | Match line loading |
| `lib/view-context.tsx` | Org → type/name/agent mapping |
| `lib/portal-config.ts` | Per-org-type UI configuration |
| `lib/auth-context.tsx` | Clerk → affiliations → org_id |
| `lib/notifications.ts` | Partner notification system |

### Edge Functions (sos-core/supabase/functions/)
| Function | Purpose |
|----------|---------|
| `erv-intake` | Person upsert + request/resource creation |
| `erv-query` | 14 query types for ERV dashboard data |
| `erv-update` | Status changes, notes, person flags |
| `match-trigger` | Auto-match scoring + proposal |
| `match-respond` | Accept/decline handler |
| `match-fulfill` | Fulfillment outcome + trust updates |
| `partner-referral` | Cross-partner referral |
| `notify-partner` | Match notification delivery |
