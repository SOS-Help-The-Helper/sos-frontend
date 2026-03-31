'use client';

import { useState, useRef, useEffect } from 'react';
import { emitMapCommand } from '@/lib/map-commands';
import { parseAgentResponse, detectSearchIntent, autoSearchForMap } from '@/lib/agent-map-parser';
import { TapCardGrid, QuickChips } from './agent-tap-cards';

type SheetState = 'collapsed' | 'half' | 'full';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  cards?: { type: string; options?: any[] };
}

interface SOSBottomSheetProps {
  open: boolean;
  onClose: () => void;
  context: 'map' | 'feed' | 'profile';
  userLat?: number;
  userLng?: number;
}

const DOMAIN_CARDS = [
  { id: 'safety', icon: '🆘', label: 'Safety' },
  { id: 'housing', icon: '🏠', label: 'Housing' },
  { id: 'food', icon: '🍽️', label: 'Food' },
  { id: 'health', icon: '💊', label: 'Health' },
  { id: 'utilities', icon: '⚡', label: 'Utilities' },
  { id: 'supplies', icon: '📦', label: 'Supplies' },
];

const MAP_CHIPS = [
  { id: 'shelters', label: 'Find shelters', icon: '🏠' },
  { id: 'help', label: 'I need help', icon: '🔴' },
  { id: 'driver', label: 'Sign me up as driver', icon: '🚗' },
  { id: 'near', label: "What's near me", icon: '📍' },
];

/**
 * Full agent chat overlaid on the map.
 * Collapsed: input bar. Half: chat visible. Full: full conversation.
 * Agent responses can include map commands that update pins/bounds.
 */
export function SOSBottomSheet({ open, onClose, context, userLat = 35.5951, userLng = -82.5515 }: SOSBottomSheetProps) {
  const [sheetState, setSheetState] = useState<SheetState>('half');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initialized = useRef(false);

  // Initial greeting
  useEffect(() => {
    if (!open || initialized.current) return;
    initialized.current = true;
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: "What can I help you with?",
    }]);
  }, [open]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      initialized.current = false;
      setSheetState('half');
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(text: string) {
    const userMsg: Message = { id: `user-${Date.now()}`, role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    if (sheetState === 'collapsed') setSheetState('half');

    // Detect quick intents that show tap cards
    const lower = text.toLowerCase();
    if (lower.includes('need help') && !lower.includes('find') && !lower.includes('show')) {
      setMessages(prev => [...prev, {
        id: `a-${Date.now()}`, role: 'assistant', content: 'What kind of help do you need?',
        cards: { type: 'domain_select' },
      }]);
      setLoading(false);
      return;
    }

    // Send to agent API
    const assistantId = `a-${Date.now()}`;
    let assistantContent = '';

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

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
      assistantContent = "Having trouble connecting. Try again.";
      setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: assistantContent }]);
    }

    // Parse response for map commands
    if (assistantContent) {
      const parsed = parseAgentResponse(assistantContent);

      // If explicit map command in response
      if (parsed.mapCommand) {
        emitMapCommand(parsed.mapCommand);
        if (parsed.text !== assistantContent) {
          setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: parsed.text } : m));
        }
      } else {
        // Auto-detect: did agent mention finding/showing resources?
        const intent = detectSearchIntent(assistantContent);
        if (intent.isSearch && intent.keyword) {
          const cmd = await autoSearchForMap(intent.keyword, userLat, userLng);
          if (cmd) emitMapCommand(cmd);
        }
      }
    }

    setLoading(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    sendMessage(input.trim());
  }

  if (!open) return null;

  // Sheet heights
  const sheetHeight = sheetState === 'full' ? 'calc(100vh - 56px - env(safe-area-inset-bottom, 0px))'
    : sheetState === 'half' ? '55vh' : '64px';

  return (
    <div className="fixed left-0 right-0 z-50 max-w-lg mx-auto transition-all duration-300"
      style={{ bottom: 'calc(56px + env(safe-area-inset-bottom, 0px))', height: sheetHeight }}>

      {/* Backdrop (only when half/full) */}
      {sheetState !== 'collapsed' && (
        <div className="fixed inset-0 -z-10" onClick={onClose} />
      )}

      <div className="bg-[#1A3850] rounded-t-2xl h-full flex flex-col shadow-2xl border-t border-white/10 overflow-hidden">
        {/* Drag handle + header */}
        <div className="flex items-center justify-between px-4 py-2 flex-shrink-0">
          <button onClick={() => {
            if (sheetState === 'collapsed') setSheetState('half');
            else if (sheetState === 'half') setSheetState('full');
            else setSheetState('half');
          }} className="flex items-center gap-2">
            <div className="w-8 h-1 bg-white/20 rounded-full" />
          </button>
          <div className="flex items-center gap-1.5">
            <img src="/logomark.svg" alt="SOS" className="h-5 w-5" />
            <span className="text-[10px] font-bold text-white/60">SOS Agent</span>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white text-sm px-1">✕</button>
        </div>

        {/* Messages (hidden when collapsed) */}
        {sheetState !== 'collapsed' && (
          <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-2.5">
            {messages.map(msg => (
              <div key={msg.id}>
                <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 ${
                    msg.role === 'user'
                      ? 'bg-sos-red-500 text-white rounded-br-md'
                      : 'bg-white/10 text-white rounded-bl-md'
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>

                {/* Tap cards */}
                {msg.cards?.type === 'domain_select' && (
                  <div className="mt-2 ml-1">
                    <TapCardGrid options={DOMAIN_CARDS} onSelect={(id) => {
                      const d = DOMAIN_CARDS.find(c => c.id === id);
                      sendMessage(`I need help with ${d?.label || id}`);
                    }} freeTextPlaceholder="Or describe what's going on..." onFreeText={sendMessage} />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/10 rounded-2xl rounded-bl-md px-3.5 py-2">
                  <div className="flex gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-sos-accent-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-sos-accent-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-sos-accent-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Quick chips (first messages only, non-collapsed) */}
        {sheetState !== 'collapsed' && messages.length <= 2 && !loading && (
          <div className="px-4 py-1.5 flex-shrink-0">
            <QuickChips chips={MAP_CHIPS} onSelect={(id) => {
              const prompts: Record<string, string> = {
                shelters: 'Find shelters near me',
                help: 'I need help',
                driver: 'Sign me up as a driver',
                near: "What resources are near me",
              };
              sendMessage(prompts[id] || id);
            }} />
          </div>
        )}

        {/* Input bar (always visible) */}
        <div className="px-4 py-2.5 border-t border-white/10 flex-shrink-0">
          <form onSubmit={handleSubmit} className="flex gap-2 max-w-full">
            <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)}
              onFocus={() => { if (sheetState === 'collapsed') setSheetState('half'); }}
              placeholder="Ask SOS anything..."
              disabled={loading}
              className="flex-1 px-3.5 py-2 rounded-xl bg-white/10 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-sos-accent-400 disabled:opacity-50" />
            <button type="submit" disabled={!input.trim() || loading}
              className="w-9 h-9 rounded-xl bg-sos-red-500 text-white flex items-center justify-center disabled:opacity-30 transition-colors flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
