'use client';

import { useState, useEffect } from 'react';
import { CrmShell } from '@/components/crm-shell';
import { PageHeader } from '@/components/crm/manage-tabs';
import { Check, Pin } from 'lucide-react';
import { useAuthContext } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { usePortalConfig, ALL_MODULES, MODULE_META, type ModuleId } from '@/lib/use-portal-config';

const FALLBACK_ORG = { name: 'Organization', county: '', email: '' };

interface OrgProfile {
  name: string;
  county: string;
  email: string;
}

export default function SettingsPage() {
  const { orgId } = useAuthContext();
  const { config, updateConfig } = usePortalConfig();
  const [org, setOrg] = useState<OrgProfile>(FALLBACK_ORG);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    api.efCall<{ org?: { name?: string; county?: string; contact_email?: string } }>(
      'crm-settings',
      { action: 'get_settings', org_id: orgId }
    ).then((data) => {
      if (data.org) {
        setOrg({
          name: data.org.name ?? FALLBACK_ORG.name,
          county: data.org.county ?? FALLBACK_ORG.county,
          email: data.org.contact_email ?? FALLBACK_ORG.email,
        });
      }
    }).catch(() => {});
  }, [orgId]);

  async function toggleModule(m: ModuleId) {
    const on = config.modules.includes(m);
    const next = on
      ? config.modules.filter((x) => x !== m)
      : [...config.modules, m];
    // Preserve canonical order
    const ordered = ALL_MODULES.filter((mod) => next.includes(mod));
    setSaving(true);
    try {
      await updateConfig({ modules: ordered });
      toast.success(`${MODULE_META[m].label} ${on ? 'disabled' : 'enabled'}`);
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function toggleMobilePin(m: ModuleId) {
    if (!config.modules.includes(m)) return;
    const has = config.mobile_pins.includes(m);
    let next: ModuleId[];
    if (has) {
      next = config.mobile_pins.filter((x) => x !== m);
    } else {
      if (config.mobile_pins.length >= 4) return;
      next = [...config.mobile_pins, m];
    }
    try {
      await updateConfig({ mobile_pins: next });
    } catch {
      toast.error('Failed to save pins');
    }
  }

  async function setOrgSize(size: 'small' | 'mid' | 'large') {
    try {
      await updateConfig({ org_size: size });
      toast.success(`Org size set to ${size}`);
    } catch {
      toast.error('Failed to save');
    }
  }

  return (
    <CrmShell module="Settings">
      <PageHeader title="Settings" subtitle={org.name} />
      <div className="px-6 pt-6 pb-10 max-w-3xl space-y-6">
        <section className="rounded-2xl bg-white/5 border border-white/10 p-5">
          <h2 className="text-[15px] font-semibold mb-1">Org profile</h2>
          <p className="text-[12px] text-white/55 mb-4">Visible across SOS Connect.</p>
          <div className="space-y-3">
            <Field label="Org name" value={org.name} />
            <Field label="Primary county" value={org.county} />
            <Field label="Contact email" value={org.email} />
          </div>
        </section>

        <section className="rounded-2xl bg-white/5 border border-white/10 p-5">
          <h2 className="text-[15px] font-semibold mb-1">Modules</h2>
          <p className="text-[12px] text-white/55 mb-4">Toggle what your team sees in the sidebar and mobile nav.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ALL_MODULES.map((m) => {
              const on = config.modules.includes(m);
              return (
                <button
                  key={m}
                  disabled={saving}
                  onClick={() => toggleModule(m)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-left transition disabled:opacity-60 ${
                    on ? 'border-[#89CFF0]/40 bg-[#89CFF0]/8' : 'border-white/10 bg-white/3 hover:bg-white/5'
                  }`}
                >
                  <span className="text-[13px] font-medium">{config.labels[m] || MODULE_META[m].label}</span>
                  {on && <Check size={13} className="text-[#89CFF0]" />}
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl bg-white/5 border border-white/10 p-5">
          <h2 className="text-[15px] font-semibold mb-1">Pin to mobile</h2>
          <p className="text-[12px] text-white/55 mb-4">Choose up to 4 modules for the bottom bar on phone. SOS is always pinned.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {config.modules.map((m) => {
              const pinned = config.mobile_pins.includes(m);
              const order = pinned ? config.mobile_pins.indexOf(m) + 1 : null;
              const disabled = !pinned && config.mobile_pins.length >= 4;
              return (
                <button
                  key={m}
                  onClick={() => toggleMobilePin(m)}
                  disabled={disabled}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-left transition ${
                    pinned
                      ? 'border-[#EF4E4B]/50 bg-[#EF4E4B]/10'
                      : disabled
                        ? 'border-white/10 bg-white/3 opacity-40 cursor-not-allowed'
                        : 'border-white/10 bg-white/3 hover:bg-white/5'
                  }`}
                >
                  <span className="text-[13px] font-medium">{config.labels[m] || MODULE_META[m].label}</span>
                  {pinned && (
                    <span className="flex items-center gap-1 text-[#EF4E4B]">
                      <Pin size={11} className="fill-[#EF4E4B]" />
                      <span className="font-mono text-[10px]">{order}</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl bg-white/5 border border-white/10 p-5">
          <h2 className="text-[15px] font-semibold mb-1">Org size</h2>
          <p className="text-[12px] text-white/55 mb-4">Sets density and default mobile pins.</p>
          <div className="grid grid-cols-3 gap-2">
            {(['small', 'mid', 'large'] as const).map((d) => {
              const a = config.org_size === d;
              return (
                <button
                  key={d}
                  onClick={() => setOrgSize(d)}
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
      <input defaultValue={value} key={value} className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#89CFF0]/40" />
    </div>
  );
}
