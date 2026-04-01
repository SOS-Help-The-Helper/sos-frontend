'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { CitizenShell } from '@/components/citizen-shell';
import { QuickChips } from '@/components/agent-tap-cards';
import { AIToolRenderer } from '@/components/ai-tool-renderer';
import { loadChatHistory, saveChatHistoryDebounced } from '@/lib/chat-persistence';
import { getPersonContext } from '@/lib/person-context';

const QUICK_ACTIONS = [
  { id: 'help', label: 'I Need Help', icon: '🔴' },
  { id: 'offer', label: 'I Can Help', icon: '🤝' },
  { id: 'report', label: 'Report', icon: '📢' },
  { id: 'score', label: 'My Score', icon: '📊' },
];

function AgentContent() {
  const params = useSearchParams();
  const initialQuery = params.get('q');
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const personId = typeof window !== 'undefined' ? localStorage.getItem('sos-person-id') : null;

  const { messages, sendMessage, status, error: chatError } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat', headers: { 'x-person-id': (typeof window !== 'undefined' ? localStorage.getItem('sos-person-id') : '') || '', 'x-authenticated': (typeof window !== 'undefined' && localStorage.getItem('sos-person-id')) ? 'true' : 'false' } }),
    // No initial messages — agent responds to first user action
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  // Fix 5: Debounced chat persistence
  useEffect(() => {
    if (!personId || messages.length <= 1) return;
    saveChatHistoryDebounced(personId, messages);
  }, [personId, messages]);

  useEffect(() => {
    if (initialQuery && !initialized.current) {
      initialized.current = true;
      sendMessage({ text: initialQuery });
    }
  }, [initialQuery, sendMessage]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  function send(text: string) {
    sendMessage({ text });
    setInput('');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    send(input.trim());
  }

  return (
    <CitizenShell hideSOSButton>
      <div className="flex flex-col h-full pb-[calc(56px+env(safe-area-inset-bottom,0px))]">
        <div className="bg-[#1A3850] px-4 py-3 pt-[calc(env(safe-area-inset-top,0px)+12px)] flex items-center gap-2">
          <img src="/logomark.svg" alt="SOS" className="h-6 w-6" />
          <span className="text-sm font-bold text-white">SOS Agent</span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-[#0F1E2B]">
          {messages.map(msg => (
            <div key={msg.id}>
              {(msg as any).parts?.map((part: any, pi: number) => {
                if (part.type === 'text' && part.text) {
                  return (
                    <div key={pi} className={`flex ${((msg as any).role === 'user') ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                        ((msg as any).role === 'user') ? 'bg-sos-red-500 text-white rounded-br-md' : 'bg-white/10 text-white rounded-bl-md'
                      }`}>
                        {((msg as any).role === 'assistant') && (
                          <div className="flex items-center gap-1.5 mb-1">
                            <img src="/logomark.svg" alt="" className="h-3.5 w-3.5" />
                            <span className="text-[9px] font-bold text-white/40">SOS</span>
                          </div>
                        )}
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{part.text}</p>
                      </div>
                    </div>
                  );
                }
                if (part.type === 'tool-invocation') {
                  const inv = part.toolInvocation;
                  if (inv?.state === 'result') {
                    try {
                      const data = typeof inv.result === 'string' ? JSON.parse(inv.result) : inv.result;
                      if (data?.__tool) return <div key={pi} className="ml-1 mt-1"><AIToolRenderer toolData={data} onUserAction={send} /></div>;
                    } catch {}
                  }
                }
                return null;
              })}
            </div>
          ))}

          {/* Error + retry */}
          {chatError && !isLoading && (
            <div className="flex justify-start">
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl rounded-bl-md px-4 py-2.5">
                <p className="text-xs text-red-400">Something went wrong.</p>
                <button onClick={() => { if (messages.length > 0) sendMessage({ text: 'continue' }); }}
                  className="text-[10px] text-red-300 underline mt-1">Retry</button>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white/10 rounded-2xl rounded-bl-md px-4 py-2.5">
                <div className="flex gap-1.5 items-center">
                  <span className="text-[9px] text-white/30 mr-1">SOS is thinking</span>
                  <div className="w-2 h-2 rounded-full bg-sos-accent-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-sos-accent-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-sos-accent-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {messages.length <= 2 && !isLoading && (
          <div className="px-4 py-2 bg-[#0F1E2B] border-t border-white/5">
            <QuickChips chips={QUICK_ACTIONS} onSelect={(id) => {
              const prompts: Record<string, string> = { help: 'I need help', offer: 'I can help', report: 'I want to report something', score: 'Show me my SOS score' };
              send(prompts[id] || id);
            }} />
          </div>
        )}

        <div className="bg-[#1A3850] px-4 py-3 border-t border-white/10">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input type="text" value={input} onChange={e => setInput(e.target.value)}
              placeholder="Ask SOS anything..." disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-sos-accent-400 disabled:opacity-50" />
            <button type="submit" disabled={!input.trim() || isLoading}
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
