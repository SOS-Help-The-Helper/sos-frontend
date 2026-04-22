# ERV Map Build Plan

> Clone the citizen portal map (`/c`) for ERV's data.
> Same design, same colors, same interactions. Different data source.
> URL: `sosconnect.org/erv/map` (or `/erv` as the landing)

---

## Source: Citizen Portal Map

The citizen map is at `app/(citizen)/c/page.tsx` (717 lines). It uses:
- Mapbox GL JS with `dark-v11` style
- GeoJSON sources with clustering + glow animation
- 3 data layers: requests (red), resources (blue), reports (white)
- Bottom sheet detail card on pin click
- GPS location with pulsing green dot
- NWS weather alert polygons
- Legend overlay
- Mobile-first (no nav controls, pinch-to-zoom)

## What Changes for ERV

| Aspect | Citizen Portal | ERV Map |
|---|---|---|
| Data source | Direct Supabase queries (SOS DB) | ERV edge functions (erv-query) |
| Auth | None (public) | None (public read-only view) |
| Requests (red) | SOS requests (open/active/matched) | ERV requests from erv-query `request_summary` |
| Resources (blue) | SOS resources + partner orgs | ERV RVs (deployed/available) from `fleet_status` |
| Drivers (green) | N/A | ERV drivers from `driver_status` |
| Reports (white) | community_messages | Not needed |
| Detail card | Generic (category, urgency, household) | ERV-specific (RV type, sleeps, VIN, priority score, veteran/FR badges) |
| Agent sheet | SOS citizen agent | Not needed initially |
| Match lines | N/A | Chain connections (survivor ↔ RV ↔ driver) |
| Weather alerts | NWS API | Same (keep) |
| GPS | User location | Same (keep) |
| Legend | Requests / Resources / Reports | Families needing help / RVs / Drivers |

## Route Structure

```
app/
  erv/
    page.tsx          ← ERV map (cloned from citizen /c)
    layout.tsx        ← Minimal layout (no auth required)
```

URL: `sosconnect.org/erv`

## Design (IDENTICAL to citizen portal)

- Background: `#0F1E2B` (Navy)
- Requests/Survivors: `#EF4E4B` (Red) — pin + cluster + glow
- RVs: `#89CFF0` (Light Blue) — pin + cluster + glow  
- Drivers: `#4CAF50` (Green) — pin + cluster
- User location: `#34d399` (pulsing green dot)
- Detail card: `#1A3850` bg, white/10 borders, bottom sheet
- Cluster glow animation: same pulse effect
- Map style: `mapbox://styles/mapbox/dark-v11`

## Data Fetching

Instead of direct Supabase queries, the ERV map calls the edge function:

```typescript
// Fetch ERV data via edge functions
const BASE = 'https://rtduqguwhkczexnoawej.supabase.co/functions/v1';
const AUTH = 'Bearer <anon_key>';

// Survivors (red pins)
const requests = await fetch(`${BASE}/erv-query`, {
  method: 'POST',
  headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query_type: 'request_summary' })
}).then(r => r.json());

// RVs (blue pins) 
const fleet = await fetch(`${BASE}/erv-query`, {
  method: 'POST',
  headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query_type: 'fleet_status' })
}).then(r => r.json());

// Drivers (green pins)
const drivers = await fetch(`${BASE}/erv-query`, {
  method: 'POST',
  headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query_type: 'driver_status' })
}).then(r => r.json());
```

## Detail Card Content

**Survivor pin (red):**
- Priority score badge (color: green/yellow/red based on 0-100)
- Household size
- State
- Disaster name
- Veteran badge 🎖️ (if is_veteran)
- First responder badge 🚒 (if is_first_responder)
- FEMA badge (if is_fema_replacement)
- Status

**RV pin (blue):**
- Year/Make/Model (if available)
- Vehicle type
- Sleeps capacity
- Status (deployed/available/pending)
- Source (citizen donation / FDEM)
- Current lot (if available)

**Driver pin (green):**
- Display name
- Tow capability (hitch types)
- Class A experience
- Location

---

## Claude Code Chunks

### Chunk 1: Scaffold route + layout
- Create `app/erv/layout.tsx` (minimal, no auth)
- Create `app/erv/page.tsx` (copy citizen `/c/page.tsx` verbatim)
- Verify it compiles with no changes

### Chunk 2: Swap data source
- Replace Supabase direct queries with edge function fetch calls
- Map edge function response fields to GeoJSON feature properties
- Remove community_messages/reports layer
- Add drivers as a third GeoJSON source (green pins)

### Chunk 3: Update detail card
- Replace generic detail card with ERV-specific fields
- Add veteran/FR/FEMA badges
- Add RV specs (year/make/model, sleeps, vehicle type)
- Add driver info (tow capability, class A)

### Chunk 4: Update legend + polish
- Update legend labels (Families / RVs / Drivers)
- Add match chain lines (survivor ↔ RV connections)
- Test at sosconnect.org/erv
- Verify mobile layout

### Chunk 5: Deep link support
- URL params: `?disaster=helene&pin=<request_id>`
- Zoom to specific pin on load
- This enables Slack links: `sosconnect.org/erv?pin=<id>`
