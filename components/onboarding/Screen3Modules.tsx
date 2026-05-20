'use client';

import { Check } from 'lucide-react';
import { MODULES, type ModuleId } from './types';
import { PrimaryButton } from './PrimaryButton';

interface Screen3ModulesProps {
  selected: ModuleId[];
  onToggle: (id: ModuleId) => void;
  onContinue: () => void;
}

export function Screen3Modules({ selected, onToggle, onContinue }: Screen3ModulesProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Choose your modules</h1>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 20 }}>Pick the tools your team will use. You can change this later.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 28 }}>
        {MODULES.map(mod => {
          const Icon = mod.icon;
          const active = selected.includes(mod.id);
          return (
            <button
              key={mod.id}
              onClick={() => onToggle(mod.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 8,
                padding: '14px 14px 12px',
                borderRadius: 12,
                background: active ? 'rgba(137,207,240,0.08)' : 'rgba(255,255,255,0.04)',
                border: active ? '1.5px solid rgba(137,207,240,0.6)' : '1.5px solid rgba(255,255,255,0.08)',
                cursor: 'pointer',
                textAlign: 'left',
                position: 'relative',
                transition: 'all 0.15s',
              }}
            >
              {active && (
                <div style={{ position: 'absolute', top: 10, right: 10, width: 18, height: 18, borderRadius: '50%', background: '#89CFF0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={11} color="#0F1E2B" strokeWidth={3} />
                </div>
              )}
              <div style={{ color: active ? '#89CFF0' : 'rgba(255,255,255,0.5)' }}>
                <Icon size={20} />
              </div>
              <div>
                <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{mod.label}</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>{mod.description}</div>
              </div>
            </button>
          );
        })}
      </div>

      <PrimaryButton disabled={selected.length === 0} onClick={onContinue}>
        Continue with {selected.length} module{selected.length !== 1 ? 's' : ''}
      </PrimaryButton>
    </div>
  );
}
