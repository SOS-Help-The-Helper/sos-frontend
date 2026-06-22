# Phase 4 — Match engine. Claude Code brief.

Read FIRST: CONSOLE_ARCHITECTURE.md, app/app/command/page.tsx (pattern), components/console/score-breakdown.tsx + case-card.tsx (composites to reuse/mirror).

## Rules (same contract)
Compose ONLY from @/components/console. New composite → add to components/console/ (typed, accessible, exported). No bespoke markup, no hardcoded hex. Data ONLY via @/lib/api. Wrap in <ConsoleShell>. Loading/empty/error states. Mobile-safe. No next build/npm install/deploy. Commit only.

## Screen: app/app/match/page.tsx (full rewrite)
Reference: Match Explorations + agent-chain shots. The match engine: queue of requests needing matches → request detail → "how the agent scored this" breakdown → candidate chain → broadcast to vendors.

Structure:
- ConsoleShell with disasters + agent panel.
- LEFT: a queue/list of open match requests (use CaseCard-style rows or a list). Selecting one loads detail on the right.
- RIGHT: selected request detail + ScoreBreakdown (reuse the existing components/console/score-breakdown.tsx for match_reasoning) + candidate chain (the matched resources, each with score) + action buttons: "Commit match", "Broadcast to vendors", "Add to queue".
- Use api.crmMatchesList(orgId) → { matches[] } where each match has: id, request_id, resource_id, score, reasoning(match_reasoning), status, chain_id, request_person_name, request_taxonomy, request_county, request_urgency, resource_name, org_name.
- Group matches by request_id to form the "chain" per request. Show score per candidate.
- "Commit"/"Broadcast" buttons: wire to api if a method exists (look in lib/api), else leave a clearly-commented TODO — do NOT invent endpoints.

## Acceptance
- [ ] Match queue + selected request detail + ScoreBreakdown (reused) + candidate chain
- [ ] Any new composite in components/console (not inline), exported
- [ ] loading/empty/error states; mobile single-column
- [ ] typecheck: no new errors in changed files; no forbidden hex
- [ ] Commit: "feat(console): Phase 4 — Match engine (queue, score breakdown, candidate chain) composed from console system"
