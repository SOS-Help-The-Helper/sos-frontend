'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { AIToolRenderer } from '@/components/ai-tool-renderer';

type Step = 'who' | 'what' | 'chat';
type FlowType = 'survivor' | 'donor' | 'volunteer';
type ForWhom = 'myself' | 'someone';

const ERV_LOGO = 'https://images.squarespace-cdn.com/content/v1/5f8873ca8870914d0d9008eb/1604966886490-AH1M1O1LHME34AQJAWEF/IMG_0053.JPG?format=100w';

export default function ErvIntakePage() {
  const [step, setStep] = useState<Step>('who');
  const [forWhom, setForWhom] = useState<ForWhom | null>(null);
  const [flowType, setFlowType] = useState<FlowType | null>(null);
  const [input, setInput] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const personId = typeof window !== 'undefined' ? localStorage.getItem('sos-person-id') : null;

  const transport = useRef(new DefaultChatTransport({
    api: '/api/chat',
    headers: {
      'x-person-id': personId || '',
      'x-authenticated': personId ? 'true' : 'false',
    },
  })).current;

  const { messages, sendMessage, status } = useChat({ transport });
  const isLoading = status === 'streaming' || status === 'submitted';

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior });
    });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // Mobile keyboard handling
  useEffect(() => {
    const vv = (window as any).visualViewport;
    if (!vv) return;
    const handler = () => {
      const diff = window.innerHeight - vv.height;
      setKeyboardHeight(diff > 50 ? diff : 0);
    };
    vv.addEventListener('resize', handler);
    return () => vv.removeEventListener('resize', handler);
  }, []);

  // Start agent conversation when flow selected
  useEffect(() => {
    if (step === 'chat' && flowType && forWhom && messages.length === 0) {
      const context = forWhom === 'myself'
        ? 'The user is filling this out for themselves.'
        : 'The user is filling this out on behalf of someone else. Ask for the beneficiary\'s information separately.';
      sendMessage({ text: `[ERV_INTAKE:${flowType}:${forWhom}] ${context}. Start the intake flow.` });
    }
  }, [step, flowType, forWhom]);

  function send(text: string) {
    if (!text.trim() || isLoading) return;
    sendMessage({ text: text.trim() });
    setInput('');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <div className="min-h-screen bg-[#0F1E2B] text-white flex flex-col max-w-lg mx-auto">
      {/* Persistent Header */}
      <div className="bg-[#1A3850] px-4 py-3 pt-[calc(env(safe-area-inset-top,0px)+12px)] flex items-center gap-3 flex-shrink-0 z-10 border-b border-white/10">
        <img src={ERV_LOGO} alt="EmergencyRV" className="h-8 w-8 rounded-full object-cover" />
        <div className="flex-1">
          <span className="text-sm font-bold text-white">EmergencyRV</span>
          {step === 'chat' && (
            <span className="text-[10px] text-white/30 ml-2">
              {flowType === 'survivor' ? 'Housing Application' : flowType === 'donor' ? 'RV Donation' : 'Volunteer Signup'}
            </span>
          )}
        </div>
        {isLoading && <span className="text-[10px] text-white/30">typing...</span>}
        {step !== 'who' && (
          <button onClick={() => { setStep('who'); setForWhom(null); setFlowType(null); }}
            className="text-[10px] text-white/20 hover:text-white/40">Start over</button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain bg-[#0F1E2B]"
        ref={messagesContainerRef}
        style={{ WebkitOverflowScrolling: 'touch', paddingBottom: step === 'chat' ? `calc(${keyboardHeight}px + 56px + env(safe-area-inset-bottom, 0px))` : '0' }}>

        {/* Step 0: For whom? */}
        {step === 'who' && (
          <div className="px-4 py-6 space-y-4">
            <p className="text-xs text-white/40 text-center">Who is this for?</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { setForWhom('myself'); setStep('what'); }}
                className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-center">
                <p className="text-sm font-semibold">For myself</p>
                <p className="text-[10px] text-white/30 mt-0.5">I need help, want to donate, or volunteer</p>
              </button>
              <button onClick={() => { setForWhom('someone'); setStep('what'); }}
                className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-center">
                <p className="text-sm font-semibold">For someone else</p>
                <p className="text-[10px] text-white/30 mt-0.5">Partner, case worker, or friend</p>
              </button>
            </div>
          </div>
        )}

        {/* Step 1: What path? */}
        {step === 'what' && (
          <div className="px-4 py-4 space-y-2">
            <p className="text-xs text-white/40 text-center mb-2">
              {forWhom === 'myself' ? 'How can we help?' : 'How can we help them?'}
            </p>
            {[
              { flow: 'survivor' as FlowType, label: 'I need housing help', sub: 'Lost or damaged home from a natural disaster' },
              { flow: 'donor' as FlowType, label: 'Donate an RV', sub: 'Give an RV to a family in need' },
              { flow: 'volunteer' as FlowType, label: 'Volunteer or drive', sub: 'Help deliver RVs or support operations' },
            ].map(opt => (
              <button key={opt.flow} onClick={() => { setFlowType(opt.flow); setStep('chat'); }}
                className="w-full p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-left">
                <p className="text-sm font-semibold">{opt.label}</p>
                <p className="text-[10px] text-white/30">{opt.sub}</p>
              </button>
            ))}
            <button onClick={() => { setStep('who'); setForWhom(null); }}
              className="w-full text-center text-[10px] text-white/20 hover:text-white/40 mt-2">← Back</button>
          </div>
        )}

        {/* Step 2: Agent Chat */}
        {step === 'chat' && (
          <div className="px-4 py-3 space-y-3">
            {messages.map(msg => (
              <div key={msg.id}>
                {(msg as any).parts?.map((part: any, pi: number) => {
                  // Skip system trigger messages
                  if (part.type === 'text' && part.text?.startsWith('[ERV_INTAKE:')) return null;

                  if (part.type === 'text' && part.text) {
                    const isUser = msg.role === 'user';
                    return (
                      <div key={pi} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-1`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                          isUser ? 'bg-[#D4553A] text-white rounded-br-md' : 'bg-white/10 text-white rounded-bl-md'
                        }`}>
                          {!isUser && (
                            <div className="flex items-center gap-1.5 mb-1">
                              <img src={ERV_LOGO} alt="" className="h-3.5 w-3.5 rounded-full" />
                              <span className="text-[9px] font-bold text-white/40">ERV</span>
                            </div>
                          )}
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{part.text}</p>
                        </div>
                      </div>
                    );
                  }

                  // Tool results (chips, location, etc)
                  if (part.type?.startsWith('tool-') && part.type !== 'tool-approval-request') {
                    const inv = { state: (part as any).state, result: (part as any).output };
                    if (inv?.state === 'result' || inv?.state === 'output-available') {
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

            {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex justify-start">
                <div className="bg-white/10 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input bar — only in chat */}
      {step === 'chat' && (
        <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-[#0F1E2B] border-t border-white/10 z-20">
          <form onSubmit={handleSubmit} className="px-4 py-2 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type your answer..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20"
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading || !input.trim()}
              className="w-10 h-10 rounded-xl bg-[#D4553A] flex items-center justify-center disabled:opacity-30">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
