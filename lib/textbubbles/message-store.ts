/**
 * In-memory message store for TextBubbles messages
 * Used for testing - in production, use a database
 */

export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed' | string;

export type StoredAttachment = {
  url: string;
  mimeType?: string;
  filename?: string;
};

export type StoredMessage = {
  id: string;
  from: string;
  to: string;
  text: string;
  timestamp: Date;
  direction: 'inbound' | 'outbound';
  channel?: 'whatsapp' | 'imessage' | 'sms' | string;
  status?: MessageStatus;
  statusError?: string;
  attachments?: StoredAttachment[];
};

// Simple in-memory store
const messages: StoredMessage[] = [];

export const messageStore = {
  /**
   * Add a message to the store
   */
  addMessage(message: StoredMessage): void {
    messages.push(message);
    // Keep only the last 100 messages
    if (messages.length > 100) {
      messages.shift();
    }
  },

  /**
   * Get all messages
   */
  getMessages(): StoredMessage[] {
    return [...messages];
  },

  /**
   * Get messages for a specific phone number (as sender or recipient)
   */
  getMessagesForPhone(phoneNumber: string): StoredMessage[] {
    return messages.filter(
      (m) => m.from === phoneNumber || m.to === phoneNumber
    );
  },

  /**
   * Get messages filtered by channel ('whatsapp', 'imessage', 'sms').
   */
  getMessagesForChannel(channel: string): StoredMessage[] {
    return messages.filter((m) => m.channel === channel);
  },

  /**
   * Update the delivery status of a stored message by id. Used to
   * reconcile outbound `sent` rows once the webhook delivers
   * `message.delivered` / `message.failed` events.
   */
  updateStatus(id: string, status: MessageStatus, statusError?: string): boolean {
    const msg = messages.find((m) => m.id === id);
    if (!msg) return false;
    msg.status = status;
    if (statusError) msg.statusError = statusError;
    return true;
  },

  /**
   * Clear all messages
   */
  clear(): void {
    messages.length = 0;
  },

  /**
   * Get message count
   */
  count(): number {
    return messages.length;
  },
};
