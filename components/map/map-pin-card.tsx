'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { X, ArrowUpRight } from 'lucide-react';

export type PinLayer = 'case' | 'resource' | 'facility' | 'event';

const LAYER_META: Record<PinLayer, { label: string; color: string }> = {
  case:     { label: 'Case',     color: '#EF4E4B' },
  resource: { label: 'Resource', color: '#89CFF0' },
  facility: { label: 'Facility', color: '#4ADE80' },
  event:    { label: 'Event',    color: '#A855F7' },
};

export interface MapPinCardProps {
  pin: {
    layer: PinLayer;
    id: string;
    title: string;
    subtitle?: string;
    status?: string;
    href: string;
  };
  x: number;
  y: number;
  onClose: () => void;
}

export function MapPinCard({ pin, x, y, onClose }: MapPinCardProps) {
  const { label, color } = LAYER_META[pin.layer] ?? { label: pin.layer, color: '#EF4E4B' };

  const cardRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<'above' | 'below'>('above');
  const [shiftX, setShiftX] = useState(0);

  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const parentRect = el.offsetParent?.getBoundingClientRect();
    setPlacement(y - rect.height - 24 < 8 ? 'below' : 'above');
    if (parentRect) {
      const half = rect.width / 2;
      let dx = 0;
      if (x - half < 8) dx = 8 - (x - half);
      else if (x + half > parentRect.width - 8) dx = parentRect.width - 8 - (x + half);
      setShiftX(dx);
    }
  }, [x, y]);

  const translateY = placement === 'above' ? 'calc(-100% - 18px)' : '18px';

  return (
    <div
      ref={cardRef}
      className="pointer-events-auto absolute z-30 w-[280px] max-w-[calc(100%-24px)]"
      style={{ left: x + shiftX, top: y, transform: `translate(-50%, ${translateY})` }}
      role="dialog"
    >
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: '#0F1E2B',
          border: `1.5px solid ${color}`,
          boxShadow: `0 0 28px ${color}35, 0 16px 40px rgba(0,0,0,0.5)`,
        }}
      >
        {/* Header */}
        <div className="relative px-4 pt-4 pb-2">
          <button
            onClick={onClose}
            className="absolute right-2.5 top-2.5 w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center text-white/60"
            aria-label="Close"
          >
            <X size={15} />
          </button>
          <div className="flex justify-center">
            <span
              className="font-mono text-[9.5px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full"
              style={{ color, background: `${color}1A` }}
            >
              {label}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 pb-5 pt-1">
          <h2 className="font-semibold text-[16px] leading-tight text-white text-center">{pin.title}</h2>

          {pin.subtitle && (
            <p className="mt-1 text-[12.5px] text-white/55 text-center">{pin.subtitle}</p>
          )}

          {pin.status && (
            <div className="flex justify-center mt-2">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                {pin.status}
              </span>
            </div>
          )}

          <div className="mt-4">
            <Link
              href={pin.href}
              className="flex items-center justify-center gap-1.5 w-full h-10 rounded-full bg-white text-[#0F1E2B] text-[13px] font-semibold hover:bg-white/90 transition"
              onClick={onClose}
            >
              View details <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
