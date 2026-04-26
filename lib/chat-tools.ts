// Chat tool definitions — extracted from route.ts
// Each tool has a Zod schema + execute function that calls Supabase EFs

import { z } from 'zod';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rtduqguwhkczexnoawej.supabase.co';
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export function getChatTools() {
  return {
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

          // Fire-and-forget: trigger matching for the new request
          if (resp.ok && result.sos_id) {
            fetch(`${SUPABASE_URL}/rest/v1/rpc/run_matching_v2`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${SUPABASE_ANON}`, 'apikey': SUPABASE_ANON, 'Content-Type': 'application/json' },
              body: JSON.stringify({ p_entity_type: 'request', p_entity_id: result.sos_id }),
            }).catch(() => {});
          }

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

      submit_join_person: {
        description: 'Save a person who wants to join the SOS community. Use in the join flow after collecting name, phone, skills, and optionally organization.',
        inputSchema: z.object({
          name: z.string().describe('Full name'),
          phone: z.string().describe('Phone number'),
          skills: z.string().optional().describe('Skills, resources, or what they can contribute'),
          organization: z.string().optional().describe('Organization name if they are part of one'),
          motivation: z.string().optional().describe('Why they want to join'),
        }),
        execute: async function({ name, phone, skills, organization, motivation }) {
          try {
            const nameParts = name.trim().split(' ');
            const phoneCan = phone.replace(/[^\d+]/g, '');
            const bio = [skills, motivation ? `Motivation: ${motivation}` : ''].filter(Boolean).join('. ');

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

            if (!resp.ok) {
              const errText = await resp.text().catch(() => 'unknown error');
              return JSON.stringify({ success: false, message: `Could not save: ${errText}` });
            }

            const persons = await resp.json();
            const newPersonId = persons?.[0]?.id;

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
              success: true,
              personId: newPersonId,
              message: 'Welcome to SOS! Someone from the team will reach out soon.',
            });
          } catch (err: any) {
            return JSON.stringify({ success: false, message: 'Something went wrong saving your info. Please try again.' });
          }
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
            message: 'Share this chat with someone who needs help — just send them the link to this page.',
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
  };
}
