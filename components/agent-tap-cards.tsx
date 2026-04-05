'use client';

import { useState } from 'react';

/**
 * Interactive tap cards rendered inside agent chat as messages.
 * When agent asks "What do you need?", these appear as tappable bubbles.
 */

interface TapCardOption {
  id: string;
  icon: string;
  label: string;
}

interface TapCardGridProps {
  options: TapCardOption[];
  columns?: 2 | 3;
  multiSelect?: boolean;
  selected?: string[];
  onSelect: (id: string) => void;
  freeTextPlaceholder?: string;
  onFreeText?: (text: string) => void;
}

export function TapCardGrid({ options, columns = 3, multiSelect, selected = [], onSelect, freeTextPlaceholder, onFreeText }: TapCardGridProps) {
  return (
    <div className="space-y-2">
      <div className={`grid gap-1.5 ${columns === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {options.map(opt => {
          const isSelected = selected.includes(opt.id);
          return (
            <button key={opt.id} onClick={() => onSelect(opt.id)}
              className={`flex flex-col items-center justify-center gap-1 py-3 rounded-xl border transition-all active:scale-[0.96] ${
                isSelected ? 'border-sos-red-400 bg-sos-red-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}>
              {isSelected && multiSelect && <span className="absolute top-1 right-1 text-[9px] text-sos-red-400">✓</span>}
              <span className="text-xl">{opt.icon}</span>
              <span className="text-[10px] font-semibold text-white">{opt.label}</span>
            </button>
          );
        })}
      </div>
      {freeTextPlaceholder && onFreeText && (
        <div className="flex gap-1.5">
          <input type="text" placeholder={freeTextPlaceholder}
            onKeyDown={(e) => { if (e.key === 'Enter' && e.currentTarget.value.trim()) { onFreeText(e.currentTarget.value.trim()); e.currentTarget.value = ''; } }}
            className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-sos-accent-400" />
        </div>
      )}
    </div>
  );
}

interface QuickChipsProps {
  chips: Array<{ id: string; label: string; icon?: string }>;
  onSelect: (id: string) => void;
}

export function QuickChips({ chips, onSelect }: QuickChipsProps) {
  // Max 3 per row
  const rows: typeof chips[] = [];
  for (let i = 0; i < chips.length; i += 3) {
    rows.push(chips.slice(i, i + 3));
  }
  return (
    <div className="space-y-1.5">
      {rows.map((row, ri) => (
        <div key={ri} className="flex gap-1.5">
          {row.map(chip => (
            <button key={chip.id} onClick={() => onSelect(chip.id)}
              className="flex-1 text-[11px] font-medium px-3 py-2 rounded-full bg-white/10 border border-white/10 text-white hover:bg-white/20 active:scale-[0.97] transition-all text-center">
              {chip.icon && <span className="mr-1">{chip.icon}</span>}{chip.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

// Send SOS button — branded red with pulse animation on tap
interface SendSOSButtonProps {
  onSend: () => void;
  label?: string;
  disabled?: boolean;
}

export function SendSOSButton({ onSend, label = 'Send SOS', disabled = false }: SendSOSButtonProps) {
  const [animating, setAnimating] = useState(false);

  function handleClick() {
    if (disabled || animating) return;
    setAnimating(true);
    setTimeout(() => {
      onSend();
      setAnimating(false);
    }, 600);
  }

  return (
    <button onClick={handleClick} disabled={disabled}
      className={`relative w-full py-3 rounded-xl font-bold text-sm text-white transition-all active:scale-[0.97] ${
        disabled ? 'bg-white/10 text-white/30' : 'bg-[#EF4E4B] hover:bg-[#d94340]'
      } ${animating ? 'scale-[1.02]' : ''}`}>
      {animating && (
        <>
          <span className="absolute inset-0 rounded-xl bg-[#EF4E4B] animate-ping opacity-30" />
          <span className="absolute inset-0 rounded-xl bg-[#EF4E4B] animate-pulse opacity-50" />
        </>
      )}
      <span className="relative z-10">{animating ? '⚡ Sending...' : `⚡ ${label}`}</span>
    </button>
  );
}

interface CounterCardsProps {
  options: Array<{ id: string; label: string }>;
  onSelect: (id: string) => void;
}

export function CounterCards({ options, onSelect }: CounterCardsProps) {
  return (
    <div className="flex gap-1.5">
      {options.map(opt => (
        <button key={opt.id} onClick={() => onSelect(opt.id)}
          className="flex-1 py-3 rounded-xl border border-white/10 bg-white/5 text-center text-sm font-bold text-white hover:bg-white/10 active:scale-[0.97] transition-all">
          {opt.label}
        </button>
      ))}
    </div>
  );
}

interface ToggleChipsProps {
  options: Array<{ id: string; icon: string; label: string }>;
  selected: string[];
  onToggle: (id: string) => void;
  onDone?: () => void;
}

export function ToggleChips({ options, selected, onToggle, onDone }: ToggleChipsProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => {
          const isOn = selected.includes(opt.id);
          return (
            <button key={opt.id} onClick={() => onToggle(opt.id)}
              className={`text-[11px] font-medium px-3 py-1.5 rounded-full border transition-all active:scale-[0.97] ${
                isOn ? 'bg-sos-red-500/20 border-sos-red-400 text-sos-red-300' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
              }`}>
              {opt.icon} {opt.label}
            </button>
          );
        })}
      </div>
      {onDone && selected.length > 0 && (
        <button onClick={onDone} className="text-[11px] font-bold text-sos-red-400 hover:text-sos-red-300">
          Done ({selected.length}) →
        </button>
      )}
    </div>
  );
}
