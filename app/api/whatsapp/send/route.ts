import { NextRequest, NextResponse } from 'next/server';
import { messageStore, type StoredAttachment } from '@/lib/textbubbles/message-store';

export const maxDuration = 60;

type IncomingAttachment = {
  url?: string;
  mimeType?: string;
  filename?: string;
};

/**
 * Send a WhatsApp message via TextBubbles.
 * POST /api/whatsapp/send
 * Body: {
 *   recipient: string,
 *   text?: string,
 *   attachments?: Array<{ url: string, mimeType?: string, filename?: string }>
 * }
 *
 * At least one of `text` or `attachments` is required. Routes through the
 * shared /v1/messages endpoint with `routing.preference = ['whatsapp']` so
 * the message goes out over the paired WhatsApp session on the deploy's
 * TEXTBUBBLES_PHONE_NUMBER instead of iMessage/SMS.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { recipient, text } = body ?? {};
    const { attachments } = (body ?? {}) as { attachments?: IncomingAttachment[] };

    const tbApiKey = process.env.TEXTBUBBLES_API_KEY;
    const senderPhoneNumber = process.env.TEXTBUBBLES_PHONE_NUMBER;

    if (!tbApiKey) {
      return NextResponse.json(
        { error: 'TEXTBUBBLES_API_KEY not configured' },
        { status: 500 },
      );
    }
    if (!senderPhoneNumber) {
      return NextResponse.json(
        { error: 'TEXTBUBBLES_PHONE_NUMBER not configured' },
        { status: 500 },
      );
    }

    // Strip invisible Unicode control characters that creep in from
    // copy/paste sources (BOM, zero-width spaces, bidi marks).
    if (recipient && typeof recipient === 'string') {
      recipient = recipient.replace(/[​-‏‪-‮⁠-⁩]/g, '');
    }

    if (!recipient) {
      return NextResponse.json(
        { error: 'Recipient (phone number) is required' },
        { status: 400 },
      );
    }

    const hasText = typeof text === 'string' && text.trim().length > 0;
    const cleanAttachments: StoredAttachment[] = Array.isArray(attachments)
      ? attachments
          .map((a) => (a && typeof a.url === 'string' && a.url.trim().length > 0 ? a : null))
          .filter((a): a is IncomingAttachment & { url: string } => a !== null)
          .map((a) => ({
            url: a.url,
            mimeType: typeof a.mimeType === 'string' ? a.mimeType : undefined,
            filename: typeof a.filename === 'string' ? a.filename : undefined,
          }))
      : [];
    const hasAttachments = cleanAttachments.length > 0;

    if (!hasText && !hasAttachments) {
      return NextResponse.json(
        { error: 'Message text or at least one attachment is required' },
        { status: 400 },
      );
    }

    const normalizedRecipient = normalizePhoneNumber(recipient);
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(normalizedRecipient)) {
      return NextResponse.json(
        { error: 'Recipient must be in E.164 format (e.g. +14155551234)' },
        { status: 400 },
      );
    }

    // content.text has minLength: 1 upstream, so omit it on attachment-only
    // sends rather than passing an empty string.
    const content: Record<string, unknown> = {};
    if (hasText) content.text = text;

    const requestBody: Record<string, unknown> = {
      to: normalizedRecipient,
      from: senderPhoneNumber,
      content,
      routing: { preference: ['whatsapp'] },
    };
    if (hasAttachments) {
      requestBody.attachments = cleanAttachments.map((a) => ({
        type: 'url' as const,
        url: a.url,
        ...(a.mimeType ? { mimeType: a.mimeType } : {}),
        ...(a.filename ? { filename: a.filename } : {}),
      }));
    }

    const response = await fetch('https://api.textbubbles.com/v1/messages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tbApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json().catch(() => ({}));
    const messageId = data.data?.id;
    const isApiError = !response.ok || data.success === false;

    if (isApiError) {
      const errorDetail = data.error?.message || data.message || 'Unknown error';
      console.error(`[WhatsApp] Send failed: ${errorDetail}`);
      return NextResponse.json(
        {
          error: 'Failed to send WhatsApp message via TextBubbles',
          details: errorDetail,
          success: false,
        },
        { status: response.status },
      );
    }

    // Push the outbound row into the test store so the inbox renders both
    // sides of the conversation. Subsequent message.delivered / .failed
    // webhook events patch this row in place via messageStore.updateStatus.
    if (messageId) {
      messageStore.addMessage({
        id: messageId,
        from: senderPhoneNumber,
        to: normalizedRecipient,
        text: hasText ? text : '',
        timestamp: new Date(),
        direction: 'outbound',
        channel: 'whatsapp',
        status: 'sent',
        ...(hasAttachments ? { attachments: cleanAttachments } : {}),
      });
    }

    return NextResponse.json({
      success: true,
      messageId,
      recipient: normalizedRecipient,
      text: hasText ? text : '',
      senderNumber: senderPhoneNumber,
      message: 'WhatsApp message sent successfully via TextBubbles',
    });
  } catch (error: unknown) {
    console.error('Error sending WhatsApp message via TextBubbles:', error);
    return NextResponse.json(
      { error: 'Failed to send WhatsApp message', success: false },
      { status: 500 },
    );
  }
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
