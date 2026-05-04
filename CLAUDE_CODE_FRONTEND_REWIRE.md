# Frontend EF Rewire — Claude Code Task Spec

> Created: 2026-05-04
> Owner: Henry-SOS / Claude Code
> Repo: SOS-Help-The-Helper/sos-frontend
> Problem: lib/api.ts uses 13 wrong EF names. Manage + Match pages use direct PostgREST instead of EFs.
> Goal: All frontend data flows through the correct deployed Edge Functions.

## Context

The backend was rebuilt on 2026-05-03. All EFs were renamed to a universal pattern:
- `sos-write` (intake), `sos-read` (queries), `sos-update` (state changes), `sos-notify` (notifications)
- Old EFs like `intake-write`, `match-respond`, `query-matches` no longer exist

The frontend (`lib/api.ts`) still calls the OLD EF names. The pages work partially because some use direct PostgREST (`db.from()`) which bypasses the EF layer.

## Deployed EFs (the source of truth)

```
SOS DB (rtduqguwhkczexnoawej):
  sos-write           — universal write (requests, resources, reports)
  sos-read            — universal read (4 scopes: my_records, org_records, impact, area)
  sos-update          — universal state changes + match lifecycle
  sos-notify          — notification dispatcher
  sos-sync            — partner data federation
  match-request       — matching engine (called by DB triggers, not frontend)
  match-transport     — driver matching (called by match-request, not frontend)
  erv-match-propose   — ERV 3-way matching
  resource-search     — 211 + SOS resource search
  address-autocomplete — Google Places
  alerts-feed         — NWS weather alerts
  fema-check          — FEMA eligibility
  image-analyze       — Gemini Vision for photos
  sitrep-write        — EMS field reports
  score-compute       — SOS Score calculation
  community-messages  — location-scoped chat
  partner-onboard     — org registration
  referral-track      — referral chain tracking
  inventory-query     — facility inventory reads
  inventory-write     — facility inventory writes
  cron-process-notifications — batch processor (not called by frontend)
```

## The Name Mapping

| lib/api.ts calls | Should call | Input change needed? |
|---|---|---|
| `respond-match` | `sos-update` | YES: `{ match_id, response }` → `{ actor: {type:"citizen"}, record_type:"match", record_id, action: response }` |
| `fulfill-match` | `sos-update` | YES: `{ match_id }` → `{ actor: {type:"citizen"}, record_type:"match", record_id, action:"deliver" }` |
| `consent-flow` | `sos-update` | YES: → `{ actor: {type:"citizen"}, record_type:"match", record_id, action:"consent" }` |
| `query-matches` | `sos-read` | YES: → `{ actor: {type:"citizen", id: person_id}, scope:"my_records", include:["matches"] }` |
| `query-partner` | `sos-read` | YES: → `{ actor: {type:"partner", id: org_id}, scope:"org_records" }` |
| `submit-intake` | `sos-write` | YES: reshape to sos-write format (see sos-write spec below) |
| `submit-sitrep` | `sitrep-write` | Name only |
| `onboard-partner` | `partner-onboard` | Name only |
| `get-alerts` | `alerts-feed` | Name only |
| `check-fema` | `fema-check` | Name only |
| `analyze-image` | `image-analyze` | Name only |
| `get-messages` | `community-messages` | Name + method may differ |
| `post-message` | `community-messages` | Name + payload shape |
| `get-notifications` | `sos-notify` | Name + payload shape |
| `query-inventory` | `inventory-query` | Name only |
| `write-inventory` | `inventory-write` | Name only |

EFs that are CORRECT already: `resource-search`, `erv-query`, `erv-update`, `erv-match-propose`

---

## TASKS (run in order, one Claude Code run per task)

### Task 1: Update lib/api.ts — Fix EF names (simple renames)

Read: `lib/api.ts`

Change these efCall function names (name-only fixes, no payload changes):
```
'submit-sitrep'    → 'sitrep-write'
'onboard-partner'  → 'partner-onboard'
'get-alerts'       → 'alerts-feed'
'check-fema'       → 'fema-check'
'analyze-image'    → 'image-analyze'
'query-inventory'  → 'inventory-query'
'write-inventory'  → 'inventory-write'
```

That's 7 simple string replacements in `efCall()` calls.

DO NOT change any payload shapes or response handling in this task.

Acceptance: `grep -c "submit-sitrep\|onboard-partner\|get-alerts\|check-fema\|analyze-image\|query-inventory\|write-inventory" lib/api.ts` returns 0.

---

### Task 2: Update lib/api.ts — Rewire match + intake to sos-read/sos-write/sos-update

Read: `lib/api.ts`

Replace these functions:

```typescript
// OLD: queryMatches
queryMatches: (data: Record<string, unknown>) =>
    efCall('query-matches', data),

// NEW: queryMatches → sos-read with my_records scope
queryMatches: (data: Record<string, unknown>) =>
    efCall('sos-read', {
      actor: { type: 'citizen', id: data.person_id || data.request_ids?.[0] },
      scope: 'my_records',
      include: ['matches'],
      ...data,
    }),

// OLD: respondMatch
respondMatch: (matchId: string, response: 'accept' | 'decline', note?: string) =>
    efCall('respond-match', { match_id: matchId, response, note }),

// NEW: respondMatch → sos-update
respondMatch: (matchId: string, response: 'accept' | 'decline', note?: string) =>
    efCall('sos-update', {
      actor: { type: 'citizen' },
      record_type: 'match',
      record_id: matchId,
      action: response,
      ...(note ? { data: { reason: note } } : {}),
    }),

// OLD: fulfillMatch
fulfillMatch: (matchId: string, data: Record<string, unknown>) =>
    efCall('fulfill-match', { match_id: matchId, ...data }),

// NEW: fulfillMatch → sos-update
fulfillMatch: (matchId: string, data: Record<string, unknown>) =>
    efCall('sos-update', {
      actor: { type: 'citizen' },
      record_type: 'match',
      record_id: matchId,
      action: 'deliver',
      data,
    }),

// OLD: consentFlow
consentFlow: (data: Record<string, unknown>) =>
    efCall('consent-flow', data),

// NEW: consentFlow → sos-update
consentFlow: (data: Record<string, unknown>) =>
    efCall('sos-update', {
      actor: { type: 'citizen' },
      record_type: 'match',
      record_id: data.match_id,
      action: 'consent',
      data,
    }),

// OLD: submitIntake
submitIntake: (data: Record<string, unknown>) =>
    efCall('submit-intake', data),

// NEW: submitIntake → sos-write
submitIntake: (data: Record<string, unknown>) =>
    efCall('sos-write', data),

// OLD: queryPartner
queryPartner: (orgId: string, queryType: string) =>
    efCall('query-partner', { org_id: orgId, query_type: queryType }),

// NEW: queryPartner → sos-read
queryPartner: (orgId: string, queryType: string) =>
    efCall('sos-read', {
      actor: { type: 'partner', id: orgId },
      scope: 'org_records',
      query_type: queryType,
    }),

// OLD: partnerReferral
partnerReferral: (data: Record<string, unknown>) =>
    efCall('partner-referral', data),

// NEW: partnerReferral → referral-track
partnerReferral: (data: Record<string, unknown>) =>
    efCall('referral-track', data),

// OLD: getNotifications
getNotifications: (orgId: string) =>
    efCall('get-notifications', { org_id: orgId }, { method: 'GET' }),

// NEW: getNotifications → sos-notify (POST, not GET)
getNotifications: (orgId: string) =>
    efCall('sos-notify', { org_id: orgId, action: 'list' }),

// OLD: getMessages / postMessage
getMessages: (channelId: string) =>
    efCall('get-messages', { channel_id: channelId }, { method: 'GET' }),
postMessage: (channelId: string, text: string) =>
    efCall('post-message', { channel_id: channelId, text }),

// NEW: both → community-messages
getMessages: (channelId: string) =>
    efCall('community-messages', { channel_id: channelId, action: 'list' }),
postMessage: (channelId: string, text: string) =>
    efCall('community-messages', { channel_id: channelId, action: 'post', text }),
```

Acceptance: `grep -c "query-matches\|respond-match\|fulfill-match\|consent-flow\|submit-intake\|query-partner\|partner-referral\|get-notifications\|get-messages\|post-message" lib/api.ts` returns 0.

---

### Task 3: Fix manage page — Replace direct PostgREST with sos-read

Read: `app/(citizen)/c/manage/page.tsx`

The `loadData` function (around line 52) currently uses `db.from('requests')` and `db.from('resources')` directly. Replace with `api.efCall('sos-read', ...)`:

Replace the loadData body:
```typescript
const loadData = useCallback(async (pid: string) => {
  const [scoreData, sosData] = await Promise.all([
    getSOSScore(pid),
    api.efCall<any>('sos-read', {
      actor: { type: 'citizen', id: pid },
      scope: 'my_records',
      include: ['matches'],
    }),
  ]);
  setScore(scoreData);
  setRequests(sosData?.requests || []);
  setResources(sosData?.resources || []);
  // Matches come from sos-read response
  const allMatches = sosData?.matches || [];
  setMatches(allMatches);
}, []);
```

Also replace the direct `db.from()` update calls later in the file (for status changes, editing requests/resources) with `api.efCall('sos-update', ...)`:

For status changes (around line 116):
```typescript
// OLD: db.from(table).update({ status: newStatus }).eq('id', id)
// NEW:
await api.efCall('sos-update', {
  actor: { type: 'citizen', id: personId },
  record_type: table === 'requests' ? 'request' : 'resource',
  record_id: id,
  action: 'update',
  data: { status: newStatus },
});
```

For request edits (around line 130):
```typescript
// OLD: db.from('requests').update({...}).eq('id', ...)
// NEW:
await api.efCall('sos-update', {
  actor: { type: 'citizen', id: personId },
  record_type: 'request',
  record_id: editingRequest.id,
  action: 'update',
  data: { details_sanitized: editingRequest.details_sanitized, urgency: editingRequest.urgency, household_size: editingRequest.household_size },
});
```

Same pattern for resource edits (around line 149).

Also replace the `match-respond` fetch calls at lines 449 and 465 with `api.respondMatch(matchId, 'accept')` and `api.respondMatch(matchId, 'decline')`.

Remove the `db` import if no longer used.

Acceptance: `grep -c "db.from\|match-respond" app/\(citizen\)/c/manage/page.tsx` returns 0.

---

### Task 4: Fix match page — Replace match-respond with sos-update

Read: `app/(citizen)/c/match/page.tsx`

Replace the direct fetch to `match-respond` EF (around line 218):
```typescript
// OLD:
const res = await fetch(`${SUPABASE_URL}/functions/v1/match-respond`, {
  method: 'POST',
  headers: { ... },
  body: JSON.stringify({ match_id: proposal.id, response: decision, ... }),
});

// NEW:
const res = await fetch(`${SUPABASE_URL}/functions/v1/sos-update`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
  },
  body: JSON.stringify({
    actor: { type: 'citizen' },
    record_type: 'match',
    record_id: proposal.id,
    action: decision,  // 'accept' or 'decline'
  }),
});
```

Also replace the `db.from('requests')` and `db.from('resources')` calls (lines 98-99) that fetch the citizen's record IDs. These should use sos-read:
```typescript
// Get citizen's request and resource IDs via sos-read
const sosData = await api.efCall<any>('sos-read', {
  actor: { type: 'citizen', id: personId },
  scope: 'my_records',
});
const myRequestIds = (sosData?.requests || []).map((r: any) => r.id);
const myResourceIds = (sosData?.resources || []).map((r: any) => r.id);
```

Import `api` from `@/lib/api` if not already imported.

Acceptance: `grep -c "match-respond\|db.from" app/\(citizen\)/c/match/page.tsx` returns 0.

---

### Task 5: Verify build

Run: `npx next build`

Fix any TypeScript errors from the changes. The most likely issues:
- Response shape changes (sos-read returns `{ requests, resources, matches }` not arrays directly)
- Missing imports (api not imported in pages that now use it)
- Type mismatches on sos-update response vs old match-respond response

Acceptance: Build succeeds with zero errors.

---

## DO NOT TOUCH

- `lib/supabase-client.ts` — still needed for realtime subscriptions
- `lib/citizen-api.ts` — SOS Score calculation, separate from main API
- Any component files — only change page.tsx and lib/api.ts
- `erv-query`, `erv-update`, `erv-match-propose` calls — these still exist and are correct
- `resource-search` — already correct
