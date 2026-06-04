'use client';

import { useState, useEffect, useRef } from 'react';
import { getTextLines } from '@/lib/text-measure';

interface TypewriterProps {
  text: string;
  speed?: number; // ms per character
  font?: string;
  maxWidth?: number;
  lineHeight?: number;
  className?: string;
  onComplete?: () => void;
}

/**
 * Typewriter that pre-calculates line breaks via Pretext.
 * Text types out character by character within stable, pre-measured lines.
 * No reflow, no line jumping.
 */
export function Typewriter({
  text,
  speed = 20,
  font = '14px Roboto, sans-serif',
  maxWidth = 500,
  lineHeight = 22,
  className = '',
  onComplete,
}: TypewriterProps) {
  const [lines, setLines] = useState<string[]>([]);
  const [revealedChars, setRevealedChars] = useState(0);
  const [ready, setReady] = useState(false);
  const totalChars = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Step 1: Measure all line breaks upfront
  useEffect(() => {
    if (!text) return;
    getTextLines(text, font, maxWidth, lineHeight).then(measured => {
      const lineTexts = measured.map(l => l.text);
      setLines(lineTexts);
      totalChars.current = lineTexts.join('').length;
      setRevealedChars(0);
      setReady(true);
    });
  }, [text, font, maxWidth, lineHeight]);

  // Step 2: Animate character reveal
  useEffect(() => {
    if (!ready || totalChars.current === 0) return;
    intervalRef.current = setInterval(() => {
      setRevealedChars(prev => {
        const next = prev + 1;
        if (next >= totalChars.current) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          onComplete?.();
          return totalChars.current;
        }
        return next;
      });
    }, speed);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [ready, speed, onComplete]);

  if (!ready) return null;

  // Render lines with character-level visibility
  let charsSoFar = 0;
  return (
    <div className={className}>
      {lines.map((rawLine, i) => {
        const line = rawLine ?? '';
        const lineStart = charsSoFar;
        charsSoFar += line.length;
        const visibleCount = Math.max(0, Math.min(line.length, revealedChars - lineStart));

        if (visibleCount === 0 && revealedChars < lineStart) return null;

        return (
          <div key={i} className="min-h-[1.4em]">
            <span>{line.slice(0, visibleCount)}</span>
            <span className={visibleCount < line.length ? 'animate-pulse inline-block w-[2px] h-[1em] bg-current ml-[1px] align-text-bottom' : ''} />
          </div>
        );
      })}
    </div>
  );
}
