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
  const [exiting, setExiting] = useState<'left' | 'right' | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Use refs for touch tracking — React state is too slow for touch events
  const swipingRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const offsetRef = useRef(0);
  const directionLockedRef = useRef<'horizontal' | 'vertical' | null>(null);

  const SWIPE_THRESHOLD = 80;

  // Attach all touch handlers as non-passive native listeners
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    function onTouchStart(e: TouchEvent) {
      const touch = e.touches[0];
      startXRef.current = touch.clientX;
      startYRef.current = touch.clientY;
      swipingRef.current = true;
      directionLockedRef.current = null;
      offsetRef.current = 0;
    }

    function onTouchMove(e: TouchEvent) {
      if (!swipingRef.current) return;
      const touch = e.touches[0];
      const dx = touch.clientX - startXRef.current;
      const dy = touch.clientY - startYRef.current;

      // Lock direction on first significant movement
      if (!directionLockedRef.current) {
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
          directionLockedRef.current = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
        }
        return; // Wait for direction lock
      }

      // If vertical, let the browser scroll normally
      if (directionLockedRef.current === 'vertical') {
        swipingRef.current = false;
        return;
      }

      // Horizontal — we own this gesture
      e.preventDefault();
      offsetRef.current = dx;
      setOffset(dx);
    }

    function onTouchEnd() {
      if (!swipingRef.current || directionLockedRef.current !== 'horizontal') {
        swipingRef.current = false;
        directionLockedRef.current = null;
        return;
      }

      swipingRef.current = false;
      directionLockedRef.current = null;
      const finalOffset = offsetRef.current;

      if (finalOffset > SWIPE_THRESHOLD) {
        setExiting('right');
        setTimeout(onAccept, 300);
      } else if (finalOffset < -SWIPE_THRESHOLD) {
        setExiting('left');
        setTimeout(onDecline, 300);
      } else {
        setOffset(0);
      }
      offsetRef.current = 0;
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [onAccept, onDecline]);

  // Mouse drag (desktop)
  const mouseDown = useRef(false);
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    mouseDown.current = true;
    startXRef.current = e.clientX;
    offsetRef.current = 0;
  }, []);
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!mouseDown.current) return;
    const dx = e.clientX - startXRef.current;
    offsetRef.current = dx;
    setOffset(dx);
  }, []);
  const handleMouseUp = useCallback(() => {
    if (!mouseDown.current) return;
    mouseDown.current = false;
    const finalOffset = offsetRef.current;
    if (finalOffset > SWIPE_THRESHOLD) {
      setExiting('right');
      setTimeout(onAccept, 300);
    } else if (finalOffset < -SWIPE_THRESHOLD) {
      setExiting('left');
      setTimeout(onDecline, 300);
    } else {
      setOffset(0);
    }
    offsetRef.current = 0;
  }, [onAccept, onDecline]);

  // Keyboard
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') { setExiting('right'); setTimeout(onAccept, 300); }
    if (e.key === 'ArrowLeft') { setExiting('left'); setTimeout(onDecline, 300); }
  }, [onAccept, onDecline]);

  const swiping = swipingRef.current && directionLockedRef.current === 'horizontal';
  const rotation = offset * 0.05;
  const opacity = exiting ? 0 : 1;
  const translateX = exiting === 'right' ? 500 : exiting === 'left' ? -500 : offset;
  const showAccept = offset > 40;
  const showDecline = offset < -40;

  return (
    <div className="relative w-full max-w-md mx-auto" tabIndex={0} onKeyDown={handleKeyDown}>
      {/* Swipe indicators */}
      <div className={`absolute inset-0 flex items-center justify-start pl-6 z-10 transition-opacity pointer-events-none ${showDecline ? 'opacity-100' : 'opacity-0'}`}>
        <span className="text-2xl font-bold text-sos-red-500 bg-sos-red-50 px-4 py-2 rounded-xl border-2 border-sos-red-300 rotate-[-12deg]">
          {declineLabel}
        </span>
      </div>
      <div className={`absolute inset-0 flex items-center justify-end pr-6 z-10 transition-opacity pointer-events-none ${showAccept ? 'opacity-100' : 'opacity-0'}`}>
        <span className="text-2xl font-bold text-green-600 bg-green-50 px-4 py-2 rounded-xl border-2 border-green-300 rotate-[12deg]">
          {acceptLabel}
        </span>
      </div>

      {/* Card */}
      <div
        ref={cardRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="bg-sos-blue-800 rounded-2xl shadow-lg overflow-hidden select-none cursor-grab active:cursor-grabbing"
        style={{
          transform: `translateX(${translateX}px) rotate(${rotation}deg)`,
          opacity,
          transition: offset === 0 && !swiping ? 'all 0.3s ease-out' : 'none',
          touchAction: 'pan-y',
        }}
      >
        {children}
      </div>

      {/* Button actions */}
      <div className="flex gap-3 mt-4 justify-center">
        <button
          onClick={() => { setExiting('left'); setTimeout(onDecline, 300); }}
          className="px-6 py-3 rounded-xl border-2 border-sos-gray-300 text-sos-gray-600 font-semibold hover:bg-sos-gray-200 transition-all active:scale-[0.97]"
        >
          ← {declineLabel}
        </button>
        <button
          onClick={() => { setExiting('right'); setTimeout(onAccept, 300); }}
          className="px-6 py-3 rounded-xl bg-sos-red-500 text-white font-semibold hover:bg-sos-red-600 transition-all active:scale-[0.97] shadow-sm"
        >
          {acceptLabel} →
        </button>
      </div>
    </div>
  );
}
