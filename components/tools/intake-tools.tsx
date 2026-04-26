'use client';

import { useState } from 'react';
import { TapCardGrid, CounterCards } from '../agent-tap-cards';

export function CategoryCards({ data, onSelect }: { data: any; onSelect: (msg: string) => void }) {
  const [selected, setSelected] = useState<string[]>([]);

  return (
    <div className="space-y-2">
      {data.prompt && <p className="text-xs text-white/60 mb-1">{data.prompt}</p>}
      <TapCardGrid
        options={data.options || []}
        multiSelect
        selected={selected}
        onSelect={(id) => {
          const next = selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id];
          setSelected(next);
          // Single tap sends immediately for speed; multi-select needs a "done" action
          if (next.length === 1 && selected.length === 0) {
            const opt = (data.options || []).find((o: any) => o.id === id);
            onSelect(`I need help with ${opt?.label || id}`);
          }
        }}
      />
      {selected.length > 1 && (
        <button onClick={() => {
          const labels = selected.map(s => (data.options || []).find((o: any) => o.id === s)?.label || s);
          onSelect(`I need help with ${labels.join(' and ')}`);
        }} className="text-[10px] font-bold text-sos-red-400">
          Continue with {selected.length} selected →
        </button>
      )}
    </div>
  );
}


export function CounterSelection({ data, onSelect }: { data: any; onSelect: (msg: string) => void }) {
  return (
    <div>
      {data.prompt && <p className="text-xs text-white/60 mb-2">{data.prompt}</p>}
      <CounterCards
        options={data.options || [
          { id: '1', label: '1' }, { id: '2-3', label: '2-3' },
          { id: '4-6', label: '4-6' }, { id: '7+', label: '7+' },
        ]}
        onSelect={(id) => onSelect(`${id} people`)}
      />
    </div>
  );
}


export function CircumstanceChips({ data, onSelect }: { data: any; onSelect: (msg: string) => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [freeText, setFreeText] = useState('');
  const options = data.options || [
    { id: 'children', icon: '👶', label: 'Children' },
    { id: 'elderly', icon: '👴', label: 'Elderly' },
    { id: 'pets', icon: '🐕', label: 'Pets' },
    { id: 'accessibility', icon: '♿', label: 'Accessibility' },
  ];


export function LocationInput({ data, onSelect }: { data: any; onSelect: (msg: string) => void }) {
  const [detecting, setDetecting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);


