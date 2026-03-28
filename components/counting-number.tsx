'use client';

import { useState, useEffect, useRef } from 'react';
import { shrinkWrapWidth } from '@/lib/text-measure';

interface CountingNumberProps {
  value: number;
  duration?: number; // ms
  prefix?: string; // e.g. "$"
  suffix?: string; // e.g. "%"
  decimals?: number;
  font?: string;
  className?: string;
}

/**
 * Number that counts up from 0 to value with no width jitter.
 * Pretext measures the final formatted number to lock container width.
 * "8" is wider than "1" in proportional fonts — this prevents jitter.
 */
export function CountingNumber({
  value,
  duration = 1000,
  prefix = '',
  suffix = '',
  decimals = 0,
  font = '700 30px Roboto, sans-serif',
  className = '',
}: CountingNumberProps) {
  const [display, setDisplay] = useState(0);
  const [fixedWidth, setFixedWidth] = useState<number | null>(null);
  const animRef = useRef<number | null>(null);
  const startTime = useRef<number>(0);
  const prevValue = useRef(0);

  // Measure final value width
  useEffect(() => {
    const formatted = `${prefix}${value.toFixed(decimals)}${suffix}`;
    shrinkWrapWidth(formatted, font, 300, 36).then(w => {
      setFixedWidth(w + 4); // tiny breathing room
    });
  }, [value, prefix, suffix, decimals, font]);

  // Animate count
  useEffect(() => {
    const from = prevValue.current;
    const to = value;
    prevValue.current = value;
    startTime.current = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (to - from) * eased);
      if (progress < 1) {
        animRef.current = requestAnimationFrame(tick);
      }
    }

    animRef.current = requestAnimationFrame(tick);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [value, duration]);

  const formatted = `${prefix}${display.toFixed(decimals)}${suffix}`;

  return (
    <span
      className={`inline-block text-right tabular-nums ${className}`}
      style={fixedWidth ? { minWidth: `${fixedWidth}px` } : undefined}
    >
      {formatted}
    </span>
  );
}
