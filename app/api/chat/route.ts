import { streamUI } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rtduqguwhkczexnoawej.supabase.co';
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const SYSTEM_PROMPT = `You are the SOS citizen agent. You help people prepare for disasters, find help when they need it, offer help when they can, and stay connected to their community.

CRITICAL RULES:
- Use tools to show interactive UI. Don't describe options in text — call the tool.
- When someone needs help: call show_categories first, then show_counter, then show_circumstances, then get_location
- When someone can help: call show_helper_type first, then ask follow-ups conversationally
- When someone wants to search: call search_resources with their keyword + location
- When someone asks about readiness/score: call show_score
- NEVER store SSN or bank info. Direct users to FEMA's website for those fields.

WHO WHAT WHERE WHEN framework:
- WHAT: show_categories (multi-select)
- WHO: show_counter (how many people)
- Special circumstances: show_circumstances (children, elderly, pets + free text)
- WHERE: get_location (GPS or address)
- Submit: submit_sos

Be warm but efficient. Emergency = fast. Planning = conversational.`;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamUI({
    model: anthropic('claude-sonnet-4-20250514'),
    system: SYSTEM_PROMPT,
    messages,
    tools: {
      show_categories: {
        description: 'Show disaster need category selection cards. Use when someone says they need help.',
        parameters: z.object({
          prompt: z.string().describe('Text to show above the cards'),
        }),
        generate: async function*({ prompt }) {
          yield JSON.stringify({
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
        parameters: z.object({
          prompt: z.string().describe('Text to show above the counter'),
        }),
        generate: async function*({ prompt }) {
          yield JSON.stringify({
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
        parameters: z.object({
          prompt: z.string().describe('Text to show above the options'),
        }),
        generate: async function*({ prompt }) {
          yield JSON.stringify({
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
        parameters: z.object({
          prompt: z.string().describe('Text to show'),
          forSelf: z.boolean().describe('true if for the user themselves, false if for someone else'),
        }),
        generate: async function*({ prompt, forSelf }) {
          yield JSON.stringify({
            __tool: 'get_location',
            prompt,
            forSelf,
          });
        },
      },

      show_helper_type: {
        description: 'Show 3 broad helper categories. Use when someone says they can help.',
        parameters: z.object({
          prompt: z.string().describe('Text to show above options'),
        }),
        generate: async function*({ prompt }) {
          yield JSON.stringify({
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
        parameters: z.object({
          prompt: z.string().describe('Text to show'),
        }),
        generate: async function*({ prompt }) {
          yield JSON.stringify({
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
        parameters: z.object({
          keyword: z.string().describe('What to search for: shelter, food, medical, etc.'),
          lat: z.number().describe('Latitude'),
          lng: z.number().describe('Longitude'),
          distance: z.number().optional().describe('Search radius in miles, default 25'),
        }),
        generate: async function*({ keyword, lat, lng, distance }) {
          // Call resource-search EF
          const resp = await fetch(
            `${SUPABASE_URL}/functions/v1/resource-search?keyword=${encodeURIComponent(keyword)}&lat=${lat}&lng=${lng}&distance=${distance || 25}`,
            { headers: { 'Authorization': `Bearer ${SUPABASE_ANON}` } }
          );
          const data = await resp.json();
          const results = data.results || [];

          yield JSON.stringify({
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
        parameters: z.object({
          personId: z.string().optional().describe('Person ID, if known'),
        }),
        generate: async function*({ personId }) {
          yield JSON.stringify({
            __tool: 'show_score',
            personId,
          });
        },
      },

      submit_sos: {
        description: 'Submit a help request. Use after collecting category, count, circumstances, and location.',
        parameters: z.object({
          categories: z.array(z.string()).describe('Selected categories'),
          count: z.string().describe('Number of people'),
          circumstances: z.array(z.string()).optional().describe('Special circumstances'),
          circumstanceNotes: z.string().optional().describe('Free text about circumstances'),
          lat: z.number().describe('Latitude'),
          lng: z.number().describe('Longitude'),
          locationName: z.string().optional().describe('Location name'),
          urgency: z.string().optional().describe('critical/high/medium/low'),
        }),
        generate: async function*({ categories, count, circumstances, circumstanceNotes, lat, lng, locationName, urgency }) {
          // Call intake-write EF
          const resp = await fetch(`${SUPABASE_URL}/functions/v1/intake-write`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${SUPABASE_ANON}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              needs: categories.map(c => ({ category: c, urgency: urgency || 'high' })),
              household_size: parseInt(count) || 1,
              latitude: lat,
              longitude: lng,
              location_name: locationName,
              metadata: { circumstances, circumstanceNotes },
              channel: 'web_ai_sdk',
            }),
          });
          const result = await resp.json();

          yield JSON.stringify({
            __tool: 'submit_confirmation',
            success: resp.ok,
            sosId: result.sos_id,
            message: resp.ok ? 'Your SOS has been submitted. We\'re searching for help near you now.' : 'Something went wrong. Please try again.',
          });
        },
      },

      submit_helper: {
        description: 'Register someone as a helper. Use after collecting their skills and availability.',
        parameters: z.object({
          helperType: z.string().describe('skills, time, or space'),
          skills: z.array(z.string()).optional().describe('Specific skills mentioned'),
          availability: z.string().describe('disaster, anytime, or active'),
          lat: z.number().describe('Latitude'),
          lng: z.number().describe('Longitude'),
          distanceMiles: z.number().optional().describe('How far they will travel'),
          notes: z.string().optional().describe('Additional details from conversation'),
        }),
        generate: async function*({ helperType, skills, availability, lat, lng, distanceMiles, notes }) {
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

          yield JSON.stringify({
            __tool: 'submit_confirmation',
            success: resp.ok,
            message: resp.ok ? 'You\'re registered as a helper. We\'ll notify you when someone nearby needs help.' : 'Something went wrong. Please try again.',
          });
        },
      },

      capture_photo: {
        description: 'Prompt user to take a photo for reporting. Shows camera input.',
        parameters: z.object({
          prompt: z.string().describe('Text to show'),
        }),
        generate: async function*({ prompt }) {
          yield JSON.stringify({
            __tool: 'capture_photo',
            prompt,
          });
        },
      },

      show_danger_check: {
        description: 'Ask if anyone is in danger. Use during report flow.',
        parameters: z.object({
          prompt: z.string().describe('Text to show'),
        }),
        generate: async function*({ prompt }) {
          yield JSON.stringify({
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
        parameters: z.object({
          state: z.string().describe('2-letter state code'),
        }),
        generate: async function*({ state }) {
          const resp = await fetch(`${SUPABASE_URL}/functions/v1/fema-check?state=${state}`, {
            headers: { 'Authorization': `Bearer ${SUPABASE_ANON}` },
          });
          const data = await resp.json();

          yield JSON.stringify({
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
        parameters: z.object({
          personId: z.string().optional().describe('Person ID'),
        }),
        generate: async function*({ personId }) {
          yield JSON.stringify({
            __tool: 'referral_card',
            personId,
          });
        },
      },
    },
  });

  return result.toDataStreamResponse();
}
