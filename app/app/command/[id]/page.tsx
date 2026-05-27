"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { CrmShell } from "@/components/crm-shell";
import { DetailTopBar } from "@/components/crm/detail-shell";
import { useDashboard, unpinReport } from "@/lib/dashboard-store";
import { api } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import {
  AlertTriangle, FileText, X, Plus, MapPin, Calendar, User,
  Radio, Download, Megaphone, Truck, Phone, ArrowRight,
  Home, Utensils, HeartPulse, Baby, Bus, LayoutGrid, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import type { ReactNode } from "react";

type Incident = {
  id: string; name: string; county: string; status: string; priority: string;
  cases: number; capacity: number; casesHistory: number[];
  declared?: string; lead?: string; criticalDelta?: string;
  avgMatchHours?: number; avgMatchHistory?: number[];
};

type CategoryId = "housing" | "food" | "health" | "childcare" | "transport";
const CATEGORIES: { id: CategoryId; label: string; icon: typeof Home; tone: string }[] = [
  { id: "housing", label: "Housing", icon: Home, tone: "#89CFF0" },
  { id: "food", label: "Food", icon: Utensils, tone: "#89CFF0" },
  { id: "health", label: "Health", icon: HeartPulse, tone: "#EF4E4B" },
  { id: "childcare", label: "Childcare", icon: Baby, tone: "#34D399" },
  { id: "transport", label: "Transport", icon: Bus, tone: "#A78BFA" },
];

export default function IncidentDashboard() {
  const params = useParams();
  const id = params.id as string;
  const { orgId } = useAuthContext();
  const pinnedIds = useDashboard(id);
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMore, setShowMore] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<CategoryId | "all">("all");

  const [efStats, setEfStats] = useState<{
    open_cases: number; critical_cases: number; high_cases: number;
    orgs_involved: number; resources_deployed: number; fulfilled_pct: number;
    requests_by_category?: Record<string, number>;
    resources_by_category?: Record<string, number>;
    cases_by_status?: Record<string, number>;
    org_load?: { name: string; open: number; color: string }[];
  } | null>(null);

  useEffect(() => {
    api.crmCommandIncidents()
      .then((res: any) => {
        const list = res?.incidents ?? [];
        const found = list.find((i: Incident) => i.id === id);
        if (found) setIncident(found);
      })
      .catch(() => { toast.error("Failed to load incident"); })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    api.crmCommandSummary(id)
      .then((res) => setEfStats(res as typeof efStats))
      .catch(() => {});
  }, [id]);

  if (loading) {
    return (
      <CrmShell module="Command">
        <DetailTopBar backTo="/command" backLabel="Command" />
        <div className="px-6 py-10 space-y-4 animate-pulse">
          <div className="h-32 rounded-2xl bg-white/5" />
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl bg-white/5" />)}
          </div>
        </div>
      </CrmShell>
    );
  }

  if (!incident) {
    return (
      <CrmShell module="Command">
        <DetailTopBar backTo="/command" backLabel="Command" />
        <div className="flex flex-col items-center gap-3 py-20 text-white/40">
          <p>Incident not found or failed to load.</p>
          <a href="/app/command" className="text-sm underline text-white/60">Back to Command</a>
        </div>
      </CrmShell>
    );
  }

  const isUrgent = incident.priority === "urgent";
  const openCases = efStats?.open_cases ?? incident.cases;
  const criticalCount = (efStats?.critical_cases ?? 0) + (efStats?.high_cases ?? 0);
  const orgsEngaged = efStats?.orgs_involved ?? 0;

  // Category stats from EF or zero
  const categoryStats = CATEGORIES.map(cat => ({
    ...cat,
    requests: efStats?.requests_by_category?.[cat.id] ?? 0,
    resources: efStats?.resources_by_category?.[cat.id] ?? 0,
  }));
  const maxBar = Math.max(1, ...categoryStats.flatMap(s => [s.requests, s.resources]));

  // Case posture from EF
  const casePosture = efStats?.cases_by_status ?? {};
  const postureTotal = Object.values(casePosture).reduce((a, b) => a + b, 0) || 1;
  const postureSlices = Object.entries(casePosture).map(([status, count]) => ({
    label: status, count, pct: Math.round((count / postureTotal) * 100),
  }));

  const orgLoad = efStats?.org_load ?? [];

  function fireAction(label: string) { toast.success(label); }

  return (
    <CrmShell module="Command">
      <DetailTopBar backTo="/command" backLabel="Command" />
      <main className="max-w-[1240px] mx-auto px-4 py-4 md:py-6 space-y-5">
        {/* ============ Header ============ */}
        <div
          className="rounded-2xl border p-5 relative overflow-hidden"
          style={{
            background: isUrgent ? "linear-gradient(135deg, rgba(239,78,75,0.10), rgba(20,20,20,0.4))" : "var(--surface-1)",
            borderColor: isUrgent ? "rgba(239,78,75,0.35)" : "var(--hairline)",
          }}
        >
          {isUrgent && (
            <div className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#EF4E4B]/20 text-[#EF4E4B] text-[10px] font-mono uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[#EF4E4B] animate-pulse" /> Live · Urgent
            </div>
          )}
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${isUrgent ? "bg-[#EF4E4B]/15 text-[#EF4E4B]" : "bg-[#89CFF0]/15 text-[#89CFF0]"}`}>
              <AlertTriangle size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-wider text-white/45">{incident.id} · {incident.status}</p>
              <h1 className="font-serif text-[26px] md:text-[32px] mt-0.5 leading-[1.1] tracking-tight">{incident.name}</h1>
              <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                <Chip icon={MapPin}>{incident.county} County</Chip>
                {incident.declared && <Chip icon={Calendar}>Declared {incident.declared}</Chip>}
                {incident.lead && <Chip icon={User}>Lead: {incident.lead}</Chip>}
              </div>
            </div>
          </div>

          {/* Action rail */}
          <div className="flex items-center gap-2 mt-5 flex-wrap">
            <ActionBtn primary onClick={() => fireAction("Sitrep brief generated")}><Megaphone size={12} /> Brief team</ActionBtn>
            <ActionBtn onClick={() => fireAction("Mobilization dispatched")}><Truck size={12} /> Mobilize resources</ActionBtn>
            <ActionBtn onClick={() => fireAction("Escalated to state EOC")}><Radio size={12} /> Escalate to EOC</ActionBtn>
            <ActionBtn onClick={() => fireAction("Sitrep PDF downloaded")}><Download size={12} /> Export sitrep</ActionBtn>
            <a href="tel:+1-828-555-0911" className="ml-auto inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white/6 hover:bg-white/12 text-[12px] font-medium transition">
              <Phone size={12} /> Hotline
            </a>
          </div>
        </div>

        {/* ============ Now strip (KPIs) ============ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <NowTile label="Open cases" value={openCases} tone="#89CFF0" sub={`${orgsEngaged} orgs engaged`} spark={incident.casesHistory} />
          <NowTile label="Critical / high" value={criticalCount} tone="#EF4E4B" sub="vs yesterday" spark={[]} />
          <NowTile label="Avg match" value={incident.avgMatchHours ? `${incident.avgMatchHours}h` : "—"} tone="#34D399" sub="time to first match" spark={incident.avgMatchHistory ?? []} />
        </div>

        {/* ============ Needs & resources by category ============ */}
        <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-white/45">Needs &amp; resources</p>
              <p className="text-[13px] font-medium mt-0.5">Open requests vs offered resources by category</p>
            </div>
            <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-white/4">
              <CategoryChip active={categoryFilter === "all"} onClick={() => setCategoryFilter("all")} icon={LayoutGrid} label="All" tone="#89CFF0" />
              {CATEGORIES.map(c => (
                <CategoryChip key={c.id} active={categoryFilter === c.id} onClick={() => setCategoryFilter(c.id)} icon={c.icon} label={c.label} tone={c.tone} />
              ))}
            </div>
          </div>
          <ul className="space-y-3">
            {categoryStats.filter(s => categoryFilter === "all" || s.id === categoryFilter).map(s => {
              const Icon = s.icon;
              const reqPct = (s.requests / maxBar) * 100;
              const resPct = (s.resources / maxBar) * 100;
              const gap = s.requests - s.resources;
              return (
                <li key={s.id} className="grid grid-cols-[140px_1fr_auto] gap-3 items-center">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-7 h-7 rounded-md flex items-center justify-center shrink-0" style={{ background: `${s.tone}1A`, color: s.tone }}><Icon size={13} /></span>
                    <span className="text-[12.5px] truncate">{s.label}</span>
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <BarRow label="Requests" count={s.requests} pct={reqPct} tone={s.tone} solid />
                    <BarRow label="Resources" count={s.resources} pct={resPct} tone={s.tone} />
                  </div>
                  <span className="font-mono text-[10.5px] tabular-nums shrink-0 px-1.5 py-0.5 rounded"
                    style={{ color: gap > 0 ? "#EF4E4B" : gap < 0 ? "#34D399" : "#9CA3AF", background: gap > 0 ? "rgba(239,78,75,0.10)" : gap < 0 ? "rgba(52,211,153,0.10)" : "transparent" }}>
                    {gap > 0 ? `+${gap} gap` : gap < 0 ? `${Math.abs(gap)} extra` : "—"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* ============ Case posture ============ */}
        {postureSlices.length > 0 && (
          <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-white/45">Case posture</p>
                <p className="text-[13px] font-medium mt-0.5">Where cases sit right now</p>
              </div>
              <Link href="/app/cases" className="text-[11px] text-white/55 hover:text-white inline-flex items-center gap-1">Open queue <ArrowRight size={11} /></Link>
            </div>
            <div className="flex gap-2 flex-wrap">
              {postureSlices.map(s => (
                <div key={s.label} className="rounded-lg bg-white/4 px-3 py-2 text-center min-w-[80px]">
                  <p className="text-[18px] font-semibold tabular-nums">{s.count}</p>
                  <p className="font-mono text-[9px] uppercase tracking-wider text-white/45 mt-0.5">{s.label}</p>
                  <p className="text-[10px] text-white/35 mt-0.5">{s.pct}%</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============ Pinned reports + Org load ============ */}
        <div className="grid lg:grid-cols-[1fr_320px] gap-3">
          <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-white/45">Pinned reports</p>
              <Link href="/app/reports" className="inline-flex items-center gap-1 h-7 px-2 rounded-md bg-white/6 hover:bg-white/12 text-[11px] transition"><Plus size={11} /> Add from library</Link>
            </div>
            <div className="text-center py-10 text-white/40 text-[12.5px]">
              No reports pinned. Open <Link href="/app/reports" className="text-[#89CFF0] hover:underline">Reports</Link> and click &ldquo;Add to dashboard&rdquo;.
            </div>
          </div>

          <aside className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-5">
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-4">Org load</p>
            {orgLoad.length === 0 ? (
              <p className="text-[12px] text-white/40">No org data available.</p>
            ) : (
              <div className="space-y-3">
                {orgLoad.map((o, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: o.color || "#89CFF0" }} />
                      <span className="text-[12px] truncate">{o.name}</span>
                    </div>
                    <span className="font-mono text-[11px] tabular-nums text-white/65">{o.open} open</span>
                  </div>
                ))}
              </div>
            )}

            {/* Collapsible more section */}
            {showMore && (
              <div className="mt-5 pt-4 border-t border-white/5">
                <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-3">Quick info</p>
                <p className="text-[12px] text-white/55">Resources deployed: {efStats?.resources_deployed ?? "—"}</p>
                <p className="text-[12px] text-white/55 mt-1">Fulfilled: {efStats?.fulfilled_pct ?? "—"}%</p>
              </div>
            )}
            <button onClick={() => setShowMore(!showMore)} className="mt-3 text-[11px] text-white/45 hover:text-white/70 inline-flex items-center gap-1 transition">
              <ChevronDown size={12} className={`transition-transform ${showMore ? "rotate-180" : ""}`} />
              {showMore ? "Less" : "More details"}
            </button>
          </aside>
        </div>
      </main>
    </CrmShell>
  );
}

/* ─── Shared components ─── */

function Chip({ icon: Icon, children }: { icon: typeof MapPin; children: ReactNode }) {
  return <span className="inline-flex items-center gap-1.5 text-[11.5px] text-white/70"><Icon size={11} className="text-white/40" />{children}</span>;
}

function ActionBtn({ children, primary, onClick }: { children: ReactNode; primary?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium transition ${primary ? "bg-[#EF4E4B] hover:bg-[#d94340]" : "bg-white/6 hover:bg-white/12"}`}>
      {children}
    </button>
  );
}

function NowTile({ label, value, tone, sub, spark }: { label: string; value: string | number; tone: string; sub: string; spark?: number[] }) {
  return (
    <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-4">
      <p className="font-mono text-[10px] uppercase tracking-wider text-white/45">{label}</p>
      <div className="flex items-end justify-between mt-1">
        <p className="text-[28px] font-semibold tabular-nums" style={{ color: tone }}>{value}</p>
        {spark && spark.length > 1 && <MiniSparkline data={spark} color={tone} />}
      </div>
      <p className="font-mono text-[10px] text-white/40 mt-1">{sub}</p>
    </div>
  );
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  const w = 60, h = 24;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.6} />
    </svg>
  );
}

function CategoryChip({ active, onClick, icon: Icon, label, tone }: { active: boolean; onClick: () => void; icon: typeof Home; label: string; tone: string }) {
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-1 h-7 px-2 rounded-md text-[10.5px] font-medium transition ${active ? "bg-white/12 text-white" : "text-white/50 hover:text-white/75"}`}>
      <Icon size={11} style={active ? { color: tone } : undefined} /> {label}
    </button>
  );
}

function BarRow({ label, count, pct, tone, solid }: { label: string; count: number; pct: number; tone: string; solid?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[9px] uppercase tracking-wider text-white/40 w-16 shrink-0 text-right">{label}</span>
      <div className="flex-1 h-3 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: solid ? tone : `${tone}60` }} />
      </div>
      <span className="font-mono text-[10px] tabular-nums text-white/55 w-6 text-right">{count}</span>
    </div>
  );
}
