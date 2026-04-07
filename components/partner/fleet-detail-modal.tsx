'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  X, Truck, MapPin, Calendar, Weight, Users, Wrench,
  DollarSign, Package, FileText, Plus, Clock, AlertTriangle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase-client';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface FleetMetadata {
  vin?: string;
  year?: string;
  make?: string;
  model?: string;
  type?: string;
  vehicle_type?: string;
  sleeps?: number;
  weight?: number;
  spec_dry_weight_lbs?: number;
  hitch_type?: string;
  spec_hitch_type?: string;
  condition?: string;
  comments?: string;
  source?: string;
  delivery_method?: string;
  cost_to_ocala?: number;
  interior_contents?: string;
  repairs_needed?: string;
  known_repairs?: string;
  notes?: NoteEntry[];
  [key: string]: unknown;
}

interface NoteEntry {
  text: string;
  added_at: string;
  added_by: string;
}

interface FleetResource {
  id: string;
  category: string;
  status: string;
  description?: string;
  details_sanitized?: string;
  capacity_available?: number;
  capacity_total?: number;
  latitude?: number;
  longitude?: number;
  location_text?: string;
  org_id?: string;
  source?: string;
  taxonomy_code?: string;
  persona_type?: string;
  created_at: string;
  metadata?: FleetMetadata;
}

interface MatchRecord {
  id: string;
  created_at: string;
  status: string;
  score?: number;
  request?: {
    id: string;
    person?: {
      full_name?: string;
    };
  };
}

interface FleetDetailModalProps {
  resource: FleetResource;
  onClose: () => void;
  onStatusChange: (newStatus: string) => void;
  onEdit: () => void;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://rtduqguwhkczexnoawej.supabase.co';

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  available:   { bg: 'bg-green-900/40',  text: 'text-green-300',  dot: 'bg-green-400' },
  matched:     { bg: 'bg-yellow-900/40', text: 'text-yellow-300', dot: 'bg-yellow-400' },
  maintenance: { bg: 'bg-orange-900/40', text: 'text-orange-300', dot: 'bg-orange-400' },
  sold:        { bg: 'bg-gray-700/60',   text: 'text-gray-400',   dot: 'bg-gray-500' },
  in_transit:  { bg: 'bg-blue-900/40',   text: 'text-blue-300',   dot: 'bg-blue-400' },
};

const STATUS_ACTIONS = ['available', 'matched', 'maintenance', 'sold'] as const;

const SOURCE_LABELS: Record<string, string> = {
  citizen: 'Citizen Donated',
  partner: 'ERV Fleet',
  government: 'State Donated',
  manual: 'Manual Entry',
  web: 'Web Intake',
  migration: 'Migrated',
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getRvTitle(r: FleetResource): string {
  const m = r.metadata;
  if (m?.year && m?.make && m?.model) {
    return `${m.year} ${m.make} ${m.model}`;
  }
  return r.description || r.details_sanitized || 'RV Unit';
}

function getStatusStyle(status: string) {
  return STATUS_COLORS[status] || STATUS_COLORS.sold;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getSourceLabel(r: FleetResource): string {
  const metaSource = r.metadata?.source;
  if (typeof metaSource === 'string' && metaSource) {
    return SOURCE_LABELS[metaSource] || metaSource.replace(/_/g, ' ');
  }
  return SOURCE_LABELS[r.source || ''] || r.source || 'Unknown';
}

/* ------------------------------------------------------------------ */
/*  Detail Grid Item                                                   */
/* ------------------------------------------------------------------ */

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number | null | undefined;
}) {
  if (value == null || value === '') return null;
  return (
    <div className="flex items-start gap-2.5 py-2">
      <Icon className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-gray-500 font-medium">{label}</p>
        <p className="text-sm text-gray-200 break-words">{value}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Mini Map (static Mapbox image)                                     */
/* ------------------------------------------------------------------ */

function MiniMap({ lat, lng }: { lat: number; lng: number }) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;
  const src = `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-s+3b82f6(${lng},${lat})/${lng},${lat},9,0/300x180@2x?access_token=${token}`;
  return (
    <div className="rounded-lg overflow-hidden border border-gray-700 mt-3">
      <img
        src={src}
        alt="Resource location"
        className="w-full h-[180px] object-cover"
        loading="lazy"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function FleetDetailModal({
  resource,
  onClose,
  onStatusChange,
  onEdit,
}: FleetDetailModalProps) {
  const m = resource.metadata || {};
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [localNotes, setLocalNotes] = useState<NoteEntry[]>(
    Array.isArray(m.notes) ? m.notes : [],
  );

  // ---- Load match history ----
  useEffect(() => {
    async function loadMatches() {
      setMatchesLoading(true);
      const { data } = await supabase
        .from('matches')
        .select('id, created_at, status, score, request:requests(id, person:persons(full_name))')
        .eq('resource_id', resource.id)
        .order('created_at', { ascending: false })
        .limit(20);
      setMatches((data || []) as unknown as MatchRecord[]);
      setMatchesLoading(false);
    }
    loadMatches();
  }, [resource.id]);

  // ---- Close on Escape ----
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // ---- Add note via erv-update EF ----
  const handleAddNote = useCallback(async () => {
    const text = noteText.trim();
    if (!text) return;
    setNoteSaving(true);
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/erv-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ action: 'add_note', id: resource.id, note: text }),
      });
      if (resp.ok) {
        const newNote: NoteEntry = {
          text,
          added_at: new Date().toISOString(),
          added_by: 'portal-user',
        };
        setLocalNotes(prev => [...prev, newNote]);
        setNoteText('');
        setAddingNote(false);
      }
    } finally {
      setNoteSaving(false);
    }
  }, [noteText, resource.id]);

  // ---- Status change via erv-update EF ----
  const handleStatusChange = useCallback(async (newStatus: string) => {
    setStatusUpdating(true);
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/erv-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'update_resource',
          id: resource.id,
          updates: { status: newStatus },
        }),
      });
      if (resp.ok) {
        onStatusChange(newStatus);
      }
    } finally {
      setStatusUpdating(false);
      setConfirmStatus(null);
    }
  }, [resource.id, onStatusChange]);

  // ---- Derived values ----
  const statusStyle = getStatusStyle(resource.status);
  const vehicleType = m.vehicle_type || m.type || null;
  const weight = m.spec_dry_weight_lbs || m.weight || null;
  const hitchType = m.spec_hitch_type || m.hitch_type || null;
  const condition = m.condition || m.comments || null;
  const repairsNeeded = m.known_repairs || m.repairs_needed || null;
  const sleeps = m.sleeps ?? resource.capacity_available ?? null;
  const location = resource.location_text || resource.details_sanitized || null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-8 md:pt-16">
        <div
          className="relative w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* ---- 1. Header ---- */}
          <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-gray-700">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-gray-100 truncate">
                {getRvTitle(resource)}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
                  {(resource.status || 'unknown').replace(/_/g, ' ')}
                </span>
                {vehicleType && (
                  <span className="text-xs text-gray-500">{vehicleType}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={onEdit}
                className="px-3 py-1.5 text-xs font-medium text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="max-h-[calc(100vh-12rem)] overflow-y-auto">

            {/* ---- 2. Details Grid ---- */}
            <div className="px-5 py-4 border-b border-gray-700">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                <DetailItem icon={FileText} label="VIN" value={m.vin} />
                <DetailItem
                  icon={Truck}
                  label="Year / Make / Model"
                  value={m.year && m.make && m.model ? `${m.year} ${m.make} ${m.model}` : null}
                />
                <DetailItem icon={Truck} label="Type" value={vehicleType} />
                <DetailItem icon={Users} label="Sleep Capacity" value={sleeps} />
                <DetailItem
                  icon={Weight}
                  label="Weight"
                  value={weight ? `${Number(weight).toLocaleString()} lbs` : null}
                />
                <DetailItem icon={Truck} label="Hitch Type" value={hitchType} />
                <DetailItem icon={Wrench} label="Condition" value={condition} />
                <DetailItem icon={MapPin} label="Location" value={location} />
                <DetailItem icon={Package} label="Source" value={getSourceLabel(resource)} />
                <DetailItem icon={Package} label="Interior Contents" value={m.interior_contents} />
                <DetailItem icon={AlertTriangle} label="Repairs Needed" value={repairsNeeded} />
                <DetailItem icon={Truck} label="Delivery Method" value={m.delivery_method} />
                <DetailItem
                  icon={DollarSign}
                  label="Cost to Ocala"
                  value={m.cost_to_ocala != null ? `$${Number(m.cost_to_ocala).toLocaleString()}` : null}
                />
                <DetailItem
                  icon={Calendar}
                  label="Date Added"
                  value={formatDate(resource.created_at)}
                />
              </div>

              {/* Mini map */}
              {resource.latitude != null && resource.longitude != null && (
                <MiniMap lat={resource.latitude} lng={resource.longitude} />
              )}
            </div>

            {/* ---- 3. Match History ---- */}
            <div className="px-5 py-4 border-b border-gray-700">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Match History</h3>
              {matchesLoading ? (
                <div className="space-y-2">
                  {[1, 2].map(i => (
                    <div key={i} className="h-10 bg-gray-800 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : matches.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No match history</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-wide text-gray-500 border-b border-gray-800">
                        <th className="text-left py-2 pr-3 font-medium">Date</th>
                        <th className="text-left py-2 pr-3 font-medium">Survivor</th>
                        <th className="text-left py-2 pr-3 font-medium">Status</th>
                        <th className="text-right py-2 font-medium">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matches.map(match => (
                        <tr key={match.id} className="border-b border-gray-800/50 hover:bg-gray-800/40">
                          <td className="py-2 pr-3 text-gray-300 whitespace-nowrap">
                            {formatDate(match.created_at)}
                          </td>
                          <td className="py-2 pr-3 text-gray-200">
                            {match.request?.person?.full_name || 'Unknown'}
                          </td>
                          <td className="py-2 pr-3">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              getStatusStyle(match.status).bg
                            } ${getStatusStyle(match.status).text}`}>
                              {match.status}
                            </span>
                          </td>
                          <td className="py-2 text-right text-gray-300 font-medium">
                            {match.score ?? '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ---- 4. Notes Timeline ---- */}
            <div className="px-5 py-4 border-b border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Notes</h3>
                {!addingNote && (
                  <button
                    onClick={() => setAddingNote(true)}
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Note
                  </button>
                )}
              </div>

              {localNotes.length === 0 && !addingNote ? (
                <p className="text-sm text-gray-500 italic">No notes yet</p>
              ) : (
                <div className="space-y-3">
                  {localNotes.map((note, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5" />
                        {idx < localNotes.length - 1 && (
                          <div className="w-px flex-1 bg-gray-700 mt-1" />
                        )}
                      </div>
                      <div className="pb-2 min-w-0">
                        <p className="text-sm text-gray-200 break-words">{note.text}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="h-3 w-3 text-gray-600" />
                          <span className="text-[10px] text-gray-500">
                            {formatDateTime(note.added_at)}
                          </span>
                          <span className="text-[10px] text-gray-600">
                            by {note.added_by}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Inline add note */}
              {addingNote && (
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                    placeholder="Type a note..."
                    className="flex-1 rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={handleAddNote}
                    disabled={noteSaving || !noteText.trim()}
                    className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {noteSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => { setAddingNote(false); setNoteText(''); }}
                    className="text-xs text-gray-400 hover:text-gray-200 px-2"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* ---- 5. Status Actions ---- */}
            <div className="px-5 py-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Change Status</h3>

              {confirmStatus ? (
                <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
                  <p className="text-sm text-gray-200 mb-3">
                    Change status to <span className="font-semibold capitalize">{confirmStatus.replace(/_/g, ' ')}</span>?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStatusChange(confirmStatus)}
                      disabled={statusUpdating}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
                    >
                      {statusUpdating ? 'Updating...' : 'Confirm'}
                    </button>
                    <button
                      onClick={() => setConfirmStatus(null)}
                      disabled={statusUpdating}
                      className="text-xs text-gray-400 hover:text-gray-200 px-3"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {STATUS_ACTIONS.map(s => {
                    const isCurrent = resource.status === s;
                    const style = getStatusStyle(s);
                    return (
                      <button
                        key={s}
                        onClick={() => !isCurrent && setConfirmStatus(s)}
                        disabled={isCurrent}
                        className={`px-4 py-2 rounded-lg text-xs font-semibold capitalize border transition-colors ${
                          isCurrent
                            ? `${style.bg} ${style.text} border-transparent cursor-default ring-2 ring-offset-1 ring-offset-gray-900 ring-gray-500`
                            : 'bg-gray-800 text-gray-400 border-gray-600 hover:text-gray-200 hover:border-gray-500'
                        }`}
                      >
                        {s.replace(/_/g, ' ')}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
