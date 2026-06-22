# Phase 5 — Map. Claude Code brief.

Read FIRST: CONSOLE_ARCHITECTURE.md, app/app/command/page.tsx (it already embeds MapPreview — mirror that), components/map-preview.tsx.

## Rules (same contract)
Compose from @/components/console. Data via @/lib/api. Wrap in <ConsoleShell> (bare content if the map is full-bleed). No hardcoded hex (except inside the mapbox style config which is its own concern). Loading/empty/error. Mobile-safe. No next build/npm install/deploy. Commit only.

## Screen: app/app/map/page.tsx (full rewrite)
Full operating-picture map. ConsoleShell with disasters + agent panel. Full-bleed dark map (mapbox dark-v11). 
- Data: api.crmMapFeatures(orgId, filters) → GeoJSON { type, features[], count }. Each feature: geometry.coordinates [lng,lat], properties { id, kind (request|resource|report), category, urgency }.
- Layer legend chips (console Chip): Requests (coral) / Resources (blue) / Reports (amber) with counts.
- Filter controls (console primitives): toggle layers, filter by disaster (already in ConsoleShell sub-header).
- Clicking a pin → a console-styled detail card/popover (reuse Surface + primitives) → link to /app/cases/{id} or directory.
- Reuse the existing mapbox integration approach from components/map-preview.tsx or components/map/* but make it interactive + full-height in the console theme. If a richer map component already exists (components/map/*), prefer composing it.

## Acceptance
- [ ] Full-height interactive map in console theme; legend chips with live counts; layer filters
- [ ] pin click → console-styled detail → navigates to entity
- [ ] loading/empty/error; mobile-safe
- [ ] typecheck clean for changed files; no forbidden hex (outside mapbox style)
- [ ] Commit: "feat(console): Phase 5 — Map operating picture composed from console system"
