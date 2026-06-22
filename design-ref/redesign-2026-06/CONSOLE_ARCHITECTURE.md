# Console Architecture — composed, not cobbled
**The contract every redesign phase MUST follow.** Better-than-best-in-class enterprise frontend = a real component system, not per-screen markup.

## Layers (strict — never skip down a layer)
1. **Tokens** — `app/globals.css` `.console-theme` scope. `--cn-*` raw values mapped onto shared semantic vars (`--panel`, `--surface-1`, `--primary`, `--text-secondary`…). Components NEVER hardcode hex; always `var(--…)` or the Tailwind token. (Brand exceptions: status dot colors come from `--cn-status-*`.)
2. **Primitives** — `components/console/` — small, typed, accessible, presentational. The ONLY place raw styling lives. Pages compose these; pages do not write bespoke styled markup.
3. **Composites** — built FROM primitives (EntityCard, CaseCard, KpiRow, ScoreBreakdown, AgentPanel…). Live in `components/console/`.
4. **Shell** — `ConsoleShell` wraps every `/app` page: applies `.console-theme`, renders ConsoleNav + DisasterContext + bell + avatar + docked AgentPanel slot. Reuses `useAuthContext`, `usePortalConfig`, `NotificationBell`, `CommandPalette`.
5. **Pages** — `app/app/*/page.tsx` — data-fetch via `lib/api` (EFs) + compose composites. Thin. No styling beyond layout grid.
6. **Data** — `lib/api` (EF client) is the ONLY data path. Demo mode passes `demo:true` (Phase 0b filter). Never fetch Supabase directly from a page.

## Primitive inventory (build in Phase 0)
Presentational, typed props, forwardRef where useful, ARIA built-in:
- `Surface` (panel/card/sunken variants, radius, padding scale)
- `Button` (primary coral / secondary outline / ghost / icon; sizes; loading; disabled)
- `Pill` (nav pill + counter badge; active state)
- `Badge` (count + tone)
- `StatusDot` (tone: active/new/matching/reserved/contacted/report → `--cn-status-*`)
- `Chip` (status chip = dot + label; filter chip; tag chip)
- `Tag` (entity type: PERSON/ORG/REQUEST/RESOURCE/CASE — mono, tracked, tone)
- `MonogramTile` (square avatar tile w/ initials + type tone)
- `Tabs` (underline tabs w/ counts, keyboard nav, ARIA tablist)
- `KpiStat` (value + label + delta ▲/▼ + sparkline slot)
- `Sparkline` (tiny SVG line; reduced-motion safe)
- `MomentumMeter` (`●●● Rising/New` 3-dot scale)
- `Field` (key/value row: mono uppercase label left, value right)
- `SectionLabel` (uppercase tracked eyebrow w/ optional leading dot)
- `Dropdown` / `Menu` (Actions ▾, disaster selector) — headless + accessible
- `EmptyState`, `Skeleton`, `Spinner`

## Composites
- `EntityCard` (directory) — MonogramTile + Tag + title(serif) + desc + Chips + action Button
- `CaseCard` (board) — colored urgency border + Tag + category + req/res chips + score
- `KpiRow` — KpiStat[]
- `ScoreBreakdown` — "how the agent scored this": score number + factor rows from `match_reasoning`
- `AgentPanel` — header(status) + message list(quote style) + suggested-action chips + input
- `DisasterContext` — `● <disaster> · Day N ▾` selector (drives disaster_id for command/map EFs)
- `ConsoleNav` — pill nav (Command/Cases/Match/Map/Directory/Reporting) + bell + avatar

## Type & quality bar
- TypeScript strict; **no `any`** in new console code. Shared types in `components/console/types.ts`.
- Every interactive element: keyboard operable + visible focus ring (`--ring`) + ARIA.
- `prefers-reduced-motion`: no essential motion; sparklines/animations gate on it.
- Mobile: shell becomes top bar + bottom sheet agent panel; board scrolls horizontally; cards stack.
- No inline magic numbers for color/space — use tokens + a spacing scale.
- Loading/empty/error states on every data view (Skeleton/EmptyState).
- Demo mode: `useDemoMode()` context → passes `demo:true` to api; a visible "Demo" marker in shell.

## Naming / files
- `components/console/primitives/*.tsx` (one primitive per file, named export)
- `components/console/composites/*.tsx`
- `components/console/console-shell.tsx`, `console-nav.tsx`, `agent-panel.tsx`, `disaster-context.tsx`
- `components/console/index.ts` re-exports the public API (pages import from `@/components/console`)
- `components/console/types.ts` shared types

## What pages may NOT do
- ❌ hardcode hex colors / px outside the spacing scale
- ❌ duplicate a primitive's markup inline
- ❌ fetch data outside `lib/api`
- ❌ ship a screen without empty/loading/error states
- ❌ break the light theme on marketing/citizen routes (console theme is scoped to /app)
