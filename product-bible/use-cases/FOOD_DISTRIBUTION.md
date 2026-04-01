# Food Distribution Use Case

## The Problem (field evidence)

Grassroots food distribution during disasters is chaotic, wasteful, and exclusionary.

### Bald Creek Relief — Burnsville, NC (Hurricane Helene)

Volunteers at 100 Bald Creek School Rd received bulk donations: potatoes, apples, citrus, deer meat, hog, chicken, eggs, baked goods. The operation was first-come-first-served, "here til it's gone," recurring Fridays on an informal schedule.

**What went wrong:**
- Volunteers had no time or capacity to inventory all the food and assemble packs
- No way to know how many servings existed for 1-person, 2-person, or 4-person families
- No appointment system — people drove 30+ minutes and found nothing left
- No way to notify people who'd registered a food need that distribution was happening
- No inventory tracking — nobody knew what was available in real time

> "If the team took pictures of all the open boxes and identified which box held which food, could AI help them determine how many servings existed for 1 person, 2 person family, and 4 person family?" — Victoria Jaqua, SOS Ops

### America Cares — Upstream Supply Chain

America Cares picks up 6-8 pallets of perishable food weekly from Sanford, NC and transports to Swannanoa, NC (3.5 hour drive). They are "at risk of not being able to continue" — desperately need volunteer drivers.

**Volume:** pallets of bakery items, bread, fresh produce (berries, onions, tomatoes, garlic).

**Critical constraint:** Palletized loads require forklift/dock for loading and unloading. Meet-halfway relay transfers are NOT possible for palletized food. This eliminates the relay routing model for upstream logistics — you need point-to-point with dock-equipped vehicles.

**Connection to SOS:** Free Hot Meals (our MVP partner) is active in these same Facebook threads. They receive and distribute this food. The supply chain is: America Cares (transport) → distribution sites like Bald Creek → citizens who need food.

## Personas Involved

| Persona | Role in this use case |
|---|---|
| **Citizen** | Registers food need via SOS agent. Receives appointment slot. Picks up food. |
| **Partner (FHM)** | Receives bulk food. Uses SOS to inventory, create appointment slots, track fulfillment. |
| **Partner (ERV)** | Provides transport from supply sources to distribution sites. |
| **Volunteer** | Photographs food boxes. Helps assemble packs. Checks in appointees. |
| **Upstream donor** | America Cares, food banks — provides palletized bulk food. |

## The Coordination Loop

### 1. INTAKE
- **Partner intake:** FHM receives food donation. Volunteer photographs boxes with phone camera.
- **AI inventory:** Gemini Vision analyzes photos → identifies items, estimates quantities, calculates servings by household size (1/2/4 person).
- **Result:** "147 servings available: 42 single, 35 two-person, 18 four-person packs."
- **Citizen intake:** People in the area tell SOS agent "I need food" → request created with household size, dietary constraints, location.

### 2. MATCHING
- Available servings matched to registered food needs in the area.
- Priority: proximity + urgency + household size fit.
- Triaged appointment slots: "There are 42 single-person slots. 18 four-person slots."
- As 4-person slots fill, remaining food redistributes to smaller household slots.
- Match engine score considers: distance, household size match, urgency, time since last food assistance.

### 3. LOGISTICS
- **Downstream (citizen pickup):** Appointment time windows assigned. SMS notification: "Your food pickup is scheduled for Friday 2-3pm at Bald Creek School."
- **Upstream (supply transport):** ERV dispatches driver with dock-equipped vehicle from Sanford → Swannanoa. Requires: refrigerated truck or flatbed + dock access at both ends.
- **Transport constraint:** Palletized loads are point-to-point ONLY. No relay. Driver must complete full 3.5hr route.

### 4. FULFILLMENT
- Citizen arrives at appointment time. Volunteer checks them in via SOS (scan QR or enter phone).
- Pack handed out. Inventory updates in real time.
- Remaining inventory visible to all: "23 single-person packs remaining, 4 four-person packs remaining."
- When inventory hits zero: all unfulfilled appointments notified "food is gone, we'll notify you when more arrives."

### 5. LEARNING
- Which food types move fastest (protein > produce > baked goods)?
- Optimal pack sizes for this community's household distribution?
- No-show rate by appointment time — adjust future windows.
- Transport reliability: which drivers complete routes vs cancel?
- Demand patterns: food needs spike on which days post-disaster?

## Constraints (from field data)

1. **Pallets need forklifts.** Meet-halfway relay doesn't work for palletized loads. Point-to-point with dock access required.
2. **Perishable timeline.** Fresh produce and proteins have 24-48hr windows. Appointment scheduling must account for spoilage.
3. **No internet in disaster zones.** Bald Creek had limited connectivity. Offline-first intake is required — scan/photo works locally, syncs when connected.
4. **Volunteers are untrained.** Can't expect complex inventory systems. "Take a photo of each box" is the maximum ask.
5. **First-come-first-served fails.** People furthest away (often most in need) arrive last and get nothing. Appointment system + SOS matching fixes this.
6. **Recurring but informal.** "Fridays, here til it's gone" doesn't work when demand outstrips supply. Need structured scheduling tied to actual inventory.

## What We Build

| Feature | Status | Gap |
|---|---|---|
| Citizen says "I need food" → request created | ✅ Working | None — intake-write EF handles this |
| Match engine finds food resources nearby | ✅ Working | Category aliases need testing for food domain |
| FHM partner dashboard shows matches | ✅ Working | Need to verify E2E with food category |
| Gemini Vision photo → inventory | 📋 Designed | Not built — needs EF + Gemini API integration |
| Appointment slot system | 📋 Designed | Not built — needs scheduling logic on resources |
| Real-time inventory tracking | 🟡 Partial | `capacity_available` field exists, no real-time decrement |
| SMS appointment notification | 📋 Designed | Twilio integration designed, not connected to scheduling |
| Upstream transport dispatch (ERV) | 🟡 Partial | ERV portal exists, dispatch/routing not built |
| Offline photo intake | 📋 Designed | PWA service worker designed, not implemented |

## Evidence

- Victoria Jaqua intel: SOS Slack `#intel` channel
  - Bald Creek analysis: `C0AMSC65K5J/p1774930054145639`
  - America Cares transport: `C0AMSC65K5J/p1774930713987289`
- Henry-Ops product ideas: SOS Slack `#product-ideas` channel
  - Food Distribution Pipeline: `C0AMSCM2M3N/p1774930257898869`
  - Upstream Logistics: `C0AMSCM2M3N/p1774931000179149`
  - Grassroot Boots Analysis: `C0AMSCM2M3N/p1774932593456009`
- Google Drive: [Facebook screenshots from Bald Creek Relief](https://drive.google.com/drive/folders/1pTsdqUIhVqu5i-_13mKtoQkHpONRSp4r)
- Free Hot Meals is active in same threads — direct partner connection validated
