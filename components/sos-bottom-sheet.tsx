'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface SOSBottomSheetProps {
  open: boolean;
  onClose: () => void;
  context: 'map' | 'feed' | 'profile';
}

/**
 * Floating SOS agent bottom sheet. Context-aware per tab.
 * Compact half-screen view. Swipe up → full agent tab.
 */
export function SOSBottomSheet({ open, onClose, context }: SOSBottomSheetProps) {
  const router = useRouter();
  const [input, setInput] = useState('');

  if (!open) return null;

  const contextChips: Record<string, Array<{ id: string; label: string; icon: string }>> = {
    map: [
      { id: 'help', label: 'I Need Help', icon: '🔴' },
      { id: 'offer', label: 'I Can Help', icon: '🤝' },
      { id: 'report', label: 'Report', icon: '📢' },
    ],
    feed: [
      { id: 'report', label: 'Report Something', icon: '📢' },
      { id: 'question', label: 'Ask a Question', icon: '❓' },
    ],
    profile: [
      { id: 'readiness', label: 'Improve Readiness', icon: '🛡️' },
      { id: 'score', label: 'My Score', icon: '📊' },
    ],
  };

  const contextTitle: Record<string, string> = {
    map: 'What do you need?',
    feed: 'Want to report something?',
    profile: 'How can I help?',
  };

  function handleChip(id: string) {
    onClose();
    const prompts: Record<string, string> = {
      help: 'I need help',
      offer: 'I can help',
      report: 'I want to report something',
      question: 'I have a question',
      readiness: 'Help me improve my readiness score',
      score: 'Show me my SOS score breakdown',
    };
    router.push(`/c/agent?q=${encodeURIComponent(prompts[id] || id)}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    onClose();
    router.push(`/c/agent?q=${encodeURIComponent(input.trim())}`);
  }

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="absolute bottom-0 left-0 right-0 max-w-lg mx-auto" onClick={e => e.stopPropagation()}>
        <div className="bg-[#1A3850] rounded-t-2xl p-5 pb-[calc(env(safe-area-inset-bottom,0px)+80px)]">
          {/* Handle */}
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />

          {/* Logo + title */}
          <div className="flex items-center gap-2 mb-4">
            <img src="/logomark.svg" alt="SOS" className="h-7 w-7" />
            <p className="text-sm font-bold text-white">{contextTitle[context]}</p>
          </div>

          {/* Context chips */}
          <div className="flex flex-wrap gap-2 mb-4">
            {(contextChips[context] || []).map(chip => (
              <button key={chip.id} onClick={() => handleChip(chip.id)}
                className="text-xs font-bold px-4 py-2.5 rounded-full bg-white/10 border border-white/10 text-white hover:bg-white/20 active:scale-[0.97] transition-all">
                {chip.icon} {chip.label}
              </button>
            ))}
          </div>

          {/* Free text input */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input type="text" value={input} onChange={e => setInput(e.target.value)}
              placeholder="Or tell me anything..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-sos-accent-400" />
            <button type="submit" disabled={!input.trim()}
              className="w-10 h-10 rounded-xl bg-sos-red-500 text-white flex items-center justify-center disabled:opacity-30 transition-colors flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
            </button>
          </form>

          {/* Expand to full agent */}
          <button onClick={() => { onClose(); router.push('/c/agent'); }}
            className="w-full text-center text-[10px] text-white/30 mt-3 hover:text-white/50">
            Open full agent ↑
          </button>
        </div>
      </div>
    </div>
  );
}
