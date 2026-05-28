import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

/**
 * Send a WhatsApp message via TextBubbles.
 * POST /api/whatsapp/send
 * Body: { recipient: string, text: string }
 *
 * Routes through the shared /v1/messages endpoint with
 * `routing.preference = ['whatsapp']` so the message goes out over the
 * paired WhatsApp session on the deploy's TEXTBUBBLES_PHONE_NUMBER instead
 * of iMessage/SMS.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { recipient, text } = body ?? {};

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
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message text is required' },
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

    const requestBody = {
      to: normalizedRecipient,
      from: senderPhoneNumber,
      content: { text },
      routing: { preference: ['whatsapp'] },
    };

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

    return NextResponse.json({
      success: true,
      messageId,
      recipient: normalizedRecipient,
      text,
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
