'use client';

import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import type { OnboardingData } from './types';

interface Props {
  data: OnboardingData;
  onUpdate: (partial: Partial<OnboardingData>) => void;
  onContinue: () => void;
}

type Field = 'orgName' | 'domain' | 'location' | 'email';

const STEPS: { field: Field; question: string; placeholder: string; confirm: (v: string) => string }[] = [
  {
    field: 'orgName',
    question: "What's your organization's name?",
    placeholder: 'e.g. Red Cross Florida',
    confirm: (v) => `Got it — **${v}**. What's your website or domain?`,
  },
  {
    field: 'domain',
    question: "What's your website or domain?",
    placeholder: 'e.g. redcross.org',
    confirm: (v) => `Nice. And where are you based?`,
  },
  {
    field: 'location',
    question: 'Where are you based?',
    placeholder: 'e.g. Miami, FL',
    confirm: (v) => `Perfect. Last one — what's your work email?`,
  },
  {
    field: 'email',
    question: "What's your work email?",
    placeholder: 'you@org.com',
    confirm: (v) => `You're all set! Let's continue.`,
  },
];

interface Message {
  role: 'assistant' | 'user';
  text: string;
}

function Bubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  // Simple bold markdown renderer
  const parts = msg.text.split(/\*\*(.*?)\*\*/g);
  const rendered = parts.map((p, i) => i % 2 === 1 ? <strong key={i}>{p}</strong> : p);
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
      <div style={{
        maxWidth: '78%',
        padding: '9px 13px',
        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        background: isUser ? '#89CFF0' : 'rgba(255,255,255,0.08)',
        color: isUser ? '#0F1E2B' : 'rgba(255,255,255,0.9)',
        fontSize: 14,
        lineHeight: 1.45,
      }}>
        {rendered}
      </div>
    </div>
  );
}

export function Screen2Details({ data, onUpdate, onContinue }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: STEPS[0].question },
  ]);
  const [stepIdx, setStepIdx] = useState(0);
  const [input, setInput] = useState('');
  const [done, setDone] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function submit() {
    const value = input.trim();
    if (!value || stepIdx >= STEPS.length) return;
    const step = STEPS[stepIdx];
    onUpdate({ [step.field]: value });
    const next: Message[] = [
      ...messages,
      { role: 'user', text: value },
      { role: 'assistant', text: step.confirm(value) },
    ];
    if (stepIdx + 1 < STEPS.length) {
      next.push({ role: 'assistant', text: STEPS[stepIdx + 1].question });
      setStepIdx(stepIdx + 1);
    } else {
      setDone(true);
    }
    setMessages(next);
    setInput('');
  }

  const collected = [
    data.orgName && { label: 'Org', value: data.orgName },
    data.domain && { label: 'Domain', value: data.domain },
    data.location && { label: 'Location', value: data.location },
    data.email && { label: 'Email', value: data.email },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: 0 }}>Tell us about your org</h2>

      {/* Chat area */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {messages.map((m, i) => <Bubble key={i} msg={m} />)}
        <div ref={bottomRef} />
      </div>

      {/* Summary card */}
      {collected.length > 0 && (
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '10px 14px', border: '1px solid rgba(255,255,255,0.1)' }}>
          {collected.map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</span>
              <span>{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Input row */}
      {!done ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder={STEPS[stepIdx]?.placeholder}
            style={{
              flex: 1, padding: '11px 14px', borderRadius: 12,
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff', fontSize: 14, outline: 'none',
            }}
          />
          <button
            onClick={submit}
            disabled={!input.trim()}
            style={{
              width: 42, height: 42, borderRadius: 12, flexShrink: 0,
              background: input.trim() ? '#89CFF0' : 'rgba(255,255,255,0.1)',
              border: 'none', cursor: input.trim() ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Send size={16} color={input.trim() ? '#0F1E2B' : 'rgba(255,255,255,0.3)'} />
          </button>
        </div>
      ) : (
        <button
          onClick={onContinue}
          style={{
            width: '100%', padding: '14px 24px', borderRadius: 14,
            background: '#89CFF0', color: '#0F1E2B', fontWeight: 600,
            fontSize: 15, border: 'none', cursor: 'pointer',
          }}
        >
          Continue
        </button>
      )}
    </div>
  );
}
