'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface SwipeCardProps {
  children: React.ReactNode;
  onAccept: () => void;
  onDecline: () => void;
  acceptLabel?: string;
  declineLabel?: string;
}

export function SwipeCard({ children, onAccept, onDecline, acceptLabel = 'Accept', declineLabel = 'Decline' }: SwipeCardProps) {
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [exiting, setExiting] = useState<'left' | 'right' | null>(null);
  const startX = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const SWIPE_THRESHOLD = 100;

  const handleStart = useCallback((clientX: number) => {
    startX.current = clientX;
    setSwiping(true);
  }, []);

  const handleMove = useCallback((clientX: number) => {
    if (!swiping) return;
    const diff = clientX - startX.current;
    setOffset(diff);
  }, [swiping]);

  const handleEnd = useCallback(() => {
    setSwiping(false);
    if (offset > SWIPE_THRESHOLD) {
      setExiting('right');
      setTimeout(onAccept, 300);
    } else if (offset < -SWIPE_THRESHOLD) {
      setExiting('left');
      setTimeout(onDecline, 300);
    } else {
      setOffset(0);
    }
  }, [offset, onAccept, onDecline]);

  // Touch events — preventDefault on move to stop page scroll during swipe
  const handleTouchStart = useCallback((e: React.TouchEvent) => handleStart(e.touches[0].clientX), [handleStart]);
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (swiping) e.preventDefault();
    handleMove(e.touches[0].clientX);
  }, [swiping, handleMove]);
  const handleTouchEnd = useCallback(() => handleEnd(), [handleEnd]);

  // Mouse events (desktop drag)
  const handleMouseDown = useCallback((e: React.MouseEvent) => { e.preventDefault(); handleStart(e.clientX); }, [handleStart]);
  const handleMouseMove = useCallback((e: React.MouseEvent) => handleMove(e.clientX), [handleMove]);
  const handleMouseUp = useCallback(() => handleEnd(), [handleEnd]);
  const handleMouseLeave = useCallback(() => { if (swiping) handleEnd(); }, [swiping, handleEnd]);

  // Keyboard support
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') { setExiting('right'); setTimeout(onAccept, 300); }
    if (e.key === 'ArrowLeft') { setExiting('left'); setTimeout(onDecline, 300); }
  }, [onAccept, onDecline]);

  // Attach non-passive touchmove to prevent page scroll during swipe
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const handler = (e: TouchEvent) => {
      if (swiping) e.preventDefault();
    };
    el.addEventListener('touchmove', handler, { passive: false });
    return () => el.removeEventListener('touchmove', handler);
  }, [swiping]);

  const rotation = offset * 0.05;
  const opacity = exiting ? 0 : 1;
  const translateX = exiting === 'right' ? 500 : exiting === 'left' ? -500 : offset;

  // Swipe indicators
  const showAccept = offset > 40;
  const showDecline = offset < -40;

  return (
    <div className="relative w-full max-w-md mx-auto" tabIndex={0} onKeyDown={handleKeyDown}>
      {/* Swipe indicators */}
      <div className={`absolute inset-0 flex items-center justify-start pl-6 z-10 transition-opacity ${showDecline ? 'opacity-100' : 'opacity-0'}`}>
        <span className="text-2xl font-bold text-sos-red-500 bg-sos-red-50 px-4 py-2 rounded-xl border-2 border-sos-red-300 rotate-[-12deg]">
          {declineLabel}
        </span>
      </div>
      <div className={`absolute inset-0 flex items-center justify-end pr-6 z-10 transition-opacity ${showAccept ? 'opacity-100' : 'opacity-0'}`}>
        <span className="text-2xl font-bold text-green-600 bg-green-50 px-4 py-2 rounded-xl border-2 border-green-300 rotate-[12deg]">
          {acceptLabel}
        </span>
      </div>

      {/* Card */}
      <div
        ref={cardRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        className="bg-sos-blue-800 rounded-2xl shadow-lg overflow-hidden transition-all select-none"
        style={{
          transform: `translateX(${translateX}px) rotate(${rotation}deg)`,
          opacity,
          transition: swiping ? 'none' : 'all 0.3s ease-out',
          touchAction: 'pan-y',
        }}
      >
        {children}
      </div>

      {/* Button actions (for non-touch) */}
      <div className="flex gap-3 mt-4 justify-center">
        <button
          onClick={() => { setExiting('left'); setTimeout(onDecline, 300); }}
          className="px-6 py-3 rounded-xl border-2 border-sos-gray-300 text-sos-gray-600 font-semibold hover:bg-sos-gray-200 transition-colors"
        >
          ← {declineLabel}
        </button>
        <button
          onClick={() => { setExiting('right'); setTimeout(onAccept, 300); }}
          className="px-6 py-3 rounded-xl bg-sos-red-500 text-white font-semibold hover:bg-sos-red-600 transition-colors shadow-sm"
        >
          {acceptLabel} →
        </button>
      </div>
    </div>
  );
}
