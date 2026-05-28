# UX Fix Plan — SOS Partner Portal
**Source:** UX_AUDIT_2026-05-27.md  
**Created:** 2026-05-27  
**Batches:** 6 | **Total estimated time:** ~3 days

---

## Dependency Order

```
Batch 1 (quick wins) → can run anytime, no deps
Batch 3 (error handling) → no deps, but run after Batch 1 so toast is confirmed present
Batch 5 (critical) → no deps on other batches
Batch 6 (a11y) → no deps
Batch 2 (mobile layout) → no deps, but benefits from Batch 1 touch-target fixes already landed
Batch 4 (consolidation) → run LAST; depends on Batches 1+3 being done so DRY extraction is stable
```

---

## Batch 1 — Quick Wins
**15 items · <5 min each · Run all in one Claude Code session**  
**Estimated time:** 1.5 hours total  
**Files touched:** `app/app/cases/page.tsx`, `app/app/calendar/page.tsx`, `app/app/transport/page.tsx`, `app/app/volunteers/page.tsx`, `app/app/command/page.tsx`, `app/app/reports/page.tsx`, `app/app/map/page.tsx`, `app/app/directory/resource/[id]/page.tsx`

### Fix 1 — Dead CSS fragment [VISUAL]
**File:** `app/app/cases/page.tsx` ~line 545  
**Before:**
```tsx
className={`snap-start rounded-2xl border p-3 transition ${ "" } ${...}`}
```
**After:**
```tsx
className={`snap-start rounded-2xl border p-3 transition ${...}`}
```
**Verify:** No TypeScript error; grep for `${ "" }` returns 0 results.

---

### Fix 2 — Modal close button touch target [MOBILE]
**File:** `app/app/cases/page.tsx` ~line 179  
**Before:**
```tsx
className="w-7 h-7 rounded-md hover:bg-white/8 ..."
```
**After:**
```tsx
className="w-11 h-11 rounded-md hover:bg-white/8 ..."
```
**Verify:** Button element is 44×44px in browser devtools.

---

### Fix 3 — Modal close button aria-label [A11Y]
**File:** `app/app/cases/page.tsx` ~line 178  
**Before:**
```tsx
<button onClick={onClose}><X size={14} /></button>
```
**After:**
```tsx
<button onClick={onClose} aria-label="Close"><X size={14} /></button>
```
**Verify:** `aria-label` visible in DevTools Accessibility panel.

---

### Fix 4 — Calendar hardcoded week [UX]
**File:** `app/app/calendar/page.tsx` lines 27–35  
**Before:**
```tsx
const days = [
  { label: "Mon", date: "Mar 16" },
  { label: "Tue", date: "Mar 17" },
  { label: "Wed", date: "Mar 18" },
  { label: "Thu", date: "Mar 19" },
  { label: "Fri", date: "Mar 20" },
  { label: "Sat", date: "Mar 21" },
  { label: "Sun", date: "Mar 22" },
];
```
**After:**
```tsx
const today = new Date();
const days = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(today);
  d.setDate(today.getDate() - today.getDay() + 1 + i); // Mon–Sun
  return {
    label: d.toLocaleDateString('en', { weekday: 'short' }),
    date: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
  };
});
```
**Verify:** Calendar header shows the current week (week of 2026-05-27 = May 25–31).

---

### Fix 5 — Calendar optimistic rollback on failure [UX]
**File:** `app/app/calendar/page.tsx` ~line 63–90  
**Before:** No rollback on API failure after optimistic add.  
**After:** In the `.catch()` of the `addEvent` API call:
```tsx
.catch(() => {
  setItems(prev => prev.filter(e => e.id !== optimisticId));
  toast.error("Failed to create event");
});
```
**Verify:** Simulate API failure (wrong key); optimistic entry disappears and toast fires.

---

### Fix 6 — Calendar API error toast [UX]
**File:** `app/app/calendar/page.tsx` ~lines 53–55  
**Before:**
```tsx
.catch(() => {
  // fallback: keep seedEvents
});
```
**After:**
```tsx
.catch(() => toast.error("Failed to load events"));
```
**Verify:** Toast appears when API returns error.

---

### Fix 7 — Transport fetch silent catch [UX]
**File:** `app/app/transport/page.tsx` ~lines 73, 80  
**Before:**
```tsx
.catch(() => {})
```
**After:**
```tsx
.catch(() => toast.error("Failed to load assignments"))
```
**Verify:** Toast fires on network failure; no silent empty list.

---

### Fix 8 — Transport KPI zeros during load [UX]
**File:** `app/app/transport/page.tsx` ~line 134  
**Before:** `useMemo` computes KPIs from `assignments` immediately (shows 0/0/0 while loading).  
**After:** Return null-like values while loading:
```tsx
const kpis = useMemo(() => {
  if (loading) return { active: "—", inTransit: "—", delivered: "—" };
  // ... existing logic
}, [assignments, loading]);
```
**Verify:** KPI strip shows `—` instead of `0` on initial load.

---

### Fix 9 — Transport List/Map toggle touch target [MOBILE]
**File:** `app/app/transport/page.tsx` ~lines 149–154  
**Before:** `h-7` (28px) on toggle buttons.  
**After:** `h-10` (40px) — a reasonable compromise that fits the compact header.
**Verify:** Buttons measure ≥40px tall in DevTools.

---

### Fix 10 — Volunteers fetch silent catch [UX]
**File:** `app/app/volunteers/page.tsx` ~line 70  
**Before:**
```tsx
.catch(() => {});
```
**After:**
```tsx
.catch(() => toast.error("Failed to load volunteers"))
```
**Verify:** Toast fires on error; page does not silently show empty list.

---

### Fix 11 — Volunteer form input types [MOBILE]
**File:** `app/app/volunteers/page.tsx` (add volunteer form)  
**Before:**
```tsx
<input type="text" ... />  {/* email field */}
<input type="text" ... />  {/* phone field */}
```
**After:**
```tsx
<input type="email" ... />
<input type="tel" ... />
```
**Verify:** Mobile keyboard switches to email/numeric layout on focus.

---

### Fix 12 — Volunteer skill filter aria-pressed [A11Y]
**File:** `app/app/volunteers/page.tsx`  
**Before:**
```tsx
<button onClick={() => setSkillFilter(skill)} className={...}>
```
**After:**
```tsx
<button
  onClick={() => setSkillFilter(skill)}
  aria-pressed={skillFilter === skill}
  className={...}
>
```
**Verify:** `aria-pressed="true"` appears on active pill in DevTools.

---

### Fix 13 — Command page DEMO_ORG_ID removal [UX]
**File:** `app/app/command/page.tsx` lines 11, 23  
**Before:**
```tsx
const DEMO_ORG_ID = "9ad0f2ad-7789-47a8-bfba-0ae3382c86cc";
const orgId = authOrgId || DEMO_ORG_ID;
```
**After:** Delete the `DEMO_ORG_ID` constant entirely. Change the usage to:
```tsx
const orgId = authOrgId;
if (!orgId) return <div className="p-6 text-white/50">Loading…</div>;
```
Return early before any data fetch if `orgId` is null.  
**Verify:** If `authOrgId` is undefined, page shows loading state rather than querying production ERV data.

---

### Fix 14 — Command StatPill undefined during load [UX]
**File:** `app/app/command/page.tsx` ~lines 55–59  
**Before:**
```tsx
value={stats?.openRequests}
value={stats?.activeMatches}
// etc.
```
**After:**
```tsx
value={stats?.openRequests ?? "—"}
value={stats?.activeMatches ?? "—"}
// repeat for all StatPill value props
```
**Verify:** Stats strip shows `—` dashes while loading, not blank/undefined.

---

### Fix 15 — Map 100vh → 100dvh [MOBILE]
**File:** `app/app/map/page.tsx` (and `page.production.tsx` if it has the same)  
**Before:**
```tsx
style={{ height: 'calc(100vh - 56px)' }}
// or className="h-[calc(100vh-56px)]"
```
**After:**
```tsx
style={{ height: 'calc(100dvh - 56px)' }}
// or className="h-[calc(100dvh-56px)]"
```
**Verify:** Map bottom edge is not obscured by iOS Safari address bar when scrolling.

---

### Batch 1 Acceptance Criteria
- `grep -rn 'DEMO_ORG_ID' app/` → 0 results
- `grep -rn '\${ "" }' app/` → 0 results
- `grep -rn 'catch(() => {})' app/app/transport app/app/volunteers app/app/calendar` → 0 results
- Calendar header shows week containing today's date
- All 15 StatPill values never render "undefined"
- TypeScript strict passes on all changed files

---

## Batch 2 — Mobile Layout Fixes
**Estimated time:** Half day (4 hours)  
**Dependencies:** None (but landing Batch 1 first is nice — touch target fixes already done)  
**Files touched:** `app/app/match/page.tsx`, `app/app/cases/page.tsx`, `app/app/calendar/page.tsx`

### 2A — Match board mobile column switcher [MOBILE]
**File:** `app/app/match/page.tsx` ~line 138`

The board grid has `min-w-[1100px]` with no mobile fallback. Copy the column-switcher pill pattern from `cases/page.tsx:503–519`.

**What to build:**
1. Add `const [mobileCol, setMobileCol] = useState(columns[0].id)` state.
2. Add a pill strip above the board (visible only on `<md`):
```tsx
<div className="flex gap-2 overflow-x-auto pb-2 md:hidden">
  {columns.map(col => (
    <button
      key={col.id}
      role="tab"
      aria-selected={mobileCol === col.id}
      aria-controls={`match-col-${col.id}`}
      onClick={() => setMobileCol(col.id)}
      className={`shrink-0 px-3 h-8 rounded-full text-xs font-medium border transition
        ${mobileCol === col.id
          ? 'bg-white text-[#0F1E2B] border-white'
          : 'bg-white/5 text-white/60 border-white/10'}`}
    >
      {col.label}
    </button>
  ))}
</div>
```
3. On mobile, only render the column matching `mobileCol`. On desktop, render all columns.
4. Keep `min-w-[1100px]` inside a `hidden md:grid` wrapper; add a `md:hidden` single-column view.

**Accept/Decline button touch targets:**
- Lines 556, 560: change `h-9` → `h-11` on Accept and Decline buttons.

**Verify:**
- On 375px viewport, match board shows single column with pill switcher.
- Accept/Decline buttons measure 44px tall.
- `md:` breakpoint restores full 5-column board.

---

### 2B — Cases kanban swipe hint [MOBILE]
**File:** `app/app/cases/page.tsx` ~line 503

Add a one-time swipe hint below the mobile column switcher pills:
```tsx
<p className="text-[10px] text-white/30 text-center mt-1 md:hidden">
  ← swipe columns →
</p>
```

**Verify:** Hint text visible below the pill strip on 375px viewport. Hidden on desktop.

---

### 2C — Calendar 7-col grid mobile alternative [MOBILE]
**File:** `app/app/calendar/page.tsx`

The 7-column week grid is ~53px per column on 375px — too narrow for event names.

**What to build:**
1. Add `const [activeDay, setActiveDay] = useState(0)` (0 = today's weekday index).
2. Add a horizontal day-picker strip (mobile only):
```tsx
<div className="flex gap-1 overflow-x-auto md:hidden pb-2">
  {days.map((d, i) => (
    <button
      key={i}
      onClick={() => setActiveDay(i)}
      className={`shrink-0 flex flex-col items-center px-3 py-1.5 rounded-lg text-xs
        ${activeDay === i ? 'bg-white text-[#0F1E2B]' : 'bg-white/5 text-white/60'}`}
    >
      <span>{d.label}</span>
      <span className="font-medium">{d.date.split(' ')[1]}</span>
    </button>
  ))}
</div>
```
3. On mobile, render only the column for `days[activeDay]`.
4. Keep the full 7-column `grid-cols-7` inside `hidden md:grid`.

**Verify:**
- 375px viewport: single-day column view with horizontal day-picker.
- Desktop: full 7-column grid.
- Clicking a day tab switches the column.

---

### Batch 2 Acceptance Criteria
- Match board on 375px: no horizontal scroll; pill switcher present; correct column shown.
- Cases board on 375px: swipe hint visible.
- Calendar on 375px: single-day view with day-picker strip.
- All three pages have zero TypeScript errors.
- Desktop layout unchanged on all three pages.

---

## Batch 3 — Error Handling + Empty States
**Estimated time:** Half day (4 hours)  
**Dependencies:** None (Batch 1 fixes `catch(() => {})` on transport/volunteers/calendar — Batch 3 handles the remaining pages and adds structured empty states)  
**Files touched:** `app/app/match/page.tsx`, `app/app/cases/[id]/page.tsx`, `app/app/command/[id]/page.tsx`, `app/app/inventory/page.tsx`, `app/app/reports/page.tsx`, `app/app/directory/org/[id]/page.tsx`, `app/app/directory/person/[id]/page.tsx`, `app/app/directory/volunteer/[id]/page.tsx`

### 3A — Match board error state
**File:** `app/app/match/page.tsx` ~lines 90–102

Add an `error` state to `MatchBoard`:
```tsx
const [error, setError] = useState(false);

// in fetch .catch():
.catch(() => { setError(true); toast.error("Failed to load matches"); });

// in render, before the board:
if (error) return (
  <div className="flex flex-col items-center gap-3 py-16 text-white/40">
    <p>Failed to load matches.</p>
    <button onClick={() => { setError(false); fetchMatches(); }}
      className="text-sm text-white/60 underline">
      Retry
    </button>
  </div>
);
```

---

### 3B — Match workbench candidate loading spinner
**File:** `app/app/match/page.tsx` — `MatchWorkbench` component, candidates panel

When a case is selected and candidates are being fetched, the right panel is blank.

Add `const [candidatesLoading, setCandidatesLoading] = useState(false)` and wrap the fetch:
```tsx
setCandidatesLoading(true);
fetchCandidates(caseId)
  .then(setCandidates)
  .catch(() => toast.error("Failed to fetch candidates"))
  .finally(() => setCandidatesLoading(false));
```
In the candidates panel render:
```tsx
{candidatesLoading ? (
  <div className="flex items-center justify-center py-12 text-white/40 text-sm">
    Loading candidates…
  </div>
) : candidates.length === 0 ? (
  <div className="text-white/30 text-sm text-center py-12">
    No candidates found for this case.
  </div>
) : (
  // existing candidate list
)}
```

---

### 3C — Case detail error state
**File:** `app/app/cases/[id]/page.tsx`

After the fetch resolves with `null` (or rejects), show:
```tsx
if (!loading && !caseData) return (
  <div className="flex flex-col items-center gap-3 py-20 text-white/40">
    <p>Case not found or failed to load.</p>
    <a href="/app/cases" className="text-sm underline text-white/60">Back to Cases</a>
  </div>
);
```

---

### 3D — Incident detail error state
**File:** `app/app/command/[id]/page.tsx`

Same pattern as 3C — render an error card when `incident === null` after loading.

---

### 3E — Inventory loading state + add-button feedback
**File:** `app/app/inventory/page.tsx`

1. Add `const [loading, setLoading] = useState(true)`.
2. Render a skeleton table (3 rows of `animate-pulse bg-white/5 h-10 rounded`) while loading.
3. Change submit button text:
```tsx
{addSubmitting ? "Adding…" : "Add item"}
```

---

### 3F — Reports loading state + error handling
**File:** `app/app/reports/page.tsx` ~lines 67–80

1. Add `const [loading, setLoading] = useState(true)`.
2. Add `.catch(() => toast.error("Failed to load reports"))`.
3. Add `.finally(() => setLoading(false))`.
4. Render skeleton KPI cards while `loading === true`:
```tsx
{loading ? (
  <div className="grid grid-cols-2 gap-3">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="bg-white/5 rounded-lg h-16 animate-pulse" />
    ))}
  </div>
) : (
  // existing KPI grid
)}
```

---

### 3G — Directory org/[id] error state
**File:** `app/app/directory/org/[id]/page.tsx` ~lines 43–48

Change:
```tsx
.catch(() => {})
```
To:
```tsx
.catch(() => { setError(true); toast.error("Failed to load organization"); })
```
Add `error` state → render "Failed to load organization" card with back link.

---

### 3H — Person/Volunteer detail null guards
**File:** `app/app/directory/person/[id]/page.tsx`, `app/app/directory/volunteer/[id]/page.tsx`, `app/app/volunteers/page.tsx`

Replace all unguarded `.map()` calls on potentially-null arrays:
```tsx
// Before:
person.credentials.map(...)
person.skills.map(...)
vol.deployments.map(...)

// After:
(person.credentials ?? []).map(...)
(person.skills ?? []).map(...)
(vol.deployments ?? []).map(...)
```
Also guard `vol.credentials`, `vol.availability`, and any other fields from `volunteerDetails` that are accessed in the drawer but not present in the mapped type.

---

### Batch 3 Acceptance Criteria
- `grep -rn '\.catch(() => {})' app/app/` → 0 results
- All detail pages show an error card (not blank) when API returns null.
- Reports page shows skeleton cards during load.
- Inventory "Add item" button says "Adding…" while submitting.
- Volunteer drawer does not throw on `credentials.map()` with live data.
- TypeScript strict passes on all changed files.

---

## Batch 4 — Component Consolidation
**Estimated time:** Half day (4 hours)  
**Dependencies:** Batch 1 and Batch 3 must be done first (stable baseline before extracting shared logic)  
**Files touched:** `app/app/cases/page.tsx`, `lib/use-api-fetch.ts` (new), `app/app/inventory/page.tsx`, `app/app/reports/page.tsx`, `app/app/volunteers/page.tsx`

### 4A — Extract `mapCasesToCards` DRY function
**File:** `app/app/cases/page.tsx` lines 294–323 and 420–445

The case-mapping logic is duplicated between the initial fetch and `refreshCases`. Extract it:
```tsx
// At module level (above the component):
function mapCasesToCards(items: any[]): Card[] {
  return items.map(item => ({
    id: item.id,
    // ... full mapping logic from lines 294–323
  }));
}
```
Replace both usages with `mapCasesToCards(items)`.

**Verify:** `refreshCases` and initial load produce identical card shapes. No behavior change.

---

### 4B — Merge 4 mount useEffects into Promise.all
**File:** `app/app/cases/page.tsx` ~lines 294, 326, 343, 360

**Before:** Four separate `useEffect` calls each firing independently.  
**After:** Single `useEffect` with `Promise.all`:
```tsx
useEffect(() => {
  setLoading(true);
  Promise.all([
    api.fetchCases(),
    api.fetchRequests(),
    api.fetchResources(),
    api.fetchReports(),
  ])
    .then(([cases, requests, resources, reports]) => {
      setCases(mapCasesToCards(cases));
      setRequests(requests);
      setResources(resources);
      setReports(reports);
    })
    .catch(() => toast.error("Failed to load cases"))
    .finally(() => setLoading(false));
}, []);
```

**Verify:** Network tab shows 4 requests firing simultaneously (not sequentially). Page loads same data.

---

### 4C — Create `useApiFetch` shared hook
**File:** `lib/use-api-fetch.ts` (new file)

Create a shared hook per the systemic recommendation in the audit:
```tsx
'use client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner'; // or whichever toast lib is used

export function useApiFetch<T>(
  fetcher: () => Promise<T>,
  errorMsg: string,
  deps: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const run = () => {
    setLoading(true);
    setError(false);
    fetcher()
      .then(setData)
      .catch(() => { setError(true); toast.error(errorMsg); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { run(); }, deps);

  return { data, loading, error, refetch: run };
}
```

Use this hook in `reports/page.tsx`, `inventory/page.tsx`, and `volunteers/page.tsx` to replace the manual `useEffect` + catch boilerplate added in Batch 3.

**Verify:** All three pages retain same behavior. TypeScript strict passes. No new runtime errors.

---

### Batch 4 Acceptance Criteria
- `grep -rn 'mapCasesToCards' app/app/cases/page.tsx` → exactly 1 definition + 2 usages.
- Cases page network tab: 4 requests fire in parallel on mount.
- `lib/use-api-fetch.ts` exists and is used in at least 3 page files.
- No duplicate `useEffect(() => { api.fetch... }, [])` patterns remain in the files touched.
- Full TypeScript strict check passes.

---

## Batch 5 — Critical Individual Fixes
**Estimated time:** 4 hours  
**Dependencies:** None (each fix is independent)  
**Files touched:** `app/app/transport/page.tsx`, `app/app/command/page.tsx`

### 5A — Replace `window.prompt()` with inline form [MOBILE]
**File:** `app/app/transport/page.tsx` ~lines 122–131

**Current broken behavior:**
```tsx
const description = window.prompt("Describe the issue:");
if (description) { api.reportIssue(assignmentId, description); }
```

**Fix:** Add state for the issue form, replace with an inline modal/bottom sheet:

1. Add state:
```tsx
const [issueFormId, setIssueFormId] = useState<string | null>(null);
const [issueText, setIssueText] = useState('');
const [issueSubmitting, setIssueSubmitting] = useState(false);
```

2. Replace `window.prompt` call:
```tsx
// Before: window.prompt(...)
// After:
setIssueFormId(assignmentId);
setIssueText('');
```

3. Add the issue form modal (rendered when `issueFormId !== null`):
```tsx
{issueFormId && (
  <div className="fixed inset-0 z-50 flex items-end bg-black/60"
       onClick={() => setIssueFormId(null)}>
    <div className="w-full bg-[#0F1E2B] border-t border-white/10 p-4 space-y-3"
         onClick={e => e.stopPropagation()}>
      <p className="text-sm font-medium text-white">Report Issue</p>
      <textarea
        value={issueText}
        onChange={e => setIssueText(e.target.value)}
        placeholder="Describe the issue…"
        rows={3}
        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm
                   text-white placeholder-white/30 resize-none focus:outline-none
                   focus:border-white/30"
        autoFocus
      />
      <div className="flex gap-2 justify-end">
        <button onClick={() => setIssueFormId(null)}
          className="h-10 px-4 text-sm text-white/60 rounded-lg hover:bg-white/5">
          Cancel
        </button>
        <button
          disabled={!issueText.trim() || issueSubmitting}
          onClick={async () => {
            setIssueSubmitting(true);
            try {
              await api.reportIssue(issueFormId, issueText.trim());
              toast.success("Issue reported");
              setIssueFormId(null);
            } catch {
              toast.error("Failed to report issue");
            } finally {
              setIssueSubmitting(false);
            }
          }}
          className="h-10 px-4 text-sm bg-[#EF4E4B] text-white rounded-lg
                     disabled:opacity-40 font-medium">
          {issueSubmitting ? "Sending…" : "Submit"}
        </button>
      </div>
    </div>
  </div>
)}
```

4. Add `autoComplete` to origin/destination inputs:
```tsx
<input type="text" autoComplete="street-address" ... />
```

**Verify:**
- `grep -rn 'window\.prompt' app/` → 0 results.
- Tapping "Report Issue" on transport page opens bottom sheet.
- Form submits without page navigation.
- Cancel dismisses sheet without submitting.

---

### 5B — Command page auth guard [UX]
**File:** `app/app/command/page.tsx` ~lines 11, 23

Covered in Batch 1 Fix 13 (DEMO_ORG_ID removal). This batch item is a verification pass:
- Confirm the early return renders properly when `authOrgId` is `null`.
- Confirm no production data is queried as an unauthenticated user.
- Confirm the page works normally when `authOrgId` is a valid string.

If Batch 1 Fix 13 has not yet been merged, apply it here.

---

### Batch 5 Acceptance Criteria
- `grep -rn 'window\.prompt\|window\.confirm\|window\.alert' app/` → 0 results.
- Issue report flow works on mobile Safari (no native dialog appears).
- `DEMO_ORG_ID` constant does not exist anywhere in `command/page.tsx`.
- Transport `autoComplete` attributes present on address inputs.
- TypeScript strict passes.

---

## Batch 6 — Accessibility
**Estimated time:** Half day (4 hours)  
**Dependencies:** None (can run in parallel with Batch 2–4)  
**Files touched:** `app/app/cases/page.tsx`, `app/app/match/page.tsx`, `app/app/command/page.tsx`, `app/app/command/[id]/page.tsx`, `app/app/directory/browse/page.tsx`, `app/app/directory/request/[id]/page.tsx`, `app/app/onboard/page.tsx`

### 6A — Cases mobile column switcher ARIA roles [A11Y]
**File:** `app/app/cases/page.tsx` ~lines 503–519

**Before:**
```tsx
<button onClick={() => setMobileCol(col.id)} ...>
```
**After:**
```tsx
<div role="tablist" aria-label="Case stages">
  <button
    role="tab"
    aria-selected={mobileCol === col.id}
    aria-controls={`col-${col.id}`}
    onClick={() => setMobileCol(col.id)}
    ...
  >
```
Also add `id={`col-${col.id}`}` and `role="tabpanel"` to each column container.

---

### 6B — Match score bars text alternative [A11Y]
**File:** `app/app/match/page.tsx` — `ScoreBar` component

**Before:**
```tsx
<div className="..." style={{ width: `${score}%` }} />
```
**After:**
```tsx
<div
  className="..."
  style={{ width: `${score}%` }}
  role="meter"
  aria-valuenow={score}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label={`Match score: ${score} out of 100`}
/>
```

---

### 6C — Match board urgency color-only encoding [A11Y]
**File:** `app/app/match/page.tsx` ~line 182

**Before:** Urgency dot only.  
**After:**
```tsx
<span className="inline-flex items-center gap-1">
  <span className={`w-2 h-2 rounded-full ${um.dot}`} aria-hidden="true" />
  <span className="sr-only">{urgencyLabel}</span>
</span>
```

---

### 6D — Status timeline icon text labels [A11Y]
**File:** `app/app/cases/[id]/page.tsx`, `app/app/directory/request/[id]/page.tsx`

For each timeline icon, wrap with accessible label:
```tsx
<span aria-label={`Status: ${statusLabel}`}>
  <CheckCircle size={14} aria-hidden="true" />
</span>
```

---

### 6E — Directory browse filter group label [A11Y]
**File:** `app/app/directory/browse/page.tsx`

Wrap filter chip groups:
```tsx
<div role="group" aria-label="Filter by status">
  {statusFilters.map(...)}
</div>
<div role="group" aria-label="Filter by type">
  {typeFilters.map(...)}
</div>
```

---

### 6F — AgentChat landmark in command/[id] [A11Y]
**File:** `app/app/command/[id]/page.tsx`

Wrap the embedded chat:
```tsx
<section aria-label="Incident Chat">
  <AgentChat ... />
</section>
```

---

### 6G — Form label font size (WCAG AA) [A11Y]
**File:** `app/app/onboard/page.tsx`, and any cases modal with `text-[10px]` labels

**Before:**
```tsx
className="font-mono text-[10px] text-white/50 uppercase tracking-wider"
```
**After:**
```tsx
className="font-mono text-xs text-white/50 uppercase tracking-wider"
```
`text-xs` = 12px, which passes WCAG AA contrast at the white/50 opacity on dark background.

**Scope:** Grep for `text-\[10px\]` across `app/app/` and apply to all label/caption elements.

---

### 6H — Directory search input type [MOBILE] [A11Y]
**File:** `app/app/directory/browse/page.tsx`

**Before:**
```tsx
<input type="text" placeholder="Search..." />
```
**After:**
```tsx
<input type="search" placeholder="Search…" aria-label="Search directory" />
```

---

### 6I — Capacity bar overflow clamp [UX]
**File:** `app/app/directory/resource/[id]/page.tsx`

**Before:**
```tsx
style={{ width: `${Math.round((available / total) * 100)}%` }}
```
**After:**
```tsx
style={{ width: `${Math.min(100, Math.round((available / total) * 100))}%` }}
```
Guard against division by zero: if `total === 0`, use `0`.

---

### Batch 6 Acceptance Criteria
- `grep -rn 'text-\[10px\]' app/app/` → 0 results (all converted to `text-xs`).
- `grep -rn 'type="text"' app/app/directory/browse` returns 0 for the search input.
- Score bars have `role="meter"` and `aria-label` attributes.
- Tablist/tab/tabpanel roles present on cases column switcher.
- Timeline icons have `aria-label` on their wrapper spans.
- Capacity bar never renders > 100% width.
- TypeScript strict passes on all changed files.

---

## Summary Table

| Batch | Focus | Files | Est. Time | Deps |
|-------|-------|-------|-----------|------|
| 1 | Quick wins (15 items) | 8 files | 1.5 hrs | None |
| 2 | Mobile layout | 3 files | 4 hrs | None |
| 3 | Error handling + empty states | 8 files | 4 hrs | None |
| 4 | Component consolidation | 5 files + 1 new | 4 hrs | Batch 1 + 3 |
| 5 | Critical fixes | 1 file | 4 hrs | None |
| 6 | Accessibility | 7 files | 4 hrs | None |

**Recommended execution order:** 1 → 5 → 3 → 6 → 2 → 4
