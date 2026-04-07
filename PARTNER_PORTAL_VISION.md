# Partner Portal Vision — Canonical (2026-04-07)

> Source: Jonathan Greenberg, direct specification

## Universal Partner Portal Structure

Every partner gets:
1. **Map section** — starts with ALL their data, filterable, saveable as custom tabs
2. **Match queue** — accept/decline/refer
3. **Agent chat** — per-partner personality, org-specific context
4. **Capacity management** — edit what they can offer
5. **Impact reporting** — what they've fulfilled
6. **Notification panel** — new matches, status changes, alerts

### Map Tab System
- Default view: all partner data on one map
- Partners apply filters → "Save as tab" to pin that view
- Tabs persist per user/org
- Examples: "Hurricane Helene", "FEMA Replacements", "LA Fires"
- Multi-select on all filter dimensions

### Universal Filter Dimensions (every partner)

| Dimension | Filter Type |
|---|---|
| Disaster | Dropdown |
| Status | Multi-select (active, matched, fulfilled, closed) |
| Urgency | Toggle (critical / high / standard) |
| Time | Range (24h, 7d, 30d, all) |
| Distance | Radius from point |
| Category | Multi-select from taxonomy |
| Record type | Toggle (requests / resources / matches / reports) |

---

## 🚐 Emergency RV — Partner Portal Vision

### Top-Level Sort: Three Personas (multi-select toggle)

☑ **Survivors** (requests) | ☑ **Donors** (resources/housing) | ☑ **Drivers** (resources/transport)

Select one, two, or all three. Map shows only those pins. Filters change based on selection.

### Persona-Specific Filters

**When viewing Survivors:**
| Filter | Type |
|---|---|
| Priority score | Range slider (0-100) |
| Household size | Range (1-2, 3-4, 5-6, 7+) |
| Disaster | Dropdown |
| Location / distance | Radius |
| Urgency | Toggle |
| Status | Multi-select |
| Veteran | Toggle |
| First responder | Toggle |
| Medical needs | Toggle |
| FEMA replacement | Toggle |
| Insurance status | Multi-select |

**When viewing Donors (RVs):**
| Filter | Type |
|---|---|
| RV source | Multi-select (citizen donated, ERV fleet, state donated) |
| Sleep capacity | Range (1-2, 3-4, 5-6, 7+) |
| RV type | Multi-select (5th wheel, travel trailer, motorhome) |
| Condition | Multi-select |
| Status | Multi-select (available, matched, maintenance, sold, in transit) |
| Hitch type | Multi-select (bumper pull, 5th wheel, gooseneck) |

**When viewing Drivers:**
| Filter | Type |
|---|---|
| Hitch type | Multi-select (bumper pull, 5th wheel, gooseneck) |
| Tow rating | Range |
| Availability | Multi-select (open, weekends, limited) |
| Travel range | Multi-select (local, regional, national) |
| CDL | Toggle |
| Class A experience | Toggle |

### Combination Use Cases
- **Survivors + Drivers** → delivery planning
- **Survivors + Donors** → match planning
- **All three** → full operational picture

### Data Mapping
- Survivors = `requests` where `org_id = ERV`
- Donors = `resources` where `org_id = ERV AND category = 'housing'`
- Drivers = `resources` where `org_id = ERV AND category = 'transport'`
- Filter dimensions map to existing DB fields (metadata JSON + top-level columns)

### ERV-Specific Features Needed
- Match queue with three-way proposals (Survivor ↔ RV ↔ Driver)
- Fleet management dashboard (status per RV unit)
- Driver coordination + delivery run creation
- Intake pages: survivor, RV donation, volunteer driver (all agent-conversational)
- Referring partner visibility (Endeavors, FEMA, Volunteer Florida cases)
- Priority queue sorted by ERV scoring

---

## 🍽️ Free Hot Meals — Partner Portal Vision

### Top-Level Sort: Distribution Sites

### FHM-Specific Filters
| Filter | Type |
|---|---|
| Distribution site | Dropdown |
| Meal type | Multi-select (breakfast, lunch, dinner) |
| Capacity remaining | Range (low/medium/full) |
| Food category | Multi-select |

### FHM-Specific Features Needed
- Site-based capacity editor (servings per meal per site)
- Meal-time-aware matching
- Site management (add/remove/edit with hours + capacity)

---

## 🎯 Aid Arena — Partner Portal Vision

### Top-Level Sort: Assignment Status

### Aid Arena-Specific Filters
| Filter | Type |
|---|---|
| Assignment status | Multi-select (unassigned, assigned, in progress, complete) |
| Volunteer | Dropdown (roster) |
| Contributing org | Multi-select |
| Task type | Multi-select (delivery, assessment, cleanup, etc.) |

### Aid Arena-Specific Features Needed
- Task board (map-based + list view)
- Volunteer roster management
- Multi-org coordination view
- Assignment tracking through completion
