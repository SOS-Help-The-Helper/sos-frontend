# Phase 2 — Cases (board + table + detail). Claude Code brief.

Read FIRST: `design-ref/redesign-2026-06/CONSOLE_ARCHITECTURE.md` (the contract) and
`app/app/command/page.tsx` (the Phase 1 reference implementation — copy its composition pattern exactly).

## Rules (non-negotiable)
- COMPOSE from `@/components/console`. Do NOT write bespoke styled markup or hardcode hex colors. If you need a primitive that doesn't exist, add it to `components/console/` (typed, accessible) and export it — do not inline it in the page.
- Data ONLY via `@/lib/api` (the `api.*` methods → EFs). Never fetch Supabase directly.
- Wrap pages in `<ConsoleShell>` exactly like command/page.tsx (pass disasters, navCounts, agent).
- TypeScript strict, no `any` in page logic where avoidable (narrow local interfaces like command/page.tsx does).
- Every data view: loading (Skeleton), empty (EmptyState), error (catch → empty) states.
- Mobile: board scrolls horizontally; detail two-column collapses to one at ≤860px.
- Respect prefers-reduced-motion. No forbidden colors. Do NOT run next build / npm install / deploy. Commit only.

## Screens to build (3 files)
### A. `app/app/cases/page.tsx` — Board + Table
- Sub-header (via ConsoleShell `subActions`): Board / Table toggle.
- BOARD: kanban columns by stage. Use `STAGE_META` from console types for column label+tone. Columns from `cases.list` `stage_counts` (show count per column with a StatusDot). Cards = CaseCard.
- TABLE: dense rows (Type, Need/Category, Stage, Items, Owner, Updated, score). Use console primitives (Tag, Chip, Badge).
- Data: `api.crmCasesList(orgId)` → `{ cases[], total, stage_counts }`. Each case has: `id, display_name|name, urgency, status|stage, category, request_count, resource_count, match_count` (+ a match score where present).
- Build a **CaseCard composite** in `components/console/` (compose MonogramTile + Tag + category + req/res Chips + score number + colored urgency left-border). Export it.

### B. `app/app/cases/[id]/page.tsx` — Case detail
- Two-column: LEFT entity card (MonogramTile, serif title = person.display_name, meta line `SOS-#### · county · household of N`, status chips, Actions dropdown [Match/Assign coordinator/Add request/Add resource/Update status/Escalate/Close], Share). RIGHT tabs: Details / Timeline / Items / Chat.
- DETAILS tab = `Field` rows from cases.detail: coordinator, opened (created_at + channel), address (person.location_text), household (sos.household_size + has_children/has_elderly/has_disabled/has_pets), pets, language (person.metadata?), medical (sos.metadata?), priority (sos.urgency), stage (sos.status).
- TIMELINE tab = `timeline[]` (each: `who/actor, kind, msg, time/date`).
- ITEMS tab = `requests[]` + `resources[]` (title/description, urgency, status, score from matches).
- CHAT tab = `notes[]`.
- Data: `api.crmCaseDetail(sosId)` if it exists, else `efCall`/the existing detail method. Detail shape (VERIFIED LIVE):
  `{ person{display_name,avatar_url,verification_level,email,phone,location_text,...}, sos{status,urgency,household_size,has_children,has_elderly,has_disabled,has_pets,request_count,resource_count,housing_type,housing_status,metadata,created_at,channel}, requests[]{title,description,urgency,status,county,state}, resources[]{category,description,status,capacity_available,city,county}, matches[]{request_id,resource_id,match_score,match_reasoning,status}, notes[], timeline[]{who,actor,kind,msg,time,date}, household, household_members[], orgs[], affiliations[] }`

### C. ScoreBreakdown (needed by Items/Match) — build in `components/console/`
- Small composite: big score number (0-100) + factor rows parsed from `match_reasoning` (it may be text or JSON — render text gracefully, and if JSON with factors, list them). Export it.

## Acceptance
- [ ] Board renders columns from stage_counts with STAGE_META; CaseCard composed from primitives
- [ ] Table view toggle works
- [ ] Case detail two-column; Details/Timeline/Items/Chat tabs all render from cases.detail
- [ ] CaseCard + ScoreBreakdown live in components/console (not inline), exported from index
- [ ] loading/empty/error states everywhere; mobile collapse
- [ ] typecheck clean for new files (no new `any`-driven errors); no forbidden colors
- [ ] Commit: "feat(console): Phase 2 — Cases board + table + detail composed from console system"
