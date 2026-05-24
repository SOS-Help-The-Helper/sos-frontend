'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { CrmShell } from "@/components/crm-shell";
import { PageHeader } from "@/components/crm/manage-tabs";
import { kpis as protoKpis, orgs, cases } from "@/lib/prototype-data";
import { Download } from "lucide-react";
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

  const [kpis, setKpis] = useState<Kpi[]>(protoKpis);
  const [byOrg, setByOrg] = useState<OrgBar[]>(protoByOrg);
  const [taxList, setTaxList] = useState<TaxEntry[]>(protoTaxList);

  useEffect(() => {
    if (!orgId) return;
    api.crmImpactDashboard(orgId)
      .then((res) => {
        const data = (res as Record<string, unknown>)?.data ?? res;
        const mappedKpis = mapDashboardToKpis(data);
        if (mappedKpis.length) setKpis(mappedKpis);
        const mappedOrgs = mapDashboardToOrgBars(data);
        if (mappedOrgs.length) setByOrg(mappedOrgs);
        const mappedTax = mapDashboardToTaxList(data);
        if (mappedTax.length) setTaxList(mappedTax);
      })
      .catch(() => {
        // fallback to prototype data already set
      });
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-5">
              <p className="font-mono text-[10px] uppercase tracking-wider text-white/45">{k.label}</p>
              <p className="text-[32px] font-semibold tracking-tight mt-2 tabular-nums">{k.value}</p>
              <p className="font-mono text-[10px] text-[#34D399] mt-1">{k.delta}</p>
            </div>
          ))}
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
