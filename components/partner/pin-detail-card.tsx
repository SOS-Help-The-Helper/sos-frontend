'use client';

import { X, Star, Phone, Route, Search, Truck, Edit, Info } from 'lucide-react';

interface PinDetailCardProps {
  type: 'request' | 'resource' | 'driver';
  data: Record<string, any>;
  onClose: () => void;
  onAction: (action: string) => void;
}

function ActionBtn({ label, icon: Icon, onClick }: { label: string; icon: React.ElementType; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex-1 flex flex-col items-center gap-1 py-2 rounded-lg bg-white/10 active:bg-white/20 transition-colors">
      <Icon size={16} className="text-sky-300" />
      <span className="text-[11px] text-white/80">{label}</span>
    </button>
  );
}

function rvTitle(data: Record<string, any>): string {
  // Build from year/make/model if available, otherwise use description
  const parts = [data.year, data.make, data.model].filter(Boolean);
  if (parts.length > 0) return parts.join(' ');
  if (data.description) return data.description;
  return 'RV';
}

function addressLine(data: Record<string, any>): string | null {
  if (data.location_text) return data.location_text;
  const parts = [data.city, data.state].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (!value) return null;
  return <span className="text-white/50 text-xs">{label}: {value}</span>;
}

export function PinDetailCard({ type, data, onClose, onAction }: PinDetailCardProps) {
  return (
    <div className="bg-[#1A3850] rounded-t-2xl shadow-2xl px-5 pt-4 pb-8 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-1 min-w-0 flex-1 mr-3">
          {type === 'request' && (() => {
            const name = data.display_name || data.persons?.display_name || 'Anonymous';
            const address = addressLine(data);
            const tags: string[] = [];
            if (data.household_size && data.household_size > 1) tags.push(`Family of ${data.household_size}`);
            if (data.is_veteran) tags.push('Veteran');
            if (data.is_first_responder) tags.push('First Responder');
            if (data.has_disability) tags.push('ADA');
            if (data.has_pets) tags.push('Pets');
            return (
              <>
                <p className="text-white font-semibold truncate">{name}</p>
                {tags.length > 0 && (
                  <p className="text-white/60 text-xs">{tags.join(' · ')}</p>
                )}
                {address && <p className="text-white/40 text-xs truncate">{address}</p>}
              </>
            );
          })()}

          {type === 'resource' && (() => {
            const title = rvTitle(data);
            const address = addressLine(data);
            return (
              <>
                <p className="text-white font-semibold truncate">{title}</p>
                {address && <p className="text-white/40 text-xs truncate">{address}</p>}
                <div className="flex flex-wrap gap-2 text-xs">
                  {data.sleeps && <InfoRow label="Sleeps" value={data.sleeps} />}
                  {data.hitch_type && <InfoRow label="Hitch" value={data.hitch_type} />}
                  {data.condition_rating != null && (
                    <span className="flex items-center gap-0.5 text-yellow-400 text-xs"><Star size={11} fill="currentColor" />{data.condition_rating}</span>
                  )}
                </div>
              </>
            );
          })()}

          {type === 'driver' && (() => {
            const name = data.display_name || data.persons?.display_name || 'Driver';
            const address = addressLine(data);
            return (
              <>
                <p className="text-white font-semibold truncate">{name}</p>
                {address && <p className="text-white/40 text-xs truncate">{address}</p>}
                {data.description && <p className="text-white/50 text-xs truncate">{data.description}</p>}
              </>
            );
          })()}
        </div>
        <button onClick={onClose} className="text-white/40 hover:text-white/80 mt-0.5 shrink-0"><X size={18} /></button>
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
