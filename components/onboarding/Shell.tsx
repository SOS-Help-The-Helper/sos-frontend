'use client';

import { ChevronLeft } from 'lucide-react';
import { ProgressDots } from './ProgressDots';

interface ShellProps {
  children: React.ReactNode;
  step: number; // 0-indexed
  totalSteps?: number;
  stepLabel?: string;
  onBack?: () => void;
}

export function Shell({ children, step, totalSteps = 5, stepLabel, onBack }: ShellProps) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#0F1E2B',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '0 20px 32px',
        }}
      >
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, paddingBottom: 24 }}>
          {onBack ? (
            <button
              onClick={onBack}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: 4, display: 'flex' }}
            >
              <ChevronLeft size={22} />
            </button>
          ) : (
            <div style={{ width: 30 }} />
          )}
          <ProgressDots total={totalSteps} current={step} />
          {stepLabel ? (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', minWidth: 30, textAlign: 'right' }}>{stepLabel}</span>
          ) : (
            <div style={{ width: 30 }} />
          )}
        </div>

        {/* Content with fade-in */}
        <div
          key={step}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.25s ease' }}
        >
          {children}
        </div>
      </div>

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }`}</style>
    </div>
  );
}
