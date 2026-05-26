'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { X, MapPin, Calendar, ShieldCheck } from 'lucide-react';

export type PinLayer = 'case' | 'resource' | 'facility' | 'event';

const LAYER_META: Record<PinLayer, { label: string; color: string; logoSrc: string }> = {
  case:     { label: 'Case',     color: '#EF4E4B', logoSrc: '/logomark-red.svg' },
  resource: { label: 'Resource', color: '#89CFF0', logoSrc: '/logomark-blue.svg' },
  facility: { label: 'Facility', color: '#4ADE80', logoSrc: '/logomark-white.svg' },
  event:    { label: 'Event',    color: '#A855F7', logoSrc: '/logomark-white.svg' },
};

export interface MapPin {
  layer: PinLayer;
  id: string;
  title: string;
  subtitle?: string;
  status?: string;
  href: string;
  urgency?: string;
  county?: string;
  taxonomy?: string;
  capacity?: string | number;
  matchedTo?: string;
  verifiedBy?: string;
  date?: string;
  time?: string;
  filled?: number;
  slots?: number;
  type?: string;
  description?: string;
  needs?: { id: string; label: string; urgency?: string }[];
}

export interface MapPinCardProps {
  pin: MapPin;
  onClose: () => void;
}

function useIsNarrow() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const upd = () => setNarrow(mq.matches);
    upd();
    mq.addEventListener('change', upd);
    return () => mq.removeEventListener('change', upd);
  }, []);
  return narrow;
}

/* ── Shared sub-components ── */

function AccentRing({ color, logoSrc }: { color: string; logoSrc: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative flex items-center justify-center">
        <span className="absolute w-14 h-14 rounded-full animate-pulse" style={{ border: `2px solid ${color}`, opacity: 0.5 }} />
        <span className="relative w-12 h-12 rounded-full flex items-center justify-center" style={{ background: color }}>
          <img src={logoSrc} alt="SOS" className="w-6 h-6" />
        </span>
      </div>
    </div>
  );
}

function StatusLabel({ accent, children, verified }: { accent: string; children: React.ReactNode; verified?: boolean }) {
  return (
    <div className="flex items-center justify-center gap-2 mt-3 mb-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: accent }}>{children}</span>
      {verified && <ShieldCheck size={12} className="text-emerald-400" />}
    </div>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return <h2 className="font-serif text-[18px] text-white text-center leading-tight">{children}</h2>;
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/10 text-white/70">{children}</span>;
}

function SubLine({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <p className="flex items-center justify-center gap-1.5 text-[12px] text-white/50 mt-1">
      <Icon size={11} /> {children}
    </p>
  );
}

function Primary({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="w-full mt-4 py-3 rounded-2xl bg-white text-[#0F1E2B] text-[13px] font-bold tracking-wide active:scale-[0.97] transition-transform">
      {children}
    </button>
  );
}

function Empty({ label }: { label: string }) {
  return <p className="text-[13px] text-white/40 text-center py-4">{label}</p>;
}

/* ── Entity variants ── */

function CaseCard({ pin, accent, onClose }: { pin: MapPin; accent: string; onClose: () => void }) {
  return (
    <>
      <StatusLabel accent={accent}>Case</StatusLabel>
      <Title>{pin.title || `Case ${pin.id?.slice(0, 8)}`}</Title>
      <div className="flex justify-center gap-2 mt-2">
        {pin.status && <Chip>{pin.status.replace(/_/g, ' ')}</Chip>}
      </div>
      {pin.county && <SubLine icon={MapPin}>{pin.county} County</SubLine>}
      {pin.needs && pin.needs.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {pin.needs.map(n => (
            <div key={n.id} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
              <span className="text-[12px] text-white/70">{n.label}</span>
              {n.urgency && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300">{n.urgency}</span>}
            </div>
          ))}
        </div>
      )}
      <Primary onClick={() => { window.location.href = pin.href; onClose(); }}>View case</Primary>
    </>
  );
}

function RequestCard({ pin, accent, onClose }: { pin: MapPin; accent: string; onClose: () => void }) {
  return (
    <>
      <StatusLabel accent={accent}>Request</StatusLabel>
      <Title>{pin.title || pin.taxonomy?.replace(/_/g, ' ') || `Request`}</Title>
      <div className="flex justify-center gap-2 mt-2">
        {pin.urgency && <Chip>{pin.urgency}</Chip>}
        {pin.status && <Chip>{pin.status.replace(/_/g, ' ')}</Chip>}
      </div>
      {pin.county && <SubLine icon={MapPin}>{pin.county} County</SubLine>}
      {pin.description && <p className="text-[12px] text-white/50 text-center mt-2 line-clamp-2">{pin.description}</p>}
      <Primary onClick={() => { window.location.href = pin.href; onClose(); }}>View request</Primary>
    </>
  );
}

function ResourceCard({ pin, accent, onClose }: { pin: MapPin; accent: string; onClose: () => void }) {
  const chip = pin.matchedTo ? 'Matched' : pin.status === 'approved' ? 'Available' : (pin.status || 'Available');
  return (
    <>
      <StatusLabel accent={accent}>Resource</StatusLabel>
      <Title>{pin.title || pin.description || 'Resource'}</Title>
      <div className="flex justify-center gap-2 mt-2"><Chip>{chip}</Chip></div>
      {pin.subtitle && <SubLine icon={MapPin}>{pin.subtitle}</SubLine>}
      {pin.capacity && <p className="text-[11px] text-white/40 text-center mt-1">Capacity: {pin.capacity}</p>}
      <Primary onClick={() => { window.location.href = pin.href; onClose(); }}>View resource</Primary>
    </>
  );
}

function ReportCard({ pin, accent }: { pin: MapPin; accent: string }) {
  return (
    <>
      <StatusLabel accent={accent} verified={!!pin.verifiedBy}>Report</StatusLabel>
      <Title>{pin.title || 'Field Report'}</Title>
      {pin.description && <p className="text-[12px] text-white/50 text-center mt-2 line-clamp-3">{pin.description}</p>}
      {pin.subtitle && <SubLine icon={MapPin}>{pin.subtitle}</SubLine>}
      {pin.verifiedBy && <p className="text-[10px] text-emerald-400/70 text-center mt-2">Verified by {pin.verifiedBy}</p>}
    </>
  );
}

function EventCard({ pin, accent }: { pin: MapPin; accent: string }) {
  const [rsvped, setRsvped] = useState(false);
  const filled = pin.filled ?? 0;
  const slots = pin.slots ?? 1;
  const ratio = filled / Math.max(slots, 1);
  const chipLabel = filled >= slots ? 'Full' : ratio >= 0.7 ? 'Filling up' : 'Open';
  return (
    <>
      <StatusLabel accent={accent}>Event</StatusLabel>
      <Title>{pin.title || 'Event'}</Title>
      <div className="flex justify-center gap-2 mt-2"><Chip>{chipLabel}</Chip></div>
      <SubLine icon={Calendar}>{pin.date || '—'} · {pin.time || '—'} · {filled}/{slots} slots</SubLine>
      <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(ratio * 100, 100)}%`, background: accent }} />
      </div>
      <button
        onClick={() => setRsvped(!rsvped)}
        className={`w-full mt-4 py-3 rounded-2xl text-[13px] font-bold tracking-wide active:scale-[0.97] transition-transform ${
          rsvped ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-white text-[#0F1E2B]'
        }`}
      >
        {rsvped ? '✓ RSVPed' : 'RSVP'}
      </button>
    </>
  );
}

function FacilityCard({ pin, accent }: { pin: MapPin; accent: string }) {
  const current = pin.filled ?? 0;
  const capacity = pin.slots ?? pin.capacity ? Number(pin.capacity) : 1;
  const ratio = current / Math.max(capacity, 1);
  const chipLabel = current >= capacity ? 'Full' : ratio >= 0.8 ? 'Near capacity' : 'Open';
  return (
    <>
      <StatusLabel accent={accent}>Facility</StatusLabel>
      <Title>{pin.title || 'Facility'}</Title>
      <div className="flex justify-center gap-2 mt-2"><Chip>{chipLabel}</Chip></div>
      {pin.type && <SubLine icon={MapPin}>{pin.type.replace(/_/g, ' ')} · {current}/{capacity}</SubLine>}
      {pin.subtitle && <p className="text-[11px] text-white/40 text-center mt-1">{pin.subtitle}</p>}
      <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(ratio * 100, 100)}%`, background: ratio >= 0.8 ? '#EF4E4B' : accent }} />
      </div>
    </>
  );
}

function Variant({ pin, accent, onClose }: { pin: MapPin; accent: string; onClose: () => void }) {
  switch (pin.layer) {
    case 'case':     return <CaseCard pin={pin} accent={accent} onClose={onClose} />;
    case 'resource': return <ResourceCard pin={pin} accent={accent} onClose={onClose} />;
    case 'facility': return <FacilityCard pin={pin} accent={accent} />;
    case 'event':    return <EventCard pin={pin} accent={accent} />;
    default:         return <RequestCard pin={pin} accent={accent} onClose={onClose} />;
  }
}

/* ── Main card ── */

export function MapPinCard({ pin, onClose }: MapPinCardProps) {
  const meta = LAYER_META[pin.layer] ?? { label: pin.layer, color: '#EF4E4B', logoSrc: '/logomark-red.svg' };
  const { color, logoSrc } = meta;
  const narrow = useIsNarrow();

  const cardInner = (
    <div className="rounded-3xl overflow-hidden" style={{ background: '#0F1E2B', boxShadow: `0 24px 60px -12px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)` }}>
      {narrow && (
        <div className="flex justify-center pt-2">
          <span className="block h-1 w-9 rounded-full bg-white/25" />
        </div>
      )}
      <div className="relative pt-5 pb-2 px-4">
        <button onClick={onClose} className="absolute right-2 top-2 w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center text-white" aria-label="Close">
          <X size={18} />
        </button>
        <AccentRing color={color} logoSrc={logoSrc} />
      </div>
      <div className="px-7 pb-7">
        <Variant pin={pin} accent={color} onClose={onClose} />
      </div>
      <div className="h-[3px] w-full" style={{ background: color }} />
    </div>
  );

  if (narrow) {
    return (
      <>
        <div className="fixed inset-0 z-[25] bg-black/40 animate-in fade-in duration-150" onClick={onClose} />
        <div className="pointer-events-auto fixed left-3 right-3 bottom-3 z-40 mx-auto max-w-[420px] animate-in slide-in-from-bottom-4 fade-in duration-200" role="dialog" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {cardInner}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="absolute inset-0 z-[25] bg-black/30 backdrop-blur-[2px] transition-opacity duration-300" onClick={onClose} />
      <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none px-6">
        <div className="pointer-events-auto w-full max-w-[340px] animate-[cardPop_0.25s_ease-out]" role="dialog">
          {cardInner}
        </div>
      </div>
      <style>{`@keyframes cardPop { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }`}</style>
    </>
  );
}
