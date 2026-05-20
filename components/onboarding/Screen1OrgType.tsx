'use client';

import { Check } from 'lucide-react';
import { ORG_TYPES, type OrgType } from './types';
import { PrimaryButton } from './PrimaryButton';

interface Screen1OrgTypeProps {
  selected: OrgType | null;
  onSelect: (id: OrgType) => void;
  onContinue: () => void;
}

export function Screen1OrgType({ selected, onSelect, onContinue }: Screen1OrgTypeProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, marginBottom: 6 }}>What type of organization are you?</h1>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 20 }}>This helps us customize your workspace.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
        {ORG_TYPES.map(org => {
          const Icon = org.icon;
          const active = selected === org.id;
          return (
            <button
              key={org.id}
              onClick={() => onSelect(org.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 16px',
                borderRadius: 12,
                background: active ? 'rgba(137,207,240,0.08)' : 'rgba(255,255,255,0.04)',
                border: active ? '1.5px solid rgba(137,207,240,0.6)' : '1.5px solid rgba(255,255,255,0.08)',
                boxShadow: active ? '0 0 16px rgba(137,207,240,0.15)' : 'none',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ color: active ? '#89CFF0' : 'rgba(255,255,255,0.5)', flexShrink: 0 }}>
                <Icon size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{org.label}</div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 2 }}>{org.description}</div>
              </div>
              {active && (
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#89CFF0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Check size={12} color="#0F1E2B" strokeWidth={3} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <PrimaryButton disabled={!selected} onClick={onContinue}>Continue</PrimaryButton>
    </div>
  );
}
