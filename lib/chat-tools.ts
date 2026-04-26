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
  };
}
