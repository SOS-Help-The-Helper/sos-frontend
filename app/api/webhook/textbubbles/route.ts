export const maxDuration = 10;
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

const TEXTBUBBLES_WEBHOOK_SECRET = process.env.TEXTBUBBLES_WEBHOOK_SECRET;

function verifyWebhook(request: NextRequest, rawBody: string): boolean {
  if (!TEXTBUBBLES_WEBHOOK_SECRET) return false;
  const signature = request.headers.get('x-signature');
  const timestamp = request.headers.get('x-timestamp');
  if (!signature || !timestamp) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > 300) return false;
  const signed = `${timestamp}.${rawBody}`;
  const expected = 'sha256=' + crypto.createHmac('sha256', TEXTBUBBLES_WEBHOOK_SECRET).update(signed).digest('hex');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (!verifyWebhook(request, rawBody)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  
  // Only forward inbound messages to our server
  if (event.type === 'message.inbound') {
    const text = event.data?.text || '';
    const from = (event.data?.from || '').replace(/^sms:/, '').trim();
    
    // Fire and forget to our proxy — don't await
    fetch('http://159.203.70.230:3847/webhook/textbubbles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': request.headers.get('x-signature') || '',
        'X-Timestamp': request.headers.get('x-timestamp') || '',
      },
      body: rawBody,
    }).catch(() => {}); // Ignore errors — fire and forget
  }

  // Return 200 immediately — TextBubbles is happy, our server handles the rest
  return NextResponse.json({ success: true });
}

export async function GET() {
  return NextResponse.json({ status: 'active', mode: 'proxy-to-server' });
}
