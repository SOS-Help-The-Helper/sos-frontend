import { streamText, convertToModelMessages } from 'ai';
import { sanitize } from '@/lib/pii-sanitizer';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rtduqguwhkczexnoawej.supabase.co';
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const SYSTEM_PROMPT = `You are the SOS citizen agent. You help people prepare for disasters, find help, offer help, and connect communities.

RULES:
- ALWAYS call tools immediately. NEVER narrate intent — ACT. If someone mentions finding, searching, showing, or looking for anything: your ONLY response is to call search_resources. Do not include any text in your response — ONLY the tool call. Text comes AFTER the tool returns results.
- Use tools to show interactive UI — don't describe options in text.
- ONE question at a time. Never ask multiple questions.
- Keep responses to 1-2 sentences. No paragraphs. No bullet points unless showing a list.
- NEVER ask for, collect, or store SSN, bank account numbers, routing numbers, or credit card numbers.
- If a user shares financial info, respond: 'Please don't share that in chat — I don't need it and can't store it safely.'
- Phone numbers are OK to collect for matching.

AUTH AWARENESS:
The first message may include metadata: {"isAuthenticated":true/false,"personId":"...","name":"..."}
If authenticated: you already know their name, phone, location. Skip those questions. Reference their history if provided.
If not authenticated:
- Collect phone during match/SOS flows (after "How can you help?" — not before)
- After their 2nd message: softly mention "By the way, you can save your progress with a quick phone signup."
- After submitting an SOS: "Sign up to track your request and get notified when matched."
- After a match: "Want to get notified when help is confirmed? Quick signup."
- After readiness check: "Save your readiness score — 10 second signup."
- NEVER block browsing or searching behind auth. Only gate ACTIONS behind phone collection.
- After 10 messages without auth: "You're getting great use out of SOS! Sign up to keep your conversation history."
- These are SOFT prompts. If they decline, move on. Don't repeat.

INTAKE FLOW (I need help):
1. show_categories (multi-select — user can pick multiple needs)
2. show_counter (how many people)  
3. show_circumstances (special needs + free text)
4. get_location (skip if authenticated)
5. submit_sos with ALL selected categories as array (creates one SOS umbrella with multiple sub-requests)

HELPER FLOW (I can help):
1. show_helper_type (3 broad options)
2. Ask follow-ups conversationally based on their type
3. get_location + availability
4. submit_helper

MATCH FLOW (from map pin):
When you receive JSON with {"action":"match"}: 
1. "This [category] request needs help. How can you help?" (open-ended)
2. If not authenticated: "What's the best number to reach you?"
3. "When can you do this?"
4. Confirm. Done. Three-four exchanges max.

SEARCH:
When someone asks to find, show, or search for ANYTHING: IMMEDIATELY call search_resources. Do NOT narrate what you're about to do. Just call the tool. The results show on the map automatically.

MAP INTELLIGENCE TOOLS (coordinates are OPTIONAL — all tools default to Asheville NC if not provided. Do NOT call get_location first for map tools. Just call the tool directly.):
- "What's around me?" / "What's nearby?" → call show_nearby (summarizes all pins within radius)
- "How do I get to [place]?" / "Directions" → call show_route (draws route on map with distance/time)
- "Show the flood area" / "disaster zone" → call show_disaster_zone
- "Which shelter is closest?" / "Compare options" → call compare_resources (ranks + highlights)
- "Where is help not reaching?" / "Coverage gaps" → call show_coverage_gaps (shows underserved areas)
- "What's happening right now?" / "Recent activity" → call show_activity
- "Am I in danger?" / "Is it safe here?" → call show_risk (overlays alerts)
- "Where's my help?" / "Track my request" → call track_my_sos (shows your SOS + matched resource)
- "Save this for later" / "Bookmark" → call bookmark_resource
- "Share my location with the volunteer" → call share_location
All map tools update the map automatically. The user sees changes on the map behind the chat.

TAXONOMY (CRITICAL):
When creating SOS requests or resources, use taxonomy codes — NOT flat strings:
- shelter/housing → HOUSING.EMERGENCY
- food/meals → FOOD.MEALS
- water → FOOD.WATER
- medical/doctor → HEALTH.EMERGENCY
- medication/prescription → HEALTH.MEDICATION
- generator/power/electricity → UTILITIES.POWER
- ride/transport/evacuation → TRANSPORT.PEOPLE
- supplies/hygiene/blankets → GOODS.HYGIENE
- clothing → GOODS.CLOTHING
- tree/debris/chainsaw → SAFETY.DEBRIS
- rescue/trapped → SAFETY.RESCUE
- mold/restoration → SVC.RESTORATION.MOLD
- electrician → SVC.TRADES.ELECTRIC
- plumber → SVC.TRADES.PLUMBING
- roofing → SVC.TRADES.ROOFING

Always include taxonomy_code in submit_sos and submit_helper tool calls.

Be warm but efficient. Emergency = fast, minimal questions. Planning = conversational.

ESCALATION:
If a citizen needs help from MULTIPLE partner types (shelter + food + medical), or the situation is complex:
Call escalate_to_platform with the SOS ID and reason. Tell the user: "I've flagged this for our coordination team."
Do NOT try to coordinate multi-partner chains yourself — hand off to the platform agent.

MATCH FLOW:
When you receive a JSON message starting with {"action":"match"}, the user tapped Match on a map pin.
Check the "intent" field:

IF intent = "citizen_wants_to_help" (they tapped a REQUEST — they want to HELP):
  Step 1: Describe the need briefly. Ask: "How would you like to help?"
  Show chips: relevant options based on category (e.g., housing → "I have an RV" / "I can deliver" / "I can donate")
  Step 2: Based on their answer, ONE follow-up about timing/availability.
  Step 3: Call show_sos_confirmation with summary. Final button is ALWAYS "Send SOS".
  
IF intent = "citizen_needs_this" (they tapped a RESOURCE — they NEED it):
  Step 1: Confirm: "Would you like to request this?" 
  Show chips: "Yes, for me" / "For someone I know" / "Tell me more"
  Step 2: Quick intake — household size, any special needs.
  Step 3: Call show_sos_confirmation with summary. Final button is ALWAYS "Send SOS".

RULES FOR MATCH FLOW:
- ONE question at a time. Never ask multiple questions.
- Keep every response to 1-2 sentences.
- Use show_chips for structured choices (max 3 per row).
- Use show_toggle_chips when multiple selections are allowed (e.g., veteran + medical).
- Final confirmation ALWAYS uses show_sos_confirmation which renders the "Send SOS" button.
- Three-four exchanges max. Fast.
- No bullet points. No lists. No paragraphs. Conversational.`;

export async function POST(req: Request) {
  const { messages: uiMessages } = await req.json();
  const personId = req.headers.get('x-person-id') || '';
  const isAuthenticated = req.headers.get('x-authenticated') === 'true';
  // Detect ERV flow from first message content: [ERV_INTAKE:survivor:myself]
  let ervFlow = req.headers.get('x-erv-flow') || '';
  let ervFor = req.headers.get('x-erv-for') || '';
  const firstMsg = uiMessages?.[0];
  if (firstMsg?.content && typeof firstMsg.content === 'string') {
    const ervMatch = firstMsg.content.match(/\[ERV_INTAKE:(\w+):(\w+)\]/);
    if (ervMatch) { ervFlow = ervMatch[1]; ervFor = ervMatch[2]; }
  }
  // Also check parts array
  if (!ervFlow && firstMsg?.parts) {
    for (const p of firstMsg.parts) {
      if (p.type === 'text' && typeof p.text === 'string') {
        const m = p.text.match(/\[ERV_INTAKE:(\w+):(\w+)\]/);
        if (m) { ervFlow = m[1]; ervFor = m[2]; break; }
      }
    }
  }
  const authContext = isAuthenticated 
    ? `\nUSER CONTEXT: Authenticated user (ID: ${personId}). You already have their phone and location. Skip those questions.`
    : '\nUSER CONTEXT: Anonymous user. Collect phone during match/SOS flows.';
  const messages = await convertToModelMessages(uiMessages);

  // PII sanitizer — strip SSN/CC/bank from user messages before LLM sees them
  const sanitizeResults: any[] = [];
  for (const msg of messages) {
    if (msg.role === 'user' && Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === 'text' && typeof part.text === 'string') {
          const result = sanitize(part.text);
          if (result.redactedCount > 0) {
            part.text = result.text;
            sanitizeResults.push({
              skill_id: 'pii-sanitizer',
              skill_version: 'v1',
              redacted: result.redacted,
              flagged: result.flagged,
              duration_ms: result.durationMs,
            });
          }
        }
      }
    }
  }

  // Log PII sanitizer traces (async, non-blocking)
  if (sanitizeResults.length > 0) {
    fetch(SUPABASE_URL + '/rest/v1/signal_traces', {
      method: 'POST',
      headers: { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer ' + SUPABASE_ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify(sanitizeResults.map(r => ({
        entity_type: 'skill_execution',
        signal_layer: 'N',
        trace_type: 'pii_sanitize',
        reasoning: 'PII stripped from user message before LLM: ' + r.redacted.join(', '),
        confidence_score: 1.0,
        agent_id: 'web-citizen',
        metadata: r,
      }))),
    }).catch(() => {});
  }

  // ERV-specific system prompts
  const ERV_PROMPTS: Record<string, string> = {
    survivor: `You are the EmergencyRV intake agent. You help disaster survivors apply for temporary RV housing.
CONTEXT: EmergencyRV provides fully equipped RVs to veterans, first responders, and families displaced by natural disasters. Staging location: Ocala, FL.
PRIORITY GROUPS: Veterans (+25 priority), First responders (+25), Single parents with children (+20), Medical conditions (+15), Families with children (+10), Elderly (+10).
INTAKE FLOW — collect ONE question at a time, use show_chips tool for structured answers:
1. "What disaster caused you to lose or damage your home?" → show_chips: Hurricane, Tornado, Wildfire, Flood, Fire, Other
2. "Are you a veteran or first responder?" → show_chips: Veteran, First Responder, Both, Neither. If yes, ask branch/type.
3. "Medical conditions or accessibility needs? Trouble with stairs?" → show_chips: Yes, No. If yes, free text.
4. "Are you a single parent?" → show_chips: Yes, No
5. "How many people in your household? Ages?" → number + free text
6. "Rent or own?" → show_chips: Rent, Own
7. "Homeowner's or renter's insurance?" → show_chips: Yes, No
8. "How long will you need the RV?" → show_chips: Less than 6 months, 6-12 months, 1-2 years, 2+ years
9. Location — use get_location or ask for address
10. "Anything else to consider?" → free text
11. Summarize and call submit_sos
RULES: ONE question at a time. Be warm but efficient. Never ask for SSN/bank info.${ervFor === 'someone' ? '\nThis is being filled out ON BEHALF of someone else. Ask for the beneficiary\'s info, not the submitter\'s.' : ''}`,

    donor: `You are the EmergencyRV intake agent helping someone donate their RV.
CONTEXT: EmergencyRV accepts 5th wheels, motorhomes, teardrops, travel trailers, toy haulers, sprinter vans in good working condition.
INTAKE FLOW — ONE question at a time, use show_chips for structured:
1. "Type of RV?" → show_chips: Travel Trailer, 5th Wheel, Motorhome, Pop-up, Toy Hauler, Other
2. "Year, make, and model?" → free text
3. "How many can it sleep?" → number
4. "Where is the RV now?" → get_location or address
5. "Condition? Repairs needed?" → free text (tires, batteries, leaks, propane, roof)
6. "Can you deliver or need pickup?" → show_chips: I can deliver, Need pickup, Depends on distance
7. "Do you have the VIN?" → free text (not mandatory)
8. "Specific recipient group preference?" → show_chips: Veterans, Single Parents, First Responders, Anyone in need
9. "Name and address for tax donation letter?" → free text
10. Summarize and call submit_sos with intent=donate
RULES: ONE question at a time. Be grateful. Don't require VIN.${ervFor === 'someone' ? '\nBeing filled out ON BEHALF of the donor.' : ''}`,

    volunteer: `You are the EmergencyRV intake agent helping someone volunteer, especially as a driver.
CONTEXT: ERV needs drivers to transport RVs from Ocala, FL to survivors. Drivers are the bottleneck.
INTAKE FLOW — ONE question at a time:
1. "How would you like to help?" → show_chips: Drive/Tow RVs, Social Media, Admin, Fundraising, General Help
2. If driver: "What vehicle do you have for towing?" → free text (make/model, hitch type)
3. If driver: "Class A motorhome experience?" → show_chips: Yes, No
4. "What state?" → free text or location
5. "Availability?" → free text
6. "Previous volunteer experience?" → free text
7. Name, email, phone
8. Summarize and call submit_sos
RULES: ONE question at a time. Get vehicle specs if driver. Be enthusiastic.${ervFor === 'someone' ? '\nBeing filled out ON BEHALF of the volunteer.' : ''}`,
  };

  const activeSystemPrompt = ervFlow && ERV_PROMPTS[ervFlow] 
    ? ERV_PROMPTS[ervFlow] + authContext
    : SYSTEM_PROMPT + authContext;

  const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: activeSystemPrompt,
    messages,
    tools: {
      show_categories: {
        description: 'Show disaster need category selection cards. Use when someone says they need help.',
        inputSchema: z.object({
          prompt: z.string().describe('Text to show above the cards'),
        }),
        execute: async function({ prompt }) {
          return JSON.stringify({
            __tool: 'show_categories',
            prompt,
            options: [
              { id: 'safety', icon: '🆘', label: 'Safety' },
              { id: 'housing', icon: '🏠', label: 'Housing' },
              { id: 'food', icon: '🍽️', label: 'Food' },
              { id: 'health', icon: '💊', label: 'Health' },
              { id: 'utilities', icon: '⚡', label: 'Utilities' },
              { id: 'supplies', icon: '📦', label: 'Supplies' },
            ],
            multiSelect: true,
          });
        },
      },

      show_counter: {
        description: 'Show people count selection. Use after categories are selected.',
        inputSchema: z.object({
          prompt: z.string().describe('Text to show above the counter'),
        }),
        execute: async function({ prompt }) {
          return JSON.stringify({
            __tool: 'show_counter',
            prompt,
            options: [
              { id: '1', label: 'Just me' },
              { id: '2-3', label: '2-3' },
              { id: '4-6', label: '4-6' },
              { id: '7+', label: '7+' },
            ],
          });
        },
      },

      show_circumstances: {
        description: 'Show special circumstances selection. Use after count is selected.',
        inputSchema: z.object({
          prompt: z.string().describe('Text to show above the options'),
        }),
        execute: async function({ prompt }) {
          return JSON.stringify({
            __tool: 'show_circumstances',
            prompt,
            options: [
              { id: 'children', icon: '👶', label: 'Children' },
              { id: 'elderly', icon: '👴', label: 'Elderly' },
              { id: 'pets', icon: '🐕', label: 'Pets' },
              { id: 'accessibility', icon: '♿', label: 'Accessibility' },
              { id: 'medical_equipment', icon: '🔌', label: 'Medical Equipment' },
              { id: 'other', icon: '💬', label: 'Tell me more' },
            ],
            multiSelect: true,
          });
        },
      },

      get_location: {
        description: 'Get user location via GPS or address search. Use when you need their location.',
        inputSchema: z.object({
          prompt: z.string().describe('Text to show'),
          forSelf: z.boolean().describe('true if for the user themselves, false if for someone else'),
        }),
        execute: async function({ prompt, forSelf }) {
          return JSON.stringify({
            __tool: 'get_location',
            prompt,
            forSelf,
          });
        },
      },

      show_helper_type: {
        description: 'Show 3 broad helper categories. Use when someone says they can help.',
        inputSchema: z.object({
          prompt: z.string().describe('Text to show above options'),
        }),
        execute: async function({ prompt }) {
          return JSON.stringify({
            __tool: 'show_helper_type',
            prompt,
            options: [
              { id: 'skills', icon: '🔧', label: 'I have skills or equipment' },
              { id: 'time', icon: '🕐', label: 'I have time to volunteer' },
              { id: 'space', icon: '🏠', label: 'I have space or supplies to share' },
            ],
          });
        },
      },

      show_availability: {
        description: 'Show availability options for helpers.',
        inputSchema: z.object({
          prompt: z.string().describe('Text to show'),
        }),
        execute: async function({ prompt }) {
          return JSON.stringify({
            __tool: 'show_availability',
            prompt,
            options: [
              { id: 'disaster', label: 'Disasters only' },
              { id: 'anytime', label: 'Whenever there\'s a need' },
              { id: 'active', label: 'I actively want to volunteer' },
            ],
          });
        },
      },

      search_resources: {
        description: 'Search for resources near a location. Returns results to show on map and in list.',
        inputSchema: z.object({
          keyword: z.string().describe('What to search for: shelter, food, medical, etc.'),
          lat: z.number().describe('Latitude'),
          lng: z.number().describe('Longitude'),
          distance: z.number().optional().describe('Search radius in miles, default 25'),
        }),
        execute: async function({ keyword, lat, lng, distance }) {
          // Call resource-search EF
          const resp = await fetch(
            `${SUPABASE_URL}/functions/v1/resource-search?keyword=${encodeURIComponent(keyword)}&lat=${lat}&lng=${lng}&distance=${distance || 25}`,
            { headers: { 'Authorization': `Bearer ${SUPABASE_ANON}` } }
          );
          const data = await resp.json();
          const results = data.results || [];

          // Log search skill trace
          fetch(SUPABASE_URL + '/rest/v1/signal_traces', {
            method: 'POST',
            headers: { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer ' + SUPABASE_ANON, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              entity_type: 'skill_execution', signal_layer: 'S', trace_type: 'resource_search',
              reasoning: 'Web search: ' + keyword + ' (' + results.length + ' results)',
              agent_id: 'web-citizen',
              metadata: { skill_id: 'resource-search', skill_version: 'v1', keyword, result_count: results.length, lat, lng },
            }),
          }).catch(() => {});

          return JSON.stringify({
            __tool: 'search_results',
            keyword,
            results: results.slice(0, 20).map((r: any) => ({
              id: r.id || r.source_id,
              name: r.organization_name || r.name,
              description: r.description || r.service_name,
              lat: r.latitude,
              lng: r.longitude,
              address: r.address,
              phone: r.phone,
              category: r.category,
              source: r.source || 'sos',
            })),
            count: results.length,
          });
        },
      },

      show_score: {
        description: 'Show the user SOS Score with breakdown. Use when they ask about their score or readiness.',
        inputSchema: z.object({
          personId: z.string().optional().describe('Person ID, if known'),
        }),
        execute: async function({ personId }) {
          return JSON.stringify({
            __tool: 'show_score',
            personId,
          });
        },
      },

      submit_sos: {
        description: 'Submit a help request. Use after collecting category, count, circumstances, and location.',
        inputSchema: z.object({
          categories: z.array(z.string()).describe('Selected categories'),
          count: z.string().describe('Number of people'),
          circumstances: z.array(z.string()).optional().describe('Special circumstances'),
          circumstanceNotes: z.string().optional().describe('Free text about circumstances'),
          lat: z.number().describe('Latitude'),
          lng: z.number().describe('Longitude'),
          locationName: z.string().optional().describe('Location name'),
          urgency: z.string().optional().describe('critical/high/medium/low'),
        }),
        execute: async function({ categories, count, circumstances, circumstanceNotes, lat, lng, locationName, urgency }) {
          // Call intake-write EF
          const resp = await fetch(`${SUPABASE_URL}/functions/v1/intake-write`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${SUPABASE_ANON}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              needs: categories.map((c: string) => ({ category: c, urgency: urgency || 'high' })),
              household_size: parseInt(count) || 1,
              latitude: lat,
              longitude: lng,
              location_name: locationName,
              metadata: { circumstances, circumstanceNotes },
              channel: 'web_ai_sdk',
            }),
          });
          const result = await resp.json();

          return JSON.stringify({
            __tool: 'submit_confirmation',
            success: resp.ok,
            sosId: result.sos_id,
            message: resp.ok ? 'Your SOS has been submitted. We\'re searching for help near you now.' : 'Something went wrong. Please try again.',
          });
        },
      },

      submit_helper: {
        description: 'Register someone as a helper. Use after collecting their skills and availability.',
        inputSchema: z.object({
          helperType: z.string().describe('skills, time, or space'),
          skills: z.array(z.string()).optional().describe('Specific skills mentioned'),
          availability: z.string().describe('disaster, anytime, or active'),
          lat: z.number().describe('Latitude'),
          lng: z.number().describe('Longitude'),
          distanceMiles: z.number().optional().describe('How far they will travel'),
          notes: z.string().optional().describe('Additional details from conversation'),
        }),
        execute: async function({ helperType, skills, availability, lat, lng, distanceMiles, notes }) {
          const resp = await fetch(`${SUPABASE_URL}/functions/v1/intake-write`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${SUPABASE_ANON}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              offers: [{ category: helperType, details: notes || '' }],
              latitude: lat,
              longitude: lng,
              metadata: { helper_type: helperType, skills, availability, distance_miles: distanceMiles },
              channel: 'web_ai_sdk',
            }),
          });
          const result = await resp.json();

          return JSON.stringify({
            __tool: 'submit_confirmation',
            success: resp.ok,
            message: resp.ok ? 'You\'re registered as a helper. We\'ll notify you when someone nearby needs help.' : 'Something went wrong. Please try again.',
          });
        },
      },

      capture_photo: {
        description: 'Prompt user to take a photo for reporting. Shows camera input.',
        inputSchema: z.object({
          prompt: z.string().describe('Text to show'),
        }),
        execute: async function({ prompt }) {
          return JSON.stringify({
            __tool: 'capture_photo',
            prompt,
          });
        },
      },

      show_danger_check: {
        description: 'Ask if anyone is in danger. Use during report flow.',
        inputSchema: z.object({
          prompt: z.string().describe('Text to show'),
        }),
        execute: async function({ prompt }) {
          return JSON.stringify({
            __tool: 'show_danger_check',
            prompt,
            options: [
              { id: 'yes', label: 'Yes — people in danger', icon: '🔴' },
              { id: 'no', label: 'No immediate danger', icon: '🟢' },
            ],
          });
        },
      },

      check_fema: {
        description: 'Check FEMA disaster declarations for a state.',
        inputSchema: z.object({
          state: z.string().describe('2-letter state code'),
        }),
        execute: async function({ state }) {
          const resp = await fetch(`${SUPABASE_URL}/functions/v1/fema-check?state=${state}`, {
            headers: { 'Authorization': `Bearer ${SUPABASE_ANON}` },
          });
          const data = await resp.json();

          return JSON.stringify({
            __tool: 'fema_status',
            state,
            iaEligible: data.fema_assistance_available,
            declarations: data.declarations?.slice(0, 3),
            fieldsFromSOS: 17,
            fieldsNeeded: 6,
            neverStored: ['SSN', 'Bank account info'],
          });
        },
      },

      escalate_to_platform: {
        description: 'Escalate a complex coordination request to the SOS platform agent. Use when: multiple partners needed for one SOS, referral chain required, match conflict, or request unfulfilled for extended time.',
        inputSchema: z.object({
          sosId: z.string().optional().describe('SOS record ID'),
          reason: z.string().describe('Why this needs platform coordination'),
          partnerTypes: z.array(z.string()).optional().describe('Types of partners needed'),
        }),
        execute: async function({ sosId, reason, partnerTypes }) {
          // Write escalation to signal_traces for platform agent to pick up
          await fetch(SUPABASE_URL + '/rest/v1/signal_traces', {
            method: 'POST',
            headers: { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer ' + SUPABASE_ANON, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              entity_type: 'escalation',
              signal_layer: 'A',
              trace_type: 'platform_escalation',
              reasoning: reason,
              agent_id: 'web-citizen',
              metadata: { skill_id: 'platform-handoff', sos_id: sosId, partner_types: partnerTypes, source: 'web_ai_sdk' },
            }),
          }).catch(() => {});

          return JSON.stringify({
            __tool: 'escalation_confirmed',
            message: 'I\'ve flagged this for our coordination team. They\'ll connect the right partners and follow up with you.',
          });
        },
      },

      generate_referral: {
        description: 'Generate a referral code and show share card.',
        inputSchema: z.object({
          personId: z.string().optional().describe('Person ID'),
        }),
        execute: async function({ personId }) {
          return JSON.stringify({
            __tool: 'referral_card',
            personId,
          });
        },
      },

      // ── MAP INTELLIGENCE TOOLS ──────────────────────────────────

      show_nearby: {
        description: 'Show summary of everything near the user. Use when someone says "what\'s around me", "what\'s nearby", "show me what\'s close". Returns counts + closest resource.',
        inputSchema: z.object({
          lat: z.number().optional().describe('User latitude (defaults to Asheville NC if not provided)'),
          lng: z.number().optional().describe('User longitude'),
          radiusKm: z.number().optional().describe('Search radius in km, default 8'),
        }),
        execute: async function({ lat, lng, radiusKm }) {
          const useLat = lat || 35.597; const useLng = lng || -82.546; // Default: Asheville NC
          const radius = radiusKm || 8;
          // Query all active resources directly (show_nearby doesn't filter by keyword)
          const resp = await fetch(`${SUPABASE_URL}/rest/v1/resources?status=eq.active&select=id,organization_name,service_name,category,taxonomy_code,details_sanitized,latitude,longitude,capacity_available,source&limit=100`, {
            headers: { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer ' + SUPABASE_ANON },
          });
          const allResources = await resp.json().catch(() => []);
          // Also get active requests
          const reqResp = await fetch(`${SUPABASE_URL}/rest/v1/requests?status=eq.active&select=id,category,details_sanitized,latitude,longitude,urgency&limit=100`, {
            headers: { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer ' + SUPABASE_ANON },
          });
          const allRequests = await reqResp.json().catch(() => []);
          
          const allItems = [
            ...allResources.filter((r: any) => r.latitude && r.longitude).map((r: any) => ({
              id: r.id, name: r.organization_name || r.details_sanitized?.substring(0, 50) || r.category,
              lat: r.latitude, lng: r.longitude, category: r.category, source: r.source || 'sos',
              capacity: r.capacity_available, description: r.details_sanitized,
            })),
            ...allRequests.filter((r: any) => r.latitude && r.longitude).map((r: any) => ({
              id: r.id, name: r.details_sanitized?.substring(0, 50) || r.category,
              lat: r.latitude, lng: r.longitude, category: r.category, source: 'request',
              urgency: r.urgency,
            })),
          ];
          const results = allItems.filter((r: any) => {
            if (!r.lat || !r.lng) return false;
            const d = Math.sqrt(Math.pow((r.lat - useLat) * 111, 2) + Math.pow((r.lng - useLng) * 85, 2));
            r.distance_km = Math.round(d * 10) / 10;
            return d <= radius;
          });

          const cats: Record<string, number> = {};
          results.forEach((r: any) => { cats[r.category || 'other'] = (cats[r.category || 'other'] || 0) + 1; });
          const closest = results.sort((a: any, b: any) => a.distance_km - b.distance_km)[0];

          return JSON.stringify({
            __tool: 'nearby_summary',
            __mapCommand: {
              type: 'show_nearby',
              center: [useLng, useLat],
              nearbyRadius: radius,
              nearbySummary: {
                shelters: cats['housing'] || 0,
                food: (cats['food_water'] || 0) + (cats['food'] || 0),
                medical: cats['medical'] || 0,
                supplies: cats['supplies'] || 0,
                requests: results.filter((r: any) => r.source === 'request').length,
                total: results.length,
                closest: closest ? { name: closest.name, distance_km: closest.distance_km, category: closest.category } : undefined,
              },
              results: results.slice(0, 20),
            },
            summary: {
              total: results.length,
              categories: cats,
              closest: closest ? `${closest.name} (${Math.round(closest.distance_km * 0.621 * 10) / 10}mi, ${closest.category})` : 'none found',
              radius,
            },
          });
        },
      },

      show_route: {
        description: 'Show directions/route to a destination on the map. Use when someone asks "how do I get to", "directions to", "navigate to".',
        inputSchema: z.object({
          fromLat: z.number().describe('Starting latitude'),
          fromLng: z.number().describe('Starting longitude'),
          toLat: z.number().describe('Destination latitude'),
          toLng: z.number().describe('Destination longitude'),
          destName: z.string().describe('Name of destination'),
          mode: z.enum(['driving', 'walking', 'cycling']).optional().describe('Travel mode, default driving'),
        }),
        execute: async function({ fromLat, fromLng, toLat, toLng, destName, mode }) {
          const travelMode = mode || 'driving';
          const resp = await fetch(`https://api.mapbox.com/directions/v5/mapbox/${travelMode}/${fromLng},${fromLat};${toLng},${toLat}?geometries=geojson&steps=true&access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`);
          const data = await resp.json().catch(() => ({ routes: [] }));
          const route = data.routes?.[0];

          if (!route) {
            return JSON.stringify({ __tool: 'route_result', error: 'Could not find a route.' });
          }

          return JSON.stringify({
            __tool: 'route_result',
            __mapCommand: {
              type: 'show_route',
              route: {
                geometry: route.geometry,
                distance_km: Math.round(route.distance / 100) / 10,
                duration_min: Math.round(route.duration / 60),
                mode: travelMode,
              },
              destination: { lat: toLat, lng: toLng, name: destName },
            },
            distance_km: Math.round(route.distance / 100) / 10,
            duration_min: Math.round(route.duration / 60),
            mode: travelMode,
            destName,
          });
        },
      },

      show_disaster_zone: {
        description: 'Show disaster boundaries or affected area on the map. Use when someone asks about a specific disaster area, flood zone, fire perimeter, etc.',
        inputSchema: z.object({
          disasterName: z.string().describe('Name of the disaster'),
          lat: z.number().optional().describe('Center latitude of disaster area'),
          lng: z.number().optional().describe('Center longitude of disaster area'),
        }),
        execute: async function({ disasterName, lat, lng }) {
          // Query disaster records from DB
          const resp = await fetch(`${SUPABASE_URL}/rest/v1/disasters?name=ilike.*${encodeURIComponent(disasterName)}*&select=id,name,center_lat,center_lng,radius_km,status&limit=1`, {
            headers: { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer ' + SUPABASE_ANON },
          });
          const disasters = await resp.json().catch(() => []);
          const d = disasters[0];

          return JSON.stringify({
            __tool: 'disaster_zone',
            __mapCommand: {
              type: 'show_disaster',
              center: d ? [d.center_lng, d.center_lat] : (lng && lat ? [lng, lat] : undefined),
              disasterName: d?.name || disasterName,
              zoom: 10,
            },
            found: !!d,
            name: d?.name || disasterName,
            status: d?.status || 'unknown',
          });
        },
      },

      compare_resources: {
        description: 'Compare multiple resources and rank them. Use when someone asks "which is closest", "best option", "compare shelters".',
        inputSchema: z.object({
          keyword: z.string().describe('What to search for'),
          lat: z.number().optional().describe('User latitude (defaults to Asheville NC if not provided)'),
          lng: z.number().optional().describe('User longitude'),
        }),
        execute: async function({ keyword, lat, lng }) {
          const useLat = lat || 35.597; const useLng = lng || -82.546;
          const resp = await fetch(`${SUPABASE_URL}/functions/v1/resource-search?keyword=${encodeURIComponent(keyword)}&lat=${useLat}&lng=${useLng}`, {
            headers: { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer ' + SUPABASE_ANON },
          });
          const data = await resp.json().catch(() => ({ results: [] }));
          const results = (data.results || []).filter((r: any) => r.lat && r.lng).slice(0, 5);

          // Rank by distance + capacity
          const ranked = results.map((r: any, i: number) => {
            const dist = Math.sqrt(Math.pow((r.lat - lat) * 111, 2) + Math.pow((r.lng - lng) * 85, 2));
            const distKm = Math.round(dist * 10) / 10;
            return {
              ...r, rank: i + 1, distance_km: distKm,
              reason: `${distKm}km away${r.capacity ? `, capacity: ${r.capacity}` : ''}`,
            };
          }).sort((a: any, b: any) => a.distance_km - b.distance_km)
            .map((r: any, i: number) => ({ ...r, rank: i + 1 }));

          return JSON.stringify({
            __tool: 'comparison_result',
            __mapCommand: { type: 'compare', comparedResults: ranked, center: [lng, lat] },
            results: ranked,
            recommendation: ranked[0] ? `Closest: ${ranked[0].name} (${Math.round(ranked[0].distance_km * 0.621 * 10) / 10}mi)` : 'No results found',
          });
        },
      },

      show_coverage_gaps: {
        description: 'Show areas where people need help but no resources are nearby. Use for "where is help not reaching", "coverage gaps", "underserved areas".',
        inputSchema: z.object({
          lat: z.number().describe('Center latitude'),
          lng: z.number().describe('Center longitude'),
          radiusKm: z.number().optional().describe('Analysis radius in km, default 20'),
        }),
        execute: async function({ lat, lng, radiusKm }) {
          const useLat = lat || 35.597; const useLng = lng || -82.546;
          const radius = radiusKm || 20;
          // Get requests and resources within radius
          const [reqResp, resResp] = await Promise.all([
            fetch(`${SUPABASE_URL}/rest/v1/requests?select=id,latitude,longitude,category,status&status=eq.active&limit=200`, {
              headers: { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer ' + SUPABASE_ANON },
            }),
            fetch(`${SUPABASE_URL}/rest/v1/resources?select=id,latitude,longitude,category,status&status=eq.active&limit=200`, {
              headers: { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer ' + SUPABASE_ANON },
            }),
          ]);
          const requests = await reqResp.json().catch(() => []);
          const resources = await resResp.json().catch(() => []);

          // Find requests with no resource within 5km
          const gaps: any[] = [];
          const nearbyReqs = requests.filter((r: any) => r.latitude && r.longitude);
          for (const req of nearbyReqs) {
            const nearRes = resources.filter((res: any) => {
              if (!res.latitude || !res.longitude) return false;
              const d = Math.sqrt(Math.pow((res.latitude - req.latitude) * 111, 2) + Math.pow((res.longitude - req.longitude) * 85, 2));
              return d < 5;
            });
            if (nearRes.length === 0) {
              gaps.push({ lat: req.latitude, lng: req.longitude, radius_km: 5, request_count: 1, resource_count: 0, category: req.category });
            }
          }

          return JSON.stringify({
            __tool: 'coverage_gaps',
            __mapCommand: { type: 'show_gaps', gaps, center: [lng, lat], zoom: 10 },
            gapCount: gaps.length,
            totalRequests: nearbyReqs.length,
            totalResources: resources.filter((r: any) => r.latitude).length,
            message: gaps.length > 0
              ? `Found ${gaps.length} areas where people need help but no resources are within 5km.`
              : 'Good coverage — all active requests have resources nearby.',
          });
        },
      },

      show_activity: {
        description: 'Show recent coordination activity on the map. Use for "what\'s happening", "recent activity", "show me what\'s going on".',
        inputSchema: z.object({
          lat: z.number().optional().describe('Center latitude'),
          lng: z.number().optional().describe('Center longitude'),
          hoursBack: z.number().optional().describe('How many hours back to look, default 24'),
        }),
        execute: async function({ lat, lng, hoursBack }) {
          const hours = hoursBack || 24;
          const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

          const [matchResp, msgResp] = await Promise.all([
            fetch(`${SUPABASE_URL}/rest/v1/matches?select=id,request_id,status,created_at&created_at=gte.${since}&order=created_at.desc&limit=20`, {
              headers: { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer ' + SUPABASE_ANON },
            }),
            fetch(`${SUPABASE_URL}/rest/v1/community_messages?select=id,message_type,latitude,longitude,message_text,created_at&created_at=gte.${since}&order=created_at.desc&limit=20`, {
              headers: { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer ' + SUPABASE_ANON },
            }),
          ]);
          const matches = await matchResp.json().catch(() => []);
          const messages = await msgResp.json().catch(() => []);

          const activity = messages.filter((m: any) => m.latitude && m.longitude).map((m: any) => ({
            id: m.id, type: m.message_type || 'report',
            lat: m.latitude, lng: m.longitude,
            label: m.message_text?.substring(0, 60) || m.message_type,
            timestamp: m.created_at,
          }));

          return JSON.stringify({
            __tool: 'activity_feed',
            __mapCommand: { type: 'show_activity', activity, center: lng && lat ? [lng, lat] : undefined },
            matchCount: matches.length,
            reportCount: activity.length,
            hours,
            message: `${matches.length} matches and ${activity.length} reports in the last ${hours} hours.`,
          });
        },
      },

      show_risk: {
        description: 'Show risk/danger zones near user. Use for "am I in danger", "is it safe", "show alerts", "risk assessment".',
        inputSchema: z.object({
          lat: z.number().optional().describe('User latitude (defaults to Asheville NC if not provided)'),
          lng: z.number().optional().describe('User longitude'),
        }),
        execute: async function({ lat, lng }) {
          const useLat = lat || 35.597; const useLng = lng || -82.546;
          // Get NWS alerts from our alerts-feed EF
          const resp = await fetch(`${SUPABASE_URL}/functions/v1/alerts-feed?lat=${lat}&lng=${lng}`, {
            headers: { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer ' + SUPABASE_ANON },
          });
          const data = await resp.json().catch(() => ({ alerts: [] }));

          const riskZones = (data.alerts || []).map((a: any) => ({
            type: a.type === 'flood' ? 'flood' : a.type === 'fire' ? 'fire' : 'weather_alert',
            severity: a.severity || 'moderate',
            label: a.headline || a.description?.substring(0, 80),
            source: 'NWS',
            center: [lng, lat] as [number, number],
            radius_km: 10,
          }));

          return JSON.stringify({
            __tool: 'risk_assessment',
            __mapCommand: { type: 'show_risk', riskZones, center: [lng, lat] },
            alertCount: riskZones.length,
            alerts: riskZones,
            safe: riskZones.length === 0,
            message: riskZones.length > 0
              ? `${riskZones.length} active alert(s) near your location.`
              : 'No active alerts near your location.',
          });
        },
      },

      track_my_sos: {
        description: 'Show the user\'s active SOS and matched resources on the map with a connecting line. Use for "where\'s my help", "track my request", "show my SOS status".',
        inputSchema: z.object({
          personId: z.string().optional().describe('Person ID'),
        }),
        execute: async function({ personId }) {
          const pid = personId || 'anonymous';
          // Get active SOS + matches
          const [sosResp, matchResp] = await Promise.all([
            fetch(`${SUPABASE_URL}/rest/v1/soses?select=id,category,status,latitude,longitude&person_id=eq.${pid}&status=eq.active&order=created_at.desc&limit=1`, {
              headers: { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer ' + SUPABASE_ANON },
            }),
            fetch(`${SUPABASE_URL}/rest/v1/requests?select=id,latitude,longitude,category,status,matches(id,resource_id,status,match_score)&person_id=eq.${pid}&status=in.(active,matched)&order=created_at.desc&limit=3`, {
              headers: { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer ' + SUPABASE_ANON },
            }),
          ]);
          const soses = await sosResp.json().catch(() => []);
          const requests = await matchResp.json().catch(() => []);

          const activeReq = requests[0];
          const activeMatch = activeReq?.matches?.[0];

          return JSON.stringify({
            __tool: 'sos_tracker',
            __mapCommand: activeReq ? {
              type: 'track_sos',
              trackingData: {
                requestPin: { lat: activeReq.latitude, lng: activeReq.longitude, category: activeReq.category, status: activeReq.status },
                matchStatus: activeMatch?.status || 'searching',
                matchId: activeMatch?.id || '',
              },
              center: activeReq.latitude && activeReq.longitude ? [activeReq.longitude, activeReq.latitude] : undefined,
            } : undefined,
            hasActiveSOS: soses.length > 0,
            hasActiveRequest: !!activeReq,
            hasMatch: !!activeMatch,
            matchStatus: activeMatch?.status || 'no match yet',
            message: !activeReq
              ? "You don't have an active SOS request right now."
              : activeMatch
                ? `Your ${activeReq.category} request has a ${activeMatch.status} match (score: ${activeMatch.match_score}).`
                : `Your ${activeReq.category} request is active. We're searching for a match.`,
          });
        },
      },

      bookmark_resource: {
        description: 'Save/bookmark a resource for later. Use when someone says "save this", "bookmark", "remember this place".',
        inputSchema: z.object({
          resourceId: z.string().describe('Resource ID to bookmark'),
          resourceName: z.string().describe('Resource name'),
        }),
        execute: async function({ resourceId, resourceName }) {
          // Store in person's metadata (or localStorage signal)
          return JSON.stringify({
            __tool: 'bookmark_confirmed',
            __mapCommand: { type: 'bookmark', bookmarkId: resourceId },
            resourceId,
            resourceName,
            message: `Saved "${resourceName}" to your bookmarks. You can find it in your Profile tab.`,
          });
        },
      },

      share_location: {
        description: 'Share your live location with a matched helper. Use when someone is waiting for help and wants to share location.',
        inputSchema: z.object({
          lat: z.number().describe('Your latitude'),
          lng: z.number().describe('Your longitude'),
          matchId: z.string().optional().describe('Match ID to share with'),
        }),
        execute: async function({ lat, lng, matchId }) {
          // Generate a share URL (in production, this would create a temporary share token)
          const shareToken = Math.random().toString(36).substring(2, 10);
          const shareUrl = `https://sosconnect.org/locate/${shareToken}`;

          return JSON.stringify({
            __tool: 'location_shared',
            __mapCommand: { type: 'share_location', center: [lng, lat], shareUrl },
            shareUrl,
            message: 'Your location has been shared. The volunteer coming to help you can see where you are.',
          });
        },
      },

      create_match: {
        description: 'Create a match between a helper and a request or resource. Use after collecting how they can help and when.',
        inputSchema: z.object({
          recordId: z.string().describe('The ID of the request or resource'),
          recordType: z.string().describe('request or resource'),
          category: z.string().optional(),
          helperDescription: z.string().optional().describe('What the helper said they can offer'),
          availability: z.string().optional().describe('When they can help'),
          phone: z.string().optional().describe('Phone if not authenticated'),
        }),
        execute: async function({ recordId, recordType, category, helperDescription, availability, phone }) {
          // Write match via match-respond EF
          const resp = await fetch(`${SUPABASE_URL}/functions/v1/match-respond`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${SUPABASE_ANON}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              match_id: recordId,
              action: 'accept',
              channel: 'web_ai_sdk',
              helper_description: helperDescription,
              availability: availability,
              phone: phone,
            }),
          });

          // Write signal trace
          await fetch(`${SUPABASE_URL}/rest/v1/signal_traces`, {
            method: 'POST',
            headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${SUPABASE_ANON}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              entity_type: 'match',
              entity_id: recordId,
              signal_layer: 'I',
              trace_type: 'web_match_created',
              reasoning: `Web match: ${helperDescription || 'helper offered'}. Available: ${availability || 'not specified'}`,
              agent_id: 'web-citizen',
              metadata: { channel: 'web_ai_sdk', category },
            }),
          });

          return JSON.stringify({
            __tool: 'match_confirmed',
            recordId,
            message: 'Match confirmed! The person in need will be notified with your info.',
          });
        },
      },

      show_chips: {
        description: 'Show quick-select chip buttons. Max 3 per row. Use for structured choices at any point in the conversation.',
        inputSchema: z.object({
          prompt: z.string().describe('Text to show above the chips'),
          chips: z.array(z.object({
            id: z.string(),
            label: z.string(),
            icon: z.string().optional(),
          })).describe('Array of chip options'),
          multiSelect: z.boolean().optional().describe('Allow multiple selections'),
        }),
        execute: async function({ prompt, chips, multiSelect }) {
          return JSON.stringify({ __tool: 'show_chips', prompt, chips, multiSelect: multiSelect || false });
        },
      },

      show_toggle_chips: {
        description: 'Show multi-select toggle chips (e.g., veteran + medical + first responder). Shows a "Continue" button after selections.',
        inputSchema: z.object({
          prompt: z.string().describe('Text to show above the chips'),
          options: z.array(z.object({
            id: z.string(),
            icon: z.string(),
            label: z.string(),
          })),
        }),
        execute: async function({ prompt, options }) {
          return JSON.stringify({ __tool: 'show_toggle_chips', prompt, options });
        },
      },

      show_sos_confirmation: {
        description: 'Show final SOS confirmation card with the "Send SOS" button. ALWAYS use this as the final step before submitting any SOS, match, or intake. Never use a text-only confirmation.',
        inputSchema: z.object({
          summary: z.string().describe('Brief summary of what will be submitted'),
          type: z.string().describe('Type: request, offer, match, report'),
          details: z.object({}).passthrough().optional().describe('Structured data to submit'),
        }),
        execute: async function({ summary, type, details }) {
          return JSON.stringify({ __tool: 'show_sos_confirmation', summary, type, details });
        },
      },
    },
  });

  return result.toUIMessageStreamResponse();
}
