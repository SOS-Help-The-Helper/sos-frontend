export const maxDuration = 60;
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { messageStore } from '@/lib/textbubbles/message-store';

const TEXTBUBBLES_WEBHOOK_SECRET = process.env.TEXTBUBBLES_WEBHOOK_SECRET;
const TEXTBUBBLES_API_KEY = process.env.TEXTBUBBLES_API_KEY;
const PROXY_URL = 'http://159.203.70.230:3847';

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

function normalizePhone(p: string): string {
  if (!p) return p;
  const d = p.trim().replace(/\D/g, '');
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith('1')) return `+${d}`;
  return p.startsWith('+') ? p : `+${d}`;
}

async function sendReply(to: string, text: string) {
  if (!TEXTBUBBLES_API_KEY) return;
  await fetch('https://api.textbubbles.com/v1/messages', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${TEXTBUBBLES_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, content: { text } }),
  });
}

async function askCitizenAgent(message: string, phone: string): Promise<string> {
  try {
    const resp = await fetch(`${PROXY_URL}/citizen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, sessionId: phone }),
    });
    const data = await resp.json() as any;
    return data.response || '';
  } catch (err) {
    console.error('[CitizenAgent]', err);
    return '';
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (!verifyWebhook(request, rawBody)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  const eventType: string = event.type;
  const eventData = event.data || {};

  if (eventType !== 'message.inbound') {
    return NextResponse.json({ success: true });
  }

  const text = eventData.text || '';
  const from = normalizePhone((eventData.from || '').replace(/^sms:/, ''));
  const to = normalizePhone((eventData.to || '').replace(/^sms:/, ''));

  messageStore.addMessage({
    id: eventData.messageId || Date.now().toString(),
    from, to, text,
    timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
    direction: 'inbound',
    attachments: eventData.attachments,
  });

  if (text.trim()) {
    const reply = await askCitizenAgent(text, from);
    if (reply) {
      await sendReply(from, reply);
      messageStore.addMessage({
        id: `reply-${Date.now()}`, from: to, to: from, text: reply,
        timestamp: new Date(), direction: 'outbound',
      });
    }
  }

  return NextResponse.json({ success: true });
}

export async function GET() {
  return NextResponse.json({
    success: true, status: 'active',
    agentEnabled: true,
    messagesReceived: messageStore.count(),
  });
}
