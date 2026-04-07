'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useAuthContext } from '@/lib/auth-context';
import { useViewContext } from '@/lib/view-context';
import { getPortalConfig } from '@/lib/portal-config';
import { AIToolRenderer } from './ai-tool-renderer';
import { MeasuredBubble } from './measured-bubble';
import { TextReveal } from './text-reveal';
import { Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AgentChatProps {
  hideHeader?: boolean;
}

export function AgentChat({ hideHeader = false }: AgentChatProps) {
  const { orgId, orgName, orgType, isAdmin } = useAuthContext();
  const { currentView, effectiveAgentId, effectiveOrgId, effectiveOrgType, effectiveOrgName } = useViewContext();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { messages, sendMessage, status } = useChat({
    id: `agent-${effectiveAgentId}`,
    transport: new DefaultChatTransport({
      api: '/api/chat',
      headers: {
        'x-org-id': effectiveOrgId || orgId || 'sos-platform',
        'x-org-type': effectiveOrgType || orgType || '',
      },
    }),
    onError: (err) => console.error('Agent chat error:', err),
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  // Scroll to latest message
  useEffect(() => {
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages]);

  // Scroll when streaming starts (keyboard might shift layout)
  useEffect(() => {
    if (!isLoading) return;
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 300);
    return () => clearTimeout(timer);
  }, [isLoading]);

  function send(text: string) {
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

  // Portal config drives all per-org content
  const portalConfig = getPortalConfig(effectiveOrgType);
  const viewConfig = { welcome: portalConfig.agent.welcome, suggestions: portalConfig.agent.suggestions };
  const agentName = effectiveOrgName;

  return (
    <div className="flex flex-col bg-[#F7F5F0] overflow-hidden
        md:rounded-xl md:border md:border-sos-gray-300 md:h-[calc(100vh-7.5rem)]
        max-md:fixed max-md:inset-x-0 max-md:z-20
        max-md:[top:env(safe-area-inset-top,0px)]
        max-md:[bottom:calc(64px+env(safe-area-inset-bottom,0px))]"
    >
      {/* Header — hidden when embedded in dashboard shell */}
      {!hideHeader && (
        <div className="px-5 py-3.5 border-b border-sos-gray-300 bg-sos-blue-800">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <div>
              <h3 className="text-sm font-bold text-white">{agentName} Agent</h3>
              <p className="text-[10px] text-sos-accent-400">
                {isAdmin ? 'Platform coordination' : 'Your coordination partner'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-12 rounded-full bg-sos-blue-800 flex items-center justify-center mb-3">
              <img src="/logomark.svg" alt="SOS" className="h-10 w-10" />
            </div>
            <h3 className="text-xl font-bold text-sos-blue-800">
              {agentName}
            </h3>
            <div className="mt-2 max-w-md text-base text-sos-gray-600">
              <TextReveal text={viewConfig.welcome} mode="spotlight" maxWidth={448} stagger={60} delay={300} />
            </div>
            <div className="flex flex-wrap gap-2.5 mt-6 justify-center max-w-sm">
              {viewConfig.suggestions.length > 0 ? viewConfig.suggestions.map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => { setInput(suggestion); }}
                  className="text-sm px-4 py-2.5 rounded-full bg-white border border-sos-gray-300 text-sos-blue-800 font-medium shadow-sm hover:bg-sos-blue-800 hover:text-white hover:border-sos-blue-800 transition-colors"
                >
                  {suggestion}
                </button>
              )) : [
                'Show me open matches',
                'What\'s our capacity?',
                'Situation brief',
              ].map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}
                  className="text-sm px-4 py-2.5 rounded-full bg-white border border-sos-gray-300 text-sos-blue-800 font-medium shadow-sm hover:bg-sos-blue-800 hover:text-white hover:border-sos-blue-800 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
            <p className="mt-5 text-xs text-sos-gray-400 italic">or, just start a conversation</p>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id}>
            {/* Render from parts (AI SDK v6 pattern) */}
            {(msg as any).parts?.map((part: any, pi: number) => {
              if (part.type === 'text' && part.text) {
                return (
                  <div key={pi} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-full bg-sos-blue-800 flex items-center justify-center flex-shrink-0 mt-1">
                        <img src="/logomark.svg" alt="SOS" className="h-4 w-4" />
                      </div>
                    )}
                    {msg.role === 'user' ? (
                      <MeasuredBubble
                        text={part.text}
                        isOwn={true}
                        className="bg-sos-blue-800 text-white rounded-br-md"
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{part.text}</p>
                      </MeasuredBubble>
                    ) : (
                      <div className="max-w-[80%] md:max-w-[75%] bg-[#F7F5F0] border border-sos-gray-300 text-sos-blue-800 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                        <div className="text-sm leading-relaxed prose prose-sm max-w-none prose-headings:text-sos-blue-800 prose-headings:font-bold prose-headings:mt-3 prose-headings:mb-1 prose-h1:text-base prose-h2:text-sm prose-h3:text-sm prose-p:my-1.5 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-strong:text-sos-blue-800 prose-li:marker:text-sos-red-500">
                          <ReactMarkdown>{part.text}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }
              if (part.type.startsWith('tool-') && part.type !== 'tool-approval-request') {
                const inv = { state: (part as any).state, result: (part as any).output, toolName: (part as any).toolName || part.type };
                if (inv?.state === 'result' || inv?.state === 'output-available') {
                  try {
                    const data = typeof inv.result === 'string' ? JSON.parse(inv.result) : inv.result;
                    if (data?.__tool) return <div key={pi} className="ml-9 mt-1"><AIToolRenderer toolData={data} onUserAction={handleToolAction} /></div>;
                  } catch {}
                }
                return null;
              }
              return null;
            })}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2.5 justify-start">
            <div className="w-7 h-7 rounded-full bg-sos-blue-800 flex items-center justify-center flex-shrink-0">
              <img src="/logomark.svg" alt="SOS" className="h-4 w-4" />
            </div>
            <div className="bg-[#F7F5F0] border border-sos-gray-300 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-sos-blue-800 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-sos-blue-800 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-sos-blue-800 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-white/10 bg-sos-blue-800">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={messages.length === 0 ? "Find resources near me, report an issue..." : "Message your SOS agent..."}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-base md:text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-sos-accent-400 focus:ring-1 focus:ring-sos-accent-400/30 disabled:opacity-50 transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 rounded-xl bg-sos-red-500 text-white flex items-center justify-center hover:bg-sos-red-600 disabled:opacity-30 disabled:hover:bg-sos-red-500 transition-colors flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
