'use client';

import { useState, useEffect, useRef } from 'react';
import { getTextLines } from '@/lib/text-measure';

interface TextRevealProps {
  text: string;
  mode?: 'assemble' | 'spotlight' | 'cascade';
  font?: string;
  maxWidth?: number;
  lineHeight?: number;
  delay?: number; // ms before starting
  stagger?: number; // ms between items
  className?: string;
}

/**
 * Text reveal animations powered by Pretext line measurement.
 *
 * Modes:
 * - assemble: words fly in from random positions to their measured spots
 * - spotlight: lines reveal one by one with a glow sweep
 * - cascade: lines slide in from below with stagger
 */
export function TextReveal({
  text,
  mode = 'cascade',
  font = '16px Roboto, sans-serif',
  maxWidth = 320,
  lineHeight = 24,
  delay = 0,
  stagger = 80,
  className = '',
}: TextRevealProps) {
  const [lines, setLines] = useState<Array<{ text: string; width: number }>>([]);
  const [visibleLines, setVisibleLines] = useState(0);
  const [started, setStarted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Measure lines
  useEffect(() => {
    if (!text) return;
    getTextLines(text, font, maxWidth, lineHeight).then(setLines);
  }, [text, font, maxWidth, lineHeight]);

  // Start animation after delay
  useEffect(() => {
    if (lines.length === 0) return;
    const timer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timer);
  }, [lines, delay]);

  // Reveal lines with stagger
  useEffect(() => {
    if (!started || lines.length === 0) return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setVisibleLines(i);
      if (i >= lines.length) clearInterval(interval);
    }, stagger);
    return () => clearInterval(interval);
  }, [started, lines.length, stagger]);

  if (mode === 'assemble') {
    return (
      <div ref={containerRef} className={`relative ${className}`} style={{ minHeight: `${lines.length * lineHeight}px` }}>
        {lines.map((line, i) => {
          const words = line.text.split(/\s+/);
          return (
            <div key={i} style={{ height: `${lineHeight}px`, overflow: 'hidden' }}>
              {words.map((word, wi) => {
                const isVisible = i < visibleLines;
                const wordDelay = (i * stagger) + (wi * 30);
                return (
                  <span
                    key={wi}
                    className="inline-block transition-all"
                    style={{
                      transform: isVisible ? 'translate(0, 0) scale(1)' : `translate(${(Math.random() - 0.5) * 200}px, ${(Math.random() - 0.5) * 100}px) scale(0.5)`,
                      opacity: isVisible ? 1 : 0,
                      transition: `all 400ms cubic-bezier(0.34, 1.56, 0.64, 1) ${wordDelay}ms`,
                    }}
                  >
                    {word}{wi < words.length - 1 ? '\u00A0' : ''}
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  }

  if (mode === 'spotlight') {
    return (
      <div className={className}>
        {lines.map((line, i) => {
          const isVisible = i < visibleLines;
          return (
            <div
              key={i}
              className="transition-all"
              style={{
                height: `${lineHeight}px`,
                opacity: isVisible ? 1 : 0.1,
                filter: isVisible ? 'none' : 'blur(2px)',
                transition: `all 300ms ease ${i * stagger}ms`,
                textShadow: isVisible && i === visibleLines - 1 ? '0 0 20px rgba(137, 207, 240, 0.4)' : 'none',
              }}
            >
              {line.text}
            </div>
          );
        })}
      </div>
    );
  }

  // cascade (default)
  return (
    <div className={className}>
      {lines.map((line, i) => {
        const isVisible = i < visibleLines;
        return (
          <div
            key={i}
            className="transition-all"
            style={{
              height: `${lineHeight}px`,
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(12px)',
              transition: `all 250ms cubic-bezier(0.4, 0, 0.2, 1) ${i * stagger}ms`,
            }}
          >
            {line.text}
          </div>
        );
      })}
    </div>
  );
}
