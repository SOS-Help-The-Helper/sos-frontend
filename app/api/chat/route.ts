import { streamText, convertToModelMessages } from 'ai';
import { sanitize } from '@/lib/pii-sanitizer';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { SYSTEM_PROMPT } from '@/lib/chat-prompts';
import { getChatTools } from '@/lib/chat-tools';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rtduqguwhkczexnoawej.supabase.co';
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const body = await req.json();
  const rawMessages = body.messages || [];
  if (!rawMessages.length) {
    return new Response(JSON.stringify({ error: 'No messages provided' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  // Normalize messages — ensure parts array format for AI SDK v6
  const uiMessages = rawMessages.map((m: any, i: number) => ({
    id: m.id || `msg-${i}`,
    role: m.role,
    parts: m.parts || [{ type: 'text', text: typeof m.content === 'string' ? m.content : '' }],
    createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
    ...(m.content !== undefined && { content: m.content }),
  }));
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
  // Also check parts array (useChat v6 sends parts, not content)
  if (firstMsg?.parts) {
    for (const p of firstMsg.parts) {
      if (p.type === 'text' && typeof p.text === 'string') {
        if (!ervFlow) {
          const m = p.text.match(/\[ERV_INTAKE:(\w+):(\w+)\]/);
          if (m) { ervFlow = m[1]; ervFor = m[2]; }
        }
        if (!joinFlow && p.text.includes('[JOIN_SOS]')) { joinFlow = true; }
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

  const JOIN_PROMPT = `You are SOS — a community coordination platform that connects people who want to help with the communities that need them. You're having a friendly, conversational chat with someone interested in joining.

GOAL: Understand who they are, what motivates them, what skills or resources they can contribute, and whether they're part of an organization. By the end, you should have their name, phone number, and a clear picture of how they can help.

STYLE:
- Warm, genuine, conversational. Like talking to a friend who's excited about what they're building.
- ONE question at a time. Never stack questions.
- Keep responses to 1-3 sentences. Be human, not corporate.
- Share brief context about SOS when relevant — we coordinate disaster response by connecting citizens, nonprofits, and government agencies so help actually reaches people.
- "Everyone is a helper" is our thesis — people who need help and people who give it aren't separate categories.

FLOW:
1. Welcome them and ask what brought them here / what interests them about SOS
2. Ask about their background — what they do, what skills they have
3. Ask if they're part of an organization (nonprofit, faith-based, government, volunteer group, etc.)
4. Ask what motivates them — why disaster response, why community coordination
5. Collect their name and phone number (frame it as "so we can keep you in the loop")
6. Thank them genuinely. Tell them someone from the team will reach out.

After collecting info, call submit_join_person to save their details.

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
    tools: getChatTools(),
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

          // Rank by distance + capacity (skip sort if no coordinates provided)
          const ranked = lat == null || lng == null
            ? results.map((r: any, i: number) => ({ ...r, rank: i + 1, reason: r.capacity ? `capacity: ${r.capacity}` : '' }))
            : results.map((r: any, i: number) => {
                const dist = Math.sqrt(Math.pow((r.lat - useLat) * 111, 2) + Math.pow((r.lng - useLng) * 85, 2));
                const distKm = Math.round(dist * 10) / 10;
                return {
                  ...r, rank: i + 1, distance_km: distKm,
                  reason: `${distKm}km away${r.capacity ? `, capacity: ${r.capacity}` : ''}`,
                };
              }).sort((a: any, b: any) => a.distance_km - b.distance_km)
                .map((r: any, i: number) => ({ ...r, rank: i + 1 }));

          return JSON.stringify({
            __tool: 'comparison_result',
            __mapCommand: { type: 'compare', comparedResults: ranked, center: [useLng, useLat] },
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
          const useLat = lat ?? 35.5946; const useLng = lng ?? -82.5540;
          // Get NWS alerts from our alerts-feed EF
          const resp = await fetch(`${SUPABASE_URL}/functions/v1/alerts-feed?lat=${useLat}&lng=${useLng}`, {
            headers: { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer ' + SUPABASE_ANON },
          });
          const data = await resp.json().catch(() => ({ alerts: [] }));

          const riskZones = (data.alerts || []).map((a: any) => ({
            type: a.type === 'flood' ? 'flood' : a.type === 'fire' ? 'fire' : 'weather_alert',
            severity: a.severity || 'moderate',
            label: a.headline || a.description?.substring(0, 80),
            source: 'NWS',
            center: [useLng, useLat] as [number, number],
            radius_km: 10,
          }));

          return JSON.stringify({
            __tool: 'risk_assessment',
            __mapCommand: { type: 'show_risk', riskZones, center: [useLng, useLat] },
            alertCount: riskZones.length,
            alerts: riskZones,
            safe: riskZones.length === 0,
            message: riskZones.length > 0
              ? `${riskZones.length} active alert(s) near your location.`
              : 'No active alerts near your location.',
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

          // Different message based on what they matched with
          const confirmMessage = recordType === 'request'
            ? 'Match confirmed! The person in need will be notified that help is on the way.'
            : recordType === 'resource'
            ? 'Match confirmed! The resource provider will be connected with you shortly.'
            : 'Match confirmed! You\'ll be connected shortly.';

          return JSON.stringify({
            __tool: 'match_confirmed',
            recordId,
            recordType,
            message: confirmMessage,
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
  } catch (error: any) {
    console.error('Chat API error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
