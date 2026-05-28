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

export type StoredReaction = {
  emoji: string;
  from: string;
  timestamp: Date;
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
  reactions?: StoredReaction[];
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
   * Attach a reaction to a stored message. WhatsApp reactions are
   * single-emoji per sender; sending the same emoji twice is a remove,
   * and any new emoji replaces the previous one for that sender. An
   * empty `emoji` argument removes the sender's reaction entirely.
   * Returns true if the target message was found.
   */
  setReaction(targetMessageId: string, reaction: { emoji: string; from: string }): boolean {
    const msg = messages.find((m) => m.id === targetMessageId);
    if (!msg) return false;
    const existing = msg.reactions ?? [];
    const filtered = existing.filter((r) => r.from !== reaction.from);
    if (reaction.emoji && reaction.emoji.trim().length > 0) {
      filtered.push({ emoji: reaction.emoji, from: reaction.from, timestamp: new Date() });
    }
    msg.reactions = filtered;
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
