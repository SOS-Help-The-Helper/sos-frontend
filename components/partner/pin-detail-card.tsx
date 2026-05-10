'use client';

import { X, Star, Phone, Route, Search, Truck, Edit, Info } from 'lucide-react';

const URGENCY = { critical: 'bg-red-500', high: 'bg-orange-500', medium: 'bg-yellow-500', low: 'bg-green-500' } as const;

interface PinDetailCardProps {
  type: 'request' | 'resource' | 'driver';
  data: Record<string, any>;
  onClose: () => void;
  onAction: (action: string) => void;
}

function Badge({ label, color = 'bg-sky-700' }: { label: string; color?: string }) {
  return <span className={`${color} text-white text-xs font-medium px-2 py-0.5 rounded-full`}>{label}</span>;
}

function Pill({ label }: { label: string }) {
  return <span className="bg-white/10 text-white/70 text-xs px-2 py-0.5 rounded">{label}</span>;
}

function ActionBtn({ label, icon: Icon, onClick }: { label: string; icon: React.ElementType; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex-1 flex flex-col items-center gap-1 py-2 rounded-lg bg-white/10 active:bg-white/20 transition-colors">
      <Icon size={16} className="text-sky-300" />
      <span className="text-[11px] text-white/80">{label}</span>
    </button>
  );
}

export function PinDetailCard({ type, data, onClose, onAction }: PinDetailCardProps) {
  return (
    <div className="bg-[#1A3850] rounded-t-2xl shadow-2xl px-5 pt-4 pb-8 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          {type === 'request' && (
            <>
              <p className="text-white font-semibold">{data.display_name || 'Anonymous'}</p>
              <div className="flex flex-wrap gap-1.5">
                {data.taxonomy_code && <Badge label={data.taxonomy_code} />}
                {data.urgency && <Badge label={data.urgency} color={URGENCY[data.urgency as keyof typeof URGENCY] ?? 'bg-gray-600'} />}
                {data.status && <Pill label={data.status} />}
                {data.partner_status && <Pill label={data.partner_status} />}
              </div>
              {data.location_text && <p className="text-white/50 text-xs">{data.location_text}</p>}
            </>
          )}
          {type === 'resource' && (
            <>
              <p className="text-white font-semibold">{data.facility_name || data.location_text || 'Resource'}</p>
              {data.description && <p className="text-white/70 text-sm">{data.description}</p>}
              <div className="flex flex-wrap gap-1.5">
                {data.taxonomy_code && <Badge label={data.taxonomy_code} />}
                {data.status && <Pill label={data.status} />}
                {data.partner_status && <Pill label={data.partner_status} />}
                {data.condition_rating != null && (
                  <span className="flex items-center gap-0.5 text-yellow-400 text-xs"><Star size={11} fill="currentColor" />{data.condition_rating}</span>
                )}
              </div>
            </>
          )}
          {type === 'driver' && (
            <>
              <p className="text-white font-semibold">{data.display_name || 'Driver'}</p>
              <div className="flex flex-wrap gap-1.5">
                {data.assignment_status && <Pill label={data.assignment_status} />}
                {data.eta && <Pill label={`ETA ${data.eta}`} />}
              </div>
              {data.destination && <p className="text-white/50 text-xs">→ {data.destination}</p>}
            </>
          )}
        </div>
        <button onClick={onClose} className="text-white/40 hover:text-white/80 mt-0.5"><X size={18} /></button>
      </div>

      <div className="flex gap-2 pt-1">
        {type === 'request' && <>
          <ActionBtn label="Find Match" icon={Search} onClick={() => onAction('find_match')} />
          <ActionBtn label="Update" icon={Edit} onClick={() => onAction('update')} />
          <ActionBtn label="Details" icon={Info} onClick={() => onAction('details')} />
        </>}
        {type === 'resource' && <>
          <ActionBtn label="Assign Driver" icon={Truck} onClick={() => onAction('assign_driver')} />
          <ActionBtn label="Update" icon={Edit} onClick={() => onAction('update')} />
          <ActionBtn label="Details" icon={Info} onClick={() => onAction('details')} />
        </>}
        {type === 'driver' && <>
          <ActionBtn label="Call" icon={Phone} onClick={() => onAction('call')} />
          <ActionBtn label="View Route" icon={Route} onClick={() => onAction('view_route')} />
          <ActionBtn label="Details" icon={Info} onClick={() => onAction('details')} />
        </>}
      </div>
    </div>
  );
}
