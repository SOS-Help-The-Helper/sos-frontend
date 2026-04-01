# Transport Logistics Use Case

## The Problem (field evidence)

Disaster relief supply chains depend on ad-hoc volunteer drivers coordinating via Facebook posts. No centralized dispatch, no route optimization, no capacity matching between what needs to move and what vehicles are available.

### America Cares — Sanford to Swannanoa (Hurricane Helene)

6-8 pallets of perishable food picked up weekly, 3.5-hour drive. At risk of stopping entirely due to driver shortage.

**Key constraint discovered:** Palletized loads require forklift and dock at both ends. This eliminates relay-style transfers where a halfway driver picks up the load. Upstream bulk transport is point-to-point only.

### ERV Operations — Multi-Stop Distribution

ERV runs caravans from warehouse to multiple distribution sites. Current coordination: group texts and phone calls. No route optimization, no ETA tracking, no capacity utilization data.

**Dispatch types:**
- Warehouse run: load at warehouse → deliver to 3-5 sites → return
- Elderly transport: pickup at homes → deliver to distribution site → return home
- Emergency delivery: direct point-to-point (medical supplies, generators)

## Personas Involved

| Persona | Role |
|---|---|
| **ERV coordinator** | Plans routes, assigns drivers, tracks completion |
| **Volunteer driver** | Accepts run, drives route, confirms delivery |
| **Distribution site** | Receives goods, confirms receipt, reports inventory |
| **Citizen (elderly/disabled)** | Needs transport to pickup site or home delivery |
| **Upstream donor** | Has goods at origin, needs pickup scheduled |

## The Coordination Loop

### 1. INTAKE
- Distribution site or upstream donor reports: "I have 6 pallets ready for pickup at [location], available until [time], requires [vehicle type]."
- Transport need classified: vehicle type (refrigerated, flatbed, van, car), dock required (yes/no), weight/volume, perishable (yes/no + deadline).

### 2. MATCHING
- Available drivers matched to transport needs by: vehicle type, location proximity, availability window, route efficiency.
- Multi-stop optimization: if Driver A is already going from Sanford to Asheville, add a stop at a distribution site en route.
- Constraint: palletized = no relay. Non-palletized = relay eligible (driver A goes halfway, driver B picks up).

### 3. LOGISTICS
- Route generated with ETAs per stop.
- Driver receives route via SMS or app with turn-by-turn.
- Each stop has: what to pick up/deliver, contact name, dock instructions, time window.
- Real-time tracking: coordinator sees driver position, ETA updates.

### 4. FULFILLMENT
- Driver confirms pickup (photo of loaded vehicle).
- Driver confirms each delivery (photo + recipient signature or confirmation).
- Inventory at destination updated automatically.
- If driver can't complete: alert coordinator, find replacement driver or adjust remaining stops.

### 5. LEARNING
- Route efficiency: actual time vs estimated per leg.
- Driver reliability: completion rate, on-time rate.
- Vehicle utilization: how full are trucks running? Could loads be consolidated?
- Demand patterns: which routes run most frequently? Should they become standing routes?

## Constraints (from field data)

1. **Pallets = point-to-point.** No relay for forklift-required loads. Must have dock access at both ends.
2. **Perishable timelines.** Fresh food has 24-48hr window. Route must account for total transit + unload time.
3. **Volunteer drivers are unreliable.** Cancel rates are high. System needs backup driver matching within 30 min of cancellation.
4. **Mixed vehicle fleet.** Some drivers have trucks, some have SUVs, some have cars. Matching must filter by vehicle capability.
5. **No cell service on rural routes.** Offline route must be downloadable before departure. Status updates sync when connectivity returns.
6. **Elderly transport is recurring.** Same people, same routes, same schedule. System should auto-generate recurring runs, not require manual dispatch each time.

## What We Build

| Feature | Status | Gap |
|---|---|---|
| ERV partner portal | ✅ Built | Exists with management, matching, map |
| Delivery runs page (/runs) | ✅ Built | UI exists, needs dispatch logic |
| Driver matching | 📋 Designed | Not built — needs driver registry + vehicle types |
| Route optimization | 📋 Designed | Not built — needs mapping API integration |
| Real-time driver tracking | 📋 Designed | Not built — needs mobile GPS reporting |
| Multi-stop dispatch | 📋 Designed | Not built — needs route builder UI |
| Recurring run templates | 📋 Designed | Not built |
| Offline route download | 📋 Designed | PWA service worker covers this |

## Evidence

- Victoria intel on America Cares: SOS Slack `#intel` `C0AMSC65K5J/p1774930713987289`
- Henry-Ops product ideas: Upstream Logistics `C0AMSCM2M3N/p1774931000179149`
- ERV partner portal: live at `sosconnect.org/partner/erv`
- Pallet constraint: discovered in intel thread — Victoria confirmed palletized loads can't do relay transfers
