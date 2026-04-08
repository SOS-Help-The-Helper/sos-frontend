'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { AIToolRenderer } from '@/components/ai-tool-renderer';
import { getPersonId } from '@/lib/person-cookie';

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

  const personId = typeof window !== 'undefined' ? getPersonId() : null;

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

  function selectForWhom(whom: ForWhom) {
    setForWhom(whom);
    setStep('what');
  }

  function selectFlow(flow: FlowType) {
    setFlowType(flow);
    setStep('chat');
  }

  return (
    <div className="min-h-screen bg-[#0F1E2B] text-white flex flex-col max-w-lg mx-auto">
      {/* Header — persists on ALL steps including chat */}
      <header className="bg-[#1A3850] px-4 py-3 pt-[calc(env(safe-area-inset-top,0px)+12px)] flex items-center gap-3 flex-shrink-0 z-10 border-b border-white/10">
        <img src="/erv-logo.png" alt="EmergencyRV" className="w-9 h-9 rounded-full object-cover" />
        <div className="flex-1">
          <h1 className="text-sm font-bold leading-none">EmergencyRV</h1>
          <p className="text-[10px] text-white/40 mt-0.5">Bridging the Gap Between Disaster and Safe Shelter</p>
        </div>
        {step === 'chat' && (
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
            <span className="text-[9px] text-white/30">{isLoading ? 'typing...' : 'online'}</span>
          </div>
        )}
      </header>

      {/* Flow indicator bar — visible during chat */}
      {step === 'chat' && flowType && (
        <div className="px-4 py-1.5 bg-white/[0.03] border-b border-white/5 flex items-center justify-between flex-shrink-0">
          <span className="text-[10px] text-white/40">
            {flowType === 'survivor' ? 'Housing Application' : flowType === 'donor' ? 'RV Donation' : 'Volunteer Signup'}
            {forWhom === 'someone' ? ' · on behalf' : ''}
          </span>
          <button onClick={() => { setStep('what'); setFlowType(null); }} className="text-[10px] text-white/25 hover:text-white/50">Change</button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {/* Step 0: For whom? */}
        {step === 'who' && (
          <div className="px-4 py-6 space-y-5">
            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold">Welcome</h2>
              <p className="text-xs text-white/40">We provide RVs to families displaced by natural disasters.</p>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] text-white/30 text-center uppercase tracking-wider font-semibold">Who is this for?</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => selectForWhom('myself')}
                  className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-center space-y-1.5 active:scale-[0.98]">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mx-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </div>
                  <p className="text-sm font-semibold">For myself</p>
                  <p className="text-[10px] text-white/30">I need help, want to donate, or volunteer</p>
                </button>
                <button onClick={() => selectForWhom('someone')}
                  className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-center space-y-1.5 active:scale-[0.98]">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mx-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  </div>
                  <p className="text-sm font-semibold">For someone else</p>
                  <p className="text-[10px] text-white/30">Partner, case worker, or friend</p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: What do you need? */}
        {step === 'what' && (
          <div className="px-4 py-5 space-y-4">
            <p className="text-xs text-white/30 text-center">{forWhom === 'myself' ? 'How can we help you?' : 'How can we help them?'}</p>
            <div className="space-y-2">
              <button onClick={() => selectFlow('survivor')}
                className="w-full p-3.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-3 active:scale-[0.99]">
                <div className="w-10 h-10 rounded-lg bg-[#EF4E4B]/10 flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4E4B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                </div>
                <div className="text-left"><p className="text-sm font-semibold">I need housing help</p><p className="text-[10px] text-white/30">Lost or damaged home due to disaster</p></div>
              </button>
              <button onClick={() => selectFlow('donor')}
                className="w-full p-3.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-3 active:scale-[0.99]">
                <div className="w-10 h-10 rounded-lg bg-[#89CFF0]/10 flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#89CFF0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                </div>
                <div className="text-left"><p className="text-sm font-semibold">I want to donate an RV</p><p className="text-[10px] text-white/30">Give an RV to a family in need</p></div>
              </button>
              <button onClick={() => selectFlow('volunteer')}
                className="w-full p-3.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-3 active:scale-[0.99]">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <div className="text-left"><p className="text-sm font-semibold">I want to volunteer or drive</p><p className="text-[10px] text-white/30">Help deliver RVs or support operations</p></div>
              </button>
            </div>
            <button onClick={() => { setStep('who'); setForWhom(null); }} className="w-full text-center text-[10px] text-white/25 hover:text-white/40 mt-1">← Back</button>
          </div>
        )}

        {/* Step 2: Agent Chat — matches /c/agent design */}
        {step === 'chat' && (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-[#0F1E2B]">
              {messages.map((msg, i) => (
                <div key={msg.id || i}>
                  {(msg as any).parts?.map((part: any, j: number) => {
                    if (part.type === 'text' && part.text?.startsWith('[System:')) return null;
                    if (part.type === 'tool-invocation' && part.toolInvocation?.result) {
                      try {
                        const result = typeof part.toolInvocation.result === 'string' ? JSON.parse(part.toolInvocation.result) : part.toolInvocation.result;
                        return <div key={j} className="ml-1 mt-1"><AIToolRenderer toolData={result} onUserAction={(text: string) => sendMessage({ text })} /></div>;
                      } catch { return null; }
                    }
                    if (part.type === 'text' && part.text) {
                      const isUser = msg.role === 'user';
                      return (
                        <div key={j} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-1`}>
                          <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                            isUser ? 'bg-sos-red-500 text-white rounded-br-md' : 'bg-white/10 text-white rounded-bl-md'
                          }`}>
                            {!isUser && (
                              <div className="flex items-center gap-1.5 mb-1">
                                <img src="/erv-logo.png" alt="" className="h-3.5 w-3.5 rounded-full" />
                                <span className="text-[9px] font-bold text-white/40">ERV</span>
                              </div>
                            )}
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{part.text}</p>
                          </div>
                        </div>
                      );
                    }
                    if (part.type === 'step-start') {
                      return (
                        <div key={j} className="flex justify-start mb-1">
                          <div className="bg-white/5 rounded-2xl rounded-bl-md px-4 py-2.5">
                            <div className="flex gap-1.5 items-center">
                              <div className="w-2 h-2 rounded-full bg-amber-400/50 animate-pulse" />
                              <span className="text-[10px] text-white/25">Working on it...</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                <div className="flex justify-start">
                  <div className="bg-white/10 rounded-2xl rounded-bl-md px-4 py-2.5">
                    <div className="flex gap-1.5">
                      <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Input bar — matches /c/agent design */}
      {step === 'chat' && (
        <div className="bg-[#1A3850] border-t border-white/10 flex-shrink-0">
          <form onSubmit={handleSubmit} className="px-4 py-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] flex gap-2">
            <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)}
              placeholder="Type your answer..."
              className="flex-1 bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-sos-accent-400"
              disabled={isLoading} />
            <button type="submit" disabled={isLoading || !input.trim()}
              className="w-10 h-10 rounded-xl bg-sos-red-500 text-white flex items-center justify-center disabled:opacity-30 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>
              </svg>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
