'use client';

export const dynamic = 'force-dynamic';

import { useMemo } from "react";
import { useApiFetch } from "@/lib/use-api-fetch";
import { CrmShell } from "@/components/crm-shell";
import { PageHeader } from "@/components/crm/manage-tabs";
const protoKpis: Array<{ label: string; value: string | number; delta: string }> = [];
const orgs: any[] = [];
const cases: any[] = [];
import { Download } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";

type Kpi = { label: string; value: string | number; delta: string };
type OrgBar = { org?: { id: string; name: string; color: string }; name?: string; count: number };
type TaxEntry = [string, number];

function mapDashboardToKpis(data: unknown): Kpi[] {
  if (!data || typeof data !== "object") return [];
  const d = data as Record<string, unknown>;
  return [
    { label: "Open cases", value: Number(d.open_cases ?? 0), delta: "" },
    { label: "Avg time to match", value: String(d.avg_match_time ?? "—"), delta: "" },
    { label: "Active volunteers", value: Number(d.active_volunteers ?? 0), delta: "" },
    { label: "Resources matched", value: Number(d.resources_matched ?? 0), delta: "" },
  ];
}

function mapDashboardToOrgBars(data: unknown): OrgBar[] {
  if (!data || typeof data !== "object") return [];
  const d = data as Record<string, unknown>;
  const byOrg = d.by_org;
  if (!Array.isArray(byOrg)) return [];
  return (byOrg as Record<string, unknown>[]).map((b) => ({
    org: {
      id: String(b.org_id ?? b.id ?? ""),
      name: String(b.org_name ?? b.name ?? b.org_id ?? ""),
      color: String(b.color ?? "#89CFF0"),
    },
    count: Number(b.count ?? b.case_count ?? 0),
  }));
}

function mapDashboardToTaxList(data: unknown): TaxEntry[] {
  if (!data || typeof data !== "object") return [];
  const d = data as Record<string, unknown>;
  const byTax = d.by_taxonomy;
  if (!Array.isArray(byTax)) return [];
  return (byTax as Record<string, unknown>[])
    .map((b): TaxEntry => [String(b.taxonomy ?? b.tag ?? ""), Number(b.count ?? 0)])
    .sort((a, b) => b[1] - a[1]);
}

export default function ReportsPage() {
  const { orgId } = useAuthContext();

  // Proto fallbacks
  const protoByOrg = orgs.map((o) => ({
    org: o,
    count: cases.filter((c) => c.org === o.id).length,
  }));
  const protoTaxCounts: Record<string, number> = {};
  cases.forEach((c) => c.taxonomy.forEach((t) => (protoTaxCounts[t] = (protoTaxCounts[t] || 0) + 1)));
  const protoTaxList: TaxEntry[] = Object.entries(protoTaxCounts).sort((a, b) => b[1] - a[1]);

  const { data: dashboard, loading, error, refetch } = useApiFetch(
    () => api.crmImpactDashboard(orgId || '').then((res) => {
      const d = (res as Record<string, unknown>)?.data ?? res;
      return {
        kpis: mapDashboardToKpis(d),
        byOrg: mapDashboardToOrgBars(d),
        taxList: mapDashboardToTaxList(d),
      };
    }),
    "Failed to load reports",
    [orgId]
  );

  const kpis = useMemo(() => dashboard?.kpis?.length ? dashboard.kpis : protoKpis, [dashboard]);
  const byOrg = useMemo(() => dashboard?.byOrg?.length ? dashboard.byOrg : protoByOrg, [dashboard]);
  const taxList = useMemo(() => dashboard?.taxList?.length ? dashboard.taxList : protoTaxList, [dashboard]);

  const max = Math.max(...byOrg.map((b) => b.count), 1);
  const taxMax = Math.max(...taxList.map(([, n]) => n), 1);

  return (
    <CrmShell module="Reports">
      <PageHeader
        title="Reports"
        subtitle="Field reports from volunteers and partners."
        actions={
          <button className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white/8 hover:bg-white/12 text-[12px] font-medium transition">
            <Download size={12} /> Export
          </button>
        }
      />

      <div className="px-4 pt-4 pb-4 space-y-4">
        {error ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="text-3xl">⚠️</span>
            <p className="text-sm font-bold text-white">Failed to load reports</p>
            <button
              onClick={refetch}
              className="px-4 py-2 rounded-lg bg-white/8 hover:bg-white/12 text-xs font-medium transition"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white/5 rounded-lg p-3 h-16 animate-pulse" />
                ))
              ) : (
            kpis.map((k) => (
              <div key={k.label} className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-5">
                <p className="font-mono text-xs uppercase tracking-wider text-white/45">{k.label}</p>
                <p className="text-[32px] font-semibold tracking-tight mt-2 tabular-nums">{k.value}</p>
                <p className="font-mono text-xs text-[#34D399] mt-1">{k.delta}</p>
              </div>
            ))
          )}
        </div>

        {/* Severity donut + trend sparkline */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-5">
            <p className="font-mono text-xs uppercase tracking-wider text-white/45 mb-4">Severity distribution</p>
            <SeverityDonut kpis={kpis} />
          </div>
          <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-5">
            <p className="font-mono text-xs uppercase tracking-wider text-white/45 mb-4">14-day trend</p>
            <TrendSparkline />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-5">
            <p className="font-mono text-xs uppercase tracking-wider text-white/45 mb-4">Cases by org</p>
            <div className="space-y-3">
              {byOrg.map((b) => (
                <div key={b.org?.id ?? b.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px]">{b.org?.name ?? b.name}</span>
                    <span className="font-mono text-[11px] tabular-nums text-white/65">{b.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${(b.count / max) * 100}%`, background: b.org?.color ?? '#89CFF0' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-5">
            <p className="font-mono text-xs uppercase tracking-wider text-white/45 mb-4">Taxonomy distribution</p>
            <div className="space-y-3">
              {taxList.map(([t, n]) => (
                <div key={t}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[11px] text-white/85">{t}</span>
                    <span className="font-mono text-[11px] tabular-nums text-white/65">{n}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full bg-[#89CFF0] transition-all" style={{ width: `${(n / taxMax) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
          </>
        )}
      </div>
    </CrmShell>
  );
}

function SeverityDonut({ kpis }: { kpis: Kpi[] }) {
  // Severity data not available in dashboard API yet - show placeholder
  return (
    <div className="flex items-center justify-center h-24">
      <p className="text-sm text-white/40">Severity data not yet available</p>
    </div>
  );
}

function TrendSparkline() {
  // No trend data available from the dashboard API yet
  const data: number[] = [];
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-20">
        <p className="text-sm text-white/40">Trend data not available</p>
      </div>
    );
  }

  const max = Math.max(...data, 1);
  const w = 280, h = 80;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * (h - 10)}`).join(" ");
  const areaPoints = `0,${h} ${points} ${w},${h}`;

  return (
    <div>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full">
        <polygon points={areaPoints} fill="url(#trendGrad)" />
        <polyline points={points} fill="none" stroke="#89CFF0" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#89CFF0" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#89CFF0" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
      <div className="flex items-center justify-between mt-2">
        <span className="font-mono text-[9px] text-white/35">14 days ago</span>
        <span className="font-mono text-[9px] text-white/35">Today</span>
      </div>
    </div>
  );
}
