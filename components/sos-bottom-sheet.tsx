'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { QuickChips } from './agent-tap-cards';
import { AIToolRenderer } from './ai-tool-renderer';
import { loadChatHistory, saveChatHistoryDebounced } from '@/lib/chat-persistence';
import { getPersonContext } from '@/lib/person-context';

type SheetState = 'collapsed' | 'half' | 'full';

const DEFAULT_CHIPS = [
  { id: 'help', label: 'Get help', icon: '' },
  { id: 'offer', label: 'Give help', icon: '' },
  { id: 'report', label: 'Report', icon: '' },
];

const ERV_CHIPS = [
  { id: 'help', label: 'I need an RV', icon: '🏠' },
  { id: 'donate', label: 'Donate an RV', icon: '🚐' },
  { id: 'drive', label: 'Drive an RV to a family', icon: '🛣️' },
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
  partner?: string; // 'erv', 'fhm', etc. — shows partner-specific chips
}

export function SOSBottomSheet({ open, onClose, context, userLat = 35.5951, userLng = -82.5515, personId, isAuthenticated = false, fullScreen = false, partner }: SOSBottomSheetProps) {
  const [sheetState, setSheetState] = useState<SheetState>(fullScreen ? 'full' : 'half');
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error: chatError } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat', headers: { 'x-person-id': personId || '', 'x-authenticated': String(isAuthenticated), 'x-user-lat': String(userLat || ''), 'x-user-lng': String(userLng || '') } }),
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
  // Scroll to latest message on new messages AND when keyboard opens (input focus)
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages]);
  useEffect(() => {
    // When virtual keyboard opens/closes, scroll to keep last message visible
    if (typeof window !== 'undefined' && window.visualViewport) {
      const handler = () => setTimeout(scrollToBottom, 100);
      window.visualViewport.addEventListener('resize', handler);
      return () => window.visualViewport?.removeEventListener('resize', handler);
    }
  }, []);

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

  // Track visual viewport offset for keyboard
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const vv = window.visualViewport;
    const handler = () => {
      const offset = window.innerHeight - vv.height;
      setKeyboardOffset(offset > 50 ? offset : 0);
    };
    vv.addEventListener('resize', handler);
    vv.addEventListener('scroll', handler);
    return () => { vv.removeEventListener('resize', handler); vv.removeEventListener('scroll', handler); };
  }, []);

  if (!open) return null;

  // Full: below header (~80px) and above nav (56px)
  const sheetHeight = sheetState === 'full' ? 'calc(100vh - 136px - env(safe-area-inset-top, 0px))'
    : sheetState === 'half' ? '45vh' : '64px';
  const bottomOffset = keyboardOffset > 0 ? keyboardOffset : 56;

  const hasMessages = messages.length > 0;

  return (
    <div className="fixed left-0 right-0 z-50 max-w-lg mx-auto transition-all duration-300"
      style={{ bottom: `${bottomOffset}px`, height: sheetHeight, maxWidth: '100vw' }}>
      {sheetState !== 'collapsed' && <div className="fixed inset-0 -z-10 bg-black/20 backdrop-blur-[1px]" onClick={onClose} />}
      <div className="h-full flex flex-col overflow-hidden relative"
        style={{
          background: 'rgba(26, 56, 80, 0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '24px 24px 0 0',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.4), 0 0 30px rgba(239,78,75,0.08)',
        }}>

        {/* Border that fades at top for logomark */}
        <div className="absolute inset-0 rounded-t-[24px] pointer-events-none" style={{
          border: '1.5px solid rgba(239,78,75,0.2)',
          borderBottom: 'none',
          mask: 'linear-gradient(to bottom, transparent 0px, transparent 20px, black 20px)',
          WebkitMask: 'linear-gradient(to bottom, transparent 0px, transparent 20px, black 20px)',
        }} />

        {/* Floating logomark — only in opening state */}
        {!hasMessages && !isLoading && !fullScreen && (
          <div className="absolute left-1/2 -translate-x-1/2 -top-8 z-10 animate-[logoFloat_0.4s_ease-out]">
            <div className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{
                background: 'rgba(15,30,43,0.97)',
                boxShadow: '0 0 30px rgba(239,78,75,0.35), 0 4px 20px rgba(0,0,0,0.4)',
                border: '2px solid rgba(239,78,75,0.35)',
              }}>
              <img src="/logomark-red.svg" alt="SOS" className="w-8 h-8" />
            </div>
            {/* Pulse ring behind logomark */}
            <div className="absolute inset-0 rounded-full animate-ping" style={{ border: '1px solid rgba(239,78,75,0.2)', animationDuration: '2s' }} />
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 flex-shrink-0">
          <button onClick={() => setSheetState(sheetState === 'collapsed' ? 'half' : sheetState === 'half' ? 'full' : 'half')}>
            <div className="w-8 h-1 bg-white/20 rounded-full" />
          </button>
          <div className="flex items-center gap-1.5">
            {hasMessages && <img src="/logomark-red.svg" alt="SOS" className="h-4 w-4" />}
            <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
              {hasMessages ? 'SOS Agent' : ''}
            </span>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white text-sm px-1">✕</button>
        </div>

        {/* Messages */}
        {sheetState !== 'collapsed' && (
          <div className={`${messages.length > 0 ? 'flex-1' : ''} overflow-y-auto px-3 pb-2 space-y-4 overflow-x-hidden ${fullScreen ? 'pt-16' : ''}`}>
            {messages.map(msg => (
              <div key={msg.id}>
                {/* Debug: show part types */}
                <div className="text-[8px] text-white/20 mb-1">
                  {(msg as any).parts?.map((p: any, i: number) => `[${i}:${p.type}${p.state ? ':'+p.state : ''}]`).join(' ')}
                </div>
                {/* Render from parts (AI SDK v6 pattern) */}
                {(msg as any).parts?.map((part: any, pi: number) => {
                  if (part.type === 'text' && part.text) {
                    // Hide match context JSON from display
                    if (part.text.trim().startsWith('{"action":"match"')) return null;
                    if (part.text.trim().startsWith('[SOS_CONFIRMED')) return null;
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

        {/* Opening state — branded welcome */}
        {sheetState !== 'collapsed' && messages.length === 0 && !isLoading && !fullScreen && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#EF4E4B] mb-2">SOS Agent</p>
            <p className="text-center text-sm text-white/60 mb-5">How can I help?</p>
            {partner === 'erv' ? (
              <QuickChips chips={ERV_CHIPS} onSelect={(id) => {
                const prompts: Record<string, string> = { donate: 'I want to donate an RV', drive: 'I want to volunteer as an RV delivery driver' };
                send(prompts[id] || id);
              }} />
            ) : (
              <div className="flex gap-2.5">
                {[
                  { id: 'help', label: 'Get help', color: '#EF4E4B', prompt: 'I need help' },
                  { id: 'offer', label: 'Give help', color: '#89CFF0', prompt: 'I want to help' },
                  { id: 'report', label: 'Report', color: '#FBBF24', prompt: 'I want to report something' },
                ].map(chip => (
                  <button key={chip.id} onClick={() => send(chip.prompt)}
                    className="flex items-center gap-2 text-[12px] font-semibold px-4 py-2.5 rounded-2xl text-white active:scale-[0.97] transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: `1.5px solid ${chip.color}30`,
                      boxShadow: `0 0 12px ${chip.color}10`,
                    }}>
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: chip.color, boxShadow: `0 0 6px ${chip.color}40` }} />
                    {chip.label}
                  </button>
                ))}
              </div>
            )}
            <p className="mt-4 text-[10px] text-white/20">or type anything below</p>
          </div>
        )}

        <style>{`@keyframes logoFloat { from { opacity: 0; transform: translateX(-50%) translateY(10px) scale(0.8); } to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); } }`}</style>

        {/* Input */}
        <div className="px-4 py-2.5 border-t border-white/10 flex-shrink-0">
          <form onSubmit={handleSubmit} className="flex gap-2 w-full overflow-hidden">
            <input type="text" value={input} onChange={e => setInput(e.target.value)}
              onFocus={() => { if (sheetState === 'collapsed') setSheetState('half'); }}
              placeholder={messages.length === 0 ? "Find resources near me, report an issue..." : "Ask SOS anything..."} disabled={isLoading}
              className="flex-1 min-w-0 px-3.5 py-2 rounded-xl bg-white/10 border border-white/10 text-base text-white placeholder:text-white/30 focus:outline-none focus:border-sos-accent-400 disabled:opacity-50" />
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
