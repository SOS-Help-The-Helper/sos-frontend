import { streamText, convertToModelMessages, stepCountIs } from 'ai';
import { sanitize } from '@/lib/pii-sanitizer';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { SYSTEM_PROMPT } from '@/lib/chat-prompts';
import { getChatTools } from '@/lib/chat-tools';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rtduqguwhkczexnoawej.supabase.co';
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function POST(req: Request) {
  try {
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
  // Transport context injection for driver mode
  const transportId = req.headers.get('x-transport-id') || '';
  let driverSystemPrompt: string | null = null;
  if (transportId) {
    const ERV_DB = process.env.NEXT_PUBLIC_ERV_SUPABASE_URL || 'https://xbtrtztzaokeodarqvpr.supabase.co';
    const ERV_ANON = process.env.NEXT_PUBLIC_ERV_ANON_KEY || '';
    const ERV_KEY = process.env.NEXT_PUBLIC_ERV_PARTNER_KEY || '';
    try {
      const transportRes = await fetch(ERV_DB + '/functions/v1/partner-read', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + ERV_ANON, 'x-partner-key': ERV_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query_type: 'transport_assignments', filters: { id: transportId }, limit: 1 }),
      });
      const transportData = await transportRes.json();
      const transport = transportData.results?.[0] || transportData.assignments?.[0];
      if (transport) {
        // Fetch resource details for the delivery description
        let resourceDesc = 'Delivery item';
        if (transport.resource_id) {
          try {
            const resRes = await fetch(ERV_DB + '/functions/v1/partner-read', {
              method: 'POST',
              headers: { 'Authorization': 'Bearer ' + ERV_ANON, 'x-partner-key': ERV_KEY, 'Content-Type': 'application/json' },
              body: JSON.stringify({ query_type: 'resource_lookup', filters: { id: transport.resource_id } }),
            });
            const resData = await resRes.json();
            const resource = resData.resource || resData.results?.[0];
            if (resource) {
              resourceDesc = [resource.year, resource.make, resource.model].filter(Boolean).join(' ') || resource.description || 'RV';
            }
          } catch {}
        }

        driverSystemPrompt = `You are in DRIVER MODE for a specific delivery.

DELIVERY DETAILS:
- Transport ID: ${transport.id}
- Status: ${transport.status}
- Resource: ${resourceDesc}
- Pickup: ${transport.origin_text || transport.origin || 'TBD'}
- Dropoff: ${transport.destination_text || transport.destination || 'TBD'}
- Distance: ${transport.distance_miles ? transport.distance_miles + ' miles' : 'TBD'}
- Driver: ${transport.driver_name || 'Not yet assigned'}
- Notes: ${transport.coordinator_notes || 'None'}

RULES:
- Only answer questions about THIS delivery
- If no driver is assigned (driver is null), your job is to onboard them: collect name, phone, vehicle description, tow capacity, hitch types
- Be friendly, practical, focused on getting the delivery done
- You can explain the delivery process, help with issues, and answer questions about the RV
- Do NOT access other deliveries, matches, or admin functions
- Survivor full address is private until pickup is confirmed
`;
      }
    } catch {
      // Non-blocking — fall through to default prompt if transport fetch fails
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

  const activeSystemPrompt = driverSystemPrompt
    ? driverSystemPrompt
    : joinFlow
    ? JOIN_PROMPT
    : ervFlow && ERV_PROMPTS[ervFlow]
    ? ERV_PROMPTS[ervFlow] + authContext + locationContext
    : SYSTEM_PROMPT + authContext + locationContext;

  const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: activeSystemPrompt,
    messages,
    // Don't pass tools for join flow (pure conversation)
    ...(joinFlow ? {} : { tools: getChatTools({ personId, userLat, userLng }), stopWhen: stepCountIs(5) }),
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
