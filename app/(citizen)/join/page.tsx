'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';

function JoinChat() {
  const params = useSearchParams();
  const ref = params.get('ref');
  const [input, setInput] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initialized = useRef(false);

  // Store referral code if present
  useEffect(() => {
    if (ref) localStorage.setItem('sos-referral-code', ref);
  }, [ref]);

  const { messages, sendMessage, status, error: chatError } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior });
    });
  }, []);

  // Send [JOIN_SOS] as first message to trigger the join flow
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      sendMessage({ text: '[JOIN_SOS]' });
    }
  }, [sendMessage]);

  // Force navy background on html/body to prevent any white/cream flash or gap
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.background;
    const prevBody = body.style.background;
    html.style.background = '#0F1E2B';
    body.style.background = '#0F1E2B';
    return () => {
      html.style.background = prevHtml;
      body.style.background = prevBody;
    };
  }, []);

  // Mobile keyboard handling
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const viewport = window.visualViewport;
    const onResize = () => {
      const diff = window.innerHeight - viewport.height;
      setKeyboardHeight(diff > 50 ? diff : 0);
      if (diff > 50) setTimeout(() => scrollToBottom('instant'), 100);
    };
    viewport.addEventListener('resize', onResize);
    viewport.addEventListener('scroll', onResize);
    return () => {
      viewport.removeEventListener('resize', onResize);
      viewport.removeEventListener('scroll', onResize);
    };
  }, [scrollToBottom]);

  // Auto-scroll on new messages
  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // Auto-scroll while streaming
  useEffect(() => {
    if (status === 'streaming') {
      const interval = setInterval(() => scrollToBottom('instant'), 200);
      return () => clearInterval(interval);
    }
  }, [status, scrollToBottom]);

  function send(text: string) {
    sendMessage({ text });
    setInput('');
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    send(input.trim());
  }

  // Check if running inside an iframe
  const isIframe = typeof window !== 'undefined' && window.parent !== window;

  return (
    <div
      className="flex flex-col bg-[#0F1E2B] text-white"
      style={{
        minHeight: isIframe ? '100%' : '100dvh',
        height: isIframe ? '100%' : '100dvh',
      }}
    >
      {/* Messages — flex-1 fills all space above fixed input bar */}
      <div
        className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-3"
        style={{
          WebkitOverflowScrolling: 'touch',
          paddingBottom: `calc(76px + env(safe-area-inset-bottom, 0px) + ${keyboardHeight > 0 ? `${keyboardHeight}px` : '0px'})`,
        }}
      >
        {messages.map(msg => (
          <div key={msg.id}>
            {(msg as any).parts?.map((part: any, pi: number) => {
              if (part.type === 'text' && part.text) {
                const isUser = (msg as any).role === 'user';
                // Hide the initial [JOIN_SOS] trigger message
                if (isUser && part.text.includes('[JOIN_SOS]')) return null;
                return (
                  <div key={pi} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-1`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                      isUser ? 'bg-[#EF4E4B] text-white rounded-br-md' : 'bg-white/10 text-white rounded-bl-md'
                    }`}>
                      {!isUser && (
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
              return null;
            })}
          </div>
        ))}

        {/* Error */}
        {chatError && !isLoading && (
          <div className="flex justify-start">
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl rounded-bl-md px-4 py-2.5">
              <p className="text-xs text-red-400">Something went wrong.</p>
              <button onClick={() => sendMessage({ text: 'continue' })}
                className="text-[10px] text-red-300 underline mt-1">Retry</button>
            </div>
          </div>
        )}

        {/* Typing indicator */}
        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex justify-start">
            <div className="bg-white/10 rounded-2xl rounded-bl-md px-4 py-2.5">
              <div className="flex gap-1.5 items-center">
                <span className="text-[9px] text-white/30 mr-1">SOS is thinking</span>
                <div className="w-1.5 h-1.5 rounded-full bg-[#89CFF0] animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-[#89CFF0] animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-[#89CFF0] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar — fixed to bottom, above safe area */}
      <div
        className="bg-[#1A3850] px-4 py-3 border-t border-white/10 flex-shrink-0"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          paddingBottom: `calc(12px + env(safe-area-inset-bottom, 0px))`,
          zIndex: 50,
        }}
      >
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
            enterKeyHint="send"
            autoComplete="off"
            autoCorrect="on"
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#89CFF0] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 rounded-xl bg-[#EF4E4B] text-white flex items-center justify-center disabled:opacity-30 transition-colors flex-shrink-0 active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
          </button>
        </form>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-[#0F1E2B]">
        <div className="w-8 h-8 border-3 border-[#89CFF0] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <JoinChat />
    </Suspense>
  );
}
