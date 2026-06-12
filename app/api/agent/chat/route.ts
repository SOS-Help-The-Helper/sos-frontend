import { db } from '@/lib/api';
// Clerk removed — auth handled by custom auth-context
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const GATEWAY_URL = 'https://159.203.70.230/v1/responses';
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rtduqguwhkczexnoawej.supabase.co';
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

const ORG_AGENT_MAP: Record<string, string> = {
  'admin': 'sos-platform',
  'citizen': 'sos-citizen',
  '43299807-6229-49be-9a6b-0498c9188178': 'sos-aid-arena',
  'da86c92f-d52d-4b13-a474-30e1be8fb808': 'sos-erv',
  '9d894368-51af-4cf7-9318-444a3c216f5d': 'sos-fhm',
  'c1e74116-5e12-410a-9b21-dc80c7646d77': 'sos-partner',
  'sos-platform': 'sos-platform',
};

const ORG_NAMES: Record<string, string> = {
  '43299807-6229-49be-9a6b-0498c9188178': 'Aid Arena',
  'da86c92f-d52d-4b13-a474-30e1be8fb808': 'Emergency RV',
  '9d894368-51af-4cf7-9318-444a3c216f5d': 'Free Hot Meals',
  'c1e74116-5e12-410a-9b21-dc80c7646d77': 'Greater Good',
};

// Pre-fetch context from Supabase for the agent
async function buildContext(orgId: string | null, viewType: string): Promise<string> {
  try {
    const lines: string[] = [];

    if (viewType === 'admin' || viewType === 'citizen') {
      // Admin/platform context — system-wide stats
      const [requests, matches, orgs, fulfilled, learnings] = await Promise.all([
        db.from('requests').select('id', { count: 'exact', head: true }),
        db.from('matches').select('id', { count: 'exact', head: true }),
        db.from('organizations').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        db.from('matches').select('id', { count: 'exact', head: true }).eq('status', 'fulfilled'),
        db.from('system_learnings').select('pattern, confidence, category').order('confidence', { ascending: false }).limit(5),
      ]);

      lines.push(`[SYSTEM CONTEXT — Live data from Supabase]`);
      lines.push(`Total requests: ${requests.count || 0}`);
      lines.push(`Total matches: ${matches.count || 0}`);
      lines.push(`Fulfilled matches: ${fulfilled.count || 0}`);
      lines.push(`Active partner orgs: ${orgs.count || 0}`);
      
      if (learnings.data?.length) {
        lines.push(`\nTop system learnings:`);
        for (const l of learnings.data) {
          lines.push(`- [${l.category ?? "general"}] ${l.pattern} (confidence: ${l.confidence})`);
        }
      }

      // Recent activity
      const { data: recentMatches } = await db.from('matches')
        .select('id, match_score, match_summary_masked, status, created_at')
        .order('created_at', { ascending: false }).limit(5);
      
      if (recentMatches?.length) {
        lines.push(`\nRecent matches:`);
        for (const m of recentMatches) {
          lines.push(`- ${m.status}: ${m.match_summary_masked || 'no summary'} (score: ${m.match_score})`);
        }
      }

      // Active disasters
      const { data: disasters } = await db.from('disasters')
        .select('name, status, response_phase').eq('status', 'active');
      if (disasters?.length) {
        lines.push(`\nActive disasters:`);
        for (const d of disasters) {
          lines.push(`- ${d.name} (${d.response_phase})`);
        }
      }

    } else if (orgId) {
      // Partner context — org-specific data
      const orgName = ORG_NAMES[orgId] || 'Partner';
      
      const [org, offers, matches, fulfilled] = await Promise.all([
        db.from('organizations').select('name, org_type, capabilities, service_area_description, trust_score').eq('id', orgId).single(),
        db.from('resources').select('id, category, description, capacity_available, status').eq('org_id', orgId).eq('status', 'active'),
        db.from('matches').select('id, match_score, match_summary_masked, status, created_at, resource_id')
          .order('created_at', { ascending: false }).limit(10),
        db.from('matches').select('id', { count: 'exact', head: true }).eq('status', 'fulfilled'),
      ]);

      // Get network members (if coordinator org)
      const { data: networkMembers } = await supabase
        .from('organizations')
        .select('name, org_type, network_role, service_area_description')
        .eq('parent_org_id', orgId)
        .eq('status', 'active');

      if (networkMembers?.length) {
        lines.push(`\nNetwork members (${networkMembers.length}):`);
        for (const m of networkMembers) {
          lines.push(`- ${m.name} (${m.org_type || 'partner'}${m.service_area_description ? ', ' + m.service_area_description : ''})`);
        }
      }

      // Filter matches to this org's offers
      const orgOfferIds = new Set((offers.data || []).map(o => o.id));
      const orgMatches = (matches.data || []).filter(m => orgOfferIds.has(m.resource_id));
      const proposed = orgMatches.filter(m => m.status === 'proposed');
      const active = orgMatches.filter(m => ['accepted', 'connected', 'in_progress'].includes(m.status));
      const done = orgMatches.filter(m => m.status === 'fulfilled');

      lines.push(`[PARTNER CONTEXT — ${orgName}]`);
      lines.push(`Organization: ${org.data?.name || orgName}`);
      lines.push(`Type: ${org.data?.org_type || 'unknown'}`);
      lines.push(`Capabilities: ${JSON.stringify(org.data?.capabilities || [])}`);
      lines.push(`Coverage: ${org.data?.service_area_description || 'not set'}`);
      lines.push(`\nActive offers: ${offers.data?.length || 0}`);
      for (const o of (offers.data || []).slice(0, 5)) {
        lines.push(`- ${o.category}: ${o.description} (capacity: ${o.capacity_available})`);
      }
      lines.push(`\nPending matches: ${proposed.length}`);
      for (const m of proposed) {
        lines.push(`- ${m.match_summary_masked || 'no summary'} (score: ${m.match_score})`);
      }
      lines.push(`Active matches: ${active.length}`);
      lines.push(`Completed matches: ${done.length}`);
    }

    return lines.join('\n');
  } catch (e) {
    return '[Context fetch failed — respond based on your training only]';
  }
}

export async function POST(req: NextRequest) {
  try {
    let userId = 'admin-demo';
    try {
      const authResult = null as any; // Clerk removed
      if (authResult?.userId) userId = authResult.userId;
    } catch {}

    const body = await req.json();
    const { message, orgId, agentId: clientAgentId, sessionId } = body;

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message required' }), { status: 400 });
    }

    const agentId = clientAgentId || ORG_AGENT_MAP[orgId] || 'sos-citizen';
    const viewType = orgId === 'admin' || orgId === 'sos-platform' ? 'admin' 
                   : orgId === 'citizen' ? 'citizen' : 'partner';

    // Pre-fetch context from Supabase
    const context = await buildContext(
      viewType === 'partner' ? orgId : null,
      viewType
    );

    // Inject context into the message
    const enrichedInput = `${context}\n\n[INSTRUCTION: Use the data above to answer directly. Do not say you need database access — the data is already provided. Format answers clearly with names and details.]\n\n[User message]: ${message}`;

    const response = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GATEWAY_TOKEN}`,
        'Content-Type': 'application/json',
        'x-openclaw-agent-id': agentId,
      },
      body: JSON.stringify({
        model: 'openclaw',
        input: enrichedInput,
        user: `${userId}-${orgId || 'admin'}`,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Agent unavailable', detail: response.status }),
        { status: 502 }
      );
    }

    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Agent chat error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal error', message: error.message }),
      { status: 500 }
    );
  }
}
