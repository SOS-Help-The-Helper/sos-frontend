'use client';

import { useState } from 'react';
import { CrmShell } from '@/components/crm-shell';
import { PageHeader } from '@/components/crm/manage-tabs';
import { Check } from 'lucide-react';

const modules = ['Directory', 'Cases', 'Map', 'Match', 'Calendar', 'Inventory', 'Volunteers', 'Reports', 'Command'];

export default function SettingsPage() {
  const [enabled, setEnabled] = useState<string[]>(['Directory', 'Cases', 'Map', 'Match', 'Calendar']);
  const [density, setDensity] = useState<'small' | 'mid' | 'large'>('mid');

  return (
    <CrmShell module="Settings">
      <PageHeader title="Settings" subtitle="Mountain Area Aid" />
      <div className="px-6 pt-6 pb-10 max-w-3xl space-y-6">
        <section className="rounded-2xl bg-white/5 border border-white/10 p-5">
          <h2 className="text-[15px] font-semibold mb-1">Org profile</h2>
          <p className="text-[12px] text-white/55 mb-4">Visible across SOS Connect.</p>
          <div className="space-y-3">
            <Field label="Org name" value="Mountain Area Aid" />
            <Field label="Primary county" value="Burke" />
            <Field label="Contact email" value="ops@mountainareaaid.org" />
          </div>
        </section>

        <section className="rounded-2xl bg-white/5 border border-white/10 p-5">
          <h2 className="text-[15px] font-semibold mb-1">Modules</h2>
          <p className="text-[12px] text-white/55 mb-4">Toggle what your team sees in the sidebar.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {modules.map((m) => {
              const on = enabled.includes(m);
              return (
                <button
                  key={m}
                  onClick={() => setEnabled((s) => (s.includes(m) ? s.filter((x) => x !== m) : [...s, m]))}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-left transition ${
                    on ? 'border-[#89CFF0]/40 bg-[#89CFF0]/8' : 'border-white/10 bg-white/3 hover:bg-white/5'
                  }`}
                >
                  <span className="text-[13px] font-medium">{m}</span>
                  {on && <Check size={13} className="text-[#89CFF0]" />}
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl bg-white/5 border border-white/10 p-5">
          <h2 className="text-[15px] font-semibold mb-1">Density</h2>
          <p className="text-[12px] text-white/55 mb-4">Auto-adapts to org size. Override below.</p>
          <div className="grid grid-cols-3 gap-2">
            {(['small', 'mid', 'large'] as const).map((d) => {
              const a = density === d;
              return (
                <button
                  key={d}
                  onClick={() => setDensity(d)}
                  className={`px-3 py-3 rounded-xl border text-left transition ${a ? 'border-[#89CFF0] bg-[#89CFF0]/8' : 'border-white/10 bg-white/3 hover:bg-white/5'}`}
                >
                  <p className="font-medium text-[13px] capitalize">{d}</p>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mt-0.5">
                    {d === 'small' ? '<5 ppl' : d === 'mid' ? '5–50' : '50+'}
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </CrmShell>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-1.5">{label}</p>
      <input defaultValue={value} className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#89CFF0]/40" />
    </div>
  );
}
