export const maxDuration = 10;
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { messageStore } from '@/lib/textbubbles/message-store';

const TEXTBUBBLES_WEBHOOK_SECRET = process.env.TEXTBUBBLES_WEBHOOK_SECRET;

// WhatsApp 1:1 JIDs look like `<digits>@s.whatsapp.net`; group JIDs end in
// `@g.us`. For the test inbox we strip the suffix so the address renders
// as a plain phone number. Returns the original string for anything else.
function normalizeFrom(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.replace(/^sms:/, '').trim();
  const at = trimmed.indexOf('@');
  if (at === -1) return trimmed;
  const local = trimmed.slice(0, at);
  return /^\d+$/.test(local) ? `+${local}` : trimmed;
}

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

  if (event.type === 'message.inbound') {
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

    // Also keep a copy in the in-memory test store so /test-whatsapp can
    // render the inbox. TextBubbles fans every channel's events at this
    // route, so we route on the payload's `channel` field.
    const data = event.data ?? {};
    const channel = typeof data.channel === 'string' ? data.channel : undefined;
    if (channel === 'whatsapp') {
      const rawAttachments = Array.isArray(data.attachments) ? data.attachments : [];
      const attachments = rawAttachments
        .map((a: unknown) => {
          if (typeof a !== 'object' || a === null) return null;
          const o = a as Record<string, unknown>;
          const url =
            typeof o.downloadUrl === 'string'
              ? o.downloadUrl
              : typeof o.url === 'string'
                ? o.url
                : null;
          if (!url) return null;
          return {
            url,
            mimeType: typeof o.mimeType === 'string' ? o.mimeType : undefined,
            filename: typeof o.filename === 'string' ? o.filename : undefined,
          };
        })
        .filter((a): a is { url: string; mimeType?: string; filename?: string } => a !== null);

      messageStore.addMessage({
        id: typeof data.messageId === 'string' ? data.messageId : crypto.randomUUID(),
        from: normalizeFrom(data.from),
        to: typeof data.to === 'string' ? data.to : '',
        text: typeof data.text === 'string' ? data.text : '',
        timestamp: new Date(),
        direction: 'inbound',
        channel: 'whatsapp',
        ...(attachments.length > 0 ? { attachments } : {}),
      });
    }
  }

  // Delivery status updates for outbound messages we already pushed into
  // the store at /api/whatsapp/send. TextBubbles surfaces `message.sent`,
  // `message.delivered`, `message.read`, and `message.failed` — anything
  // we can match by messageId, we patch in place. Unknown ids are dropped
  // silently (the send may have predated this deploy).
  if (
    event.type === 'message.sent' ||
    event.type === 'message.delivered' ||
    event.type === 'message.read' ||
    event.type === 'message.failed'
  ) {
    const data = event.data ?? {};
    if (data.channel === 'whatsapp' && typeof data.messageId === 'string') {
      const status = event.type.replace(/^message\./, '');
      const errorMessage =
        event.type === 'message.failed'
          ? (data.error?.message as string | undefined) ??
            (data.errorCode as string | undefined) ??
            'failed'
          : undefined;
      messageStore.updateStatus(data.messageId, status, errorMessage);
    }
  }

  // Return 200 immediately — TextBubbles is happy, our server handles the rest
  return NextResponse.json({ success: true });
}

export async function GET() {
  return NextResponse.json({ status: 'active', mode: 'proxy-to-server' });
}
