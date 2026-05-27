'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo, Fragment } from "react";
import Link from "next/link";
import { CrmShell } from "@/components/crm-shell";
import { PageHeader } from "@/components/crm/manage-tabs";
import { api } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import { TRANSPORT_STATUS_LABEL, transportStatusColor, type TransportStatus } from "@/lib/display-constants";
import {
  Truck, Plus, Clock, AlertTriangle, ChevronDown, Camera,
  ArrowRight, Map as MapIcon, List, ExternalLink, X,
} from "lucide-react";
import { toast } from "sonner";

type Assignment = {
  id: string;
  org: string;
  resourceId: string;
  status: TransportStatus;
  origin: string;
  destination: string;
  driverName: string;
  driverPhone?: string;
  estimatedArrival?: string;
  statusHistory?: { status: string; timestamp: string; photo?: boolean; note?: string }[];
  issues?: { type: string; description: string; timestamp: string }[];
  photos?: string[];
  priority?: "normal" | "urgent" | "critical";
  resourceSummary?: string;
  convoy_id?: string;
  convoyPosition?: number;
  originLat?: number; originLng?: number;
  destinationLat?: number; destinationLng?: number;
  currentLat?: number; currentLng?: number;
};

const NEW_FORM_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "dispatched", label: "Dispatched" },
  { value: "in_transit", label: "In Transit" },
  { value: "delivered", label: "Delivered" },
  { value: "completed", label: "Completed" },
];

const ALL_STATUSES = Object.entries(TRANSPORT_STATUS_LABEL).map(([value, label]) => ({ value, label }));

function extractList(res: unknown): Assignment[] {
  if (!res || typeof res !== 'object') return [];
  const d = res as Record<string, unknown>;
  const arr = d.assignments ?? d.data ?? d.transports ?? (Array.isArray(res) ? res : []);
  return Array.isArray(arr) ? arr : [];
}

const emptyForm = { driverName: "", origin: "", destination: "", status: "pending" };

export default function TransportPage() {
  const { orgId } = useAuthContext();
  const [view, setView] = useState<"list" | "map">("list");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [issueFormId, setIssueFormId] = useState<string | null>(null);
  const [issueType, setIssueType] = useState('other');
  const [issueText, setIssueText] = useState('');
  const [issueSubmitting, setIssueSubmitting] = useState(false);

  function refresh() {
    if (!orgId) return;
    api.transportList(orgId)
      .then((res: unknown) => setAssignments(extractList(res)))
      .catch(() => toast.error("Failed to load assignments"));
  }

  useEffect(() => {
    if (!orgId) return;
    api.transportList(orgId)
      .then((res: unknown) => setAssignments(extractList(res)))
      .catch(() => toast.error("Failed to load assignments"))
      .finally(() => setLoading(false));
  }, [orgId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.driverName.trim() || !form.origin.trim() || !form.destination.trim()) {
      toast.error("All fields are required");
      return;
    }
    setSubmitting(true);
    try {
      await api.transportCreate({
        driver_name: form.driverName.trim(),
        origin: form.origin.trim(),
        destination: form.destination.trim(),
        status: form.status,
        org_id: orgId,
      });
      toast.success("Assignment created");
      setForm(emptyForm);
      setShowNewForm(false);
      refresh();
    } catch {
      toast.error("Failed to create assignment");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(assignmentId: string, newStatus: string) {
    try {
      await api.transportUpdateStatus(assignmentId, newStatus);
      toast.success("Status updated");
      setAssignments(prev =>
        prev.map(a => a.id === assignmentId ? { ...a, status: newStatus as TransportStatus } : a)
      );
    } catch {
      toast.error("Failed to update status");
    }
  }

  function handleReportIssue(assignmentId: string) {
    setIssueFormId(assignmentId);
    setIssueType('other');
    setIssueText('');
  }

  const kpis = useMemo(() => {
    if (loading) return { active: "—", inTransit: "—", delivered: "—" };
    const active = assignments.filter(t => t.status !== "completed" && t.status !== "verified").length;
    const inTransit = assignments.filter(t => t.status === "in_transit").length;
    const delivered = assignments.filter(t => t.status === "delivered" || t.status === "verified").length;
    return { active, inTransit, delivered };
  }, [assignments, loading]);

  return (
    <CrmShell module="Transport">
      <PageHeader
        title="Transport"
        subtitle="Loads, drivers, and convoys."
        actions={
          <>
            <div className="flex items-center gap-0.5 rounded-lg bg-white/6 p-0.5">
              <button onClick={() => setView("list")} className={`inline-flex items-center gap-1.5 h-10 px-2.5 rounded-md text-[11.5px] font-medium transition ${view === "list" ? "bg-white/12 text-white" : "text-white/55 hover:text-white"}`}>
                <List size={11} /> List
              </button>
              <button onClick={() => setView("map")} className={`inline-flex items-center gap-1.5 h-10 px-2.5 rounded-md text-[11.5px] font-medium transition ${view === "map" ? "bg-white/12 text-white" : "text-white/55 hover:text-white"}`}>
                <MapIcon size={11} /> Map
              </button>
            </div>
            <button
              onClick={() => setShowNewForm(v => !v)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#EF4E4B] hover:bg-[#d94340] text-[12px] font-medium transition"
            >
              {showNewForm ? <X size={12} /> : <Plus size={12} />}
              {showNewForm ? "Cancel" : "New assignment"}
            </button>
          </>
        }
      />

      {/* Inline new assignment form */}
      {showNewForm && (
        <form onSubmit={handleCreate} className="mx-4 mt-3 mb-1 rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)] p-4 space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/45">New assignment</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-white/50 mb-1">Driver name</label>
              <input
                type="text"
                value={form.driverName}
                onChange={e => setForm(f => ({ ...f, driverName: e.target.value }))}
                placeholder="John Smith"
                className="w-full h-8 rounded-lg bg-white/8 border border-white/10 px-3 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/25"
              />
            </div>
            <div>
              <label className="block text-[11px] text-white/50 mb-1">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full h-8 rounded-lg bg-white/8 border border-white/10 px-3 text-[13px] text-white focus:outline-none focus:border-white/25"
              >
                {NEW_FORM_STATUSES.map(s => (
                  <option key={s.value} value={s.value} className="bg-[#0F1E2B]">{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-white/50 mb-1">Origin</label>
              <input
                type="text"
                autoComplete="street-address"
                value={form.origin}
                onChange={e => setForm(f => ({ ...f, origin: e.target.value }))}
                placeholder="Ocala, FL"
                className="w-full h-8 rounded-lg bg-white/8 border border-white/10 px-3 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/25"
              />
            </div>
            <div>
              <label className="block text-[11px] text-white/50 mb-1">Destination</label>
              <input
                type="text"
                autoComplete="street-address"
                value={form.destination}
                onChange={e => setForm(f => ({ ...f, destination: e.target.value }))}
                placeholder="Atlanta, GA"
                className="w-full h-8 rounded-lg bg-white/8 border border-white/10 px-3 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/25"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg bg-[#EF4E4B] hover:bg-[#d94340] disabled:opacity-50 text-[12px] font-medium transition"
            >
              {submitting ? "Creating…" : "Create assignment"}
            </button>
          </div>
        </form>
      )}

      <div className="px-4 pt-4 pb-4 space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="Active" value={kpis.active} accent="#89CFF0" />
          <Kpi label="In transit" value={kpis.inTransit} accent="#89CFF0" />
          <Kpi label="Delivered" value={kpis.delivered} accent="#34D399" />
          <Kpi label="Total" value={assignments.length} accent="#89CFF0" />
        </div>

        {loading ? (
          <div className="text-center py-12 text-white/45 text-[13px]">Loading transport data…</div>
        ) : assignments.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Truck size={28} className="text-white/30" />
            </div>
            <p className="text-[15px] text-white/70 font-medium">No transport assignments yet</p>
            <p className="text-[12px] text-white/45 mt-1">Create an assignment to start tracking deliveries.</p>
          </div>
        ) : view === "list" ? (
          <>
            <section>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/45 mb-3">
                Active transports <span className="text-white/65 tabular-nums ml-1">{assignments.length}</span>
              </p>

              {/* Mobile cards */}
              <div className="md:hidden space-y-2">
                {assignments.map((t) => {
                  const isOpen = expanded === t.id;
                  return (
                    <div key={t.id} className="rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)] overflow-hidden">
                      <button onClick={() => setExpanded(isOpen ? null : t.id)} className="w-full text-left px-3.5 py-3 active:bg-white/4 transition">
                        <div className="flex items-start justify-between gap-3 mb-1.5">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: transportStatusColor(t.status) }} />
                              <span className="text-[11.5px] text-white/75">{TRANSPORT_STATUS_LABEL[t.status] ?? t.status}</span>
                              {t.priority && <PriorityPill p={t.priority} />}
                            </div>
                            <p className="font-medium text-[14px] text-white truncate">{t.driverName}</p>
                            <p className="text-[12px] text-white/65 truncate mt-0.5">{t.resourceSummary ?? t.resourceId}</p>
                          </div>
                          <ChevronDown size={14} className={`text-white/40 shrink-0 mt-1 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                        </div>
                        <div className="flex items-center gap-1.5 text-[11.5px] text-white/65">
                          <span className="truncate">{t.origin}</span>
                          <ArrowRight size={10} className="text-white/35 shrink-0" />
                          <span className="truncate">{t.destination}</span>
                        </div>
                      </button>
                      {/* Row actions */}
                      <div className="border-t border-white/5 px-3.5 py-2 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <select
                          value={t.status}
                          onChange={e => handleStatusChange(t.id, e.target.value)}
                          className="flex-1 h-7 rounded-lg bg-white/8 border border-white/10 px-2 text-[12px] text-white focus:outline-none focus:border-white/25"
                        >
                          {ALL_STATUSES.map(s => (
                            <option key={s.value} value={s.value} className="bg-[#0F1E2B]">{s.label}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleReportIssue(t.id)}
                          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-[#EF4E4B]/12 hover:bg-[#EF4E4B]/22 text-[#EF4E4B] text-[11.5px] font-medium transition"
                        >
                          <AlertTriangle size={11} /> Report
                        </button>
                      </div>
                      {isOpen && (
                        <div className="border-t border-white/5 bg-white/[0.02] px-3.5 py-3">
                          <ExpandedRow t={t} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] overflow-hidden">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-left font-mono text-[10px] uppercase tracking-wider text-white/45 border-b border-[var(--hairline)]">
                      <th className="px-4 py-3 font-normal">Status</th>
                      <th className="px-4 py-3 font-normal">Driver</th>
                      <th className="px-4 py-3 font-normal">Resource</th>
                      <th className="px-4 py-3 font-normal">Route</th>
                      <th className="px-4 py-3 font-normal">ETA</th>
                      <th className="px-4 py-3 font-normal">Priority</th>
                      <th className="px-4 py-3 font-normal">Actions</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((t) => {
                      const isOpen = expanded === t.id;
                      return (
                        <Fragment key={t.id}>
                          <tr className="border-t border-white/5 hover:bg-white/4 transition">
                            <td className="px-4 py-3" onClick={() => setExpanded(isOpen ? null : t.id)}>
                              <select
                                value={t.status}
                                onChange={e => handleStatusChange(t.id, e.target.value)}
                                onClick={e => e.stopPropagation()}
                                className="h-7 rounded-lg bg-white/8 border border-white/10 px-2 text-[12px] text-white focus:outline-none focus:border-white/25 cursor-pointer"
                              >
                                {ALL_STATUSES.map(s => (
                                  <option key={s.value} value={s.value} className="bg-[#0F1E2B]">{s.label}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3 font-medium cursor-pointer" onClick={() => setExpanded(isOpen ? null : t.id)}>{t.driverName}</td>
                            <td className="px-4 py-3 text-white/65 text-[12px] cursor-pointer" onClick={() => setExpanded(isOpen ? null : t.id)}>{t.resourceSummary ?? t.resourceId}</td>
                            <td className="px-4 py-3 text-white/65 text-[12px] cursor-pointer" onClick={() => setExpanded(isOpen ? null : t.id)}>
                              <span className="inline-flex items-center gap-1.5">
                                {t.origin} <ArrowRight size={10} className="text-white/35" /> {t.destination}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-[11px] text-white/65 cursor-pointer" onClick={() => setExpanded(isOpen ? null : t.id)}>{t.estimatedArrival ?? "—"}</td>
                            <td className="px-4 py-3 cursor-pointer" onClick={() => setExpanded(isOpen ? null : t.id)}>{t.priority && <PriorityPill p={t.priority} />}</td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => handleReportIssue(t.id)}
                                title="Report issue"
                                className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-[#EF4E4B]/12 hover:bg-[#EF4E4B]/22 text-[#EF4E4B] text-[11.5px] font-medium transition"
                              >
                                <AlertTriangle size={11} /> Report issue
                              </button>
                            </td>
                            <td className="px-4 py-3 text-right cursor-pointer" onClick={() => setExpanded(isOpen ? null : t.id)}>
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
          </>
        ) : (
          <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] aspect-[16/9] relative overflow-hidden flex items-center justify-center">
            <div className="text-center">
              <MapIcon size={32} className="text-white/25 mx-auto mb-2" />
              <p className="text-[13px] text-white/50">Map view coming soon</p>
              <p className="text-[11px] text-white/35 mt-1">Live transport tracking with route visualization</p>
            </div>
          </div>
        )}
      </div>
      {/* Issue report bottom sheet */}
      {issueFormId && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/60"
          onClick={() => setIssueFormId(null)}
        >
          <div
            className="w-full bg-[var(--surface-1)] border-t border-[var(--hairline)] p-4 space-y-3"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-sm font-medium text-white">Report Issue</p>
            <div>
              <label className="block text-[11px] text-white/50 mb-1">Issue type</label>
              <select
                value={issueType}
                onChange={e => setIssueType(e.target.value)}
                className="w-full h-9 rounded-lg bg-white/8 border border-[var(--hairline)] px-3 text-[13px] text-white focus:outline-none focus:border-[#89CFF0]/40"
              >
                <option value="mechanical" className="bg-[#0F1E2B]">Mechanical</option>
                <option value="flat_tire" className="bg-[#0F1E2B]">Flat tire</option>
                <option value="weather_delay" className="bg-[#0F1E2B]">Weather delay</option>
                <option value="route_blocked" className="bg-[#0F1E2B]">Route blocked</option>
                <option value="other" className="bg-[#0F1E2B]">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-white/50 mb-1">Notes</label>
              <textarea
                value={issueText}
                onChange={e => setIssueText(e.target.value)}
                placeholder="Describe the issue…"
                rows={3}
                autoFocus
                className="w-full bg-white/5 border border-[var(--hairline)] rounded-lg p-3 text-[13px]
                           text-white placeholder-white/30 resize-none focus:outline-none
                           focus:border-[#89CFF0]/40"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setIssueFormId(null)}
                className="h-10 px-4 text-sm text-white/60 rounded-lg hover:bg-white/5 transition"
              >
                Cancel
              </button>
              <button
                disabled={!issueText.trim() || issueSubmitting}
                onClick={async () => {
                  if (!issueFormId) return;
                  setIssueSubmitting(true);
                  try {
                    await api.transportReportIssue(issueFormId, issueType, issueText.trim());
                    toast.success("Issue reported");
                    setIssueFormId(null);
                    refresh();
                  } catch {
                    toast.error("Failed to report issue");
                  } finally {
                    setIssueSubmitting(false);
                  }
                }}
                className="h-10 px-4 text-[13px] font-medium rounded-lg bg-[#89CFF0] text-[#0F1E2B]
                           disabled:opacity-40 transition"
              >
                {issueSubmitting ? "Sending…" : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </CrmShell>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-4">
      <p className="font-mono text-[9.5px] uppercase tracking-wider text-white/45">{label}</p>
      <p className="font-serif text-[28px] tabular-nums mt-1" style={{ color: accent }}>{value}</p>
    </div>
  );
}

function PriorityPill({ p }: { p: "normal" | "urgent" | "critical" }) {
  const c = p === "critical" ? "#EF4E4B" : p === "urgent" ? "#EF4E4B" : "#89CFF0";
  return <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ color: c, background: `${c}1A` }}>{p}</span>;
}

function ExpandedRow({ t }: { t: Assignment }) {
  const history = t.statusHistory ?? [];
  const issues = t.issues ?? [];
  const photos = t.photos ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2">
        {history.length > 0 && (
          <>
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-2">Status history</p>
            <ol className="relative ml-2 space-y-2.5 border-l border-[var(--hairline)] pl-5">
              {history.map((h, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[28px] top-1 w-4 h-4 rounded-full bg-[#34D399]/25 ring-4 ring-[var(--surface-1)] flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
                  </span>
                  <div className="flex items-center justify-between">
                    <p className="text-[12.5px] text-white/85">
                      {TRANSPORT_STATUS_LABEL[h.status as TransportStatus] ?? h.status}
                      {h.photo && <Camera size={10} className="inline ml-1.5 text-[#89CFF0]" />}
                    </p>
                    <span className="font-mono text-[10px] text-white/40">{h.timestamp}</span>
                  </div>
                  {h.note && <p className="text-[11.5px] text-white/55 mt-0.5">{h.note}</p>}
                </li>
              ))}
            </ol>
          </>
        )}
        {issues.length > 0 && (
          <div className="mt-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-2">Issues</p>
            {issues.map((iss, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg bg-[#EF4E4B]/8 border border-[#EF4E4B]/25 px-3 py-2 mb-2">
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
        {t.driverPhone && (
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-1">Driver contact</p>
            <p className="text-[12.5px] text-white/75">{t.driverPhone}</p>
          </div>
        )}
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-1.5">Photos · {photos.length}</p>
          {photos.length === 0 ? (
            <p className="text-[12px] text-white/45">No photos yet.</p>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {photos.map((_, i) => (
                <div key={i} className="aspect-square rounded-md bg-white/6 flex items-center justify-center">
                  <Camera size={16} className="text-white/35" />
                </div>
              ))}
            </div>
          )}
        </div>
        <Link href={`/drive/${t.id}`} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#89CFF0]/15 hover:bg-[#89CFF0]/25 text-[#89CFF0] text-[12px] font-medium transition">
          <ExternalLink size={11} /> View driver page
        </Link>
      </div>
    </div>
  );
}
