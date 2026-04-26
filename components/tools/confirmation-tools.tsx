'use client';

import { useState } from 'react';

export function SubmitConfirmation({ data }: { data: any }) {
  const [visible, setVisible] = useState(data.success !== false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (data.personId) {
      setPersonId(data.personId);
    }
  }, [data.personId]);

  useEffect(() => {
    if (!visible) return;
    const fadeTimer = setTimeout(() => setFading(true), 2000);
    const removeTimer = setTimeout(() => {
      setVisible(false);
      // Close the agent sheet so map is visible
      window.dispatchEvent(new CustomEvent('sos-close-sheet'));
      // Fire map command after overlay clears
      if (data.__mapCommand) {
        emitMapCommand(data.__mapCommand);
      }
    }, 2500);
    return () => { clearTimeout(fadeTimer); clearTimeout(removeTimer); };
  }, [visible, data.__mapCommand]);

  if (data.success === false) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
        <span className="text-2xl">❌</span>
        <p className="text-xs font-bold text-red-400 mt-1">{data.title || 'Error'}</p>
        {data.message && <p className="text-[10px] text-white/50 mt-0.5">{data.message}</p>}
      </div>
    );
  }

  if (!visible) return null;

  const overlay = (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0F1E2B] transition-opacity duration-500 ${fading ? 'opacity-0' : 'opacity-100'}`}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes sos-radar-ring {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(3); opacity: 0; }
        }
      ` }} />
      {/* Logomark with radar rings */}
      <div className="relative flex items-center justify-center" style={{ width: 192, height: 192 }}>
        <span
          className="absolute rounded-full border-2 border-[#EF4E4B]"
          style={{ width: 96, height: 96, top: 48, left: 48, animation: 'sos-radar-ring 2.5s ease-out infinite' }}
        />
        <span
          className="absolute rounded-full border-2 border-[#EF4E4B]"
          style={{ width: 96, height: 96, top: 48, left: 48, animation: 'sos-radar-ring 2.5s ease-out 0.8s infinite' }}
        />
        <span
          className="absolute rounded-full border-2 border-[#EF4E4B]"
          style={{ width: 96, height: 96, top: 48, left: 48, animation: 'sos-radar-ring 2.5s ease-out 1.6s infinite' }}
        />
        <img src="/logomark.svg" alt="SOS" className="relative z-10" style={{ width: 96, height: 96 }} />
      </div>
      <p className="text-white text-xl font-bold mt-6">SOS Submitted</p>
      <p className="text-white/50 text-sm mt-3">Searching for help near you...</p>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(overlay, document.body);
}


export function ToggleChipWrapper({ options, prompt, onAction }: { options: any[]; prompt?: string; onAction: (msg: string) => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <div className="space-y-2">
      {prompt && <p className="text-xs text-white/60">{prompt}</p>}
      <ToggleChips
        options={options}
        selected={selected}
        onToggle={(id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
        onDone={() => onAction(selected.join(', '))}
      />
    </div>
  );
}

// ── Send SOS Confirmation Card ──

export function SOSConfirmationCard({ summary, type, details, onAction }: { summary: string; type: string; details?: any; onAction: (msg: string) => void }) {
  const [sent, setSent] = useState(false);


