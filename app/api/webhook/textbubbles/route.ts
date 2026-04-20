import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { messageStore } from '@/lib/textbubbles/message-store';
import { logMessage, uploadMediaToS3 } from '@/lib/textbubbles/message-logger';

const TEXTBUBBLES_WEBHOOK_SECRET = process.env.TEXTBUBBLES_WEBHOOK_SECRET;

/**
 * Verify TextBubbles webhook signature.
 * TextBubbles sends:
 *   X-Signature: sha256={hmac_hex}
 *   X-Timestamp: unix seconds
 * Signed payload: "{timestamp}.{raw_body}"
 */
function verifyTextBubblesWebhook(request: NextRequest, rawBody: string): boolean {
  if (!TEXTBUBBLES_WEBHOOK_SECRET) {
    console.error('TEXTBUBBLES_WEBHOOK_SECRET is not configured');
    return false;
  }

  const signature = request.headers.get('x-signature');
  const timestamp = request.headers.get('x-timestamp');

  if (!signature || !timestamp) {
    console.error('Missing X-Signature or X-Timestamp header');
    return false;
  }

  // Reject requests older than 5 minutes to prevent replay attacks
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > 300) {
    console.error('Webhook timestamp too old, possible replay attack');
    return false;
  }

  const signedPayload = `${timestamp}.${rawBody}`;
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', TEXTBUBBLES_WEBHOOK_SECRET)
    .update(signedPayload)
    .digest('hex');

  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSignature);
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

/**
 * Normalize phone numbers to ensure consistent format.
 */
function normalizePhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return phoneNumber;

  const trimmed = phoneNumber.trim();
  const digitsOnly = trimmed.replace(/\D/g, '');

  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  }

  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return `+${digitsOnly}`;
  }

  if (trimmed.startsWith('+')) {
    return trimmed;
  }

  return `+${digitsOnly}`;
}

/**
 * Handle TextBubbles webhook events
 * POST /api/webhook/textbubbles
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // Verify webhook signature
  if (!verifyTextBubblesWebhook(request, rawBody)) {
    console.error('Invalid TextBubbles webhook signature');
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const event = JSON.parse(rawBody);

    // TextBubbles webhook event structure:
    // { type: "message.inbound" | "message.delivered" | "message.failed" | ...,
    //   timestamp: "2026-...",
    //   data: { messageId, from, to, text, channel, attachments?, status? } }
    const eventType: string = event.type;
    const eventData = event.data || {};

    console.log(`[TextBubbles Webhook] Event type: ${eventType}`);

    // Handle delivery status events
    if (['message.queued', 'message.sent', 'message.delivered', 'message.read', 'message.failed'].includes(eventType)) {
      console.log(`[TextBubbles] Status update: ${eventType} for message ${eventData.messageId}`);
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

      // Process attachments - upload to S3
      const tbAttachments: { guid: string; mimeType: string; filename: string; totalBytes: number; downloadUrl: string }[] = eventData.attachments || [];
      const s3Keys: string[] = [];
      const mediaUrls: string[] = [];

      if (tbAttachments.length > 0) {
        console.log(`[TextBubbles] Processing ${tbAttachments.length} attachment(s)`);
        for (const att of tbAttachments) {
          mediaUrls.push(att.downloadUrl);
          const s3Result = await uploadMediaToS3(att.downloadUrl, att.mimeType, att.filename);
          if (s3Result) {
            s3Keys.push(s3Result.s3_key);
          }
        }
      }

      // Store the message in memory store
      messageStore.addMessage({
        id: tbMessageId,
        from: normalizedFanPhone,
        to: normalizedCreatorPhone,
        text: messageText,
        timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
        direction: 'inbound',
        attachments: eventData.attachments,
      });

      // Log inbound message to Supabase
      logMessage({
        direction: 'inbound',
        from_number: normalizedFanPhone,
        to_number: normalizedCreatorPhone,
        message_text: messageText,
        message_id: tbMessageId,
        status: 'success',
        media_urls: mediaUrls.length > 0 ? mediaUrls : undefined,
        media_s3_keys: s3Keys.length > 0 ? s3Keys : undefined,
      });

      return NextResponse.json({
        success: true,
        message: 'Message received',
      });
    }

    // Ignore other event types
    console.log(`[TextBubbles] Ignoring event type: ${eventType}`);
    return NextResponse.json({
      success: true,
      message: `Event type ${eventType} ignored`,
    });

  } catch (error) {
    console.error('TextBubbles webhook error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process webhook',
    }, { status: 200 }); // Return 200 to prevent retries
  }
}

/**
 * Health check for webhook endpoint
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    status: 'active',
    info: 'TextBubbles webhook is active and ready to receive events.',
    messagesReceived: messageStore.count(),
  });
}
