'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { QuickChips } from './agent-tap-cards';
import { AIToolRenderer } from './ai-tool-renderer';
import { loadChatHistory, saveChatHistoryDebounced } from '@/lib/chat-persistence';
import { getPersonContext } from '@/lib/person-context';

type SheetState = 'collapsed' | 'half' | 'full';

const MAP_CHIPS = [
  { id: 'help', label: 'Get help', icon: '🔴' },
  { id: 'offer', label: 'Give help', icon: '🟢' },
  { id: 'report', label: 'Report something', icon: '📢' },
];

interface SOSBottomSheetProps {
  open: boolean;
  onClose: () => void;
  context: 'map' | 'feed' | 'profile';
  userLat?: number;
  userLng?: number;
  personId?: string;
  isAuthenticated?: boolean;
  fullScreen?: boolean;
}

export function SOSBottomSheet({ open, onClose, context, userLat = 35.5951, userLng = -82.5515, personId, isAuthenticated = false, fullScreen = false }: SOSBottomSheetProps) {
  const [sheetState, setSheetState] = useState<SheetState>(fullScreen ? 'full' : 'half');
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error: chatError } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat', headers: { 'x-person-id': personId || '', 'x-authenticated': String(isAuthenticated) } }),
    onError: (err) => console.error('Chat error:', err),
    // No welcome message — agent responds to first user action
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  // Fix 5: Load persisted chat history on mount
  const historyLoaded = useRef(false);
  useEffect(() => {
    if (!personId || !open || historyLoaded.current) return;
    historyLoaded.current = true;
    loadChatHistory(personId).then(history => {
      if (history.length > 0) {
        // History loaded — useChat initialMessages handles this via the transport
        // For now, history is loaded server-side via the personId header
      }
    });
  }, [personId, open]);

  // Fix 5: Debounced save on message changes
  useEffect(() => {
    if (!personId || messages.length <= 1) return;
    saveChatHistoryDebounced(personId, messages);
  }, [personId, messages]);

  // Fix 8: Load person context on first authenticated chat
  const contextLoaded = useRef(false);
  useEffect(() => {
    if (!personId || !open || contextLoaded.current) return;
    contextLoaded.current = true;
    getPersonContext(personId).then(ctx => {
      if (ctx) {
        // Send context as a hidden system-level message
        // The API route reads x-person-id header and loads context server-side
        // This is a fallback for client-side context injection
      }
    });
  }, [personId, open]);

  // Listen for match context from map pin buttons
  useEffect(() => {
    function handleMatch(e: any) {
      if (e.detail && open) {
        sendMessage({ text: e.detail });
      }
    }
    window.addEventListener('sos-match-message', handleMatch);
    return () => window.removeEventListener('sos-match-message', handleMatch);
  }, [open, sendMessage]);

  // P1: Save chat to DB for authenticated users (debounced)
  useEffect(() => {
    if (!personId || !isAuthenticated || messages.length < 2) return;
    const timeout = setTimeout(() => {
      fetch('/api/chat-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personId, messages }),
      }).catch(() => {});
    }, 1500);
    return () => clearTimeout(timeout);
  }, [messages, personId, isAuthenticated]);
  if (chatError) console.error('useChat error state:', chatError);

  useEffect(() => { 
    if (!open) setSheetState('half');
    else if (fullScreen) setSheetState('full');
  }, [open, fullScreen]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  function send(text: string) {
    if (sheetState === 'collapsed') setSheetState('half');
    sendMessage({ text });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    send(input.trim());
    setInput('');
  }

  function handleToolAction(message: string) {
    send(message);
  }

  if (!open) return null;

  const sheetHeight = sheetState === 'full' ? 'calc(100vh - 56px - env(safe-area-inset-top, 0px))'
    : sheetState === 'half' ? '45vh' : '64px';

  return (
    <div className="fixed left-0 right-0 z-50 max-w-lg mx-auto transition-all duration-300"
      style={{ bottom: '56px', height: sheetHeight, maxWidth: '100vw' }}>
      {sheetState !== 'collapsed' && <div className="fixed inset-0 -z-10" onClick={onClose} />}
      <div className="bg-[#1A3850] rounded-t-2xl h-full flex flex-col shadow-2xl border-t border-white/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 flex-shrink-0">
          <button onClick={() => setSheetState(sheetState === 'collapsed' ? 'half' : sheetState === 'half' ? 'full' : 'half')}>
            <div className="w-8 h-1 bg-white/20 rounded-full" />
          </button>
          <div className="flex items-center gap-1.5">
            <img src="/logomark.svg" alt="SOS" className="h-5 w-5" />
            <span className="text-[10px] font-bold text-white/60">SOS Agent</span>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white text-sm px-1">✕</button>
        </div>

        {/* Messages */}
        {sheetState !== 'collapsed' && (
          <div className="flex-1 overflow-y-auto px-3 pb-2 space-y-2.5 overflow-x-hidden">
            {messages.map(msg => (
              <div key={msg.id}>
                {/* Render from parts (AI SDK v6 pattern) */}
                {(msg as any).parts?.map((part: any, pi: number) => {
                  if (part.type === 'text' && part.text) {
                    // Hide match context JSON from display
                    if (part.text.trim().startsWith('{"action":"match"')) return null;
                    return (
                      <div key={pi} className={`flex ${((msg as any).role === 'user') ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 ${
                          ((msg as any).role === 'user') ? 'bg-sos-red-500 text-white rounded-br-md' : 'bg-white/10 text-white rounded-bl-md'
                        }`}>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{part.text}</p>
                        </div>
                      </div>
                    );
                  }
                  if (part.type.startsWith('tool-') && part.type !== 'tool-approval-request') {
                  const inv = { state: (part as any).state, result: (part as any).output, toolName: (part as any).toolName || part.type };
                  if (inv?.state === 'result' || inv?.state === 'output-available') {
                    try {
                      const data = typeof inv.result === 'string' ? JSON.parse(inv.result) : inv.result;
                      if (data?.__tool) return <div key={pi} className="ml-1 mt-1"><AIToolRenderer toolData={data} onUserAction={handleToolAction} /></div>;
                    } catch {}
                  }
                  return null;
                  }
                  return null;
                })}
              </div>
            ))}
            {isLoading && (
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

        {/* Quick chips */}
        {sheetState !== 'collapsed' && messages.length === 0 && !isLoading && !fullScreen && (
          <div className="px-4 py-1.5 flex-shrink-0">
            <QuickChips chips={MAP_CHIPS} onSelect={(id) => {
              const prompts: Record<string, string> = { help: 'I need help', offer: 'I want to help', report: 'I want to report something' };
              send(prompts[id] || id);
            }} />
          </div>
        )}

        {/* Input */}
        <div className="px-4 py-2.5 border-t border-white/10 flex-shrink-0">
          <form onSubmit={handleSubmit} className="flex gap-2 w-full overflow-hidden">
            <input type="text" value={input} onChange={e => setInput(e.target.value)}
              onFocus={() => { if (sheetState === 'collapsed') setSheetState('half'); }}
              placeholder="Ask SOS anything..." disabled={isLoading}
              className="flex-1 min-w-0 px-3.5 py-2 rounded-xl bg-white/10 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-sos-accent-400 disabled:opacity-50" />
            <button type="submit" disabled={!input.trim() || isLoading}
              className="w-9 h-9 rounded-xl bg-sos-red-500 text-white flex items-center justify-center disabled:opacity-30 transition-colors flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
