# SOS Connect /app Redesign — Audit & Phased Build Plan
**Date:** 2026-06-21 · **Author:** Henry-SOS · **Source design:** `SOS Connect System.zip` (Claude design export)

---

## 1. What the redesign IS

A pixel-level reskin + restructure of the **operational console** (`/app/*` routes) into a **dark navy "mission control" console**. It is NOT a marketing-site change and NOT net-new screens — it redesigns pages that already exist and already route through deployed EFs.

**Design source (recovered from the bundle):**
- `SOS Connect System.html` → bundler artifact (React+Babel). Real source extracted to `_redesign_zip/_design.html` (241 KB decoded markup) + `_design_styles.css` (24.5 KB) + fonts.
- 13 "pages"/screens in the canvas. 4 prototype variants (A Mission Control, B Agent-Led, C People-First, D Agent Console) + explorations (Nav, Match, Detail, Directory).
- 18 reference screenshots in `uploads/` (the canonical pixel targets).

**Screens in the redesign:**
1. **Command** — operating picture (map + KPI stat cards + priority requests + notifications)
2. **Cases** — board (kanban by stage: New / Matching / …) + table view + case detail (key/value record, tabs Details/Timeline/Items/Chat, action row)
3. **Match** — match engine: algo pick, request detail, "how the agent scored this" score breakdown, candidate chain, broadcast to vendors, queue
4. **Map** — full operating-picture map, disaster filter
5. **Directory** — My network / Discover, KPI tiles (People/Orgs/Requests/Resources), search + filter tabs, entity cards, "Tag to case"
6. **Reporting** — requests by category, coordination loop, partner leaderboard, export CSV, share report
7. **Intake** — new intake (person/org, category, housing, urgency, details)
8. **SOS Agent** — right-docked chat panel (status, messages, suggested-action chips, input) present on every screen

---

## 2. Design tokens (extracted, ground truth)

**Palette (44 hex values; canonical set):**
- Backgrounds (dark console): `#0A131C` (app bg), `#0F1E2B` (brand navy / surface), `#0C1A27`, `#0B141D`, `#101C26`, `#102433`, `#16242F`, `#182733` (card surfaces, ascending lightness)
- Borders/lines: `#20303D`, `#21323f`, `#41505E`
- Text: `#FFFFFF` (primary), `#C6CDD7`/`#CAD4DE`/`#D6DEE6` (secondary), `#788694`/`#6B7884`/`#9AA4AE` (muted labels), `#55636E` (faint)
- **Coral/red (primary accent):** `#FF5A57`, `#FF6360`, `#E6443F`, `#D43A37` (brand red `#EF4E4B` family)
- **Light blue (resources/links):** `#6BB8F0`, `#1E6FE0`
- **Green (active/verified):** `#36D399`, `#12805A`, `#d3e3d0`
- **Amber (contacted/reports):** `#F5B544`, `#B5760A`
- Status dot semantics: green=active/verified, red=new/critical/matching-request, blue=reserved/resource, amber=contacted/report

**Type:**
- **DM Serif Display** — large entity titles (case/resource names)
- **Nunito Sans** — body/UI
- **JetBrains Mono** — NEW: metadata, IDs (`SOS-1042`, `#A-118`), uppercase tracked labels, pill counters
- Fonts are bundled as woff2 in the zip (13 files); self-host them.

**Component vocabulary:**
- Centered **pill nav** (Command/Cases/Match/Map/Directory/Reporting) with badge counters; bell w/ badge; avatar (MR)
- **Disaster context selector** sub-header (`● Hurricane Milena · Day 6 ▾`)
- KPI stat cards w/ sparklines + ▲ deltas
- Entity cards: square monogram tile, type tag (PERSON/ORG/REQUEST/RESOURCE), status chips (dot + label), momentum meter (`●●● Rising/New`), visibility (Private/Shared), right action button (coral filled = primary, dark outline = secondary)
- Match score as large number (0–100), e.g. **94**
- Kanban columns w/ colored dot + count; cards w/ colored left border (urgency)
- Right-docked agent panel w/ quote-style messages + suggested-action chips

---

## 3. Current state (what we're transforming)

**Repo:** `SOS-Help-The-Helper/sos-frontend` · Next.js 16.2 + React 19 + Tailwind v4 + Supabase + Mapbox + GSAP + lucide-react. Live at sosconnect.org.

**`/app/*` routes (already exist, matching the redesign):**
| Route | Current lines | Shell | Redesign target |
|---|---|---|---|
| `/app/command` (+`[id]`) | 99 | CrmShell+AgentChat | Command operating picture |
| `/app/cases` (+ sos/request/resource/`[id]`) | 865 | CrmShell | Cases board+table+detail |
| `/app/match` | 807 | CrmShell | Match engine + scoring |
| `/app/map` | 460 | — | Operating-picture map |
| `/app/directory` (+ person/org/request/resource/report/volunteer + import/browse) | 170 | CrmShell | Directory network/discover |
| `/app/reports` | 315 | CrmShell | Reporting |
| `/app/onboard` | — | — | (intake adjacent) |
| `/app/settings`, `/inventory`, `/transport`, `/calendar`, `/volunteers` | — | — | reskin to match |

**Shells:** `crm-shell.tsx` (71), `dashboard-shell.tsx` (46), `admin-shell.tsx` (66), `agent-chat.tsx` (223). Current type = **Inter** (redesign needs DM Serif + Nunito + JetBrains Mono).

**Data layer (already wired, do NOT rebuild):** pages call `lib/api` → `/api/ef/[fn]` → EFs. Current calls observed: `sos-coordination` (×10), `sos-matching`, `sos-intelligence`, `sos-events`, `sos-inventory`.

---

## 4. Backend EF coverage vs. redesign needs

**34 EFs deployed (all ACTIVE).** Action surface (verified from source):

- **sos-coordination:** `cases.{list_soses,list,detail,update_stage,assign,unassign,approve_match,reject_match,bulk_update,add_note,get_notes}` · `command.{incident_summary,list_incidents,org_load,sitrep}` · `directory.{browse_persons,browse_orgs,get_person,get_org,...}` · `search.{all,person,organization,credential}` · `delivery.*` · `facilities.*` · `disasters.list` · `credentials.*` · `volunteers.*` · `settings.*`
- **sos-matching:** `score.run` · `propose.run` · `commit.run` · `transport.run` · `candidates.{list,expire,refresh}`
- **sos-intake:** `import.*` · `onboard.*` · `referral.*` · `sitrep.verify` · `embed.*`
- **sos-inventory:** `query.*` · `write.*`
- **sos-intelligence:** `activity.{by_entity,by_org,by_person}` · `map.features` · `scoring.{compute,trust_update}`
- **sos-events:** `calendar.*` · `notify.{list,send}` · `settings.*`

**Gap analysis — redesign data needs vs. existing actions:**

| Redesign UI element | Backend need | Status |
|---|---|---|
| Command KPI cards + sparkline deltas | `command.incident_summary` / `command.org_load` | ✅ exists (confirm deltas/trend fields) |
| Command operating-picture map | `intelligence.map.features` | ✅ exists |
| Priority requests list | `cases.list` (sort by priority) | ✅ exists |
| Cases board grouped by stage + counts | `cases.list_soses` / `cases.list` (needs stage grouping + req/res counts per case) | ⚠️ likely needs a board-shaped response (stage buckets, per-case req_count/res_count/score) |
| Case detail key/value + tabs (Items/Timeline/Chat) | `cases.detail` | ✅ exists (confirm it returns items, timeline, chat, household/pets/medical/language fields) |
| Match score breakdown "how the agent scored this" | `matching.score.run` returns score; **score *explanation*/factors** | ⚠️ may need score breakdown payload (factor weights) |
| Match candidate chain | `matching.propose.run` + `candidates.list` | ✅ exists |
| Broadcast to vendors | `events.notify.send` (vendor broadcast) | ⚠️ confirm vendor-broadcast action exists |
| Directory KPI tiles + cards + momentum meter | `directory.browse_*` + `search.*` | ✅ exists (⚠️ momentum/"Rising" meter may be new field) |
| Tag to case | `cases.*` link action | ⚠️ confirm a "tag/link record to case" verb |
| Reporting: requests by category, coordination loop, partner leaderboard | `intelligence.*` (impact_dashboard, reports) | ⚠️ confirm category breakdown + leaderboard actions |
| Export CSV / Share report | client-side CSV + share link | ⚠️ share-link may need a token endpoint |
| Intake form (person/org, category, housing, urgency) | `sos-intake citizen.intake` / `import` | ✅ exists |
| Agent panel (live stats, suggested actions, chat) | agent gateway (`/api/agent/chat`) + `command.incident_summary` | ✅ exists |

**EF work is ADDITIVE and small** — mostly (a) confirm existing responses include the fields the redesign renders, (b) add a few read-shaped actions (board grouping, score breakdown, category/leaderboard reporting, tag-to-case, vendor broadcast) where missing. No schema migration expected; if a new field is needed it's additive.

---

## 5. Phased build plan (chunked so Claude Code doesn't time out)

> Each phase = one Claude Code run, ≤3–5 files, with the screenshot(s) as the pixel target and a written acceptance checklist. Henry verifies each diff before the next phase. Deploy only after a phase group is verified. Per playbook: no `next build`/`npm install` inside CC runs; commit only; respect reduced-motion; brand tokens only.

### Phase 0 — Foundation (Henry, not CC)
- Self-host the 3 fonts (DM Serif Display, Nunito Sans, **JetBrains Mono**) via `next/font/local` from the woff2 in the zip.
- Add design tokens to `app/globals.css` / Tailwind theme: the navy console palette, status colors, surface scale, radii, shadows (from §2).
- Decode + save the design reference HTML/CSS into the repo (`/design-ref/`) so CC can diff against it.
- Build a single **`ConsoleShell`** component (new dark nav + disaster selector + bell + avatar + docked agent panel slot) to replace `CrmShell` on `/app/*`. **Verify visually** before touching pages.
- **Backend pre-flight:** curl each candidate EF action and capture the actual JSON shape (cases.detail, command.incident_summary, matching.score.run, intelligence reports). Produces `_redesign_audit/EF_RESPONSE_SHAPES.md` — the source of truth for the gap list in §4.

### Phase 1 — Shell + Command (CC run 1)
Files: `components/console-shell.tsx`, `app/app/command/page.tsx`, agent-panel component.
- New nav, disaster context selector, KPI stat cards w/ sparklines + deltas, operating-picture map embed, priority requests list, agent panel docked.
- Pixel target: shots 08/10, mobile shot 05.
- EF: `command.incident_summary` + `intelligence.map.features` + `cases.list`.

### Phase 2 — Cases board + table (CC run 2)
Files: `app/app/cases/page.tsx` (+ board/table components).
- Kanban by stage w/ colored dots + counts; card w/ type tag, category, req/res chips, match score, urgency left-border; Board/Table toggle.
- Pixel target: mobile shot 05 (board), desktop case shots.
- EF: `cases.list`/`list_soses` — **may need board-grouped response** (Phase 2b backend if so).

### Phase 3 — Case detail (CC run 3)
Files: `app/app/cases/[id]/page.tsx` + detail components.
- Left entity card (avatar tile, title, meta, status, Actions dropdown, Share); right tabs (Details key/value, Timeline, Items, Chat); action row (Match/Assign/Add request/etc).
- Pixel target: shot 11 (Marquez family).
- EF: `cases.detail` (confirm household/pets/medical/language/coordinator fields).

### Phase 4 — Directory (CC run 4)
Files: `app/app/directory/page.tsx` + entity-card component.
- My network/Discover toggle, 4 KPI tiles, search + filter tabs, entity cards w/ momentum meter + visibility + Tag to case.
- Pixel target: shots 04/15.
- EF: `directory.browse_*` + `search.*`; **Tag to case** verb (Phase 4b backend if missing).

### Phase 5 — Match engine + scoring (CC run 5)
Files: `app/app/match/page.tsx` + match components.
- Algo pick, request detail, **"how the agent scored this"** breakdown, candidate chain, queue, broadcast to vendors.
- Pixel target: Match Explorations + agent chain shots.
- EF: `matching.propose.run` + `candidates.list`; **score breakdown payload** + **vendor broadcast** (Phase 5b backend if missing).

### Phase 6 — Reporting (CC run 6)
Files: `app/app/reports/page.tsx` + chart components.
- Requests by category, coordination loop viz, partner leaderboard, export CSV, share report.
- EF: `intelligence` reporting actions (confirm category breakdown + leaderboard; share-link token if needed → Phase 6b backend).

### Phase 7 — Map + Intake + remaining reskins (CC run 7–8)
- `/app/map` full operating picture; intake form (person/org/category/housing/urgency); reskin settings/inventory/transport/calendar/volunteers to match the console.
- EF: `intelligence.map.features`, `sos-intake`.

### Phase 8 — Mobile + polish + QA (CC run 9)
- Mobile layouts for all console screens (shots 05/13 are mobile targets), reduced-motion, agent panel as bottom sheet on mobile, a11y pass.

### Phase 9 — Deploy + verify (Henry)
- Build, deploy to Vercel, verify routes 200, visual QA against screenshots, confirm EF calls succeed in prod.

**Backend mini-phases (2b/4b/5b/6b)** are only triggered if Phase 0 pre-flight confirms a field/action is missing. Each is a small additive EF change (new action verb or extra response field) → migration only if a new column is truly required (additive, with ADR per AGENTS.md).

---

## 6. Risks / decisions to confirm with Jonathan
1. **Which prototype is canonical?** The bundle has 4 prototypes (A/B/C/D). The screenshots match a blend (pill nav + docked agent + board). Assumption: `SOS Connect System.html` (the "System" bundle) is the canonical target, prototypes are exploration. **Confirm.**
2. **Demo data vs. live data.** Screenshots use demo entities (Marquez family, Hurricane Milena, ERV). Rebuild renders live org data; the demo seed can be a fallback. Confirm we keep a demo/seed mode for the donor-facing walkthrough.
3. **Scope of "pixel perfect."** Desktop screens are fully specified; some screens (intake, full reporting, map detail) are only partially shown — those get rebuilt to the design system, not a literal screenshot. Confirm acceptable.
4. **Citizen `(citizen)/c/*` routes** are out of scope (this redesign is the partner/coordinator console). Confirm.
