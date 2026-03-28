'use client';

import { useState, useEffect } from 'react';
import { shrinkWrapWidth } from '@/lib/text-measure';

interface MeasuredBubbleProps {
  text: string;
  isOwn: boolean;
  maxWidth?: number;
  children: React.ReactNode;
  className?: string;
}

/**
 * Chat bubble that shrink-wraps to its text content using Pretext.
 * Short messages like "Yes" get a small bubble.
 * Long messages expand to maxWidth.
 */
export function MeasuredBubble({ text, isOwn, maxWidth = 320, children, className = '' }: MeasuredBubbleProps) {
  const [width, setWidth] = useState<number | null>(null);

  useEffect(() => {
    if (!text || text.length > 500) return; // Skip measurement for very long texts
    shrinkWrapWidth(text, '14px Roboto, sans-serif', maxWidth, 20).then(w => {
      // Add padding (32px) + some breathing room (16px)
      setWidth(Math.min(maxWidth, w + 48));
    });
  }, [text, maxWidth]);

  return (
    <div
      className={`rounded-2xl px-4 py-2.5 ${className}`}
      style={width ? { maxWidth: `${width}px` } : { maxWidth: `${maxWidth}px` }}
    >
      {children}
    </div>
  );
}
