import { streamText, convertToModelMessages } from 'ai';
import { sanitize } from '@/lib/pii-sanitizer';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rtduqguwhkczexnoawej.supabase.co';
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const SYSTEM_PROMPT = `You are the SOS citizen agent. You help people prepare for disasters, find help, offer help, and connect communities.

RULES:
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
Call search_resources with keyword + lat/lng. Results show on map automatically.

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

MATCH FLOW:
When you receive a JSON message starting with {"action":"match"}, the user tapped Match on a map pin.

Step 1: Read the category and details. Respond with ONE question: "How can you help?" 
Keep it open-ended. Let them describe what they can offer in their own words.
Example: "This family has no power and needs it for medical equipment. How can you help?"

Step 2: Based on their answer, ask ONE follow-up about timing.
Example: They say "I have a generator" → "Great! When can you drop it off?"
Example: They say "I'm an electrician" → "When are you available to take a look?"

Step 3: Confirm and submit. That's it. Three exchanges max.
"Perfect. I'll connect you with this family. They'll get your info shortly."

RULES FOR MATCH FLOW:
- ONE question at a time. Never ask multiple questions.
- Keep every response to 1-2 sentences.
- The first question is ALWAYS "How can you help?" — open-ended, lets them self-qualify.
- The second question is ALWAYS about timing/availability.
- Third message is confirmation. Done.
- Their open-ended answer ("I have a generator" or "I can drive them to a shelter") becomes the match description that the person in need sees.
- No bullet points. No lists. No paragraphs. Conversational.`;

export async function POST(req: Request) {
  const { messages: uiMessages } = await req.json();
  const personId = req.headers.get('x-person-id') || '';
  const isAuthenticated = req.headers.get('x-authenticated') === 'true';
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

  const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: SYSTEM_PROMPT + authContext,
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
    },
  });

  return result.toUIMessageStreamResponse();
}
