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

### Chunk C: Directory — Request CRUD
**Backend:** crm-cases EF needs: `create_request`, `update_request`, `cancel_request`
**Frontend:**
1. "New request" button → modal with person, category, urgency, location, household info
2. Request detail: inline-edit status, urgency, category
3. Request detail: cancel/close button
4. Link request to existing case (or auto-create case)

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
| crm-cases | create_case, update_case, archive_case, assign_case, create_request, update_request, cancel_request | 3 hrs |
| crm-directory | create_person, delete_person, create_resource, update_resource, delete_resource, create_org, update_org | 2 hrs |
| crm-settings | update_org_info, invite_member, remove_member, change_role | 1.5 hrs |
| volunteer-mgmt | assign_volunteer, update_volunteer_status (new EF) | 1 hr |
| Total | | ~7.5 hrs |

## Priority Order
1. **Chunk E** (Settings save) — users expect this to work, smallest effort
2. **Chunk A** (Cases CRUD) — core CRM function
3. **Chunk B** (Person CRUD) — second most used
4. **Chunk C** (Request CRUD) — tied to cases
5. **Chunk F** (Match flow) — partially done
6. **Chunk H** (Calendar) — APIs exist, just wire UI
7. **Chunk D** (Resource + Org) — less frequent edits
8. **Chunk G** (Transport) — ERV-specific
9. **Chunk I** (Inventory) — APIs exist
10. **Chunk J** (Volunteers) — needs new EF
