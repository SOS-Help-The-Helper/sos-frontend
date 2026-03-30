'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rtduqguwhkczexnoawej.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Agent-first partner onboarding.
 * No forms — just a conversation with the SOS agent.
 * Agent handles: org name, type, capabilities, location, coverage, contact.
 * When ready, agent creates the organization via intake-write EF.
 */
export default function OnboardPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initial agent greeting
  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: "Welcome to SOS Connect! I'm here to help you get your organization set up.\n\nI'll need a few things from you:\n• Your organization's name\n• What type of services you provide\n• Your location and coverage area\n• Contact information\n\nLet's start — what's your organization called?",
    }]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      // Send to agent chat API with onboarding context
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          context: 'partner_onboarding',
          history: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (res.ok) {
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let assistantContent = '';

        setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
            for (const line of lines) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.text) {
                  assistantContent += data.text;
                  setMessages(prev => {
                    const copy = [...prev];
                    copy[copy.length - 1] = { role: 'assistant', content: assistantContent };
                    return copy;
                  });
                }
              } catch { /* skip malformed chunks */ }
            }
          }
        }

        // If no streaming, try JSON response
        if (!assistantContent) {
          try {
            const data = await res.json();
            assistantContent = data.message || data.text || 'I understand. Let me process that.';
            setMessages(prev => {
              const copy = [...prev];
              copy[copy.length - 1] = { role: 'assistant', content: assistantContent };
              return copy;
            });
          } catch { /* already handled via streaming */ }
        }
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting. Please try again in a moment." }]);
    }

    setLoading(false);
    inputRef.current?.focus();
  }

  return (
    <div className="min-h-screen bg-[#F7F5F0] flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <header className="bg-sos-blue-800 text-white px-4 py-4 pt-[calc(env(safe-area-inset-top,0px)+12px)]">
        <div className="flex items-center gap-3">
          <img src="/logomark.svg" alt="SOS" className="h-9 w-9" />
          <div>
            <h1 className="text-base font-bold leading-none">SOS | Connect</h1>
            <p className="text-[10px] text-white/50 mt-0.5">Partner Onboarding</p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
              msg.role === 'user'
                ? 'bg-sos-blue-800 text-white rounded-br-md'
                : 'bg-white border border-sos-gray-300 text-sos-blue-800 rounded-bl-md'
            }`}>
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-1.5 mb-1.5">
                  <img src="/logomark.svg" alt="" className="h-4 w-4" />
                  <span className="text-[10px] font-bold text-sos-gray-500">SOS Agent</span>
                </div>
              )}
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-sos-gray-300 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-sos-accent-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-sos-accent-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-sos-accent-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Shortcuts */}
      {messages.length <= 2 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {['We\'re a food bank', 'Emergency shelter provider', 'Volunteer coordination', 'Disaster restoration vendor'].map(suggestion => (
            <button key={suggestion} onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}
              className="text-xs px-3 py-1.5 rounded-full bg-white border border-sos-gray-300 text-sos-blue-800 font-medium hover:bg-sos-gray-200 transition-colors">
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="bg-sos-blue-800 px-4 py-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] border-t border-white/10">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)}
            placeholder="Tell me about your organization..."
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-sos-accent-400 disabled:opacity-50" />
          <button type="submit" disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-xl bg-sos-red-500 text-white flex items-center justify-center hover:bg-sos-red-600 disabled:opacity-30 transition-colors flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
          </button>
        </form>

        <div className="flex items-center justify-between mt-2">
          <p className="text-[10px] text-white/30">Prefer a form? <button onClick={() => router.push('/register')} className="text-white/50 underline">Use registration form →</button></p>
        </div>
      </div>
    </div>
  );
}
