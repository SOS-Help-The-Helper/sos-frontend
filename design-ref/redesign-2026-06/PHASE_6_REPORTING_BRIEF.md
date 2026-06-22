# Phase 6 — Reporting. Claude Code brief.

Read FIRST: CONSOLE_ARCHITECTURE.md, app/app/command/page.tsx (pattern), components/console/data-viz.tsx (Sparkline/KpiStat to reuse).

## Rules (same contract)
Compose ONLY from @/components/console. New chart primitives (BarRow, DonutStat, Leaderboard row) → add to components/console/ (typed, accessible, exported). No bespoke markup, no hardcoded hex. Data via @/lib/api. Wrap in <ConsoleShell>. Loading/empty/error. Mobile-safe. No next build/npm install/deploy. Commit only.

## Screen: app/app/reports/page.tsx (full rewrite)
Reference: reporting shots (requests by category, coordination loop, partner leaderboard, export CSV, share report).
- Data: api.crmImpactDashboard(orgId, {disaster_id, days}) → VERIFIED shape:
  { total_cases, fulfilled, matched, fulfillment_rate, unique_people, unique_households, by_category{}, total_matches, avg_citizen_rating, open_cases, avg_match_time, active_volunteers, resources_matched, by_org[], by_taxonomy[], by_severity[], trend_14d[{date,count}], date_range }
- TOP: KPI row (total_cases, fulfillment_rate, open_cases, avg_match_time, resources_matched) using KpiStat + trend_14d sparkline.
- "Requests by category": horizontal bar chart from by_category / by_taxonomy. Build a BarRow primitive (label + token-colored bar + value) in components/console/.
- "Partner leaderboard": ranked list from by_org[] (org name + metric). Build a Leaderboard composite (rank, name, value bar).
- "Coordination loop": a small stat cluster (matched → fulfilled → rating) — compose from primitives.
- Actions: "Export CSV" (client-side CSV from the data) + "Share report" (copy link; if a share-token EF is needed and missing, leave a clearly-commented TODO).

## Acceptance
- [ ] KPI row + by-category bar chart + partner leaderboard + coordination-loop cluster
- [ ] BarRow + Leaderboard primitives in components/console (not inline), exported
- [ ] Export CSV works client-side; share-link present (TODO if no endpoint)
- [ ] loading/empty/error; mobile-safe
- [ ] typecheck clean for changed files; no forbidden hex
- [ ] Commit: "feat(console): Phase 6 — Reporting (KPIs, by-category, leaderboard) composed from console system"
