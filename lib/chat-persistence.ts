/**
 * Chat persistence — saves/loads chat history per person.
 * Debounced save: 1s after last message, not on every token.
 */

let saveTimer: NodeJS.Timeout | null = null;

export async function loadChatHistory(personId: string): Promise<any[]> {
  try {
    const res = await fetch(`/api/chat-history?personId=${personId}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.messages || [];
  } catch {
    return [];
  }
}

export function saveChatHistoryDebounced(personId: string, messages: any[]) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveChatHistory(personId, messages);
  }, 1000);
}

async function saveChatHistory(personId: string, messages: any[]) {
  try {
    await fetch('/api/chat-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId, messages }),
    });
  } catch { /* silent fail — chat still works without persistence */ }
}
