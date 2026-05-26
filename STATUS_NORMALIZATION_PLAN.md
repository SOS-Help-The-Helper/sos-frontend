# Status Normalization Plan — Final

> Goal: Unified 6-status coordination model for requests AND resources, mirrored 1:1 across SOS DB and ALL partner DBs.
> `ops_status` is partner-local ONLY — never syncs to SOS DB. SOS DB `ops_status` column will be NULLed out.

## Unified Coordination Status (6 values, shared by requests + resources)

```
pending     → Intake received, not yet reviewed
approved    → Reviewed, ready for matching
matched     → Paired with counterpart (request↔resource)
in_progress → Delivery/fulfillment underway
fulfilled   → Need met / resource deployed successfully
closed      → Terminal (declined, withdrawn, expired, sold, broken)
```

| Status | Request (a need) | Resource (an offer) |
|---|---|---|
| `pending` | Submitted, awaiting review | Donated/received, not screened |
| `approved` | Reviewed, eligible for matching | Screened, available for matching |
| `matched` | Paired with a resource | Paired with a request |
| `in_progress` | Resource being delivered | Being transported/deployed |
| `fulfilled` | Need met, confirmed | Successfully deployed |
| `closed` | Declined/withdrew/expired/dup | Sold/broken/withdrawn |

### What this replaces
- Old resource statuses (`available`, `committed`, `in_transit`, `deployed`, `returned`, `unavailable`) → mapped to the 6 unified values
- `available` → `approved`
- `committed` → `matched`
- `in_transit` → `in_progress`
- `deployed` → `fulfilled`
- `returned` → back to `approved`
- `unavailable` → `closed`

### ops_status (partner-local ONLY)
- Lives in partner DB only (ERV DB has: repair, cleaning, screening, auction_ready, sold, received, etc.)
- NEVER syncs to SOS DB — `sos-sync` ignores it
- SOS DB `ops_status` column: NULL for all records after migration
- Partner portal can display ops_status in their local UI if they want
- Platform coordination always uses `status`

### Match statuses (unchanged)
```
proposed → accepted → active → completed → declined → expired
```

### SOS umbrella statuses (unchanged)
```
active → resolved → closed
```

---

## _shared/statuses.ts UPDATE

```typescript
// UNIFIED coordination statuses — same for requests AND resources
export const VALID_COORDINATION_STATUSES = ['pending', 'approved', 'matched', 'in_progress', 'fulfilled', 'closed'] as const;

// Aliases for backward compatibility
export const VALID_REQUEST_STATUSES = VALID_COORDINATION_STATUSES;
export const VALID_RESOURCE_STATUSES = VALID_COORDINATION_STATUSES;

// Matches have their own pipeline
export const VALID_MATCH_STATUSES = ['proposed', 'accepted', 'active', 'completed', 'declined', 'expired'] as const;
export const VALID_SOS_STATUSES = ['active', 'resolved', 'closed'] as const;
export const TERMINAL_STATUSES = ['fulfilled', 'closed', 'completed', 'expired'] as const;

export const ALL_COORD_STATUSES = [
  ...VALID_COORDINATION_STATUSES,
  ...VALID_MATCH_STATUSES,
  'active', 'resolved',  // SOS umbrella
] as const;
```

---

## EF Changes (11 EFs)

### 1. sos-write
| Line | Current | Fix |
|---|---|---|
| 315 | `let req_status = "active"` | `let req_status = "pending"` |

### 2. partner-write
| Line | Current | Fix |
|---|---|---|
| 385 | `status: rec.status \|\| "active"` | `status: rec.status \|\| "pending"` |
| 444 | `status: rec.status \|\| "active"` | `status: rec.status \|\| "pending"` |
| 493 | `status: "active"` | `status: "pending"` |
| 386 | `ops_status: rec.ops_status \|\| null` | KEEP — writes to partner DB only |
| 445 | `ops_status: rec.ops_status \|\| null` | KEEP — writes to partner DB only |
| 669 | `ops_status: rec.ops_status \|\| null` | KEEP — writes to partner DB only |

### 3. sos-sync
| Line | Current | Fix |
|---|---|---|
| 248 | `status: status \|\| "active"` | `status: status \|\| "pending"` |
| 338 | `status: status \|\| "active"` | `status: status \|\| "pending"` |
| — | No ops_status references | ✅ Correct — never syncs ops_status |

### 4. match-engine (queries)
| Line | Current | Fix |
|---|---|---|
| 110 | `resource.status !== "active" && resource.status !== "available"` | `resource.status !== "approved"` |
| 143,154,176,182,189 | `.in("status", ["pending", "active"])` | `.in("status", ["pending", "approved"])` |
| 228 | `.in("status", ["proposed", "accepted", "connected", "in_progress"])` | `.in("status", ["proposed", "accepted", "active"])` |
| 355 | `.eq("status", "active")` | `.eq("status", "scored")` |
| 375 | `status: "active"` (match_candidates) | `status: "scored"` |
| 915 | `.in("status", ["proposed", "accepted", "connected", "in_progress"])` | `.in("status", ["proposed", "accepted", "active"])` |

### 5. sos-update (match lifecycle)
| Line | Current | Fix |
|---|---|---|
| 187 | `status: "connected"` | `status: "active"` (both parties consented) |
| 191 | `status: "citizen_consented"` | `status: "accepted"` |
| 195 | `status: "connected"` | `status: "active"` |
| 199 | `status: "partner_consented"` | `status: "accepted"` |
| 206 | `status: "in_progress"` | `status: "active"` (match active) |
| 208 | `resources.update status: "deployed"` | `resources.update status: "fulfilled"` |

### 6. match-transport
| Line | Current | Fix |
|---|---|---|
| 65 | `.in("status", ["active", "available"])` | `.in("status", ["approved"])` |
| 173 | `.in("status", ["proposed", "accepted", "connected", "in_progress"])` | `.in("status", ["proposed", "accepted", "active"])` |

### 7. crm-case-action
| Line | Current | Fix |
|---|---|---|
| 72 | `status: stage` (no validation) | Add: `if (!VALID_COORDINATION_STATUSES.includes(stage)) return error` |

### 8. partner-read
| Line | Current | Fix |
|---|---|---|
| 164 | `.in("status", ["active", "available", "ready"])` | `.in("status", ["approved"])` |
| 236 | `.in("status", ["active", "pending", "approved"])` | `.in("status", ["pending", "approved"])` |

### 9. crm-directory
| Line | Current | Fix |
|---|---|---|
| 261 | `.in("status", ["active", "in_progress", "pending", "approved", "matched"])` | `.in("status", ["pending", "approved", "matched"])` |

### 10. partner-update
| Line | Current | Fix |
|---|---|---|
| 155-162 | Validates `data.status` against ALL_COORD_STATUSES | ✅ Correct after ALL_COORD_STATUSES update |
| 166-167 | Writes `ops_status` to partner DB | KEEP — partner DB only |
| 193 | Syncs `ops_status` to SOS DB via sos-sync payload | REMOVE `ops_status` from sync payload |

### 11. crm-delivery
| Line | Current | Fix |
|---|---|---|
| 30 | `status: "pending"` | ✅ Correct |

---

## DB Migration SQL

### SOS DB
```sql
-- 1. Normalize request statuses
UPDATE requests SET status = 'pending' WHERE status = 'active';
UPDATE requests SET status = 'fulfilled' WHERE status IN ('delivered', 'completed');
-- approved stays approved, pending stays pending, fulfilled stays, closed stays

-- 2. Normalize resource statuses (old 7-stage → unified 6)
UPDATE resources SET status = 'pending' WHERE status = 'active';
UPDATE resources SET status = 'approved' WHERE status = 'available';
UPDATE resources SET status = 'matched' WHERE status = 'committed';
UPDATE resources SET status = 'in_progress' WHERE status = 'in_transit';
UPDATE resources SET status = 'fulfilled' WHERE status = 'deployed';
UPDATE resources SET status = 'closed' WHERE status = 'unavailable';
UPDATE resources SET status = 'approved' WHERE status = 'returned';
-- "ready" → approved
UPDATE resources SET status = 'approved' WHERE status = 'ready';

-- 3. Normalize match statuses
UPDATE matches SET status = 'accepted' WHERE status = 'citizen_consented';
UPDATE matches SET status = 'accepted' WHERE status = 'partner_consented';
UPDATE matches SET status = 'active' WHERE status = 'connected';
UPDATE matches SET status = 'active' WHERE status = 'in_progress';

-- 4. Normalize match_candidates
UPDATE match_candidates SET status = 'scored' WHERE status = 'active';

-- 5. Clear ops_status from SOS DB (it's partner-local only)
UPDATE requests SET ops_status = NULL WHERE ops_status IS NOT NULL;
UPDATE resources SET ops_status = NULL WHERE ops_status IS NOT NULL;
```

### ERV DB (same request/resource normalization, KEEP ops_status)
```sql
-- Normalize request statuses
UPDATE requests SET status = 'pending' WHERE status = 'active';
UPDATE requests SET status = 'fulfilled' WHERE status IN ('delivered', 'completed');

-- Normalize resource statuses
UPDATE resources SET status = 'pending' WHERE status = 'active';
UPDATE resources SET status = 'approved' WHERE status = 'available';
UPDATE resources SET status = 'matched' WHERE status = 'committed';
UPDATE resources SET status = 'in_progress' WHERE status = 'in_transit';
UPDATE resources SET status = 'fulfilled' WHERE status = 'deployed';
UPDATE resources SET status = 'closed' WHERE status = 'unavailable';
UPDATE resources SET status = 'approved' WHERE status = 'returned';

-- Normalize match statuses
UPDATE matches SET status = 'accepted' WHERE status = 'citizen_consented';
UPDATE matches SET status = 'accepted' WHERE status = 'partner_consented';
UPDATE matches SET status = 'active' WHERE status = 'connected';
UPDATE matches SET status = 'active' WHERE status = 'in_progress';

-- DO NOT clear ops_status — it's ERV's operational field
```

### DB Triggers
```sql
-- Scoring triggers: change from "active" to "approved"
-- (scoring runs when coordinator approves, not on raw intake)
ALTER TRIGGER score_on_request_insert ... WHEN (NEW.status = 'approved');
ALTER TRIGGER score_on_request_active ... WHEN (NEW.status = 'approved');
ALTER TRIGGER score_on_resource_insert ... WHEN (NEW.status = 'approved');
ALTER TRIGGER score_on_resource_available ... WHEN (NEW.status = 'approved');
```

### Add CHECK constraints (both DBs)
```sql
ALTER TABLE requests ADD CONSTRAINT chk_request_status 
  CHECK (status IN ('pending','approved','matched','in_progress','fulfilled','closed'));
ALTER TABLE resources ADD CONSTRAINT chk_resource_status 
  CHECK (status IN ('pending','approved','matched','in_progress','fulfilled','closed'));
ALTER TABLE matches ADD CONSTRAINT chk_match_status 
  CHECK (status IN ('proposed','accepted','active','completed','declined','expired'));
ALTER TABLE soses ADD CONSTRAINT chk_sos_status 
  CHECK (status IN ('active','resolved','closed'));
```

---

## Frontend Changes

### display-constants.ts
```typescript
export const BUCKETS = [
  { id: "pending", label: "Pending", accent: "#EF4E4B", statuses: ["pending"] },
  { id: "approved", label: "Approved", accent: "#89CFF0", statuses: ["approved", "matched"] },
  { id: "in_progress", label: "In Progress", accent: "#89CFF0", statuses: ["in_progress"] },
  { id: "fulfilled", label: "Fulfilled", accent: "#34D399", statuses: ["fulfilled", "closed"] },
];
```

Same columns for Cases, Requests, AND Resources tabs. No more different bucket names per entity type.

---

## Execution Order

1. ✏️ Update `_shared/statuses.ts`
2. ✏️ Fix all 11 EFs (line-by-line changes above)
3. 🔨 Deploy all updated EFs to SOS DB
4. 🔨 Deploy updated `partner-write` + `partner-update` to ERV DB
5. 📊 Run SOS DB migration SQL
6. 📊 Run ERV DB migration SQL
7. 📊 Update DB triggers (scoring → approved)
8. 📊 Add CHECK constraints (both DBs)
9. ✏️ Update frontend display-constants.ts
10. ✅ Verify: query each table, confirm only 6 canonical statuses exist
11. 📝 Update product bible STATUS_NORMALIZATION doc → COMPLETED

## Estimated Effort
- EF fixes: 1.5 hours (mostly single-line changes, 11 files)
- SQL migration: 30 minutes
- Trigger + constraints: 30 minutes
- Frontend: 15 minutes
- Verification + deploy: 30 minutes
- **Total: ~3 hours**
