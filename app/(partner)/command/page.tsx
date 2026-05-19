'use client';

import { CrmShell } from '@/components/crm-shell';
import { PageHeader } from '@/components/crm/manage-tabs';
import { kpis, orgs, cases } from '@/lib/prototype-data';
import { AlertTriangle, Radio } from 'lucide-react';

const incidents = [
  { id: 'I-01', name: 'Helene aftermath', county: 'Buncombe', cases: 8, priority: 'urgent', status: 'active' },
  { id: 'I-02', name: 'Burke flooding', county: 'Burke', cases: 3, priority: 'normal', status: 'active' },
  { id: 'I-03', name: 'Madison food shortage', county: 'Madison', cases: 2, priority: 'normal', status: 'monitoring' },
];

export default function CommandPage() {
  return (
    <CrmShell module="Command">
      <PageHeader
        title="Command"
        subtitle="Multi-incident dashboard · for county EM and large orgs"
        actions={
          <button className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#EF4E4B] hover:bg-[#d94340] text-[12px] font-medium transition">
            <Radio size={12} /> Declare incident
          </button>
        }
      />
      <div className="px-6 pt-6 pb-10 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-2xl bg-white/5 border border-white/10 p-5">
              <p className="font-mono text-[10px] uppercase tracking-wider text-white/45">{k.label}</p>
              <p className="text-[28px] font-semibold tracking-tight mt-2 tabular-nums">{k.value}</p>
              <p className="font-mono text-[10px] text-[#34D399] mt-1">{k.delta}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-3">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-4">Active incidents</p>
            <div className="space-y-2">
              {incidents.map((i) => (
                <div key={i.id} className="rounded-xl bg-white/5 hover:bg-white/8 p-4 flex items-center gap-4 transition cursor-pointer">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${i.priority === 'urgent' ? 'bg-[#EF4E4B]/15 text-[#EF4E4B]' : 'bg-[#F5EBD6]/15 text-[#F5EBD6]'}`}>
                    <AlertTriangle size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{i.name}</p>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-white/50 mt-0.5">{i.id} · {i.county}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-[20px] font-semibold tabular-nums">{i.cases}</p>
                    <p className="font-mono text-[9px] uppercase tracking-wider text-white/45">cases</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-4">Org load</p>
            <div className="space-y-3">
              {orgs.map((o) => (
                <div key={o.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: o.color }} />
                    <span className="text-[12px] truncate">{o.name}</span>
                  </div>
                  <span className="font-mono text-[11px] tabular-nums text-white/65">{o.open} open</span>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-white/8">
              <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-2">Recent activity</p>
              <div className="space-y-2 text-[12px] text-white/65">
                {cases.slice(0, 4).map((c) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-white/40">{c.opened}</span>
                    <span className="truncate">{c.citizen} · {c.taxonomy[0]}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </CrmShell>
  );
}
