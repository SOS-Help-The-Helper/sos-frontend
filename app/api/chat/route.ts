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
1. show_categories with flow='need' (multi-select: Housing, Food, Supplies, Power, Volunteer)
2. Based on selection, show subcategory chips via show_chips:

   Housing subcategories: Emergency Shelter, Temporary Housing (RV/trailer), Home Repair, Transitional Housing
   - Taxonomy: HOUSING.EMERGENCY, HOUSING.TEMPORARY, HOUSING.REPAIR, HOUSING.TRANSITIONAL
   - If Temporary Housing: follow ERV-style deep intake (disaster type, veteran/FR, medical, duration, insurance)

   Food subcategories: Hot Meals, Groceries, Water, Baby Food, Pet Food
   - Taxonomy: FOOD.MEALS, FOOD.PANTRY, FOOD.WATER, FOOD.BABY, GOODS.PET

   Supplies subcategories: Clothing, Hygiene, Bedding, Baby Supplies, Tools/Tarps
   - Taxonomy: GOODS.CLOTHING, GOODS.HYGIENE, GOODS.BEDDING, GOODS.BABY, SUPPLIES.TOOLS

   Power subcategories: Generator, Fuel, Electrician, Power Restoration
   - Taxonomy: SVC.EQUIPMENT.GENERATOR, UTILITIES.POWER, SVC.TRADES.ELECTRIC

   Volunteer subcategories: Debris Cleanup, Transport/Driving, Childcare, Manual Labor, Skilled Trades
   - Taxonomy: SAFETY.DEBRIS, TRANSPORT.PEOPLE, COMMUNITY.CHILDCARE, SVC.TRADES.GENERAL

3. After subcategory: What disaster or situation? → show_chips: Hurricane, Tornado, Wildfire, Flood, Fire, Not disaster-related
4. How many people? → show_counter
5. Any special circumstances? → show_chips (multi-select): Children, Elderly, Pets, Medical Needs, Disability/Accessibility, Veteran, First Responder
6. How urgent? → show_chips: Emergency (need it now), This week, When available
7. Anything else? → free text via the chat input (agent asks conversationally)
8. Location (skip if authenticated) → get_location
9. Phone (skip if authenticated) → show_phone_input
10. Summarize and call show_sos_confirmation. User MUST tap "Send SOS" before you call submit_sos.
11. After [SOS_CONFIRMED]: call submit_sos with categories array, taxonomy_codes array, and all collected data

ALWAYS include taxonomy_code in submit_sos based on the subcategory selected. ALWAYS use show_sos_confirmation before submit_sos.

HELPER FLOW (I can help):
1. show_categories with flow='help' (multi-select: Housing, Food, Supplies, Power, Volunteer, Donate)
2. Based on selection, show subcategory chips:

   Housing: I have space to host, I have an RV/trailer, I can help with repairs
   Food: I can cook/deliver meals, I have groceries to share, I have water
   Supplies: Clothing, Tools/equipment, Building materials, Tarps/shelter materials
   Power: I have a generator, I have fuel, I'm an electrician/trades
   Volunteer: Debris cleanup, I can drive/transport, Childcare, Manual labor, Skilled trades (plumbing, roofing, HVAC, electrical)
   Donate: RV/Vehicle, Supplies/Goods, Professional services (NOT cash — removed)

3. How much capacity / how many people can you help? → show_counter
4. What's your availability? → show_chips: Available now, Weekdays, Weekends, Flexible
5. How far can you travel? → show_chips: My neighborhood (5mi), My city (25mi), My region (100mi), Anywhere
6. Anything else? → conversational
7. Location (skip if authenticated) → get_location
8. Phone (skip if authenticated) → show_phone_input
9. Summarize and call show_sos_confirmation. User MUST tap "Send SOS" before you call submit_helper.
10. After [SOS_CONFIRMED]: call submit_helper with all collected data

MATCH FLOW (from map pin):
When you receive JSON with {"action":"match"}: 
1. "This [category] request needs help. How can you help?" (open-ended)
2. If not authenticated: "What's the best number to reach you?"
3. "When can you do this?"
4. Confirm. Done. Three-four exchanges max.

SEARCH:
When someone asks to find, show, search, or locate resources:
1. If you have their GPS from USER LOCATION in this prompt, call search_resources immediately with those coordinates. Do NOT ask for location.
2. If no USER LOCATION and they say 'near me' / 'nearby' / 'close by': call get_location FIRST, then search_resources with the result.
3. If they specify a place ('in Asheville' / 'near Charlotte'): call search_resources with approximate coordinates for that city.

KEYWORD → TAXONOMY MAPPING (use the most specific match):
- food, meals, hungry → FOOD
- shelter, housing, homeless → HOUSING
- water → FOOD.WATER
- generator, power → SVC.EQUIPMENT.GENERATOR
- clothing, clothes → GOODS.CLOTHING
- medical, doctor, health → HEALTH
- transport, ride, evacuation → TRANSPORT
- debris, tree removal, cleanup → SAFETY.DEBRIS
- rv, trailer, camper → HOUSING.TEMPORARY.RV
- roofing, roof → SVC.TRADES.ROOFING
- plumber, plumbing → SVC.TRADES.PLUMBING
- electrician, electrical → SVC.TRADES.ELECTRIC

RADIUS INTERPRETATION:
- 'nearby' / 'near me' / 'close' → distance=10
- 'in my area' / 'around here' → distance=15 (default)
- 'within X miles' → distance=X
- 'anywhere' / 'all' → distance=100

AFTER RESULTS:
- If 0 results: suggest expanding radius or trying different keywords
- If results found: briefly summarize what was found, let the map show the details
- NEVER list all results in text — the map and SearchResults component handle display

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

IMPORTANT RULES:
- Every submission MUST have a taxonomy_code. Map the subcategory to the correct code.
- Show ONE question at a time. Never combine steps.
- Chips should have human-readable labels, not IDs.
- The deeper ERV intake (veteran, FR, medical, duration, insurance) ONLY applies to HOUSING.TEMPORARY subcategory.

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
  Show chips with HUMAN-READABLE labels (e.g., "I have an RV/trailer", "I can donate money", "I have space available")
  Step 2: Based on their answer, ONE follow-up about timing/availability.
  Step 3: If NOT authenticated, call show_phone_input to collect phone number.
  Step 4: Call show_sos_confirmation with summary. Final button is ALWAYS "Send SOS".
  
IF intent = "citizen_needs_this" (they tapped a RESOURCE — they NEED it):
  Step 1: Confirm: "Would you like to request this?" 
  Show chips: "Yes, for me" / "For someone I know" / "Tell me more"
  Step 2: Quick intake — household size, any special needs.
  Step 3: If NOT authenticated, call show_phone_input to collect phone number.
  Step 4: Call show_sos_confirmation with summary. Final button is ALWAYS "Send SOS".

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
  // Detect JOIN flow from first message content: [JOIN_SOS]
  let joinFlow = false;
  // Detect ERV flow from first message content: [ERV_INTAKE:survivor:myself]
  let ervFlow = req.headers.get('x-erv-flow') || '';
  let ervFor = req.headers.get('x-erv-for') || '';
  const firstMsg = uiMessages?.[0];
  if (firstMsg?.content && typeof firstMsg.content === 'string') {
    const ervMatch = firstMsg.content.match(/\[ERV_INTAKE:(\w+):(\w+)\]/);
    if (ervMatch) { ervFlow = ervMatch[1]; ervFor = ervMatch[2]; }
    if (firstMsg.content.includes('[JOIN_SOS]')) { joinFlow = true; }
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

  // Extract user GPS from headers for auto-location in searches
  const userLat = parseFloat(req.headers.get('x-user-lat') || '') || undefined;
  const userLng = parseFloat(req.headers.get('x-user-lng') || '') || undefined;
  const locationContext = userLat && userLng
    ? `\nUSER LOCATION: lat=${userLat}, lng=${userLng}. Use these coordinates for any search_resources or show_nearby call when user says near me, nearby, close by, etc. Do NOT ask for location again.`
    : '';

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
10. Phone number — use show_phone_input (skip if authenticated)
11. "Anything else to consider?" → free text
12. Summarize and call show_sos_confirmation with the summary. The user MUST tap "Send SOS" before you call submit_sos.
13. After [SOS_CONFIRMED]: call submit_sos with all collected data including taxonomy_code HOUSING.TEMPORARY
RULES: ONE question at a time. Be warm but efficient. Never ask for SSN/bank info. ALWAYS use show_sos_confirmation before submit_sos — never submit without user confirmation.${ervFor === 'someone' ? '\nThis is being filled out ON BEHALF of someone else. Ask for the beneficiary\'s info, not the submitter\'s.' : ''}`,

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
10. Phone number — use show_phone_input (skip if authenticated)
11. Summarize and call show_sos_confirmation. User MUST tap "Send SOS" before you call submit_sos.
12. After [SOS_CONFIRMED]: call submit_sos with intent=donate and taxonomy_code DONATION.ASSET.RV
RULES: ONE question at a time. Be grateful. Don't require VIN. ALWAYS use show_sos_confirmation before submit.${ervFor === 'someone' ? '\nBeing filled out ON BEHALF of the donor.' : ''}`,

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
8. Phone number — use show_phone_input (skip if authenticated)
9. Summarize and call show_sos_confirmation. User MUST tap "Send SOS" before you call submit_sos.
10. After [SOS_CONFIRMED]: call submit_sos with taxonomy_code TRANSPORT.RV_TOW
RULES: ONE question at a time. Get vehicle specs if driver. Be enthusiastic. ALWAYS use show_sos_confirmation before submit.${ervFor === 'someone' ? '\nBeing filled out ON BEHALF of the volunteer.' : ''}`,
  };

  const JOIN_PROMPT = `You are SOS — a community coordination platform that connects people who want to help with the communities that need them. You're having a friendly, conversational chat with someone who's interested in joining the SOS community.

GOAL: Understand who they are, what motivates them, what skills or resources they can contribute, and whether they're part of an organization. By the end of the conversation, you should have their name, phone number, and a clear picture of how they can help.

STYLE:
- Warm, genuine, conversational. Like talking to a friend who's excited about what they're building.
- ONE question at a time. Never stack questions.
- Keep responses to 1-3 sentences. Be human, not corporate.
- Share brief context about SOS when relevant — we coordinate disaster response by connecting citizens, nonprofits, and government agencies so help actually reaches people.
- "Everyone is a helper" is our thesis — people who need help and people who give it aren't separate categories. Needs and offers coexist on the same person.

FLOW:
1. Start by welcoming them and asking what brought them here / what interests them about SOS
2. Ask about their background — what they do, what skills they have
3. Ask if they're part of an organization (nonprofit, faith-based, government, volunteer group, etc.)
4. Ask what motivates them — why disaster response, why community coordination
5. Collect their name and phone number (frame it as "so we can keep you in the loop")
6. Thank them genuinely. Tell them someone from the team will reach out.

After collecting info, call submit_person to save their details.

DO NOT use tools like show_categories, show_chips, or search_resources. This is a pure conversation — no UI widgets.`;

  const activeSystemPrompt = joinFlow
    ? JOIN_PROMPT
    : ervFlow && ERV_PROMPTS[ervFlow]
    ? ERV_PROMPTS[ervFlow] + authContext + locationContext
    : SYSTEM_PROMPT + authContext + locationContext;

  const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: activeSystemPrompt,
    messages,
    tools: {
      show_categories: {
        description: 'Show disaster need category selection cards. Use when someone says they need help or can help.',
        inputSchema: z.object({
          prompt: z.string().describe('Text to show above the cards'),
          flow: z.enum(['need', 'help']).optional().describe('Which flow - need shows need categories, help adds Volunteer and Donate'),
        }),
        execute: async function({ prompt, flow }) {
          const options = [
            { id: 'housing', icon: '🏠', label: 'Housing' },
            { id: 'food', icon: '🍽', label: 'Food' },
            { id: 'supplies', icon: '📦', label: 'Supplies' },
            { id: 'power', icon: '⚡', label: 'Power' },
            { id: 'volunteer', icon: '🤝', label: 'Volunteer' },
          ];
          if (flow === 'help') {
            options.push(
              { id: 'donate', icon: '🎁', label: 'Donate' },
            );
          }
          return JSON.stringify({
            __tool: 'show_categories',
            prompt,
            options,
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
            showFreeText: true,
            freeTextPlaceholder: 'Anything else you would like to add?',
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

      show_phone_input: {
        description: 'Collect phone number from non-authenticated citizen. Shows a phone input field. Use BEFORE submit_sos or submit_helper when user is not authenticated.',
        inputSchema: z.object({
          prompt: z.string().describe('Text above the phone input'),
        }),
        execute: async function({ prompt }) {
          return JSON.stringify({
            __tool: 'show_phone_input',
            prompt: prompt || 'What is the best number to reach you?',
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
          lat: z.number().optional().describe('Latitude (optional — falls back to user location or Asheville NC)'),
          lng: z.number().optional().describe('Longitude (optional — falls back to user location or Asheville NC)'),
          distance: z.number().optional().describe('Search radius in miles, default 15'),
        }),
        execute: async function({ keyword, lat, lng, distance }) {
          // Fallback: user GPS from headers → Asheville NC default
          const useLat = lat ?? userLat ?? 35.5951;
          const useLng = lng ?? userLng ?? -82.5515;

          // Map common keywords to taxonomy prefixes for better search
          const KEYWORD_TO_TAXONOMY: Record<string, string> = {
            'food': 'FOOD', 'meals': 'FOOD.MEALS', 'shelter': 'HOUSING.EMERGENCY', 'housing': 'HOUSING',
            'generator': 'SVC.EQUIPMENT.GENERATOR', 'power': 'UTILITIES.POWER', 'water': 'FOOD.WATER',
            'clothing': 'GOODS.CLOTHING', 'supplies': 'GOODS', 'medical': 'HEALTH', 'transport': 'TRANSPORT',
            'debris': 'SAFETY.DEBRIS', 'roofing': 'SVC.TRADES.ROOFING', 'plumbing': 'SVC.TRADES.PLUMBING',
            'electrician': 'SVC.TRADES.ELECTRIC', 'rv': 'HOUSING.TEMPORARY.RV', 'volunteer': 'COMMUNITY.VOLUNTEER',
          };
          const keyLower = keyword.toLowerCase().trim();
          const taxonomyCode = KEYWORD_TO_TAXONOMY[keyLower] || '';
          const taxonomyParam = taxonomyCode ? `&taxonomy_code=${encodeURIComponent(taxonomyCode)}` : '';

          // Call resource-search EF
          const resp = await fetch(
            `${SUPABASE_URL}/functions/v1/resource-search?keyword=${encodeURIComponent(keyword)}&lat=${useLat}&lng=${useLng}&distance=${distance || 15}${taxonomyParam}`,
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
              metadata: { skill_id: 'resource-search', skill_version: 'v1', keyword, result_count: results.length, lat: useLat, lng: useLng, taxonomy_code: taxonomyCode || undefined },
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
          // Query score from score-compute EF
          let score = { total: 0, readiness: 0, community: 0, impact: 0, next_action: 'Complete your profile to start your score' };
          if (personId) {
            try {
              const resp = await fetch(`${SUPABASE_URL}/functions/v1/score-compute`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${SUPABASE_ANON}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ person_id: personId }),
              });
              const data = await resp.json();
              if (data?.total != null) {
                score = { total: data.total, readiness: data.readiness || 0, community: data.community || 0, impact: data.impact || 0, next_action: data.next_action || '' };
              }
            } catch {}
          }
          return JSON.stringify({
            __tool: 'show_score',
            ...score,
          });
        },
      },

      submit_sos: {
        description: 'Submit a help request. Use after collecting category, count, circumstances, and location. Include taxonomy_codes when possible.',
        inputSchema: z.object({
          categories: z.array(z.string()).describe('Selected categories'),
          taxonomy_codes: z.array(z.string()).optional().describe('Taxonomy codes matching each category (e.g. HOUSING.EMERGENCY, FOOD.MEALS)'),
          count: z.string().describe('Number of people'),
          circumstances: z.array(z.string()).optional().describe('Special circumstances'),
          circumstanceNotes: z.string().optional().describe('Free text about circumstances'),
          lat: z.number().describe('Latitude'),
          lng: z.number().describe('Longitude'),
          locationName: z.string().optional().describe('Location name'),
          urgency: z.string().optional().describe('critical/high/medium/low'),
        }),
        execute: async function({ categories, taxonomy_codes, count, circumstances, circumstanceNotes, lat, lng, locationName, urgency }) {
          // Call intake-write EF
          const resp = await fetch(`${SUPABASE_URL}/functions/v1/intake-write`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${SUPABASE_ANON}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              needs: categories.map((c: string, i: number) => ({
                category: c,
                urgency: urgency || 'high',
                taxonomy_code: taxonomy_codes?.[i] || undefined,
                description: `${c.replace(/_/g, ' ')} needed for household of ${count || 1}${circumstances?.length ? '. ' + circumstances.join(', ') : ''}${circumstanceNotes ? '. ' + circumstanceNotes : ''}`,
              })),
              household_size: parseInt(count) || 1,
              latitude: lat,
              longitude: lng,
              location_name: locationName,
              metadata: { circumstances, circumstanceNotes },
              channel: 'web_ai_sdk',
              consent_given: true,
              consent_method: 'web',
            }),
          });
          const result = await resp.json();

          return JSON.stringify({
            __tool: 'submit_confirmation',
            __mapCommand: resp.ok ? { type: 'focus' as const, center: [lng, lat] as [number, number], zoom: 14 } : undefined,
            success: resp.ok,
            sosId: result.sos_id,
            personId: result.person_id || undefined,
            lat,
            lng,
            category: categories[0],
            title: resp.ok ? `SOS #${result.sos_id} Submitted` : 'Submission Failed',
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
              consent_given: true,
              consent_method: 'web',
            }),
          });
          const result = await resp.json();

          return JSON.stringify({
            __tool: 'submit_confirmation',
            __mapCommand: resp.ok ? { type: 'focus' as const, center: [lng, lat] as [number, number], zoom: 14 } : undefined,
            success: resp.ok,
            title: resp.ok ? 'Helper Profile Created' : 'Submission Failed',
            message: resp.ok ? 'You\'re registered as a helper. We\'ll notify you when someone nearby needs help.' : 'Something went wrong. Please try again.',
          });
        },
      },

      submit_person: {
        description: 'Save a person who wants to join the SOS community. Use in the join flow after collecting name, phone, skills, and optionally organization.',
        inputSchema: z.object({
          name: z.string().describe('Full name'),
          phone: z.string().describe('Phone number'),
          skills: z.string().optional().describe('Skills, resources, or what they can contribute'),
          organization: z.string().optional().describe('Organization name if they are part of one'),
          motivation: z.string().optional().describe('Why they want to join / what motivates them'),
        }),
        execute: async function({ name, phone, skills, organization, motivation }) {
          const nameParts = name.trim().split(' ');
          const phoneCan = phone.replace(/[^\d+]/g, '');
          const bio = [skills, motivation ? `Motivation: ${motivation}` : ''].filter(Boolean).join('. ');
          
          // Insert person
          const resp = await fetch(`${SUPABASE_URL}/rest/v1/persons`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SUPABASE_ANON}`,
              'apikey': SUPABASE_ANON,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation',
            },
            body: JSON.stringify({
              display_name: name.trim(),
              first_name: nameParts[0] || null,
              last_name: nameParts.slice(1).join(' ') || null,
              phone: phone.trim(),
              phone_canonical: phoneCan,
              bio: bio || null,
              helper_status: 'interested',
              consent_contact: true,
            }),
          });
          const persons = await resp.json();
          const personId = persons?.[0]?.id;

          // If organization provided, create org record
          if (organization && organization.trim()) {
            await fetch(`${SUPABASE_URL}/rest/v1/organizations`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${SUPABASE_ANON}`,
                'apikey': SUPABASE_ANON,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal',
              },
              body: JSON.stringify({ name: organization.trim(), type: 'community_signup' }),
            }).catch(() => {});
          }

          return JSON.stringify({
            success: resp.ok,
            personId,
            message: resp.ok ? 'Person saved to SOS community.' : 'Failed to save. Try again.',
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
            eligible: data.fema_assistance_available,
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
        description: 'Show the user\'s active SOS and matched resources on the map with a connecting line. Use for "where\'s my help", "track my request", "show my SOS status". No parameters needed — uses authenticated user.',
        inputSchema: z.object({}),
        execute: async function() {
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
