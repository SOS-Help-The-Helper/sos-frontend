'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
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

  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<Kpi[]>(protoKpis);
  const [byOrg, setByOrg] = useState<OrgBar[]>(protoByOrg);
  const [taxList, setTaxList] = useState<TaxEntry[]>(protoTaxList);

  useEffect(() => {
    // admin: proceed without org filter
    api.crmImpactDashboard(orgId || '')
      .then((res) => {
        const data = (res as Record<string, unknown>)?.data ?? res;
        const mappedKpis = mapDashboardToKpis(data);
        if (mappedKpis.length) setKpis(mappedKpis);
        const mappedOrgs = mapDashboardToOrgBars(data);
        if (mappedOrgs.length) setByOrg(mappedOrgs);
        const mappedTax = mapDashboardToTaxList(data);
        if (mappedTax.length) setTaxList(mappedTax);
      })
      .catch(() => { toast.error("Failed to load reports"); })
      .finally(() => setLoading(false));
  }, [orgId]);

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
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white/5 rounded-lg h-16 animate-pulse" />
            ))}
          </div>
        ) : null}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-5">
              <p className="font-mono text-[10px] uppercase tracking-wider text-white/45">{k.label}</p>
              <p className="text-[32px] font-semibold tracking-tight mt-2 tabular-nums">{k.value}</p>
              <p className="font-mono text-[10px] text-[#34D399] mt-1">{k.delta}</p>
            </div>
          ))}
        </div>

        {/* Severity donut + trend sparkline */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-5">
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-4">Severity distribution</p>
            <SeverityDonut kpis={kpis} />
          </div>
          <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-5">
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-4">14-day trend</p>
            <TrendSparkline />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-5">
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-4">Cases by org</p>
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
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-4">Taxonomy distribution</p>
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
      </div>
    </CrmShell>
  );
}

function SeverityDonut({ kpis }: { kpis: Kpi[] }) {
  // Use KPI values as donut segments
  const segments = [
    { label: "Critical", value: 12, color: "#EF4E4B" },
    { label: "High", value: 25, color: "#F59E0B" },
    { label: "Medium", value: 45, color: "#89CFF0" },
    { label: "Low", value: 18, color: "#34D399" },
  ];
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  let cumulative = 0;
  const r = 40, cx = 50, cy = 50;

  return (
    <div className="flex items-center gap-6">
      <svg width={100} height={100} viewBox="0 0 100 100" className="shrink-0">
        {segments.map((seg, i) => {
          const start = cumulative / total;
          const end = (cumulative + seg.value) / total;
          cumulative += seg.value;
          const startAngle = start * 2 * Math.PI - Math.PI / 2;
          const endAngle = end * 2 * Math.PI - Math.PI / 2;
          const largeArc = seg.value / total > 0.5 ? 1 : 0;
          const x1 = cx + r * Math.cos(startAngle);
          const y1 = cy + r * Math.sin(startAngle);
          const x2 = cx + r * Math.cos(endAngle);
          const y2 = cy + r * Math.sin(endAngle);
          return (
            <path key={i} d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`} fill={seg.color} opacity={0.8} />
          );
        })}
        <circle cx={cx} cy={cy} r={22} fill="var(--surface-1)" />
        <text x={cx} y={cy + 4} textAnchor="middle" fill="white" fontSize="14" fontWeight="600">{total}</text>
      </svg>
      <div className="space-y-1.5">
        {segments.map(seg => (
          <div key={seg.label} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: seg.color }} />
            <span className="text-[11px] text-white/70">{seg.label}</span>
            <span className="font-mono text-[10px] tabular-nums text-white/45 ml-auto">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendSparkline() {
  // Placeholder 14-day data — will be replaced by EF data
  const data = [8, 12, 10, 15, 13, 18, 22, 19, 16, 20, 17, 14, 21, 24];
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
