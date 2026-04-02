# Agent Tools — What Each Agent Can Do

> Last updated: 2026-04-02
> Owner: Henry-Prime

---

## Two Agent Architectures

SOS has two distinct agent architectures:

### 1. Web Citizen Agent (AI SDK)
- Route: `/api/chat` in sos-frontend
- Stack: Vercel AI SDK v6 + Anthropic Sonnet + 16 tool definitions
- Runs: In the browser via `useChat` → `streamText`
- Tools are code functions that call Supabase EFs and return structured JSON
- Tool results render as interactive UI components via `AIToolRenderer`

### 2. Slack Partner Agents (OpenClaw)
- Stack: OpenClaw agents with SOUL.md + TOOLS.md
- Runs: On the OpenClaw server, triggered by Slack messages
- Tools: `web_fetch` (to call EFs), `read`, `memory_search`, `message`
- No custom tool definitions — agents use web_fetch to call the same EFs

---

## Web Citizen Agent — 16 Tools

| Tool | __tool Return | What It Does |
|---|---|---|
| `show_categories` | show_categories | Renders category selection cards for intake |
| `show_counter` | show_counter | People count selector (household size) |
| `show_circumstances` | show_circumstances | Special circumstances checkboxes |
| `get_location` | get_location | Location input/GPS capture |
| `show_helper_type` | show_helper_type | Helper category selection |
| `show_availability` | show_availability | Helper availability selector |
| `search_resources` | search_results | Calls resource-search EF, renders results + map update |
| `show_score` | show_score | Calls score-compute EF, renders score ring |
| `submit_sos` | submit_confirmation | Calls intake-write EF, creates person+SOS+requests |
| `submit_helper` | submit_confirmation | Calls intake-write EF, creates person+SOS+offers |
| `capture_photo` | capture_photo | Camera/upload for damage photos |
| `show_danger_check` | show_danger_check | Immediate danger safety check |
| `check_fema` | fema_status | Calls fema-check EF, shows disaster declarations |
| `escalate_to_platform` | escalation_confirmed | Flags for platform agent coordination |
| `generate_referral` | referral_card | Calls referral-track EF, generates share link |
| `create_match` | match_confirmed | Calls match-respond EF, confirms citizen↔resource match |

All 16 tools have matching renderers in `AIToolRenderer`. Every tool returns JSON with `__tool` field that determines which React component renders the result.

---

## Slack Partner Agents — EF Endpoints

Each partner agent (ERV, FHM, Aid Arena, Citizen, Partner) has a TOOLS.md with these endpoints:

### Write Operations (via web_fetch POST)

| Endpoint | Purpose | When to Use |
|---|---|---|
| `intake-write` | Submit SOS on behalf of survivor | Survivor contacts partner agent directly |
| `match-respond` | Accept/decline/fulfill a match | Partner reviewing match queue |
| `score-compute` | Check person's SOS score + history | Before accepting a match |

### Read Operations (via web_fetch GET)

| Endpoint | Purpose | When to Use |
|---|---|---|
| `resource-search?keyword=X&lat=Y&lng=Z` | Find resources near location | Partner searching for resources to offer |
| `match-query?org_id=X&status=proposed` | Query pending matches | Partner checking what's waiting |

### Direct Supabase Reads

Partners can also read directly from Supabase REST API:
- `resources` — their org's resources, capacity, status
- `matches` — matches assigned to their org
- `delivery_runs` — logistics runs (ERV-specific)

---

## Agents by Slack Account

| Agent ID | Slack Bot Name | Workspace | Channel | DM |
|---|---|---|---|---|
| sos-erv | SOS Emergency RV | SOS | #erv (C0879V1LYHH) | Jonathan |
| sos-fhm | SOS Free Hot Meals | SOS | #fhm (C085PDMLJ3T) | Jonathan |
| sos-aid-arena | SOS Aid Arena | SOS | #aid-arena (C096D8LNQ4C) | Jonathan |
| sos-citizen | SOS Citizen | SOS | — | Jonathan |
| sos-partner | SOS Partner | SOS | — | Jonathan |

All require @mention in channels. DMs allowlisted to Jonathan only.

---

## What's Missing (as of 2026-04-02)

1. **Partner agents have no NanoClaw/MCP tools** — they rely on web_fetch to call EFs. This works but is less structured than the citizen agent's 16 typed tools.
2. **No sos-platform agent in Slack** — exists as a concept (orchestration agent) but not configured as a Slack bot.
3. **No sos-greater-good in SOS Slack** — app exists in Harmony workspace, not SOS.
4. **Partner agents can't update their own capacity** — need a `capacity-update` EF or direct Supabase write instructions.
5. **No automated match notification to partner agents** — match-trigger creates the match but doesn't ping the partner's Slack agent. Currently relies on partner checking dashboard.
