'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuthContext } from '@/lib/auth-context';
import { Send } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function AgentChat() {
  const { orgId, orgName, isAdmin } = useAuthContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          orgId: orgId || 'sos-platform',
          sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Agent error: ${response.status}`);
      }

      // Handle SSE streaming
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      const assistantId = crypto.randomUUID();

      // Add empty assistant message
      setMessages(prev => [...prev, {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      }]);

      if (reader) {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                // Handle different SSE event types
                if (data.type === 'response.output_text.delta') {
                  assistantContent += data.delta || '';
                  setMessages(prev => prev.map(m =>
                    m.id === assistantId ? { ...m, content: assistantContent } : m
                  ));
                } else if (data.type === 'response.completed') {
                  // Extract response ID for session continuity
                  if (data.response?.id) {
                    setSessionId(data.response.id);
                  }
                  // Get full text if available
                  const fullText = data.response?.output?.find?.((o: any) => o.type === 'message')
                    ?.content?.find?.((c: any) => c.type === 'output_text')?.text;
                  if (fullText && !assistantContent) {
                    assistantContent = fullText;
                    setMessages(prev => prev.map(m =>
                      m.id === assistantId ? { ...m, content: fullText } : m
                    ));
                  }
                }
              } catch {
                // Non-JSON SSE line — might be plain text
                if (line.slice(6).trim() && !line.includes('[DONE]')) {
                  assistantContent += line.slice(6);
                  setMessages(prev => prev.map(m =>
                    m.id === assistantId ? { ...m, content: assistantContent } : m
                  ));
                }
              }
            }
          }
        }
      }

      // If no streaming content was received, try to parse as regular JSON
      if (!assistantContent) {
        try {
          const text = await response.text();
          const data = JSON.parse(text);
          assistantContent = data.output?.[0]?.content?.[0]?.text || data.message || 'Agent responded';
          setMessages(prev => prev.map(m =>
            m.id === assistantId ? { ...m, content: assistantContent } : m
          ));
        } catch {
          // Keep whatever we have
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Connection issue — please try again. Your SOS agent is available via Slack or WhatsApp in the meantime.',
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  const agentName = isAdmin ? 'SOS Platform' : orgName || 'SOS';

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)] bg-white rounded-xl border border-sos-gray-300 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-sos-gray-300 bg-sos-blue-800">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <div>
            <h3 className="text-sm font-bold text-white">{agentName} Agent</h3>
            <p className="text-[10px] text-sos-accent-400">
              {isAdmin ? 'Platform coordination' : 'Your coordination partner'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-14 h-14 rounded-full bg-sos-blue-800 flex items-center justify-center mb-4">
              <img src="/logomark.svg" alt="SOS" className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-sos-blue-800">
              {agentName} Agent
            </h3>
            <p className="text-sm text-sos-gray-600 mt-1 max-w-sm">
              Your coordination partner. Ask about matches, capacity, situations, or anything else.
            </p>
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              {[
                'Show me open matches',
                'What\'s our capacity?',
                'Situation brief',
              ].map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}
                  className="text-xs px-3 py-1.5 rounded-full border border-sos-accent-200 text-sos-accent-700 hover:bg-sos-accent-50 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
              msg.role === 'user'
                ? 'bg-sos-blue-800 text-white rounded-br-md'
                : 'bg-sos-gray-200 text-sos-blue-800 rounded-bl-md'
            }`}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              {msg.content === '' && loading && (
                <div className="flex gap-1 py-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-sos-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-sos-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-sos-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="px-4 py-3 border-t border-sos-gray-300 bg-sos-gray-200/50">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Message your SOS agent..."
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-white border border-sos-gray-300 text-sm text-sos-blue-800 placeholder:text-sos-gray-500 focus:outline-none focus:border-sos-accent-400 focus:ring-1 focus:ring-sos-accent-400/30 disabled:opacity-50 transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-xl bg-sos-red-500 text-white flex items-center justify-center hover:bg-sos-red-600 disabled:opacity-30 disabled:hover:bg-sos-red-500 transition-colors flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
