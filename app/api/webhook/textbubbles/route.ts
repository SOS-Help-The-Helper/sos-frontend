import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { messageStore } from '@/lib/textbubbles/message-store';

const TEXTBUBBLES_WEBHOOK_SECRET = process.env.TEXTBUBBLES_WEBHOOK_SECRET;
const TEXTBUBBLES_API_KEY = process.env.TEXTBUBBLES_API_KEY;
const OPENCLAW_GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://159.203.70.230:18789';
const OPENCLAW_GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN;

function verifyTextBubblesWebhook(request: NextRequest, rawBody: string): boolean {
  if (!TEXTBUBBLES_WEBHOOK_SECRET) {
    console.error('TEXTBUBBLES_WEBHOOK_SECRET is not configured');
    return false;
  }
  const signature = request.headers.get('x-signature');
  const timestamp = request.headers.get('x-timestamp');
  if (!signature || !timestamp) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > 300) return false;
  const signedPayload = `${timestamp}.${rawBody}`;
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', TEXTBUBBLES_WEBHOOK_SECRET)
    .update(signedPayload)
    .digest('hex');
  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSignature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function normalizePhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return phoneNumber;
  const trimmed = phoneNumber.trim();
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (digitsOnly.length === 10) return `+1${digitsOnly}`;
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) return `+${digitsOnly}`;
  if (trimmed.startsWith('+')) return trimmed;
  return `+${digitsOnly}`;
}

/**
 * Send a message to the citizen via TextBubbles API
 */
async function sendTextBubblesReply(to: string, text: string) {
  if (!TEXTBUBBLES_API_KEY) {
    console.error('TEXTBUBBLES_API_KEY not configured');
    return;
  }
  try {
    const resp = await fetch('https://api.textbubbles.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEXTBUBBLES_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, content: { text } }),
    });
    const data = await resp.json();
    console.log(`[TextBubbles] Reply sent to ${to}: ${data?.data?.id || 'unknown'}`);
  } catch (err) {
    console.error('[TextBubbles] Failed to send reply:', err);
  }
}

/**
 * Route message to the SOS citizen agent via OpenClaw gateway
 * Returns the agent's response text
 */
async function routeToCitizenAgent(message: string, phoneNumber: string): Promise<string> {
  if (!OPENCLAW_GATEWAY_TOKEN) {
    console.error('OPENCLAW_GATEWAY_TOKEN not configured — cannot route to citizen agent');
    return '';
  }

  try {
    const resp = await fetch(`${OPENCLAW_GATEWAY_URL}/v1/responses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENCLAW_GATEWAY_TOKEN}`,
        'Content-Type': 'application/json',
        'x-openclaw-agent-id': 'sos-citizen',
        'x-openclaw-session-key': `agent:sos-citizen:sms:${phoneNumber}`,
      },
      body: JSON.stringify({
        model: 'openclaw',
        input: message,
        user: phoneNumber,
        stream: false,
      }),
    });

    const data = await resp.json();

    if (data.error) {
      console.error('[CitizenAgent] Error:', data.error.message);
      return '';
    }

    // Extract text response
    for (const item of data.output || []) {
      if (item.type === 'message') {
        for (const content of item.content || []) {
          if (content.type === 'output_text') {
            return content.text || '';
          }
        }
      }
    }
    return '';
  } catch (err) {
    console.error('[CitizenAgent] Failed to route:', err);
    return '';
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  if (!verifyTextBubblesWebhook(request, rawBody)) {
    console.error('Invalid TextBubbles webhook signature');
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const event = JSON.parse(rawBody);
    const eventType: string = event.type;
    const eventData = event.data || {};

    console.log(`[TextBubbles Webhook] Event type: ${eventType}`);

    // Handle delivery status events
    if (['message.queued', 'message.sent', 'message.delivered', 'message.read', 'message.failed'].includes(eventType)) {
      return NextResponse.json({ success: true, message: 'Status update received' });
    }

    // Handle inbound messages
    if (eventType === 'message.inbound') {
      const messageText = eventData.text || '';
      const tbMessageId = eventData.messageId || eventData.externalMessageId || Date.now().toString();
      const fanPhoneNumber = eventData.from || '';
      const creatorPhoneNumber = eventData.to || '';

      const normalizedFanPhone = normalizePhoneNumber(fanPhoneNumber.replace(/^sms:/, '').trim());
      const normalizedCreatorPhone = normalizePhoneNumber(creatorPhoneNumber.replace(/^sms:/, '').trim());

      console.log(`[TextBubbles] Inbound message from ${normalizedFanPhone}: ${messageText}`);

      // Store the message
      messageStore.addMessage({
        id: tbMessageId,
        from: normalizedFanPhone,
        to: normalizedCreatorPhone,
        text: messageText,
        timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
        direction: 'inbound',
        attachments: eventData.attachments,
      });

      // Route to citizen agent and reply
      if (messageText.trim()) {
        // Don't await — respond to webhook immediately, process async
        routeToCitizenAgent(messageText, normalizedFanPhone)
          .then((agentReply) => {
            if (agentReply) {
              // Store the outbound reply
              messageStore.addMessage({
                id: `reply-${tbMessageId}`,
                from: normalizedCreatorPhone,
                to: normalizedFanPhone,
                text: agentReply,
                timestamp: new Date(),
                direction: 'outbound',
              });
              // Send via TextBubbles
              return sendTextBubblesReply(normalizedFanPhone, agentReply);
            }
          })
          .catch((err) => console.error('[CitizenAgent] Async error:', err));
      }

      return NextResponse.json({ success: true, message: 'Message received, routing to agent' });
    }

    return NextResponse.json({ success: true, message: `Event type ${eventType} ignored` });

  } catch (error) {
    console.error('TextBubbles webhook error:', error);
    return NextResponse.json({ success: false, error: 'Failed to process webhook' }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    status: 'active',
    agentEnabled: !!OPENCLAW_GATEWAY_TOKEN,
    messagesReceived: messageStore.count(),
  });
}
