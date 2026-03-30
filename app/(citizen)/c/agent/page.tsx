'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CitizenShell } from '@/components/citizen-shell';
import { TapCardGrid, QuickChips, CounterCards, ToggleChips } from '@/components/agent-tap-cards';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  cards?: any; // interactive tap cards data
}

const DOMAIN_CARDS = [
  { id: 'safety', icon: '🆘', label: 'Safety' },
  { id: 'housing', icon: '🏠', label: 'Housing' },
  { id: 'food', icon: '🍽️', label: 'Food' },
  { id: 'health', icon: '💊', label: 'Health' },
  { id: 'utilities', icon: '⚡', label: 'Utilities' },
  { id: 'supplies', icon: '📦', label: 'Supplies' },
];

const QUICK_ACTIONS = [
  { id: 'help', label: 'I Need Help', icon: '🔴' },
  { id: 'offer', label: 'I Can Help', icon: '🤝' },
  { id: 'report', label: 'Report', icon: '📢' },
  { id: 'score', label: 'My Score', icon: '📊' },
];

function AgentContent() {
  const params = useSearchParams();
  const initialQuery = params.get('q');

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initialized = useRef(false);

  // Initial greeting or pre-loaded query
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    if (initialQuery) {
      sendMessage(initialQuery);
    } else {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: "I'm your SOS agent. What can I help with?",
      }]);
    }
  }, [initialQuery]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(text: string) {
    const userMsg: Message = { id: `user-${Date.now()}`, role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Detect if this is a quick action and show tap cards
    const lower = text.toLowerCase();
    if (lower.includes('need help') || lower === 'i need help') {
      setMessages(prev => [...prev, {
        id: `assist-${Date.now()}`,
        role: 'assistant',
        content: 'What kind of help do you need?',
        cards: { type: 'domain_select' },
      }]);
      setLoading(false);
      return;
    }

    if (lower.includes('can help') || lower === 'i can help') {
      setMessages(prev => [...prev, {
        id: `assist-${Date.now()}`,
        role: 'assistant',
        content: "Great! What can you offer? Tap all that apply.",
        cards: { type: 'offer_select' },
      }]);
      setLoading(false);
      return;
    }

    if (lower.includes('report')) {
      setMessages(prev => [...prev, {
        id: `assist-${Date.now()}`,
        role: 'assistant',
        content: 'What are you seeing? Take a photo or describe it.',
        cards: { type: 'report_start' },
      }]);
      setLoading(false);
      return;
    }

    // Default: send to agent API
    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      let assistantContent = '';
      const assistantId = `assist-${Date.now()}`;
      setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

      if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
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
                setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: assistantContent } : m));
              }
            } catch {}
          }
        }
      }

      if (!assistantContent) {
        try {
          const data = await res.json();
          assistantContent = data.message || data.text || "I'm here to help.";
          setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: assistantContent } : m));
        } catch {}
      }
    } catch {
      setMessages(prev => [...prev, { id: `err-${Date.now()}`, role: 'assistant', content: "Having trouble connecting. Try again." }]);
    }

    setLoading(false);
  }

  function handleDomainSelect(domainId: string) {
    const domain = DOMAIN_CARDS.find(d => d.id === domainId);
    sendMessage(`I need help with ${domain?.label || domainId}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    sendMessage(input.trim());
  }

  return (
    <CitizenShell hideSOSButton>
      <div className="flex flex-col h-full pb-[calc(56px+env(safe-area-inset-bottom,0px))]">
        {/* Header */}
        <div className="bg-[#1A3850] px-4 py-3 pt-[calc(env(safe-area-inset-top,0px)+12px)] flex items-center gap-2">
          <img src="/logomark.svg" alt="SOS" className="h-6 w-6" />
          <span className="text-sm font-bold text-white">SOS Agent</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-[#0F1E2B]">
          {messages.map(msg => (
            <div key={msg.id}>
              <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                  msg.role === 'user'
                    ? 'bg-sos-red-500 text-white rounded-br-md'
                    : 'bg-white/10 text-white rounded-bl-md'
                }`}>
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <img src="/logomark.svg" alt="" className="h-3.5 w-3.5" />
                      <span className="text-[9px] font-bold text-white/40">SOS</span>
                    </div>
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>

              {/* Interactive tap cards */}
              {msg.cards?.type === 'domain_select' && (
                <div className="mt-2 ml-2">
                  <TapCardGrid options={DOMAIN_CARDS} onSelect={handleDomainSelect}
                    freeTextPlaceholder="Or describe what's going on..." onFreeText={sendMessage} />
                </div>
              )}

              {msg.cards?.type === 'offer_select' && (
                <div className="mt-2 ml-2">
                  <TapCardGrid options={[
                    { id: 'shelter', icon: '🏠', label: 'Shelter' }, { id: 'food', icon: '🍽️', label: 'Food' },
                    { id: 'transport', icon: '🚗', label: 'Transport' }, { id: 'labor', icon: '💪', label: 'Labor' },
                    { id: 'organizing', icon: '🧑‍💼', label: 'Organizing' }, { id: 'time', icon: '🚶', label: 'My Time' },
                  ]} onSelect={(id) => sendMessage(`I can help with ${id}`)} />
                </div>
              )}

              {msg.cards?.type === 'report_start' && (
                <div className="mt-2 ml-2">
                  <QuickChips chips={[
                    { id: 'photo', label: 'Take Photo', icon: '📸' },
                    { id: 'describe', label: 'Describe It', icon: '💬' },
                  ]} onSelect={(id) => {
                    if (id === 'photo') { /* TODO: trigger photo capture */ sendMessage('I want to take a photo of what I see'); }
                    else sendMessage('Let me describe what I see');
                  }} />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white/10 rounded-2xl rounded-bl-md px-4 py-2.5">
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

        {/* Quick actions (when empty or few messages) */}
        {messages.length <= 2 && (
          <div className="px-4 py-2 bg-[#0F1E2B] border-t border-white/5">
            <QuickChips chips={QUICK_ACTIONS} onSelect={(id) => {
              const prompts: Record<string, string> = { help: 'I need help', offer: 'I can help', report: 'I want to report something', score: 'Show me my SOS score' };
              sendMessage(prompts[id] || id);
            }} />
          </div>
        )}

        {/* Input */}
        <div className="bg-[#1A3850] px-4 py-3 border-t border-white/10">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)}
              placeholder="Ask SOS anything..." disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-sos-accent-400 disabled:opacity-50" />
            <button type="submit" disabled={!input.trim() || loading}
              className="w-10 h-10 rounded-xl bg-sos-red-500 text-white flex items-center justify-center disabled:opacity-30 transition-colors flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
            </button>
          </form>
        </div>
      </div>
    </CitizenShell>
  );
}

export default function AgentPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-[#0F1E2B]"><div className="w-8 h-8 border-2 border-sos-accent-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <AgentContent />
    </Suspense>
  );
}
