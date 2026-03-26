import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';

const GATEWAY_URL = 'https://159.203.70.230/v1/responses';
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '';

const ORG_AGENT_MAP: Record<string, string> = {
  // View toggle IDs
  'admin': 'sos-platform',
  'citizen': 'sos-citizen',
  // Partner org IDs
  '43299807-6229-49be-9a6b-0498c9188178': 'sos-aid-arena',    // Aid Arena
  'da86c92f-d52d-4b13-a474-30e1be8fb808': 'sos-erv',          // Emergency RV
  '9d894368-51af-4cf7-9318-444a3c216f5d': 'sos-fhm',          // Free Hot Meals
  'c1e74116-5e12-410a-9b21-dc80c7646d77': 'sos-partner',      // Greater Good (generic)
  'sos-platform': 'sos-platform',
};

export async function POST(req: NextRequest) {
  try {
    // Try Clerk auth — but don't block if not signed in (admin/demo mode)
    let userId = 'admin-demo';
    try {
      const authResult = await auth();
      if (authResult?.userId) {
        userId = authResult.userId;
      }
    } catch {
      // Clerk auth failed — continue with demo mode
    }

    const body = await req.json();
    const { message, orgId, sessionId } = body;

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message required' }), { status: 400 });
    }

    const agentId = ORG_AGENT_MAP[orgId] || 'sos-citizen';

    const response = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GATEWAY_TOKEN}`,
        'Content-Type': 'application/json',
        'x-openclaw-agent-id': agentId,
      },
      body: JSON.stringify({
        model: 'openclaw',
        input: message,
        user: userId,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Agent unavailable', detail: response.status, body: errorText.substring(0, 200) }),
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
