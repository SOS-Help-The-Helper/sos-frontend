'use client';

import { useState, useEffect, useRef } from 'react';
import { measureText } from '@/lib/text-measure';

interface BalancedTextProps {
  children: string;
  maxWidth?: number;
  font?: string;
  lineHeight?: number;
  maxLines?: number;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span';
}

/**
 * Text that auto-balances to avoid orphan words.
 * Binary searches for the tightest width where text fits in the target line count.
 * Result: even line lengths, no single-word last line.
 */
export function BalancedText({
  children,
  maxWidth: propMaxWidth,
  font = '16px Roboto, sans-serif',
  lineHeight = 24,
  maxLines = 2,
  className = '',
  as: Tag = 'p',
}: BalancedTextProps) {
  const containerRef = useRef<HTMLElement>(null);
  const [balancedWidth, setBalancedWidth] = useState<number | null>(null);

  useEffect(() => {
    if (!children || !containerRef.current) return;
    const maxW = propMaxWidth || containerRef.current.offsetWidth;
    if (maxW <= 0) return;

    async function balance() {
      // First check: does it even need multiple lines?
      const full = await measureText(children, font, maxW, lineHeight);
      if (!full || full.lineCount <= 1) {
        setBalancedWidth(null); // Single line, no balancing needed
        return;
      }

      // Binary search for tightest width that keeps same line count
      const targetLines = full.lineCount;
      let lo = maxW * 0.5; // Don't go below half width
      let hi = maxW;
      let best = maxW;

      for (let i = 0; i < 10; i++) {
        const mid = (lo + hi) / 2;
        const m = await measureText(children, font, mid, lineHeight);
        if (!m) break;
        if (m.lineCount <= targetLines) {
          best = mid;
          hi = mid;
        } else {
          lo = mid;
        }
      }

      setBalancedWidth(Math.ceil(best));
    }

    balance();
  }, [children, propMaxWidth, font, lineHeight, maxLines]);

  return (
    <Tag
      ref={containerRef as any}
      className={className}
      style={balancedWidth ? { maxWidth: `${balancedWidth}px` } : undefined}
    >
      {children}
    </Tag>
  );
}
