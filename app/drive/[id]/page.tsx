'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Camera, Navigation, Phone, MessageSquare, AlertTriangle, Sparkles,
  MapPin, Truck, CheckCircle2, Lock, X, Send, Radio,
} from 'lucide-react';
import { CommandPalette } from '@/components/command-palette';
import { api } from '@/lib/api';
import { useAuthContext } from '@/lib/auth-context';
import {
  transportAssignments,
  orgTransportConfig,
  convoys,
  TRANSPORT_STATUS_LABEL,
  type TransportAssignment,
  type TransportStatus,
} from '@/lib/prototype-data';

const PRIVACY_REVEAL_AFTER: TransportStatus[] = ['at_pickup', 'hooked_up', 'loaded', 'in_transit', 'at_staging', 'delivered', 'verified', 'completed'];

function mapApiToAssignment(raw: Record<string, unknown>): TransportAssignment {
  const proto = transportAssignments[0];
  return {
    ...proto,
    id: String(raw.id ?? proto.id),
    status: (raw.status as TransportStatus) ?? proto.status,
    driverName: String(raw.driver_name ?? proto.driverName),
    resourceSummary: String(raw.resource_description ?? proto.resourceSummary),
    origin: String(raw.origin ?? proto.origin),
    destination: String(raw.destination ?? proto.destination),
    originLat: Number(raw.origin_lat ?? proto.originLat),
    originLng: Number(raw.origin_lng ?? proto.originLng),
    destinationLat: Number(raw.destination_lat ?? proto.destinationLat),
    destinationLng: Number(raw.destination_lng ?? proto.destinationLng),
    currentLat: raw.current_lat != null ? Number(raw.current_lat) : null,
    currentLng: raw.current_lng != null ? Number(raw.current_lng) : null,
    estimatedArrival: raw.estimated_arrival != null ? String(raw.estimated_arrival) : null,
    priority: (raw.priority as TransportAssignment['priority']) ?? 'normal',
    convoyId: raw.convoy_id != null ? String(raw.convoy_id) : null,
    convoyPosition: raw.convoy_position != null ? Number(raw.convoy_position) : null,
    statusHistory: [],
    issues: [],
    photos: [],
  };
}

function Logomark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="9" cy="9" r="9" fill="#EF4E4B" />
      <text x="9" y="12.5" textAnchor="middle" fontSize="7" fontWeight="bold" fill="white" fontFamily="monospace">SOS</text>
    </svg>
  );
}

export default function DriverPage() {
  const { id } = useParams<{ id: string }>();
  const { orgId } = useAuthContext();
  const [base, setBase] = useState<TransportAssignment | null>(
    () => transportAssignments.find((a) => a.id === id) ?? null
  );

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      try {
        const res = await api.transportList(orgId) as { data?: unknown[] } | unknown[];
        const rows = Array.isArray(res) ? res : (res as { data?: unknown[] }).data ?? [];
        const match = rows.find((r) => (r as Record<string, unknown>).id === id);
        if (match) {
          setBase(mapApiToAssignment(match as Record<string, unknown>));
        }
      } catch {
        // fallback to prototype data — already set
      }
    })();
  }, [orgId, id]);

  if (!base) {
    return (
      <div className="min-h-screen bg-[#0F1E2B] flex items-center justify-center">
        <p className="text-white/60 text-sm">Trip not found.</p>
      </div>
    );
  }

  return <DriverPageInner base={base} />;
}

function DriverPageInner({ base }: { base: TransportAssignment }) {
  const [assignment, setAssignment] = useState<TransportAssignment>(base);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [shareLocation, setShareLocation] = useState(assignment.status === 'in_transit');
  const fileRef = useRef<HTMLInputElement>(null);
  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cfg = orgTransportConfig[assignment.org];
  const pipeline = cfg?.statusPipeline ?? ['assigned', 'in_transit', 'delivered'];
  const branding = cfg?.branding ?? { name: assignment.org, color: '#EF4E4B' };
  const requirePhotos = cfg?.requirePhotosAt ?? [];

  const currentIdx = pipeline.indexOf(assignment.status);
  const nextStatus = currentIdx >= 0 && currentIdx < pipeline.length - 1 ? pipeline[currentIdx + 1] : null;
  const needsPhotoForNext = nextStatus ? requirePhotos.includes(nextStatus) : false;
  const photoCapturedForNext = nextStatus
    ? assignment.photos.some((p) => p.stage === nextStatus)
    : false;

  const dropoffVisible = PRIVACY_REVEAL_AFTER.includes(assignment.status);
  const convoy = useMemo(() => convoys.find((c) => c.id === assignment.convoyId), [assignment.convoyId]);

  function advance() {
    if (!nextStatus) return;
    if (needsPhotoForNext && !photoCapturedForNext) {
      toast.error('Take a photo to continue');
      return;
    }
    const ts = 'Just now';
    setAssignment((a) => ({
      ...a,
      status: nextStatus,
      statusHistory: [...a.statusHistory, { status: nextStatus, timestamp: ts }],
    }));
    toast.success(`Updated to ${TRANSPORT_STATUS_LABEL[nextStatus]}`);
    try {
      api.transportUpdateStatus(assignment.id, nextStatus).catch(() => {
        toast.error('Failed to sync status — coordinator may not see update');
      });
    } catch {
      toast.error('Failed to sync status — coordinator may not see update');
    }
  }

  function onPhoto() {
    fileRef.current?.click();
  }

  function onFile() {
    const stage = nextStatus ?? assignment.status;
    setAssignment((a) => ({
      ...a,
      photos: [...a.photos, { url: '#', stage, timestamp: 'Just now' }],
    }));
    toast.success('Photo captured');
    if (fileRef.current) fileRef.current.value = '';
  }

  function submitIssue(type: string, description: string) {
    setAssignment((a) => ({
      ...a,
      issues: [...a.issues, { type, description, timestamp: 'Just now', resolved: false }],
    }));
    setIssueOpen(false);
    toast.success('Coordinator notified');
    try {
      api.transportReportIssue(assignment.id, type, description).catch(() => {
        toast.error('Failed to send issue report — try calling coordinator');
      });
    } catch {
      toast.error('Failed to send issue report — try calling coordinator');
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-white">
      {/* Partner branding bar */}
      <div
        className="h-1.5 w-full"
        style={{ background: `linear-gradient(90deg, ${branding.color}, ${branding.color}55)` }}
      />

      <div className="mx-auto max-w-[480px] px-4 pt-4 pb-32">
        {/* Header */}
        <header className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div
                className="absolute inset-0 rounded-full blur-md opacity-50 animate-pulse"
                style={{ background: branding.color }}
              />
              <div className="relative w-8 h-8 rounded-full bg-[var(--surface-1)] flex items-center justify-center ring-1 ring-white/10">
                <Logomark size={18} />
              </div>
            </div>
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.16em]" style={{ color: branding.color }}>
                {branding.name}
              </p>
              <p className="text-[11px] text-white/55 font-mono">{assignment.id}</p>
            </div>
          </div>
          <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/[0.08] text-white/65">
            {assignment.priority}
          </span>
        </header>

        {/* Driver greeting */}
        <div className="mb-5">
          <h1 className="text-[22px] font-semibold tracking-tight leading-tight">
            Hi {assignment.driverName.split(' ')[0]} —
          </h1>
          <p className="text-[13px] text-white/60 mt-0.5">{assignment.driverVehicle}</p>
        </div>

        {/* Convoy badge */}
        {convoy && (
          <div className="mb-4 rounded-xl bg-white/5 border border-white/[0.08] px-3 py-2 flex items-center gap-2.5">
            <Truck size={14} className="text-[#89CFF0]" />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium truncate">Convoy: {convoy.name}</p>
              <p className="font-mono text-[10px] text-white/50">
                Position {assignment.convoyPosition} of {convoy.assignmentIds.length}
              </p>
            </div>
          </div>
        )}

        {/* Status rail */}
        <section className="mb-4">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-white/45 mb-2">
            Status · {TRANSPORT_STATUS_LABEL[assignment.status]}
          </p>
          <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
            {pipeline.map((s, i) => {
              const done = i < currentIdx;
              const active = i === currentIdx;
              return (
                <div
                  key={s}
                  className={`shrink-0 inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[10.5px] font-medium whitespace-nowrap border ${
                    done
                      ? 'bg-[#34D399]/15 text-[#34D399] border-[#34D399]/30'
                      : active
                      ? 'bg-white/10 text-white border-white/30 animate-pulse'
                      : 'bg-white/[0.04] text-white/40 border-white/[0.08]'
                  }`}
                >
                  {done && <CheckCircle2 size={11} />}
                  {TRANSPORT_STATUS_LABEL[s]}
                </div>
              );
            })}
          </div>

          {/* Next-step CTA */}
          {nextStatus && (
            <div className="mt-2">
              {needsPhotoForNext && !photoCapturedForNext && (
                <button
                  onClick={onPhoto}
                  className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-[#F5EBD6]/10 border border-[#F5EBD6]/30 text-[#F5EBD6] text-[14px] font-medium mb-2"
                >
                  <Camera size={16} /> Take photo to continue
                </button>
              )}
              <button
                onClick={advance}
                disabled={needsPhotoForNext && !photoCapturedForNext}
                className="w-full inline-flex items-center justify-center gap-2 h-14 rounded-xl text-white text-[15px] font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: branding.color }}
              >
                {ctaLabelFor(nextStatus)}
              </button>
            </div>
          )}
          {!nextStatus && (
            <div className="mt-2 w-full inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-[#34D399]/15 border border-[#34D399]/30 text-[#34D399] text-[14px] font-medium">
              <CheckCircle2 size={16} /> Trip complete — thank you
            </div>
          )}
        </section>

        {/* Transport card */}
        <section className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-4 mb-4">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-white/45 mb-2">Resource</p>
          <div className="flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#89CFF0]/[0.12] text-[#89CFF0] flex items-center justify-center shrink-0">
              <Truck size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium leading-tight">{assignment.resourceSummary}</p>
              <p className="font-mono text-[10px] text-white/45 mt-0.5">{assignment.resourceId}</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <RoutePoint
              icon={<MapPin size={14} className="text-[#34D399]" />}
              label="Pickup"
              address={assignment.origin}
              navHref={`https://www.google.com/maps/dir/?api=1&destination=${assignment.originLat},${assignment.originLng}`}
              visible
            />
            <RoutePoint
              icon={<MapPin size={14} className="text-[#EF4E4B]" />}
              label="Dropoff"
              address={dropoffVisible ? assignment.destination : assignment.destination.split(',')[0]}
              navHref={`https://www.google.com/maps/dir/?api=1&destination=${assignment.destinationLat},${assignment.destinationLng}`}
              visible={dropoffVisible}
              hint={!dropoffVisible ? 'Full address unlocks at pickup (privacy)' : undefined}
            />
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 grid grid-cols-2 gap-2 text-[12px]">
            <div>
              <p className="font-mono text-[9.5px] uppercase tracking-wider text-white/40">Distance</p>
              <p className="font-mono tabular-nums text-white/85 mt-0.5">{assignment.distanceMiles} mi</p>
            </div>
            {assignment.estimatedArrival && (
              <div>
                <p className="font-mono text-[9.5px] uppercase tracking-wider text-white/40">ETA</p>
                <p className="font-mono text-white/85 mt-0.5">{assignment.estimatedArrival}</p>
              </div>
            )}
          </div>

          {assignment.notes && (
            <div className="mt-3 rounded-lg border border-[#89CFF0]/20 bg-[#89CFF0]/5 px-3 py-2">
              <p className="font-mono text-[9.5px] uppercase tracking-wider text-[#89CFF0]/85 mb-0.5">Coordinator note</p>
              <p className="text-[12.5px] text-white/85 leading-snug">{assignment.notes}</p>
            </div>
          )}
        </section>

        {/* Photos */}
        <section className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-white/45">
              Photos · {assignment.photos.length}
            </p>
            <button
              onClick={onPhoto}
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-white/[0.08] text-[11px] text-white/85"
            >
              <Camera size={12} /> Take photo
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onFile}
            className="hidden"
          />
          {assignment.photos.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/[0.12] px-3 py-6 text-center text-[12px] text-white/45">
              No photos yet
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {assignment.photos.map((p, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-lg bg-gradient-to-br from-white/10 to-white/5 border border-white/[0.08] flex flex-col items-center justify-center p-2"
                >
                  <Camera size={16} className="text-white/35 mb-1" />
                  <p className="font-mono text-[8.5px] uppercase tracking-wider text-white/55 text-center leading-tight">
                    {p.stage.replace(/_/g, ' ')}
                  </p>
                  <p className="font-mono text-[8px] text-white/35 mt-0.5 truncate w-full text-center">{p.timestamp}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Issues */}
        <section className="mb-4">
          {assignment.issues.length > 0 && (
            <div className="mb-2 space-y-1.5">
              {assignment.issues.map((it, i) => (
                <div key={i} className="rounded-lg bg-[#EF4E4B]/[0.08] border border-[#EF4E4B]/25 px-3 py-2">
                  <div className="flex items-center gap-2 mb-0.5">
                    <AlertTriangle size={11} className="text-[#EF4E4B]" />
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#EF4E4B]">{it.type}</span>
                    <span className="font-mono text-[9.5px] text-white/45 ml-auto">{it.timestamp}</span>
                  </div>
                  <p className="text-[12px] text-white/85">{it.description}</p>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => setIssueOpen(true)}
            className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-[#EF4E4B]/10 border border-[#EF4E4B]/25 text-[#EF4E4B] text-[13px] font-medium"
          >
            <AlertTriangle size={14} /> Report issue
          </button>
        </section>

        {/* Location sharing */}
        <section className="mb-4 rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 py-3 flex items-center gap-3">
          <Radio size={14} className={shareLocation ? 'text-[#34D399]' : 'text-white/35'} />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium">Share my location</p>
            <p className="text-[11px] text-white/55">
              {shareLocation ? 'Active · coordinator can see your progress' : 'Helps the coordinator track your progress'}
            </p>
          </div>
          <button
            onClick={() => {
              setShareLocation((v) => {
                const next = !v;
                if (next) {
                  // Start sending mock location every 30s
                  locationIntervalRef.current = setInterval(() => {
                    api.transportUpdateLocation(assignment.id, 29.5 + Math.random() * 0.01, -82.0 + Math.random() * 0.01).catch(() => {
                      toast.error('Location update failed');
                    });
                  }, 30_000);
                } else {
                  if (locationIntervalRef.current !== null) {
                    clearInterval(locationIntervalRef.current);
                    locationIntervalRef.current = null;
                  }
                }
                return next;
              });
            }}
            className={`relative w-10 h-6 rounded-full transition ${shareLocation ? 'bg-[#34D399]' : 'bg-white/15'}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                shareLocation ? 'translate-x-4' : ''
              }`}
            />
          </button>
        </section>
      </div>

      {/* Fixed coordinator bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 glass border-t border-white/10 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-[480px] px-4 py-2 flex items-center gap-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mr-1 truncate">
            {assignment.coordinatorName}
          </p>
          <a
            href={`tel:${assignment.coordinatorPhone.replace(/[^0-9]/g, '')}`}
            className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-lg bg-white/[0.08] text-white/90 text-[12.5px] font-medium"
          >
            <Phone size={13} /> Call
          </a>
          <a
            href={`sms:${assignment.coordinatorPhone.replace(/[^0-9]/g, '')}`}
            className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-lg bg-white/[0.08] text-white/90 text-[12.5px] font-medium"
          >
            <MessageSquare size={13} /> Text
          </a>
        </div>
      </div>

      {/* Floating agent */}
      <button
        onClick={() => setPaletteOpen(true)}
        className="fixed z-30 bottom-20 right-4 w-12 h-12 rounded-full bg-gradient-to-br from-[#EF4E4B] to-[#89CFF0] flex items-center justify-center ring-2 ring-white/15 shadow-lg active:scale-95 transition"
        aria-label="Ask SOS"
      >
        <Sparkles size={18} className="text-white" />
      </button>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} module="Driver" />

      {/* Issue sheet */}
      {issueOpen && <IssueSheet onClose={() => setIssueOpen(false)} onSubmit={submitIssue} />}

      {/* Back-to-coordinator link in corner */}
      <Link
        href="/transport"
        className="fixed top-3 right-3 z-20 font-mono text-[9px] uppercase tracking-wider text-white/40 hover:text-white/80 px-2 py-1 rounded bg-black/30 backdrop-blur"
      >
        coord view
      </Link>
    </div>
  );
}

function ctaLabelFor(s: TransportStatus): string {
  const map: Partial<Record<TransportStatus, string>> = {
    accepted: 'Accept assignment',
    en_route_pickup: 'Start drive to pickup',
    at_pickup: "I've arrived at pickup",
    hooked_up: 'Confirm hookup',
    loaded: 'Confirm loaded',
    in_transit: 'Start drive to dropoff',
    at_staging: 'Arrived at staging',
    delivered: "I've arrived — delivered",
    verified: 'Confirm verification',
    completed: 'Mark trip complete',
  };
  return map[s] ?? `Mark as ${TRANSPORT_STATUS_LABEL[s]}`;
}

function RoutePoint({
  icon, label, address, navHref, visible, hint,
}: {
  icon: React.ReactNode;
  label: string;
  address: string;
  navHref: string;
  visible: boolean;
  hint?: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-7 h-7 rounded-md bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-mono text-[9.5px] uppercase tracking-wider text-white/45">{label}</p>
        <p className="text-[13.5px] font-medium mt-0.5 flex items-center gap-1.5">
          {!visible && <Lock size={11} className="text-white/40" />}
          {address}
        </p>
        {hint && <p className="text-[10.5px] text-white/45 mt-0.5">{hint}</p>}
      </div>
      <a
        href={navHref}
        target="_blank"
        rel="noreferrer"
        className="shrink-0 inline-flex items-center gap-1 h-8 px-2.5 rounded-md bg-[#89CFF0]/15 text-[#89CFF0] text-[11.5px] font-medium"
      >
        <Navigation size={12} /> Navigate
      </a>
    </div>
  );
}

function IssueSheet({ onClose, onSubmit }: { onClose: () => void; onSubmit: (type: string, desc: string) => void }) {
  const [type, setType] = useState('delay');
  const [desc, setDesc] = useState('');
  const types = ['mechanical', 'flat_tire', 'delay', 'accident', 'other'];
  return (
    <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
      <div
        className="w-full max-w-[480px] rounded-t-2xl bg-[var(--surface-1)] border-t border-white/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-white/65">Report an issue</p>
          <button onClick={onClose} className="w-7 h-7 rounded-md hover:bg-white/[0.08] flex items-center justify-center">
            <X size={14} className="text-white/60" />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`h-7 px-2.5 rounded-md text-[11px] font-medium capitalize ${
                type === t ? 'bg-[#EF4E4B]/20 text-[#EF4E4B]' : 'bg-white/[0.06] text-white/70'
              }`}
            >
              {t.replace('_', ' ')}
            </button>
          ))}
        </div>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={3}
          placeholder="Describe what's happening…"
          className="w-full rounded-lg bg-white/5 border border-white/10 text-[13px] p-3 placeholder:text-white/35 focus:outline-none focus:border-[#89CFF0]/50 resize-none"
        />
        <button
          onClick={() => onSubmit(type, desc.trim() || `${type} reported`)}
          className="mt-3 w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-[#EF4E4B] text-white text-[13px] font-medium"
        >
          <Send size={13} /> Send to coordinator
        </button>
      </div>
    </div>
  );
}
