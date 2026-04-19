/**
 * In-memory message store for TextBubbles messages
 * Used for testing - in production, use a database
 */

export type StoredMessage = {
  id: string;
  from: string;
  to: string;
  text: string;
  timestamp: Date;
  direction: 'inbound' | 'outbound';
  attachments?: Array<{ mimeType: string; filename: string; downloadUrl: string }>;
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
