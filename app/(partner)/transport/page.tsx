'use client';

export const dynamic = 'force-dynamic';

import Link from "next/link";
import { CrmShell } from "@/components/crm-shell";
import { PageHeader } from "@/components/crm/manage-tabs";
import { TRANSPORT_STATUS_LABEL, type TransportStatus } from "@/lib/display-constants";
import { transportAssignments as protoAssignments, convoys, orgs, orgTransportConfig, type TransportAssignment } from "@/lib/prototype-data";
import { Truck, Plus, MapPin, Clock, AlertTriangle, ChevronDown, ChevronRight, Camera, ArrowRight, Map as MapIcon, List, ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState, Fragment } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";

const STATUS_COLOR: Record<TransportStatus, string> = {
  assigned: "#F5EBD6",
  accepted: "#F5EBD6",
  en_route_pickup: "#89CFF0",
  at_pickup: "#89CFF0",
  hooked_up: "#89CFF0",
  loaded: "#89CFF0",
  in_transit: "#89CFF0",
  at_staging: "#89CFF0",
  delivered: "#34D399",
  verified: "#34D399",
  completed: "#34D399",
};

function mapApiToAssignment(raw: Record<string, unknown>): TransportAssignment {
  const proto = protoAssignments[0];
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
    priority: (raw.priority as TransportAssignment["priority"]) ?? "normal",
    convoyId: raw.convoy_id != null ? String(raw.convoy_id) : null,
    convoyPosition: raw.convoy_position != null ? Number(raw.convoy_position) : null,
    statusHistory: [],
    issues: [],
    photos: [],
  };
}

export default function TransportPage() {
  const { orgId } = useAuthContext();
  const [assignments, setAssignments] = useState<TransportAssignment[]>(protoAssignments);
  const [view, setView] = useState<"list" | "map">("list");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      try {
        const res = await api.transportList(orgId) as { data?: unknown[] } | unknown[];
        const rows = Array.isArray(res) ? res : (res as { data?: unknown[] }).data ?? [];
        if (rows.length > 0) {
          setAssignments(rows.map(r => mapApiToAssignment(r as Record<string, unknown>)));
        }
      } catch {
        // fallback to prototype data — already set
      }
    })();
  }, [orgId]);

  const kpis = useMemo(() => {
    const active = assignments.filter(t => t.status !== "completed" && t.status !== "verified").length;
    const inTransit = assignments.filter(t => t.status === "in_transit").length;
    const delivered = assignments.filter(t => t.status === "delivered" || t.status === "verified").length;
    return { active, inTransit, delivered, avg: "1d 8h" };
  }, [assignments]);

  return (
    <CrmShell module="Transport">
      <PageHeader
        title="Transport"
        subtitle={`${assignments.length} assignments · ${convoys.length} convoy${convoys.length === 1 ? "" : "s"} active`}
        actions={
          <>
            <div className="flex items-center gap-0.5 rounded-lg bg-white/6 p-0.5">
              <button onClick={() => setView("list")} className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11.5px] font-medium transition ${view === "list" ? "bg-white/12 text-white" : "text-white/55 hover:text-white"}`}>
                <List size={11} /> List
              </button>
              <button onClick={() => setView("map")} className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11.5px] font-medium transition ${view === "map" ? "bg-white/12 text-white" : "text-white/55 hover:text-white"}`}>
                <MapIcon size={11} /> Map
              </button>
            </div>
            <button onClick={() => setSheetOpen(true)} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#EF4E4B] hover:bg-[#d94340] text-[12px] font-medium transition">
              <Plus size={12} /> New assignment
            </button>
          </>
        }
      />
      <div className="px-4 pt-4 pb-4 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="Active" value={kpis.active} accent="#89CFF0" />
          <Kpi label="In transit" value={kpis.inTransit} accent="#89CFF0" />
          <Kpi label="Delivered today" value={kpis.delivered} accent="#34D399" />
          <Kpi label="Avg delivery time" value={kpis.avg} accent="#F5EBD6" />
        </div>

        {view === "list" ? (
          <>
            <section>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/45 mb-3">Active transports</p>
              <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] overflow-hidden">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-left font-mono text-[10px] uppercase tracking-wider text-white/45 border-b border-[var(--hairline)]">
                      <th className="px-4 py-3 font-normal">Status</th>
                      <th className="px-4 py-3 font-normal">Driver</th>
                      <th className="px-4 py-3 font-normal">Resource</th>
                      <th className="px-4 py-3 font-normal">Route</th>
                      <th className="px-4 py-3 font-normal">ETA</th>
                      <th className="px-4 py-3 font-normal">Priority</th>
                      <th className="px-4 py-3 font-normal">Convoy</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((t) => {
                      const isOpen = expanded === t.id;
                      return (
                        <Fragment key={t.id}>
                          <tr
                            onClick={() => setExpanded(isOpen ? null : t.id)}
                            className="border-t border-white/5 hover:bg-white/4 transition cursor-pointer"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_COLOR[t.status] }} />
                                <span className="text-[12px] text-white/85">{TRANSPORT_STATUS_LABEL[t.status]}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-medium">{t.driverName}</td>
                            <td className="px-4 py-3 text-white/65 text-[12px]">{t.resourceSummary.split(" — ")[0]}</td>
                            <td className="px-4 py-3 text-white/65 text-[12px]">
                              <span className="inline-flex items-center gap-1.5">
                                {t.origin} <ArrowRight size={10} className="text-white/35" /> {t.destination}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-[11px] text-white/65">{t.estimatedArrival ?? "—"}</td>
                            <td className="px-4 py-3">
                              <PriorityPill p={t.priority} />
                            </td>
                            <td className="px-4 py-3 font-mono text-[10.5px] text-white/55">
                              {t.convoyId ? `${t.convoyId} · #${t.convoyPosition}` : "—"}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <ChevronDown size={14} className={`text-white/40 inline transition-transform ${isOpen ? "rotate-180" : ""}`} />
                            </td>
                          </tr>
                          {isOpen && (
                            <tr className="border-t border-white/5 bg-white/[0.02]">
                              <td colSpan={8} className="px-4 py-4">
                                <ExpandedRow t={t} />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/45 mb-3">Convoys</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {convoys.map((c) => {
                  const items = c.assignmentIds.map(id => assignments.find(t => t.id === id)!).filter(Boolean);
                  const done = items.filter(i => i.status === "delivered" || i.status === "verified").length;
                  const pct = (done / items.length) * 100;
                  const org = orgs.find(o => o.id === c.org);
                  return (
                    <div key={c.id} className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-[14px]">{c.name}</p>
                          <p className="font-mono text-[10px] text-white/45 mt-0.5">{c.id} · <span style={{ color: org?.color }}>{org?.name}</span></p>
                        </div>
                        <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#89CFF0]/15 text-[#89CFF0]">{c.status.replace(/_/g, " ")}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/8 overflow-hidden mb-3">
                        <div className="h-full bg-[#34D399]" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="space-y-1.5">
                        {items.map((t) => (
                          <div key={t.id} className="flex items-center gap-2 text-[12px]">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: STATUS_COLOR[t.status] }} />
                            <span className="font-mono text-[10.5px] text-white/45 w-14 shrink-0">#{t.convoyPosition}</span>
                            <span className="text-white/85 flex-1 truncate">{t.driverName}</span>
                            <span className="text-white/55 text-[11px]">{TRANSPORT_STATUS_LABEL[t.status]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        ) : (
          <MapView assignments={assignments} />
        )}
      </div>

      {sheetOpen && (
        <NewAssignmentSheet
          orgId={orgId ?? ""}
          onClose={() => setSheetOpen(false)}
          onCreated={(t) => setAssignments(prev => [t, ...prev])}
        />
      )}
    </CrmShell>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-4">
      <p className="font-mono text-[9.5px] uppercase tracking-wider text-white/45">{label}</p>
      <p className="text-[26px] font-semibold tabular-nums mt-1" style={{ color: accent }}>{value}</p>
    </div>
  );
}

function PriorityPill({ p }: { p: "normal" | "urgent" | "critical" }) {
  const c = p === "critical" ? "#EF4E4B" : p === "urgent" ? "#F5EBD6" : "#89CFF0";
  return <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ color: c, background: `${c}1A` }}>{p}</span>;
}

function ExpandedRow({ t }: { t: TransportAssignment }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2">
        <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-2">Status history</p>
        <ol className="relative ml-2 space-y-2.5 border-l border-[var(--hairline)] pl-5">
          {t.statusHistory.map((h, i) => (
            <li key={i} className="relative">
              <span className="absolute -left-[28px] top-1 w-4 h-4 rounded-full bg-[#34D399]/25 ring-4 ring-[var(--surface-1)] flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
              </span>
              <div className="flex items-center justify-between">
                <p className="text-[12.5px] text-white/85">{TRANSPORT_STATUS_LABEL[h.status]}{h.photo && <Camera size={10} className="inline ml-1.5 text-[#89CFF0]" />}</p>
                <span className="font-mono text-[10px] text-white/40">{h.timestamp}</span>
              </div>
              {h.note && <p className="text-[11.5px] text-white/55 mt-0.5">{h.note}</p>}
            </li>
          ))}
        </ol>
        {t.issues.length > 0 && (
          <div className="mt-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-2">Issues</p>
            {t.issues.map((iss, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg bg-[#EF4E4B]/8 border border-[#EF4E4B]/25 px-3 py-2">
                <AlertTriangle size={13} className="text-[#EF4E4B] mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-[#EF4E4B] capitalize">{iss.type.replace(/_/g, " ")}</p>
                  <p className="text-[11.5px] text-white/65">{iss.description}</p>
                  <p className="font-mono text-[9.5px] text-white/40 mt-0.5">{iss.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-1.5">Photos · {t.photos.length}</p>
          {t.photos.length === 0 ? (
            <p className="text-[12px] text-white/45">No photos yet.</p>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {t.photos.map((p, i) => (
                <div key={i} className="aspect-square rounded-md bg-white/6 flex items-center justify-center">
                  <Camera size={16} className="text-white/35" />
                </div>
              ))}
            </div>
          )}
        </div>
        <Link
          href={`/drive/${t.id}`}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#89CFF0]/15 hover:bg-[#89CFF0]/25 text-[#89CFF0] text-[12px] font-medium transition"
        >
          <ExternalLink size={11} /> View driver page
        </Link>
      </div>
    </div>
  );
}

function MapView({ assignments }: { assignments: TransportAssignment[] }) {
  return (
    <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] aspect-[16/9] relative overflow-hidden">
      <svg viewBox="0 0 800 450" className="w-full h-full">
        <rect width="800" height="450" fill="rgba(255,255,255,0.02)" />
        {assignments.map((t, i) => {
          const x1 = 100 + (t.originLng + 85) * 8;
          const y1 = 350 - (t.originLat - 28) * 30;
          const x2 = 100 + (t.destinationLng + 85) * 8;
          const y2 = 350 - (t.destinationLat - 28) * 30;
          const color = STATUS_COLOR[t.status];
          return (
            <g key={t.id}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={1.5} strokeDasharray={t.status === "delivered" ? "0" : "4 3"} opacity={0.6} />
              <circle cx={x1} cy={y1} r={5} fill={color} />
              <circle cx={x2} cy={y2} r={5} fill={color} opacity={0.4} />
              {t.status === "in_transit" && t.currentLat && t.currentLng && (
                <circle cx={100 + (t.currentLng + 85) * 8} cy={350 - (t.currentLat - 28) * 30} r={6} fill="#89CFF0">
                  <animate attributeName="r" values="6;10;6" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              <text x={x2 + 8} y={y2 + 4} fill="white" fontSize="10" fontFamily="monospace" opacity={0.7}>{t.id}</text>
            </g>
          );
        })}
      </svg>
      <p className="absolute bottom-3 left-3 font-mono text-[10px] text-white/45">Live transport map · {assignments.filter(t => t.status === "in_transit").length} active routes</p>
    </div>
  );
}

function NewAssignmentSheet({ orgId, onClose, onCreated }: { orgId: string; onClose: () => void; onCreated: (t: TransportAssignment) => void }) {
  const [resourceId, setResourceId] = useState("RES-RV-415");
  const [driverPersonId, setDriverPersonId] = useState("driver-marcus-lee");
  const [origin, setOrigin] = useState("Ocala, FL");
  const [destination, setDestination] = useState("");
  const [priority, setPriority] = useState<"normal" | "urgent" | "critical">("normal");
  const [convoyId, setConvoyId] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setLoading(true);
    try {
      const res = await api.transportCreate({
        org_id: orgId,
        resource_id: resourceId,
        driver_person_id: driverPersonId,
        origin,
        destination,
        priority,
        ...(convoyId ? { convoy_id: convoyId } : {}),
      }) as Record<string, unknown>;
      const proto = protoAssignments[0];
      const created: TransportAssignment = {
        ...proto,
        id: String(res.id ?? res.transport_id ?? `tmp-${Date.now()}`),
        status: "assigned",
        driverName: driverPersonId,
        resourceSummary: resourceId,
        origin,
        destination,
        priority,
        convoyId: convoyId || null,
        convoyPosition: null,
        estimatedArrival: null,
        currentLat: null,
        currentLng: null,
        statusHistory: [],
        issues: [],
        photos: [],
      };
      onCreated(created);
      toast.success("Transport assignment created");
      onClose();
    } catch (err) {
      toast.error("Failed to create assignment");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <aside className="relative ml-auto w-full max-w-md h-full bg-[var(--surface-1)] border-l border-[var(--hairline)] p-6 overflow-y-auto">
        <h2 className="text-[18px] font-semibold mb-1">New transport assignment</h2>
        <p className="text-[12px] text-white/55 mb-5">Assign a driver to move a resource.</p>
        <div className="space-y-4">
          <Field label="Resource">
            <select value={resourceId} onChange={e => setResourceId(e.target.value)} className="w-full h-9 rounded-md bg-white/6 border border-white/10 px-2.5 text-[12.5px]">
              <option value="RES-RV-415">RES-RV-415 — 2018 Coachmen 24ft</option>
            </select>
          </Field>
          <Field label="Driver (CDL holders)">
            <select value={driverPersonId} onChange={e => setDriverPersonId(e.target.value)} className="w-full h-9 rounded-md bg-white/6 border border-white/10 px-2.5 text-[12.5px]">
              <option value="driver-marcus-lee">Marcus Lee — CDL Class A · 5th wheel</option>
              <option value="driver-tina-park">Tina Park — CDL Class B · bumper pull</option>
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Origin"><input value={origin} onChange={e => setOrigin(e.target.value)} className="w-full h-9 rounded-md bg-white/6 border border-white/10 px-2.5 text-[12.5px]" /></Field>
            <Field label="Destination"><input value={destination} onChange={e => setDestination(e.target.value)} className="w-full h-9 rounded-md bg-white/6 border border-white/10 px-2.5 text-[12.5px]" placeholder="Buncombe County, NC" /></Field>
          </div>
          <Field label="Priority">
            <div className="flex gap-1.5">
              {(["normal", "urgent", "critical"] as const).map(p => (
                <button key={p} onClick={() => setPriority(p)} className={`px-2.5 h-7 rounded-md text-[11px] capitalize transition ${priority === p ? "bg-white/20 text-white" : "bg-white/6 hover:bg-white/12"}`}>{p}</button>
              ))}
            </div>
          </Field>
          <Field label="Convoy (optional)">
            <select value={convoyId} onChange={e => setConvoyId(e.target.value)} className="w-full h-9 rounded-md bg-white/6 border border-white/10 px-2.5 text-[12.5px]">
              <option value="">— None —</option>
              <option value="GA-2026-05">GA-2026-05 — Georgia Convoy</option>
            </select>
          </Field>
        </div>
        <div className="flex gap-2 mt-6">
          <button onClick={handleCreate} disabled={loading} className="flex-1 h-9 rounded-lg bg-[#EF4E4B] hover:bg-[#d94340] disabled:opacity-50 text-[12.5px] font-medium transition">
            {loading ? "Creating…" : "Create"}
          </button>
          <button onClick={onClose} className="px-4 h-9 rounded-lg bg-white/6 text-[12.5px] font-medium hover:bg-white/12 transition">Cancel</button>
        </div>
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-1.5">{label}</p>
      {children}
    </div>
  );
}
