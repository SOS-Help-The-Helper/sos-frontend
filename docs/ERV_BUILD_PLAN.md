# ERV Partner Portal — Full Build Plan

> Source: ERV Portal Audit + Partner Portal Vision + Jonathan spec (2026-04-07)
> Builder: Claude Code (opus) via Henry-Prime
> Repos: sos-frontend (Next.js) + sos-core (Supabase EFs)

---

## Overview

**Current state:** ~40% complete. Intake strong, map/filtering nearly zero.
**Target state:** Full ERV operational dashboard — Julia and Amber can manage 829 RVs, 2,583 survivors, and 127 drivers from the portal without ever opening a spreadsheet.

**8 phases, estimated 40-50 hours of Claude Code work.**

---

## Phase 1: Persona System + Schema (Foundation)
*Everything else depends on this.*

### 1a. Schema Changes (sos-core)

**New migration: `0008_persona_system.sql`**

```sql
-- Add persona_type to disambiguate resources
ALTER TABLE resources ADD COLUMN IF NOT EXISTS persona_type TEXT;
-- ERV resources: 'donor' (housing category) or 'driver' (transport category)
-- This is derivable from category but making it explicit for filtering

-- Add filter_config to map_views (currently only saves viewport + disaster_id)
ALTER TABLE map_views ADD COLUMN IF NOT EXISTS filter_config JSONB DEFAULT '{}';
-- Stores: { persona: ["survivor","donor","driver"], status: ["active"], urgency: ["critical"], ... }

-- Index for persona queries
CREATE INDEX IF NOT EXISTS idx_resources_persona_type ON resources(persona_type) WHERE persona_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_resources_org_category ON resources(org_id, category);
CREATE INDEX IF NOT EXISTS idx_requests_org_status ON requests(org_id, status);
```

**Backfill:** Set `persona_type` on existing ERV resources:
- `category = 'housing'` → `persona_type = 'donor'`
- `category = 'transport'` → `persona_type = 'driver'`

### 1b. Persona Toggle Component (sos-frontend)

**New file: `components/partner/persona-toggle.tsx`**

Three-button multi-select toggle bar:
```
[☑ Survivors] [☑ Donors] [☑ Drivers]
```

- Each button is a toggle (on/off independently)
- At least one must be selected (if user deselects last one, keep it on)
- Emits `onPersonaChange(selected: ('survivor'|'donor'|'driver')[])` callback
- Stored in URL params for shareability: `?persona=survivor,driver`
- Responsive: full labels on tablet, icons on phone

### 1c. Wire Persona to Map + Matching

**Update `app/(partner)/map/page.tsx`:**
- Add PersonaToggle above map
- When personas change, filter map pins:
  - Survivor → show `requests` pins
  - Donor → show `resources` where `category = 'housing'`
  - Driver → show `resources` where `category = 'transport'`

**Update `app/(partner)/matching/page.tsx`:**
- Add PersonaToggle above match list
- Filter matches by persona selection

**Effort:** ~4 hours

---

## Phase 2: Universal Filter Panel
*The core interaction model for the entire partner map.*

### 2a. Filter Panel Component

**New file: `components/partner/filter-panel.tsx`**

Slide-out panel (right side on desktop, bottom sheet on mobile) with sections:

```
┌─────────────────────────┐
│ Filters            [✕]  │
│─────────────────────────│
│ Status                  │
│ [☑ Active] [☑ Matched]  │
│ [☐ Fulfilled] [☐ Closed]│
│                         │
│ Urgency                 │
│ [☑ Critical] [☑ High]   │
│ [☑ Standard]            │
│                         │
│ Time Range              │
│ [24h] [7d] [30d] [All]  │
│                         │
│ Distance                │
│ ○────────● 50mi         │
│ from: [📍 current loc]  │
│                         │
│ Category                │
│ [☑ Housing] [☐ Food]    │
│ [☐ Medical] [☐ Transport]│
│                         │
│ [Apply] [Clear] [Save]  │
└─────────────────────────┘
```

- All dimensions are multi-select (chips or checkboxes)
- Distance uses a slider + location picker
- "Save as tab" button → creates new `map_views` entry with `filter_config` JSONB
- "Clear" resets to defaults
- Active filter count shown on filter button: `Filters (3)`

### 2b. Filter Data Flow

**New file: `lib/filter-engine.ts`**

```typescript
interface FilterConfig {
  personas: ('survivor' | 'donor' | 'driver')[];
  statuses: string[];
  urgencies: string[];
  timeRange: '24h' | '7d' | '30d' | 'all';
  distanceKm: number | null;
  distanceCenter: { lat: number; lng: number } | null;
  categories: string[];
  // Persona-specific (Phase 5)
  priorityRange?: [number, number];
  householdSize?: number[];
  rvSource?: string[];
  sleepCapacity?: number[];
  hitchType?: string[];
  veteranOnly?: boolean;
  firstResponderOnly?: boolean;
  femaReplacement?: boolean;
}

function applyFilters(query: SupabaseQuery, config: FilterConfig): SupabaseQuery
function filterMapPins(pins: Pin[], config: FilterConfig): Pin[]
```

Supabase queries get server-side filters where possible (status, urgency, org_id). Client-side fallback for complex filters (distance radius, persona-specific metadata fields).

### 2c. Save Filters in Map Tabs

**Update `lib/map-views.ts`:**
- `map_views.filter_config` JSONB stores the full FilterConfig
- When restoring a tab, apply viewport + filter_config
- Tab name auto-generated from filters: "Active Survivors in NC" or user-defined

**Effort:** ~6 hours

---

## Phase 3: Fleet Management Page
*Julia's primary operational view for 829 RVs.*

### 3a. Fleet Page

**New file: `app/(partner)/fleet/page.tsx`**

Grid/table view of all ERV resources (housing category):

```
┌──────────────────────────────────────────────────┐
│ Fleet Management                    [+ Add RV]   │
│ [All] [Available] [Matched] [Maintenance] [Sold] │
│──────────────────────────────────────────────────│
│ 🟢 2021 Volante 5th Wheel          Sleeps 4     │
│    Montgomery, AL | State Donated   Available     │
│    VIN: 4X4T...  | Bumper pull | 6,200 lbs      │
│    [View] [Match] [Edit]                          │
│──────────────────────────────────────────────────│
│ 🟡 2007 Heartland Landmark 37'     Sleeps 4     │
│    Longmont, CO | Citizen Donated   Matched       │
│    Matched to: Diana Starr (Priority 85)          │
│    [View] [Details] [Edit]                        │
│──────────────────────────────────────────────────│
```

**Data source:** `erv-query` EF → `available_rvs` + `fleet_status` query types
**Features:**
- Status tab filters (available/matched/maintenance/sold/in_transit)
- Search by VIN, description, location
- Sort by: date added, sleep capacity, location, status
- Quick actions: view details, propose match, edit status, add note
- Summary stats at top: total units, available, deployed, maintenance

### 3b. Fleet Detail Modal

Click any RV → full detail modal:
- All metadata: VIN, year/make/model, type, sleeps, weight, hitch, condition
- Interior contents, repairs needed
- Delivery method, cost to Ocala
- Match history (who was matched, when, outcome)
- Notes timeline
- Status change buttons
- Location on mini-map

### 3c. New `erv-query` Query Type: `fleet_detail`

Add to erv-query EF: `fleet_detail` — returns single RV with full metadata, match history, and notes.

**Effort:** ~6 hours

---

## Phase 4: Priority Queue + Survivor Management
*See who needs help most, act on it.*

### 4a. Priority Queue Page

**New file: `app/(partner)/queue/page.tsx`**

Sorted list of active survivors by ERV priority score:

```
┌──────────────────────────────────────────────────┐
│ Priority Queue (1,710 active)       [Filters 🔽] │
│──────────────────────────────────────────────────│
│ 🔴 100  Diana Starr                              │
│    Veteran • Medical • Family of 6                │
│    Weaverville, NC | Hurricane Helene             │
│    FEMA Replacement | Submitted 2025-10-15        │
│    [Propose Match] [View Details]                 │
│──────────────────────────────────────────────────│
│ 🟠  95  Michael Torres                           │
│    First Responder • Single Parent • Medical      │
│    Asheville, NC | Hurricane Helene               │
│    [Propose Match] [View Details]                 │
│──────────────────────────────────────────────────│
```

**Data source:** `erv-query` → `priority_queue` (already returns name, score, urgency, household, location, flags)
**Features:**
- Sorted by priority score (highest first)
- Filter by: veteran, first responder, medical, FEMA replacement, disaster, location
- "Propose Match" → opens match proposal flow (select RV → select driver → confirm)
- Pagination (20 per page)
- Score breakdown on hover/tap (shows why the score is what it is)

### 4b. Survivor Detail Modal

Click any survivor → detail view:
- Person info: name, phone (masked until consent), location, household details
- Priority score breakdown (which flags contribute what)
- Special circumstances (medical summary, disability, elderly)
- Request history
- Match history (proposed, declined, fulfilled)
- Notes timeline
- Action buttons: propose match, add note, change status, update priority flags

**Effort:** ~5 hours

---

## Phase 5: Driver Registry
*Browse and manage the 127 volunteer drivers.*

### 5a. Driver Registry Page

**New file: `app/(partner)/drivers/page.tsx`**

```
┌──────────────────────────────────────────────────┐
│ Volunteer Drivers (127)             [+ Add Driver]│
│ Hitch: [All ▾]  Available: [All ▾]  CDL: [All ▾] │
│──────────────────────────────────────────────────│
│ 🟢 Austin DeMaria                                │
│    Ford F250 | Bumper pull | Open availability    │
│    Chattanooga, TN | Travel: Regional             │
│    [Assign to Run] [View] [Edit]                  │
│──────────────────────────────────────────────────│
│ 🟢 Chantz Cutts                                  │
│    Ram 3500 Dually | 5th Wheel + Gooseneck       │
│    Magnolia, TX | Weekends | CDL: No              │
│    [Assign to Run] [View] [Edit]                  │
│──────────────────────────────────────────────────│
```

**Data source:** `erv-query` → `driver_status` (already returns tow_vehicle, hitch_type, tow_rating, availability, travel_range, CDL, class_a)
**Features:**
- Filter by: hitch type, availability, travel range, CDL, Class A
- Sort by: name, location, availability, hitch type
- "Assign to Run" → opens delivery run assignment
- Driver detail: vehicle specs, match/delivery history, notes

**Effort:** ~4 hours

---

## Phase 6: Three-Way Match Proposal UI
*The core ERV workflow: connect Survivor ↔ RV ↔ Driver.*

### 6a. Match Proposal Flow

Triggered from: Priority Queue → "Propose Match" button, or Fleet → "Match this RV" button.

**3-step wizard:**

```
Step 1: Select Survivor (if starting from fleet)
┌─────────────────────────────────┐
│ Who needs this RV?              │
│ [Search survivors...]           │
│                                 │
│ Top matches by proximity:       │
│ 🔴 Diana Starr (P:100, 50mi)   │
│ 🟠 Michael Torres (P:95, 120mi)│
│ 🟡 Sarah Chen (P:80, 200mi)    │
└─────────────────────────────────┘

Step 2: Select RV (if starting from queue)
┌─────────────────────────────────┐
│ Which RV fits this family?      │
│ Household: 6 | Need: 5th wheel │
│                                 │
│ Best fits:                      │
│ 🟢 2021 Volante (Sleeps 6)     │
│ 🟢 2023 Keystone (Sleeps 8)    │
│ 🟡 2019 Forest River (Sleeps 4)│
└─────────────────────────────────┘

Step 3: Select Driver
┌─────────────────────────────────┐
│ Who can deliver?                │
│ RV: 5th wheel, 6200 lbs        │
│                                 │
│ Compatible drivers:             │
│ 🟢 Austin DeMaria (193mi, Open)│
│ 🟢 Chantz Cutts (450mi, Wknd)  │
│ ⚠️ Bito Larson (bumper pull)    │
└─────────────────────────────────┘

[Confirm Match Proposal]
```

### 6b. Backend: `erv-match-propose` EF (new)

New edge function in sos-core:
- Creates 3 linked match records with `chain_id`:
  - Match 1: request ↔ RV resource (chain_sequence: 1, chain_role: 'fulfill')
  - Match 2: RV resource ↔ driver resource (chain_sequence: 2, chain_role: 'deliver')
  - Match 3: request ↔ driver resource (chain_sequence: 3, chain_role: 'transport')
- Uses existing `erv-query` → `propose_match` for scoring/ranking
- Returns the `formatted_message` for the agent to display
- Sends notification to the driver

### 6c. Match Chain Visualization

The matching dashboard already renders chain matches (`multi_step` type in portal-config). Enhance:
- Show all 3 legs: Survivor → RV → Driver
- Status per leg (proposed/accepted/in_transit/delivered)
- Quick actions per leg

**Effort:** ~8 hours

---

## Phase 7: Referring Partner Visibility
*See cases from Endeavors, FEMA, Volunteer Florida.*

### 7a. Schema Change

```sql
ALTER TABLE requests ADD COLUMN IF NOT EXISTS referring_org_id UUID REFERENCES organizations(id);
ALTER TABLE requests ADD COLUMN IF NOT EXISTS referring_contact TEXT;
CREATE INDEX IF NOT EXISTS idx_requests_referring_org ON requests(referring_org_id) WHERE referring_org_id IS NOT NULL;
```

### 7b. Referral Tracking UI

Add "Referrals" section to Priority Queue page:
- Filter: `referring_org_id IS NOT NULL`
- Shows: referring org name, contact, referral date
- Grouped by referring org (Endeavors: 29 cases, FEMA: 5 cases, etc.)

### 7c. Update `erv-intake` + `erv-query`

- `erv-intake`: accept `referring_org_name` → lookup/create org → set `referring_org_id`
- `erv-query`: new query type `referral_summary` — counts by referring org, list by org

**Effort:** ~3 hours

---

## Phase 8: Server-Side Match Filtering (Security)
*Fix the client-side filtering security gap.*

### 8a. Add `org_id` to matches via view or join

Option A (preferred): Create a Postgres view that joins matches with requests/resources to derive org_id:
```sql
CREATE VIEW org_scoped_matches AS
SELECT m.*, r.org_id
FROM matches m
JOIN requests r ON m.request_id = r.id;
```

Option B: Add `org_id` column to matches table + backfill + trigger to auto-set on insert.

### 8b. Update `getScopedMatches()` and `buildContext()`

Replace client-side filtering with server-side `.eq('org_id', orgId)` on the view/table.

**Effort:** ~3 hours

---

## Summary

| Phase | What | Effort | Dependencies |
|-------|------|--------|-------------|
| 1 | Persona System + Schema | 4h | None |
| 2 | Universal Filter Panel | 6h | Phase 1 |
| 3 | Fleet Management Page | 6h | Phase 1 |
| 4 | Priority Queue + Survivor Mgmt | 5h | Phase 1, 2 |
| 5 | Driver Registry | 4h | Phase 1, 2 |
| 6 | Three-Way Match Proposal | 8h | Phase 3, 4, 5 |
| 7 | Referring Partner Visibility | 3h | Phase 4 |
| 8 | Server-Side Match Filtering | 3h | None |
| | **Total** | **~39h** | |

### Execution Order (parallelizable)

```
Phase 1 (persona) ──→ Phase 2 (filters) ──→ Phase 4 (queue) ──→ Phase 6 (3-way match)
                  ├──→ Phase 3 (fleet)   ──→ Phase 6
                  └──→ Phase 5 (drivers) ──→ Phase 6
                                              └──→ Phase 7 (referrals)
Phase 8 (security) — independent, can run anytime
```

Phases 1-5 are buildable by Claude Code. Phase 6 (three-way match) needs design review. Phase 8 is a security fix that should happen regardless.
