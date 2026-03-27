'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuthContext } from '@/lib/auth-context';
import { useViewContext } from '@/lib/view-context';
import { Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AgentChatProps {
  hideHeader?: boolean;
}

export function AgentChat({ hideHeader = false }: AgentChatProps) {
  const { orgId, orgName, isAdmin } = useAuthContext();
  const { currentView, effectiveAgentId, effectiveOrgId } = useViewContext();
  // Persist messages per agent in localStorage
  const storageKey = `sos-chat-${effectiveAgentId}`;
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Save messages to localStorage
    if (messages.length > 0) {
      try { localStorage.setItem(storageKey, JSON.stringify(messages)); } catch {}
    }
    // Aggressive scroll — use timeout to wait for DOM + keyboard layout shift
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages]);

  // Also scroll when sending (keyboard might shift layout)
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 300);
    return () => clearTimeout(timer);
  }, [loading]);

  // Load persisted conversation when view changes
  useEffect(() => {
    const key = `sos-chat-${effectiveAgentId}`;
    try {
      const saved = localStorage.getItem(key);
      setMessages(saved ? JSON.parse(saved) : []);
    } catch { setMessages([]); }
    setSessionId(null);
    setLoading(false);
  }, [currentView, effectiveAgentId]);

  // Don't auto-focus on mobile — keyboard covers the screen on load

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
          orgId: (typeof window !== 'undefined' ? document.querySelector('[data-view-id]')?.getAttribute('data-view-id') : null) || orgId || 'sos-platform',
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

  const VIEW_CONFIG: Record<string, { name: string; welcome: string; suggestions: string[] }> = {
    'admin': {
      name: 'SOS Platform',
      welcome: 'You\'re connected to the SOS Platform agent. Full access to all coordination data, matches, and system intelligence.',
      suggestions: ['System status', 'Show all open matches', 'Partner performance'],
    },
    'citizen': {
      name: 'SOS',
      welcome: 'We\'re here to help. Tell us what you need or what you can offer — we\'ll connect you with the right people.',
      suggestions: ['I need help', 'I can help', 'What\'s available near me?'],
    },
    '43299807-6229-49be-9a6b-0498c9188178': {
      name: 'Aid Arena',
      welcome: 'Welcome to Aid Arena coordination. Manage your volunteer network, approve match chains, and track multi-partner deployments.',
      suggestions: ['Open coordination tasks', 'Network status', 'Assign a partner'],
    },
    'da86c92f-d52d-4b13-a474-30e1be8fb808': {
      name: 'Emergency RV',
      welcome: 'Hey Woody — your ERV fleet dashboard. Check unit availability, assign drivers, and manage housing deployments.',
      suggestions: ['Fleet status', 'Open housing matches', 'Assign a unit'],
    },
    '9d894368-51af-4cf7-9318-444a3c216f5d': {
      name: 'Free Hot Meals',
      welcome: 'Free Hot Meals coordination. Manage your meal sites, track serving capacity, and match hungry families to events.',
      suggestions: ['Today\'s meal schedule', 'Site capacity', 'Open food matches'],
    },
    'c1e74116-5e12-410a-9b21-dc80c7646d77': {
      name: 'Greater Good',
      welcome: 'Greater Good supply chain. Track warehouse inventory, dispatch supplies, and manage distribution to disaster zones.',
      suggestions: ['Inventory levels', 'Pending dispatch', 'Supply matches'],
    },
    '2d84a5d4-41a6-4817-8c36-37d6f8cd727a': {
      name: 'Endurant',
      welcome: 'Endurant vendor portal. Browse available restoration jobs, submit bids, and track your active projects.',
      suggestions: ['Available jobs', 'My active bids', 'Job history'],
    },
  };
  const viewConfig = VIEW_CONFIG[currentView] || VIEW_CONFIG['admin'];
  const agentName = viewConfig.name;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-7.5rem)] bg-[#F7F5F0] rounded-xl border border-sos-gray-300 overflow-hidden">
      {/* Header — hidden when embedded in dashboard shell */}
      {!hideHeader && (
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
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center -mt-16 md:-mt-8">
            <div className="w-12 h-12 rounded-full bg-sos-blue-800 flex items-center justify-center mb-3">
              <img src="/logomark.svg" alt="SOS" className="h-10 w-10" />
            </div>
            <h3 className="text-xl font-bold text-sos-blue-800">
              {agentName}
            </h3>
            <p className="text-base text-sos-gray-600 mt-2 max-w-md">
              {viewConfig.welcome}
            </p>
            <div className="flex flex-wrap gap-3 mt-6 justify-center">
              {viewConfig.suggestions.length > 0 ? viewConfig.suggestions.map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => { setInput(suggestion); }}
                  className="text-sm px-4 py-2 rounded-full border-2 border-sos-accent-200 text-sos-accent-700 hover:bg-sos-accent-50 transition-colors"
                >
                  {suggestion}
                </button>
              )) : [
                'Show me open matches',
                'What\'s our capacity?',
                'Situation brief',
              ].map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}
                  className="text-sm px-4 py-2 rounded-full border-2 border-sos-blue-800 text-sos-blue-800 font-medium hover:bg-sos-blue-800 hover:text-white transition-colors"
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
            className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-sos-blue-800 flex items-center justify-center flex-shrink-0 mt-1">
                <img src="/logomark.svg" alt="SOS" className="h-4 w-4" />
              </div>
            )}
            <div className={`max-w-[80%] md:max-w-[75%] ${
              msg.role === 'user'
                ? 'bg-sos-blue-800 text-white rounded-2xl rounded-br-md px-4 py-2.5'
                : 'bg-[#F7F5F0] border border-sos-gray-300 text-sos-blue-800 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm'
            }`}>
              {msg.role === 'assistant' ? (
                <div className="text-sm leading-relaxed prose prose-sm max-w-none prose-headings:text-sos-blue-800 prose-headings:font-bold prose-headings:mt-3 prose-headings:mb-1 prose-h1:text-base prose-h2:text-sm prose-h3:text-sm prose-p:my-1.5 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-strong:text-sos-blue-800 prose-li:marker:text-sos-red-500">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              )}
              {msg.content === '' && loading && (
                <div className="flex gap-1.5 py-1">
                  <div className="w-2 h-2 rounded-full bg-sos-accent-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-sos-accent-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-sos-accent-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}
              <div className={`text-[10px] mt-1.5 ${msg.role === 'user' ? 'text-white/40' : 'text-sos-gray-400'}`}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="px-4 py-3 border-t border-sos-gray-300 bg-[#F0EDE8]">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Message your SOS agent..."
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-white border border-sos-gray-300 text-base md:text-sm text-sos-blue-800 placeholder:text-sos-gray-500 focus:outline-none focus:border-sos-accent-400 focus:ring-1 focus:ring-sos-accent-400/30 disabled:opacity-50 transition-colors"
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
