import { NextResponse } from 'next/server';
import { messageStore } from '@/lib/textbubbles/message-store';

/**
 * Get all stored messages
 * GET /api/textbubbles/messages
 */
export async function GET() {
  const messages = messageStore.getMessages();

  return NextResponse.json({
    success: true,
    messages,
    count: messages.length,
  });
}
