import { NextRequest } from 'next/server';

const GATEWAY_URL = 'https://159.203.70.230/v1/responses';
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || 'NOT_SET';

export async function GET(req: NextRequest) {
  // Debug: show env status + test gateway connection
  const envStatus = {
    tokenSet: GATEWAY_TOKEN !== 'NOT_SET' && GATEWAY_TOKEN !== '',
    tokenLength: GATEWAY_TOKEN.length,
    tokenPrefix: GATEWAY_TOKEN.substring(0, 8) + '...',
    gatewayUrl: GATEWAY_URL,
  };

  try {
    // Test gateway health
    const healthResp = await fetch('https://159.203.70.230/health', { 
      signal: AbortSignal.timeout(5000) 
    });
    const health = await healthResp.text();
    
    // Test gateway API
    const apiResp = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GATEWAY_TOKEN}`,
        'Content-Type': 'application/json',
        'x-openclaw-agent-id': 'sos-citizen',
      },
      body: JSON.stringify({ model: 'openclaw', input: 'debug test' }),
      signal: AbortSignal.timeout(20000),
    });
    
    const apiStatus = apiResp.status;
    const apiBody = await apiResp.text();

    return new Response(JSON.stringify({
      env: envStatus,
      health: { status: healthResp.status, body: health },
      api: { status: apiStatus, body: apiBody.substring(0, 500) },
    }, null, 2), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({
      env: envStatus,
      error: error.message,
      cause: error.cause?.message || null,
    }, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
