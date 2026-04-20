import { NextRequest, NextResponse } from 'next/server';
import { logMessage } from '@/lib/textbubbles/message-logger';

export const maxDuration = 60;

/**
 * Send an iMessage via TextBubbles API
 * POST /api/textbubbles/send
 * Body: { recipient: string, text: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { recipient, text } = body;

    // Validate TextBubbles environment variables
    const tbApiKey = process.env.TEXTBUBBLES_API_KEY;
    const senderPhoneNumber = process.env.TEXTBUBBLES_PHONE_NUMBER;

    if (!tbApiKey) {
      return NextResponse.json(
        { error: 'TEXTBUBBLES_API_KEY not configured' },
        { status: 500 }
      );
    }

    if (!senderPhoneNumber) {
      return NextResponse.json(
        { error: 'TEXTBUBBLES_PHONE_NUMBER not configured' },
        { status: 500 }
      );
    }

    // Strip invisible Unicode control characters from recipient
    if (recipient && typeof recipient === 'string') {
      recipient = recipient.replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u2069]/g, '');
    }

    if (!recipient) {
      return NextResponse.json(
        { error: 'Recipient (phone number) is required' },
        { status: 400 }
      );
    }

    if (!text) {
      return NextResponse.json(
        { error: 'Message text is required' },
        { status: 400 }
      );
    }

    // Normalize phone number
    const normalizedRecipient = normalizePhoneNumber(recipient);

    // Build TextBubbles API request body
    const requestBody = {
      to: normalizedRecipient,
      from: senderPhoneNumber,
      content: { text },
    };

    console.log('Sending via TextBubbles to:', normalizedRecipient);

    // Call TextBubbles API
    const response = await fetch('https://api.textbubbles.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tbApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    console.log('TextBubbles response: status', response.status);

    const messageId = data.data?.id;
    const isApiError = !response.ok || data.success === false;

    if (isApiError) {
      const errorDetail = data.error?.message || data.message || 'Unknown error';
      console.error(`[TextBubbles] Send failed: ${errorDetail}`);

      // Log failed outbound message
      logMessage({
        direction: 'outbound',
        from_number: senderPhoneNumber,
        to_number: normalizedRecipient,
        message_text: text,
        message_id: messageId,
        status: 'error',
        error_message: errorDetail,
      });

      return NextResponse.json(
        {
          error: 'Failed to send iMessage via TextBubbles',
          details: errorDetail,
          success: false,
        },
        { status: response.status }
      );
    }

    // Log successful outbound message
    logMessage({
      direction: 'outbound',
      from_number: senderPhoneNumber,
      to_number: normalizedRecipient,
      message_text: text,
      message_id: messageId,
      status: 'success',
    });

    return NextResponse.json({
      success: true,
      messageId,
      recipient: normalizedRecipient,
      text,
      senderNumber: senderPhoneNumber,
      message: 'iMessage sent successfully via TextBubbles',
    });

  } catch (error: unknown) {
    console.error('Error sending iMessage via TextBubbles:', error);
    return NextResponse.json(
      { error: 'Failed to send iMessage', success: false },
      { status: 500 }
    );
  }
}

/**
 * Normalize phone numbers to ensure consistent format.
 * - 10 digits -> adds +1 (US)
 * - 11 digits starting with 1 -> adds +
 * - Already has + -> keeps as-is
 */
function normalizePhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return phoneNumber;

  const trimmed = phoneNumber.trim();
  const digitsOnly = trimmed.replace(/\D/g, '');

  // 10-digit US number without country code
  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  }

  // 11-digit US number with country code
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return `+${digitsOnly}`;
  }

  // Already has +
  if (trimmed.startsWith('+')) {
    return trimmed;
  }

  // Default: add + prefix
  return `+${digitsOnly}`;
}
