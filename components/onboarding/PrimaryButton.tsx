'use client';

import { type ButtonHTMLAttributes } from 'react';

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function PrimaryButton({ children, disabled, style, ...props }: PrimaryButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled}
      style={{
        width: '100%',
        padding: '14px 24px',
        borderRadius: 14,
        background: disabled ? 'rgba(137,207,240,0.25)' : '#89CFF0',
        color: disabled ? 'rgba(255,255,255,0.4)' : '#0F1E2B',
        fontWeight: 600,
        fontSize: 15,
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.2s, color 0.2s',
        ...style,
      }}
    >
      {children}
    </button>
  );
}
