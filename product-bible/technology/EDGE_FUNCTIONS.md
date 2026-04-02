# Edge Functions

Every operational write goes through an EF. Frontend never writes directly to Supabase for operational data.

## Citizen Intake
| EF | Purpose | Input | Output |
|---|---|---|---|
| `intake-write` | Create person + SOS + requests + resources | needs[], offers[], location, household | person_id, sos_id, request_ids |
| `sms-intake` | Twilio webhook → parsed intake | Twilio form data (From, Body) | TwiML response |

## Matching
| EF | Purpose | Input | Output |
|---|---|---|---|
| `match-trigger` | Auto-match on request INSERT (Postgres trigger) | request record | match_id, partner notified |
| `match-respond` | Partner accepts/declines match | match_id, action | updated status |
| `match-fulfill` | Mark match as fulfilled | match_id, outcome | fulfillment recorded |
| `consent-flow` | Citizen accepts/declines match | match_id, action | consent recorded |
| `partner-referral` | Partner refers match to another org | match_id, target_org | referral created |
| `match-query` | Query matches for a person/org | filters | match list |

## Intelligence
| EF | Purpose | Input | Output |
|---|---|---|---|
| `image-analyze` | Gemini Vision + GPT-4o fallback | image_base64, context | structured analysis JSON |
| `alerts-feed` | NWS + USGS + NIFC aggregated | lat, lng | alerts array + status |
| `score-compute` | Calculate SOS Score (3 pillars) | person_id | sos_score, breakdown |
| `fema-check` | OpenFEMA disaster declarations | state | declarations, ia_eligible |
| `resource-search` | 211 API proxy + local fallback | keyword, lat, lng | results array |

## Partners
| EF | Purpose | Input | Output |
|---|---|---|---|
| `partner-onboard` | Agent-driven org registration | org data from conversation | org_id, status |
| `notify-partner` | Send notifications to partner channels | match_id, org_id | notification sent |
| `referral-track` | Generate/convert referral codes | action, person_id or code | code or conversion |

## Community
| EF | Purpose | Input | Output |
|---|---|---|---|
| `community-messages` | GET: fetch nearby, POST: create (PII-stripped) | lat, lng, message | messages or id |
| `pre-event-notify` | Check NWS alerts for users, send push | (cron) | checked, notified |

## EMS
| EF | Purpose | Input | Output |
|---|---|---|---|
| `sitrep-write` | Create sitrep OR verify citizen report | location, category, severity OR report_id, verification | trace_id, auto_verified |

## Infrastructure / Utility
| EF | Purpose | Input | Output |
|---|---|---|---|
| `get-mapbox-token` | Return Mapbox token for frontend | none | token |
| `address-autocomplete` | Address lookup proxy | query | suggestions |
| `get-road-conditions` | Road status check | location | conditions |
| `demo-seed` | Seed demo data | config | seeded counts |
| `demo-runner` | Run demo scenarios | scenario | results |
| `cron-process-notifications` | Process notification queue | (cron) | processed count |

## External Data
| EF | Purpose | Input | Output |
|---|---|---|---|
| `nws-ingest` | Ingest NWS weather data | (cron) | alerts ingested |
| `nws-zones` | NWS zone lookup | zone_id | zone data |
| `power-outage-scrape` | Scrape power outage data | region | outage counts |
| `x-intel-scrape` | X/Twitter intel collection | query | posts |

## Deprecated / Legacy
| EF | Purpose | Status |
|---|---|---|
| `chat-parse` | Old NanoClaw chat parser | Replaced by AI SDK /api/chat |
| `intake-agent` | Old NanoClaw agent intake | Replaced by AI SDK /api/chat |
| `map-match` | Old NanoClaw map matching | Replaced by match-trigger |
| `match-engine` | Old NanoClaw match engine | Replaced by match-trigger |
| `sos-status` | Old NanoClaw status check | Needs audit |
| `facility-update` | Old NanoClaw facility updates | Needs audit |

**Total: 35 edge functions in repo (19 modern Deno.serve, 16 legacy serve import)**

---

## Audit Status (2026-04-02)

### Modern Style (Deno.serve) — 19 EFs ✅
alerts-feed, community-messages, consent-flow, fema-check, image-analyze, intake-write, match-fulfill, match-query, match-respond, match-trigger, notify-partner, partner-onboard, partner-referral, pre-event-notify, referral-track, resource-search, score-compute, sitrep-write, sms-intake

### Legacy Style (import serve) — 16 EFs ⚠️
address-autocomplete, chat-parse, cron-process-notifications, demo-runner, demo-seed, facility-update, get-mapbox-token, get-road-conditions, intake-agent, map-match, match-engine, nws-ingest, nws-zones, power-outage-scrape, sos-status, x-intel-scrape

Legacy EFs still function on Supabase but should be migrated to Deno.serve for consistency.

### Critical Fixes Applied (2026-04-02)
1. **intake-write: taxonomy_code** — Was dropping taxonomy_code on all new submissions. Fixed: now passes taxonomy_code on both needs (requests) and offers (resources).
2. **intake-write: source field** — Was writing null. Fixed: now sets `source: 'citizen'` on both requests and offers.
3. **resource-search** — Already correct: uses category_aliases table, searches taxonomy_code + category, returns consistent field names.
4. **Dead 211-search** — Archived subfolder that referenced dropped external_resources table.
