'use client';

import { useState, useEffect, useRef } from 'react';
import { measureText } from '@/lib/text-measure';

interface MorphContainerProps {
  text: string;
  font?: string;
  maxWidth?: number;
  lineHeight?: number;
  padding?: number; // extra height for non-text content
  duration?: number; // ms
  children: React.ReactNode;
  className?: string;
}

/**
 * Container that smoothly animates to its content's measured height.
 * Uses Pretext to measure BEFORE render, then CSS transitions to target.
 * Perfect for swipe cards, expanding panels, dynamic content.
 */
export function MorphContainer({
  text,
  font = '16px Roboto, sans-serif',
  maxWidth = 320,
  lineHeight = 24,
  padding = 0,
  duration = 300,
  children,
  className = '',
}: MorphContainerProps) {
  const [height, setHeight] = useState<number | null>(null);
  const prevHeight = useRef<number | null>(null);

  useEffect(() => {
    if (!text) return;
    measureText(text, font, maxWidth, lineHeight).then(result => {
      if (result) {
        const newHeight = result.height + padding;
        prevHeight.current = height;
        setHeight(newHeight);
      }
    });
  }, [text, font, maxWidth, lineHeight, padding]);

  return (
    <div
      className={`overflow-hidden ${className}`}
      style={{
        height: height ? `${height}px` : 'auto',
        transition: prevHeight.current !== null ? `height ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)` : 'none',
      }}
    >
      {children}
    </div>
  );
}
