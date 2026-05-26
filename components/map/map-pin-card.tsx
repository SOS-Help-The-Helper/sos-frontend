'use client';

import Link from 'next/link';
import { X } from 'lucide-react';

export type PinLayer = 'case' | 'resource' | 'facility' | 'event';

const LAYER_META: Record<PinLayer, { label: string; color: string; logoSrc: string }> = {
  case:     { label: 'Case',     color: '#EF4E4B', logoSrc: '/logomark-red.svg' },
  resource: { label: 'Resource', color: '#89CFF0', logoSrc: '/logomark-blue.svg' },
  facility: { label: 'Facility', color: '#4ADE80', logoSrc: '/logomark-white.svg' },
  event:    { label: 'Event',    color: '#A855F7', logoSrc: '/logomark-white.svg' },
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
  onClose: () => void;
}

export function MapPinCard({ pin, onClose }: MapPinCardProps) {
  const meta = LAYER_META[pin.layer] ?? { label: pin.layer, color: '#EF4E4B', logoSrc: '/logomark-red.svg' };
  const { label, color, logoSrc } = meta;

  return (
    <>
      {/* Backdrop */}
      <div
        className="absolute inset-0 z-[25] bg-black/30 backdrop-blur-[2px] transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Centered card */}
      <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none px-6">
        <div
          className="pointer-events-auto w-full max-w-[340px] animate-[cardPop_0.25s_ease-out] relative"
          style={{
            background: 'rgba(26, 56, 80, 0.92)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: '24px',
            boxShadow: `0 24px 80px rgba(0,0,0,0.5), 0 0 40px ${color}25`,
          }}
        >
          {/* Border with mask for logomark cutout */}
          <div
            className="absolute inset-0 rounded-[24px] pointer-events-none"
            style={{
              border: `1.5px solid ${color}4D`,
              mask: 'linear-gradient(to bottom, transparent 0px, transparent 24px, black 24px)',
              WebkitMask: 'linear-gradient(to bottom, transparent 0px, transparent 24px, black 24px)',
            }}
          />

          {/* Floating logomark */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-7 z-10">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{
                background: 'rgba(15,30,43,0.95)',
                boxShadow: `0 0 24px ${color}66`,
                border: `2px solid ${color}66`,
              }}
            >
              <img src={logoSrc} alt="SOS" className="w-8 h-8" />
            </div>
          </div>

          <div className="px-6 pt-6 pb-5">
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-3 right-4 text-white/30 hover:text-white text-lg transition-colors"
            >
              <X size={16} />
            </button>

            {/* Layer label */}
            <p
              className="text-center text-[11px] font-bold uppercase tracking-[0.2em] mb-3"
              style={{ color }}
            >
              {label}
            </p>

            {/* Title */}
            <p className="text-center text-[15px] font-semibold text-white leading-tight mb-1">
              {pin.title || pin.id?.slice(0, 8) || label}
            </p>

            {/* Subtitle */}
            {pin.subtitle && (
              <p className="text-center text-[13px] text-white/55 leading-relaxed mb-3">
                {pin.subtitle}
              </p>
            )}

            {/* Status pill */}
            {pin.status && (
              <div className="flex justify-center mb-4">
                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white/10 text-white/60 capitalize">
                  {pin.status.replace(/_/g, ' ')}
                </span>
              </div>
            )}

            {/* View details button */}
            <Link
              href={pin.href}
              onClick={onClose}
              className="flex items-center justify-center w-full py-3 rounded-2xl text-white text-[13px] font-bold tracking-wide active:scale-[0.97] transition-transform"
              style={{
                background: color,
                boxShadow: `0 4px 20px ${color}4D`,
              }}
            >
              View details
            </Link>
          </div>
        </div>
      </div>

      <style>{`@keyframes cardPop { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }`}</style>
    </>
  );
}
