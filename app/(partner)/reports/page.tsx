'use client';

import { CrmShell } from "@/components/crm-shell";
import { ManageTabs, PageHeader } from "@/components/crm/manage-tabs";
import { kpis, orgs, cases } from "@/lib/prototype-data";
import { Download } from "lucide-react";

export default function ReportsPage() {
  const byOrg = orgs.map((o) => ({
    org: o,
    count: cases.filter((c) => c.org === o.id).length,
  }));
  const max = Math.max(...byOrg.map((b) => b.count), 1);

  // taxonomy distribution
  const taxCounts: Record<string, number> = {};
  cases.forEach((c) => c.taxonomy.forEach((t) => (taxCounts[t] = (taxCounts[t] || 0) + 1)));
  const taxList = Object.entries(taxCounts).sort((a, b) => b[1] - a[1]);
  const taxMax = Math.max(...Object.values(taxCounts), 1);

  return (
    <CrmShell module="Reports">
      <ManageTabs />
      <PageHeader
        title="Reports"
        subtitle="Last 30 days"
        actions={
          <button className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white/8 hover:bg-white/12 text-[12px] font-medium transition">
            <Download size={12} /> Export
          </button>
        }
      />

      <div className="px-6 pt-6 pb-10 space-y-4">
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
                <div key={b.org.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px]">{b.org.name}</span>
                    <span className="font-mono text-[11px] tabular-nums text-white/65">{b.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${(b.count / max) * 100}%`, background: b.org.color }} />
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
