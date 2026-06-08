'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Package, MapPin, PenLine, Check, X, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface ResourceDetailViewProps {
  resource: any;
  onRefetch: () => void;
  onEdit: (field: string, value: any) => void;
  saving: boolean;
}

const STATUS_OPTIONS = ['available', 'deployed', 'unavailable'];

const STATUS_COLORS: Record<string, string> = {
  available: '#4ADE80',
  deployed: '#89CFF0',
  unavailable: 'rgba(255,255,255,0.3)',
};

function EditableField({
  label,
  field,
  value,
  type = 'text',
  options,
  saving,
  onEdit,
}: {
  label: string;
  field: string;
  value: any;
  type?: 'text' | 'number' | 'select';
  options?: string[];
  saving: boolean;
  onEdit: (field: string, value: any) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(value == null ? '' : String(value));

  const start = () => {
    setDraft(value == null ? '' : String(value));
    setEditing(true);
  };
  const commit = () => {
    onEdit(field, type === 'number' ? Number(draft) : draft);
    setEditing(false);
  };

  return (
    <div className="group flex items-start justify-between gap-3 py-2.5 border-b border-[var(--hairline)] last:border-0">
      <div className="text-xs text-[var(--foreground)]/40 pt-0.5 shrink-0 w-24">{label}</div>
      {editing ? (
        <div className="flex items-center gap-1.5 flex-1 justify-end">
          {type === 'select' ? (
            <select
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="bg-[var(--surface-1)] border border-[var(--hairline)] rounded-lg px-2 py-1 text-sm outline-none"
            >
              {options?.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={type}
              value={draft}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit();
                if (e.key === 'Escape') setEditing(false);
              }}
              className="bg-[var(--surface-1)] border border-[var(--hairline)] rounded-lg px-2 py-1 text-sm outline-none w-full max-w-[180px] text-right"
            />
          )}
          <button
            onClick={commit}
            disabled={saving}
            className="p-1 rounded-md hover:bg-foreground/5 disabled:opacity-40"
            aria-label="Save"
          >
            <Check size={15} color="#4ADE80" />
          </button>
          <button
            onClick={() => setEditing(false)}
            className="p-1 rounded-md hover:bg-foreground/5"
            aria-label="Cancel"
          >
            <X size={15} />
          </button>
        </div>
      ) : (
        <button
          onClick={start}
          className="flex items-center gap-1.5 text-sm text-right min-w-0"
        >
          <span className="truncate">
            {value == null || value === '' ? (
              <span className="text-[var(--foreground)]/30">—</span>
            ) : (
              String(value)
            )}
          </span>
          <PenLine
            size={13}
            className="shrink-0 opacity-0 group-hover:opacity-40 transition-opacity"
          />
        </button>
      )}
    </div>
  );
}

export default function ResourceDetailView({
  resource,
  onRefetch,
  onEdit,
  saving,
}: ResourceDetailViewProps) {
  const statusColor = STATUS_COLORS[resource?.status] || STATUS_COLORS.unavailable;

  const orgName = resource?.organizations?.name;
  const heading = resource?.description || resource?.taxonomy_code || 'Resource';
  const locationLine = [resource?.location_text, resource?.city, resource?.state]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="flex flex-col h-full" style={{ color: 'var(--foreground)' }}>
      {/* TOP BAR */}
      <div className="relative h-14 flex items-center justify-between px-4 sticky top-0 z-40 bg-[var(--surface-1)]/95 backdrop-blur-xl border-b border-[var(--hairline)]">
        <Link
          href="/app/inventory"
          className="p-1 -ml-1 rounded-lg hover:bg-foreground/5 shrink-0"
        >
          <ChevronLeft size={22} />
        </Link>
        <div className="absolute left-1/2 -translate-x-1/2 text-sm font-mono text-[var(--foreground)]/50">
          Resource
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }} />
          <span className="text-xs rounded-full bg-foreground/5 px-2 py-0.5 capitalize">
            {resource?.status || 'unknown'}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-6">
        {/* HERO CARD */}
        <div className="mx-4 mt-3 bg-[var(--surface-1)] border border-[var(--hairline)] rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 shrink-0 bg-foreground/5 rounded-full flex items-center justify-center ring-2"
              style={{ '--tw-ring-color': statusColor } as React.CSSProperties}
            >
              <Package size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-base font-serif truncate">{heading}</div>
              {resource?.taxonomy_code && (
                <div className="text-xs text-[var(--foreground)]/40 font-mono truncate">
                  {resource.taxonomy_code}
                </div>
              )}
              {orgName && (
                <div className="text-xs text-[var(--foreground)]/50 truncate">{orgName}</div>
              )}
              {locationLine && (
                <div className="flex items-center gap-1 text-xs text-[var(--foreground)]/30 truncate mt-0.5">
                  <MapPin size={11} className="shrink-0" />
                  {locationLine}
                </div>
              )}
            </div>
          </div>

          {resource?.capacity_available != null && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              <span className="text-[10px] bg-foreground/5 rounded-full px-2 py-0.5 text-[var(--foreground)]/50">
                {resource.capacity_available} available
              </span>
              {resource?.category && (
                <span className="text-[10px] bg-foreground/5 rounded-full px-2 py-0.5 text-[var(--foreground)]/50">
                  {resource.category}
                </span>
              )}
            </div>
          )}
        </div>

        {/* EDITABLE FIELDS */}
        <div className="mx-4 mt-3 bg-[var(--surface-1)] border border-[var(--hairline)] rounded-xl px-4 py-1">
          <EditableField label="Description" field="description" value={resource?.description} saving={saving} onEdit={onEdit} />
          <EditableField label="Status" field="status" value={resource?.status} type="select" options={STATUS_OPTIONS} saving={saving} onEdit={onEdit} />
          <EditableField label="Capacity" field="capacity_available" value={resource?.capacity_available} type="number" saving={saving} onEdit={onEdit} />
          <EditableField label="Contact" field="contact_name" value={resource?.contact_name} saving={saving} onEdit={onEdit} />
        </div>

        {/* DETAILS CARD */}
        <div className="mx-4 mt-3 bg-[var(--surface-1)] border border-[var(--hairline)] rounded-xl px-4 py-1">
          <div className="text-[10px] uppercase tracking-wide text-[var(--foreground)]/30 pt-3 pb-1">
            Details
          </div>
          <DetailRow label="Location" value={locationLine || resource?.county} />
          {resource?.latitude != null && resource?.longitude != null && (
            <DetailRow
              label="Coordinates"
              value={`${Number(resource.latitude).toFixed(4)}, ${Number(resource.longitude).toFixed(4)}`}
            />
          )}
          {resource?.created_at && (
            <DetailRow label="Created" value={new Date(resource.created_at).toLocaleDateString()} />
          )}
          {orgName && <DetailRow label="Organization" value={orgName} />}
        </div>

        {/* FILES SECTION */}
        <div className="mx-4 mt-3 bg-[var(--surface-1)] border border-[var(--hairline)] rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-wide text-[var(--foreground)]/30 mb-2">
            Files
          </div>
          <div className="text-sm text-[var(--foreground)]/30 mb-3">No files yet</div>
          <button
            onClick={() => toast('Coming soon')}
            className="flex items-center gap-2 text-xs text-[var(--foreground)]/60 border border-[var(--hairline)] rounded-lg px-3 py-2 hover:bg-foreground/5"
          >
            <Upload size={14} />
            Upload
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: any }) {
  if (value == null || value === '') return null;
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-[var(--hairline)] last:border-0">
      <div className="text-xs text-[var(--foreground)]/40 shrink-0 w-24">{label}</div>
      <div className="text-sm text-right truncate">{String(value)}</div>
    </div>
  );
}
