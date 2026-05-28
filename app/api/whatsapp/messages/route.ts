import { NextResponse } from 'next/server';
import { messageStore } from '@/lib/textbubbles/message-store';

/**
 * Inbound WhatsApp messages captured by the TextBubbles webhook.
 * GET /api/whatsapp/messages
 *
 * Backed by the in-memory store in lib/textbubbles/message-store.ts —
 * test-only, resets on every server restart / cold start.
 */
export async function GET() {
  const messages = messageStore.getMessagesForChannel('whatsapp');
  return NextResponse.json({
    success: true,
    messages,
    count: messages.length,
  });
}
