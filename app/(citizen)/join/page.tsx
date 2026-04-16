'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';

function JoinChat() {
  const params = useSearchParams();
  const ref = params.get('ref');
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (ref) localStorage.setItem('sos-referral-code', ref);
  }, [ref]);

  const { messages, sendMessage, status, error: chatError } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  }, []);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      sendMessage({ text: '[JOIN_SOS]' });
    }
  }, [sendMessage]);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);
  useEffect(() => {
    if (status === 'streaming') {
      const i = setInterval(() => scrollToBottom(), 200);
      return () => clearInterval(i);
    }
  }, [status, scrollToBottom]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input.trim() });
    setInput('');
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        background: '#0F1E2B',
        color: '#fff',
        zIndex: 1,
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        flexShrink: 0,
      }}>
        <img src="/logomark.svg" alt="" style={{ height: '24px', width: '24px' }} />
        <span style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>SOS</span>
        {isLoading && <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>typing...</span>}
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>
        {messages.map(msg => (
          <div key={msg.id}>
            {(msg as any).parts?.map((part: any, pi: number) => {
              if (part.type === 'text' && part.text) {
                const isUser = (msg as any).role === 'user';
                if (isUser && part.text.includes('[JOIN_SOS]')) return null;
                return (
                  <div key={pi} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: '4px' }}>
                    <div style={{
                      maxWidth: '85%',
                      borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      padding: '10px 16px',
                      background: isUser ? '#EF4E4B' : 'rgba(255,255,255,0.1)',
                      fontSize: '14px',
                      lineHeight: '1.6',
                      whiteSpace: 'pre-wrap' as const,
                    }}>
                      {!isUser && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <img src="/logomark.svg" alt="" style={{ height: '14px', width: '14px' }} />
                          <span style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>SOS</span>
                        </div>
                      )}
                      {part.text}
                    </div>
                  </div>
                );
              }
              return null;
            })}
          </div>
        ))}
        {chatError && !isLoading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ background: 'rgba(239,78,75,0.1)', border: '1px solid rgba(239,78,75,0.2)', borderRadius: '16px', padding: '10px 16px' }}>
              <p style={{ fontSize: '12px', color: '#EF4E4B' }}>Something went wrong.</p>
            </div>
          </div>
        )}
        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '16px', padding: '10px 16px', fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>
              SOS is thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '12px 16px',
        paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        background: '#1A3850',
        flexShrink: 0,
      }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px' }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
            enterKeyHint="send"
            autoComplete="off"
            style={{
              flex: 1, padding: '10px 16px', borderRadius: '12px',
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff', fontSize: '14px', outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            style={{
              width: '40px', height: '40px', borderRadius: '12px',
              background: '#EF4E4B', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: (!input.trim() || isLoading) ? 0.3 : 1,
              flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
          </button>
        </form>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0F1E2B' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid #89CFF0', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    }>
      <JoinChat />
    </Suspense>
  );
}
