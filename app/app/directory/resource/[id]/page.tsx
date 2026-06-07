"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CrmShell } from "@/components/crm-shell";
import { AiSummary } from "@/components/crm/AiSummary";
import {
  DetailTopBar, IdentityBand, MetaChip,
  DetailTabs, EmptyTab, type DetailTab,
  StatusPill, MetaPopover, OverflowMenu, HeroLine, HeroPanel, ActionBtn,
} from "@/components/crm/DetailShell";
import { api } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import { ChatPanel } from "@/components/chat/chat-panel";
import { toast } from "sonner";
import { User, MapPin, Package, Calendar, GitBranch, ArrowRight, Sparkles, MessageSquare, Share2, Flag, XCircle, Pencil, Check, X as XIcon } from "lucide-react";

// Types matching the crmResourceDetail EF response
interface HistEntry { event: string; date: string; }
interface MatchedTo { personName: string; caseId: string; }
interface AssetEvent { id: string; resourceId: string; eventType: string; fromStatus?: string; toStatus?: string; fromLocation?: string; toLocation?: string; notes?: string; performedBy: string; timestamp: string; }
interface ResourceData {
  id: string; title?: string; description?: string; taxonomy_code?: string; status: string;
  location_text?: string; city?: string; state?: string; county?: string;
  capacity_available?: number; capacity_total?: number;
  lat?: number; lng?: number; latitude?: number; longitude?: number;
  org_id?: string; person_id?: string;
  persons?: { display_name: string; phone?: string } | null;
  locations?: { street_address?: string; city?: string; state?: string } | null;
  [key: string]: unknown;
}

export default function ResourcePage() {
  const { id } = useParams<{ id: string }>();
  const { orgId } = useAuthContext();
  const [data, setData] = useState<{ resource: ResourceData; matches: any[] } | null | undefined>(undefined);
  const [chatOpen, setChatOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editCapacity, setEditCapacity] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editCategory, setEditCategory] = useState('');

  useEffect(() => {
    api.crmResourceDetail(id, orgId)
      .then((res: any) => setData(res?.resource ? res : null))
      .catch(() => setData(null));
  }, [id, orgId]);

  useEffect(() => {
    if (data?.resource) {
      setEditCapacity(String(data.resource.capacity_available ?? ''));
      setEditStatus(data.resource.status ?? '');
      setEditCategory(data.resource.taxonomy_code ?? '');
    }
  }, [data]);

  async function saveResource() {
    setSaving(true);
    try {
      await api.efCall('inventory-write', {
        action: 'adjust',
        resource_id: id,
        org_id: orgId,
        ...(editCapacity !== '' ? { quantity: Number(editCapacity) } : {}),
        status: editStatus,
        taxonomy_code: editCategory,
      });
      toast.success('Resource updated');
      setEditMode(false);
      const res: any = await api.crmResourceDetail(id, orgId);
      if (res?.resource) setData(res);
    } catch {
      toast.error('Failed to update resource');
    } finally {
      setSaving(false);
    }
  }

  if (data === undefined) {
    return (
      <CrmShell module="Directory">
        <DetailTopBar backTo="/app/inventory" backLabel="Resources" />
        <main className="max-w-[960px] mx-auto px-4 md:px-6 py-5 md:py-7 space-y-4 animate-pulse">
          <div className="h-20 rounded-xl bg-white/5" />
          <div className="h-16 rounded-xl bg-white/5" />
          <div className="h-48 rounded-xl bg-white/5" />
        </main>
      </CrmShell>
    );
  }

  if (!data || !data.resource) {
    return <CrmShell module="Directory"><DetailTopBar backTo="/app/inventory" backLabel="Resources" /><div className="p-10 text-center text-white/50">Resource not found</div></CrmShell>;
  }

  // Map API response to display-friendly shape
  const res = data.resource;
  const resLat = res.lat ?? res.latitude;
  const resLng = res.lng ?? res.longitude;
  const r = {
    id: res.id,
    title: res.title || res.description || res.taxonomy_code || 'Resource',
    taxonomy: res.taxonomy_code || 'Unknown',
    status: res.status,
    location: res.location_text || [res.city, res.state].filter(Boolean).join(', ') || res.locations?.city || 'Unknown',
    ownerName: res.persons?.display_name || 'Unknown',
    org: res.org_id || null,
    capacity: res.capacity_available != null ? `${res.capacity_available}${res.capacity_total ? `/${res.capacity_total}` : ''} units` : '—',
    capacityAvailable: res.capacity_available ?? null,
    capacityTotal: res.capacity_total ?? null,
    matchedTo: data.matches?.length > 0 ? { personName: data.matches[0].request_person_id || 'Matched', caseId: data.matches[0].id } as MatchedTo : null,
    history: [] as HistEntry[],
  };
  const events: AssetEvent[] = [];
  const matches: any[] = data.matches ?? [];
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const staticMapUrl = (resLat != null && resLng != null && mapboxToken)
    ? `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-l+EF4E4B(${resLng},${resLat})/${resLng},${resLat},13,0/400x200@2x?access_token=${mapboxToken}`
    : null;
  const statusColor =
    r.status === "deployed" ? "#34D399" : r.status === "matched" ? "#89CFF0" : "#F5EBD6";

  const tabs: DetailTab[] = [
    {
      key: "activity",
      label: "Activity",
      count: r.history.length + events.length + matches.length,
      content: (
        <div className="space-y-6">
          {r.history.length > 0 && (
            <ol className="relative ml-2 space-y-4 border-l border-[var(--hairline)] pl-6">
              {r.history.map((h: HistEntry, i: number) => (
                <li key={i} className="relative">
                  <span
                    className="absolute -left-[34px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-[var(--surface-1)]"
                    style={{ background: "rgba(137,207,240,0.18)" }}
                  >
                    <Package size={12} style={{ color: "#89CFF0" }} />
                  </span>
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-medium text-white/90">{h.event}</p>
                    <span className="text-[10.5px] text-white/40" title={h.date}>{h.date}</span>
                  </div>
                </li>
              ))}
            </ol>
          )}
          {events.length > 0 && (
            <div>
              <p className="text-[11.5px] text-white/45 mb-2">Asset events</p>
              <ol className="relative ml-2 space-y-3 border-l border-[var(--hairline)] pl-5">
                {events.map((e) => {
                  const color =
                    e.eventType === "status_change" ? "#89CFF0" :
                    e.eventType === "location_move" ? "#34D399" :
                    e.eventType === "condition_update" ? "#F5EBD6" :
                    e.eventType === "assignment" ? "#EF4E4B" : "white";
                  return (
                    <li key={e.id} className="relative">
                      <span className="absolute -left-[28px] top-0.5 w-4 h-4 rounded-full ring-4 ring-[var(--surface-1)]" style={{ background: `${color}33` }}>
                        <span className="absolute inset-1 rounded-full" style={{ background: color }} />
                      </span>
                      <p className="text-[12.5px] text-white/85 flex items-center gap-1.5 flex-wrap">
                        {e.fromStatus && e.toStatus && (<><span>{e.fromStatus}</span><ArrowRight size={10} className="text-white/35" /><span>{e.toStatus}</span></>)}
                        {e.fromLocation && e.toLocation && (<><span>{e.fromLocation}</span><ArrowRight size={10} className="text-white/35" /><span>{e.toLocation}</span></>)}
                        {!e.fromStatus && !e.fromLocation && e.notes}
                      </p>
                      <p className="text-[10.5px] text-white/40 mt-0.5">{e.performedBy} · {e.timestamp}</p>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
          {matches.length > 0 && (
            <div>
              <p className="text-[11.5px] text-white/45 mb-2">Recent matches</p>
              <ol className="relative ml-2 space-y-3 border-l border-[var(--hairline)] pl-5">
                {matches.map((m: any) => {
                  const matchStatus: string = m.status ?? 'matched';
                  const dotColor = matchStatus === 'committed' ? '#34D399' : matchStatus === 'declined' ? '#EF4E4B' : '#89CFF0';
                  const personName: string = m.request_person_id || m.person_name || 'Unknown';
                  const matchDate: string = m.created_at ? new Date(m.created_at).toLocaleDateString() : '';
                  return (
                    <li key={m.id} className="relative">
                      <span className="absolute -left-[28px] top-0.5 w-4 h-4 rounded-full ring-4 ring-[var(--surface-1)]" style={{ background: `${dotColor}33` }}>
                        <span className="absolute inset-1 rounded-full" style={{ background: dotColor }} />
                      </span>
                      <div className="flex items-center justify-between gap-2">
                        <Link href={`/app/cases/${m.id}`} className="text-[12.5px] text-[#89CFF0] hover:underline inline-flex items-center gap-1.5">
                          <GitBranch size={11} />
                          {personName}
                        </Link>
                        <span className="text-xs px-1.5 py-0.5 rounded-full border capitalize" style={{ borderColor: `${dotColor}44`, color: dotColor, background: `${dotColor}11` }}>
                          {matchStatus}
                        </span>
                      </div>
                      {matchDate && <p className="text-[10.5px] text-white/40 mt-0.5">{matchDate}</p>}
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
          {r.history.length === 0 && events.length === 0 && matches.length === 0 && (
            <p className="text-[13px] text-white/40 text-center py-4">No activity recorded.</p>
          )}
        </div>
      ),
    },
    {
      key: "matches",
      label: "Matches",
      count: r.matchedTo ? 1 : 0,
      content: r.matchedTo ? (
        <div className="rounded-xl border border-[#89CFF0]/30 bg-[#89CFF0]/8 p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles size={12} className="text-[#89CFF0]" />
            <p className="text-[11.5px] text-white/55">Currently matched to</p>
          </div>
          <Link href={`/app/cases/${(r as any).matchedTo?.caseId ?? "#"}`} className="text-[14px] font-medium text-[#89CFF0] hover:underline inline-flex items-center gap-2">
            <GitBranch size={13} /> {r.matchedTo.personName}
            <span className="font-mono text-[10.5px] text-white/45">{r.matchedTo.caseId}</span>
          </Link>
        </div>
      ) : (
        <EmptyTab label="No active matches. Available for deployment." />
      ),
    },
    {
      key: "files",
      label: "Files",
      content: <EmptyTab label="No files or reports attached." />,
    },
  ];

  const tldr = `${r.status} · ${r.taxonomy}${r.matchedTo ? ` · matched to ${r.matchedTo.personName}` : ""}.`;

  return (
    <CrmShell module="Cases">
      <DetailTopBar backTo="/app/inventory" backLabel="Resources" />

      <main className="max-w-[960px] mx-auto px-4 md:px-6 py-5 md:py-7 space-y-4">
        <IdentityBand
          avatar={
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: `${statusColor}22`, color: statusColor }}
            >
              <Package size={22} />
            </div>
          }
          pills={<StatusPill tint={statusColor}>{r.status}</StatusPill>}
          title={r.title}
          chips={
            <>
              <MetaChip icon={MapPin}>{r.location}</MetaChip>
              <MetaPopover>
                <MetaChip icon={User}>
                  <Link href={`/app/directory/person/${(r as any).ownerId ?? "#"}`} className="hover:text-white transition">
                    {r.ownerName}
                  </Link>
                  {r.org && <span className="text-white/40"> · {r.org}</span>}
                </MetaChip>
                <MetaChip icon={Calendar}>{r.capacity}</MetaChip>
                <span className="font-mono text-xs text-white/40">{r.id}</span>
                <span className="font-mono text-xs text-white/40">{r.taxonomy}</span>
              </MetaPopover>
            </>
          }
          actions={
            <>
              <ActionBtn icon={editMode ? XIcon : Pencil} label={editMode ? "Cancel" : "Edit"} onClick={() => setEditMode(v => !v)} />
              <ActionBtn icon={MessageSquare} label="Chat" onClick={() => setChatOpen(true)} />
              <OverflowMenu
                actions={[
                  { label: "Share", icon: Share2 },
                  { label: "Flag issue", icon: Flag, danger: true },
                  { label: "Retire resource", icon: XCircle, danger: true },
                ]}
              />
            </>
          }
        />

        {editMode && (
          <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
            <p className="text-[11px] uppercase tracking-widest text-white/45 font-mono mb-1">Edit Resource</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-white/50">Capacity Available</label>
                <input
                  type="number"
                  value={editCapacity}
                  onChange={e => setEditCapacity(e.target.value)}
                  className="bg-white/8 border border-white/15 rounded-lg px-3 py-2 text-[13px] text-white placeholder-white/30 outline-none focus:border-[#89CFF0]/60"
                  placeholder="0"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-white/50">Status</label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value)}
                  className="bg-white/8 border border-white/15 rounded-lg px-3 py-2 text-[13px] text-white outline-none focus:border-[#89CFF0]/60"
                >
                  {['available','reserved','fulfilled','unavailable'].map(s => (
                    <option key={s} value={s} className="bg-[#0F1E2B]">{s}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-white/50">Category</label>
                <input
                  type="text"
                  value={editCategory}
                  onChange={e => setEditCategory(e.target.value)}
                  className="bg-white/8 border border-white/15 rounded-lg px-3 py-2 text-[13px] text-white placeholder-white/30 outline-none focus:border-[#89CFF0]/60"
                  placeholder="taxonomy code"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setEditMode(false)}
                className="px-3 py-1.5 rounded-lg text-[12px] text-white/60 border border-white/10 hover:bg-white/5 transition"
              >
                Cancel
              </button>
              <button
                onClick={saveResource}
                disabled={saving}
                className="px-4 py-1.5 rounded-lg text-[12px] font-medium bg-[#EF4E4B] text-white hover:bg-[#d94441] transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <Check size={12} /> {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}

        <HeroLine
          primary={
            <>
              <span className="font-semibold">{r.capacity}</span>
              <span className="text-white/55"> capacity · </span>
              {r.matchedTo ? (
                <>matched to <span className="font-semibold">{r.matchedTo.personName}</span></>
              ) : (
                <span className="text-white/85">available for deployment</span>
              )}
            </>
          }
          meta={`${r.history.length} events`}
        />

        <AiSummary
          id={r.id}
          tldr={tldr}
          summary={`${r.title} owned by ${r.ownerName}${r.org ? ` (${r.org})` : ""}, currently ${r.status}${r.matchedTo ? ` and matched to ${r.matchedTo.personName} on ${r.matchedTo.caseId}` : ""}. Staged at ${r.location}. Capacity: ${r.capacity}. ${r.history.length} events in deployment history.`}
        />

        {r.capacityTotal != null && r.capacityAvailable != null && r.capacityTotal !== 0 && (
          <HeroPanel>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-widest text-white/45 font-mono">Capacity</span>
              <span className="text-[12px] font-medium text-white/80">
                {r.capacityAvailable} <span className="text-white/40">/ {r.capacityTotal}</span>
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (r.capacityAvailable / r.capacityTotal) * 100)}%`,
                  background: r.capacityAvailable / r.capacityTotal > 0.5 ? '#34D399' : r.capacityAvailable / r.capacityTotal > 0.2 ? '#F5C842' : '#EF4E4B',
                }}
              />
            </div>
            <p className="text-[10.5px] text-white/35 mt-1.5">
              {Math.round((r.capacityAvailable / r.capacityTotal) * 100)}% available
            </p>
          </HeroPanel>
        )}

        {staticMapUrl && (
          <HeroPanel padded={false}>
            <div className="relative overflow-hidden rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={staticMapUrl}
                alt={`Map showing location of ${r.title}`}
                className="w-full object-cover"
                style={{ height: 180 }}
              />
              <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1">
                <MapPin size={10} className="text-[#EF4E4B]" />
                <span className="text-xs text-white/80">{r.location}</span>
              </div>
            </div>
          </HeroPanel>
        )}

        <DetailTabs tabs={tabs} defaultKey="activity" />
      </main>
      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} entityType="resource" entityId={id} orgId={orgId} />
    </CrmShell>
  );
}
