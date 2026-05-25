# CRM Edit Functions Build Plan

## Current State
- 17 write APIs exist in lib/api.ts
- Most pages are READ-ONLY — buttons exist but handlers are missing or log to console
- EFs support: list_soses, list, detail, get_person, update_person, org_members, org_stats, browse_persons, browse_orgs, get_settings, update_profile, update_modules

## Chunk Sequence (by page)

### Chunk A: Cases — CRUD + Status Management
**Backend:** crm-cases EF needs new actions: `create_case`, `update_case`, `archive_case`, `assign_case`
**Frontend:**
1. "New case" button → modal with person picker + category + urgency + notes
2. Case detail: inline-edit fields (status, urgency, assigned_to, notes)
3. Case list: drag-to-change-status already works via crmCaseAction
4. Case detail: "Add note" composer → wire to crmCaseAction("add_case_note") ✅ DONE
5. Case detail: archive/close button
6. Case detail: assign to org dropdown

### Chunk B: Directory — Person CRUD
**Backend:** crm-directory EF needs: `create_person`, `delete_person` (update_person exists)
**Frontend:**
1. "Add person" button on directory → modal with name, phone, email, org
2. Person detail: inline-edit name, phone, email, org assignment
3. Person detail: "Edit" mode toggle (pencil icon → fields become editable)
4. Person detail: delete/archive button with confirmation
5. Import page: wire CSV import to bulk create_person

### Chunk C: Directory — Request + Resource CRUD (via partner-write)
**Backend:** NO new EFs needed — use `partner-write` (existing). This is the canonical path.
`partner-write` handles: taxonomy validation, SOS umbrella find-or-create, location geocoding, household resolution, sos-sync to SOS DB, all intake fields.
A raw `create_request` in crm-cases would bypass all of that — don't do it.
**Frontend:**
1. "New request" button → modal calls `api.efCall('partner-write', { person_name, phone, records: [{ type: 'request', taxonomy_code, urgency, ... }] })`
2. "New resource" button → same path with `type: 'resource'`
3. Request detail: status change → `partner-update` (updates partner DB + syncs to SOS)
4. Request detail: cancel/close → `partner-update` with `action: 'cancel_request'`
5. Resource detail: edit capacity/status → `partner-update`

### Chunk D: Directory — Resource + Org CRUD
**Backend:** crm-directory EF needs: `create_resource`, `update_resource`, `delete_resource`, `create_org`, `update_org`
**Frontend:**
1. Resource detail: edit capacity, status, category
2. Resource list: "Add resource" modal
3. Org detail: edit name, contact info, capabilities, counties
4. Org list: "Add org" modal
5. Org detail: invite member, remove member

### Chunk E: Settings — Save All Fields
**Backend:** crm-settings EF has update_profile + update_modules
**Frontend:**
1. Org settings: wire Save button to updatePortalConfig (API exists ✅)
2. Org settings: edit org name, description, logo URL
3. People settings: invite new member (email input + role picker + send)
4. People settings: remove member button with confirmation
5. People settings: change member role dropdown
6. Profile settings: edit name, email, phone, avatar
7. Profile settings: notification preferences toggles
8. Module picker: wire to crmSetModules (API exists ✅)

### Chunk F: Match — Full Accept/Decline Flow
**Backend:** match-engine EF has score/propose/commit modes ✅
**Frontend:**
1. Accept flow: confirmation modal → commit match → update UI
2. Decline flow: reason picker → reject → move to next candidate ✅ DONE
3. Batch actions: select multiple requests → bulk assign
4. Match detail: show timeline of match lifecycle

### Chunk G: Transport — Assignment CRUD
**Backend:** transportCreate, transportUpdateStatus exist ✅
**Frontend:**
1. "New assignment" modal → pick driver, RV, destination
2. Assignment status update buttons (dispatch, in_transit, delivered, completed)
3. Report issue button (transportReportIssue exists ✅)
4. Location update (for driver tracking)

### Chunk H: Calendar — Event CRUD
**Backend:** crmEventsCreate, crmEventsUpdate, crmEventsDelete exist ✅
**Frontend:**
1. "New event" modal ✅ EXISTS (verify it works)
2. Edit event (click event → edit modal)
3. Delete event with confirmation
4. Drag to reschedule (if calendar supports it)

### Chunk I: Inventory — Item Management
**Backend:** writeInventory, inventoryUpdateCondition exist ✅
**Frontend:**
1. "Add item" modal → category, quantity, condition, facility
2. Move item between facilities (inventoryMoveToFacility exists ✅)
3. Update condition (slider/dropdown)
4. Facility CRUD (add/edit facility)

### Chunk J: Volunteers — Assignment + Management
**Backend:** Needs new EF actions: `assign_volunteer`, `update_volunteer_status`
**Frontend:**
1. "Add volunteer" modal
2. Assign volunteer to case/event
3. Update volunteer status (available/assigned/on_break)
4. Volunteer detail: edit skills, availability, certifications

## Backend Work Summary
| EF | New Actions Needed | Effort |
|----|-------------------|--------|
| crm-cases | update_case, archive_case, assign_case (create goes through partner-write) | 1.5 hrs |
| crm-directory | create_person, delete_person, create_resource, update_resource, delete_resource, create_org, update_org | 2 hrs |
| crm-settings | update_org_info, invite_member, remove_member, change_role | 1.5 hrs |
| volunteer-mgmt | assign_volunteer, update_volunteer_status (new EF) | 1 hr |
| crm-chat | list_messages, send_message, message_stats + chat_analytics view | 4 hrs |
| Total | | ~11.5 hrs |

### Chunk K: Chat-on-Record — Persistent, Entity-Linked Conversations
**Why:** Every CRM needs chat threads tied to records. Currently CommandPalette chat is ephemeral — no persistence, no entity linking, no analytics.

**DB tables (already exist):**
- `messages` — chat threads on any entity (match, request, resource, report, sos, sitrep). Has: entity_type, entity_id, person_id, org_id, content, created_at, role (user/agent/system)
- `notes` — internal staff notes (separate from citizen-facing messages)
- `chat_sessions` — citizen chat persistence (already works for citizen portal)

**Backend:**
1. New EF action: `crm-chat` — read/write messages scoped by entity_type + entity_id + org_id
   - `list_messages(entity_type, entity_id, org_id)` → paginated thread
   - `send_message(entity_type, entity_id, org_id, person_id, content, role)` → insert + return
   - `message_stats(org_id, date_range)` → aggregate counts by entity_type, response times, volume trends
2. Update `/api/chat` to accept `entityType` + `entityId` params, store conversation turns in `messages` table
3. Add `chat_analytics` view (or materialized view) for reporting:
   - Messages per org per day/week
   - Avg response time (first message → first reply)
   - Chat volume by entity type (cases vs requests vs resources)
   - Active threads (messages in last 7d)
   - Person engagement score (messages sent, topics discussed)

**Frontend:**
1. ChatPanel component — slide-out or inline chat on detail pages
   - Loads history from `messages` where entity_type + entity_id match
   - Real-time input + send → stores via `crm-chat` EF
   - Shows agent (AI) and human messages with distinct styling
   - Thread is linked to: person_id (who chatted), org_id (which org context), entity_id (which record)
2. Wire ChatPanel into: case detail, request detail, resource detail, person detail, org detail
3. CommandPalette persistence: store Cmd+K conversations linked to current page entity
4. Chat analytics dashboard (in Reports page):
   - Volume over time chart
   - Response time distribution
   - Top chatted records
   - Chat-to-resolution correlation

**Analytics capability:**
- Every message stored with: person_id, org_id, entity_type, entity_id, timestamp, role
- Can query: "Show me all chats about housing requests in Buncombe County last month"
- Can query: "Which orgs respond fastest to citizen messages?"
- Can query: "What are the most common topics across all chats?" (via AI summarization)
- Feed into SIGNAL intelligence extraction (nightly)

**Effort:** ~4 hrs backend (EF + view), ~4 hrs frontend (ChatPanel + wiring to 5 pages + analytics)

## Priority Order
1. **Chunk E** (Settings save) — users expect this to work, smallest effort
2. **Chunk A** (Cases CRUD) — core CRM function
3. **Chunk K** (Chat-on-record) — ties conversations to people + orgs + records, enables analytics
4. **Chunk B** (Person CRUD) — second most used
5. **Chunk C** (Request CRUD) — tied to cases
6. **Chunk F** (Match flow) — partially done
7. **Chunk H** (Calendar) — APIs exist, just wire UI
8. **Chunk D** (Resource + Org) — less frequent edits
9. **Chunk G** (Transport) — ERV-specific
10. **Chunk I** (Inventory) — APIs exist
11. **Chunk J** (Volunteers) — needs new EF
