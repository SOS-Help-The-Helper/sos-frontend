# Phase 3 — Directory. Claude Code brief.

Read FIRST: `design-ref/redesign-2026-06/CONSOLE_ARCHITECTURE.md`, `app/app/command/page.tsx` (pattern),
and `app/app/cases/page.tsx` + `components/console/case-card.tsx` (the Phase 2 composites to mirror).

## Rules (same contract)
- Compose ONLY from `@/components/console`. New primitive/composite needed → add to `components/console/` (typed, accessible, exported). No bespoke markup, no hardcoded hex.
- Data ONLY via `@/lib/api`. Wrap in `<ConsoleShell>`. Loading/empty/error states. Mobile-safe. No `next build`/`npm install`/deploy. Commit only.

## Screen: `app/app/directory/page.tsx` (full rewrite)
Reference shots: directory screens (My network / Discover, KPI tiles, search + filter tabs, entity cards, Tag to case).

Structure:
- Sub-header (ConsoleShell `subActions`): **My network** / **Discover** toggle (counts).
- **4 KPI tiles** row: People / Orgs / Requests / Resources (use `KpiStat` or a compact tile; People tile coral-accented). Counts from the browse/search responses.
- **Search bar** + **filter tabs**: All / People / Orgs / Requests / Resources (use console `Tabs`).
- **Entity cards list**: build an **`EntityCard` composite** in `components/console/` — compose `MonogramTile` + `Tag`(type, verified) + serif title + description + status `Chip`s + `MomentumMeter` (Rising/New) + visibility chip (Private/Shared) + right action `Button` (primary "Match" for request/resource, secondary "Tag to case" for person/org). Export it.

Data:
- `api.crmBrowsePersons(orgId, {limit})` → `{ persons[], total }`. person fields: `id, person_id, display_name|name, phone, email, role, roles, location, sos_score, request_count, resource_count, sos_id, org_name`.
- `api.crmBrowseOrgs(orgId, {limit})` → `{ orgs[], total }`.
- `api.crmSearch(query, orgId, filters)` for the search box.
- Map person/org/request/resource into a common `EntityCardData` shape for the card.
- "Tag to case" / "Match" buttons: wire to navigation or a stub handler (e.g. router.push to the entity, or a TODO callback). If a real "tag to case" EF verb is needed and missing, leave a clearly-commented TODO — do NOT invent an endpoint.

## Acceptance
- [ ] My network / Discover toggle; 4 KPI tiles; search + filter Tabs
- [ ] EntityCard composite in components/console (not inline), exported, composed from primitives
- [ ] MomentumMeter + visibility + verified rendered
- [ ] loading/empty/error states; mobile single-column
- [ ] typecheck: no new errors in changed files (ratchet ≤ current baseline); no forbidden hex
- [ ] Commit: "feat(console): Phase 3 — Directory (network/discover, KPI tiles, EntityCard) composed from console system"
