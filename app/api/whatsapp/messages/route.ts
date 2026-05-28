import { NextResponse } from 'next/server';
import { messageStore } from '@/lib/textbubbles/message-store';

/**
 * WhatsApp messages captured for the /test-whatsapp inbox. Returns both
 * directions: inbound rows come from the TextBubbles webhook, outbound
 * rows are pushed by /api/whatsapp/send and have their `status` field
 * patched by subsequent message.delivered / .failed webhook events.
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
