'use client';

import { useState, useEffect, useCallback } from 'react';

type Message = {
  id: string;
  from: string;
  to: string;
  text: string;
  timestamp: string;
  direction: 'inbound' | 'outbound';
};

export default function MessageInboxPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [recipient, setRecipient] = useState('');
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/textbubbles/messages');
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient.trim() || !messageText.trim()) return;

    setSending(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/textbubbles/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: recipient.trim(),
          text: messageText.trim(),
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(`Message sent to ${recipient}`);
        setMessageText('');
        setMessages((prev) => [
          ...prev,
          {
            id: data.messageId || Date.now().toString(),
            from: data.senderNumber || 'You',
            to: recipient,
            text: messageText,
            timestamp: new Date().toISOString(),
            direction: 'outbound',
          },
        ]);
      } else {
        setError(data.error || 'Failed to send message');
      }
    } catch (err) {
      setError('Failed to send message');
      console.error('Send error:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">TextBubbles Test Inbox</h1>
        <p className="text-gray-400 mb-8">
          Send and receive iMessages via TextBubbles
        </p>

        <form onSubmit={sendMessage} className="mb-8 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Recipient Phone Number
            </label>
            <input
              type="tel"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="+1234567890"
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Message
            </label>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type your message..."
              rows={3}
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={sending || !recipient.trim() || !messageText.trim()}
            className="w-full py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed font-medium transition-colors"
          >
            {sending ? 'Sending...' : 'Send iMessage'}
          </button>
        </form>

        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-900/50 border border-red-700 text-red-200">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 rounded-lg bg-green-900/50 border border-green-700 text-green-200">
            {success}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Messages</h2>
            <button
              onClick={fetchMessages}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              Refresh
            </button>
          </div>

          {messages.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No messages yet</p>
              <p className="text-sm mt-2">
                Send a message or wait for incoming messages
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-4 rounded-lg ${
                    msg.direction === 'outbound'
                      ? 'bg-blue-900/30 border border-blue-800 ml-8'
                      : 'bg-gray-800 border border-gray-700 mr-8'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      {msg.direction === 'outbound' ? (
                        <span className="text-blue-400">To: {msg.to}</span>
                      ) : (
                        <span className="text-green-400">From: {msg.from}</span>
                      )}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(msg.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-gray-200">{msg.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-12 p-4 rounded-lg bg-gray-800/50 border border-gray-700">
          <h3 className="font-medium mb-2">Webhook Configuration</h3>
          <p className="text-sm text-gray-400">
            Configure your TextBubbles webhook URL to:
          </p>
          <code className="block mt-2 p-2 bg-gray-900 rounded text-sm text-green-400">
            https://sosconnect.org/api/webhook/textbubbles
          </code>
        </div>
      </div>
    </div>
  );
}
