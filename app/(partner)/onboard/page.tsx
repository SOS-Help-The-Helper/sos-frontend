'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SosLogo } from '@/components/onboarding/SosLogo';
import { Check, ArrowRight, Users, LayoutGrid, Map, Calendar, Package, HeartHandshake, BarChart3 } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const orgTypes = [
  { id: 'small', label: 'Small / mutual aid', sub: '< 5 people' },
  { id: 'mid', label: 'Mid-size org', sub: '5–50 people' },
  { id: 'large', label: 'Large org / EM', sub: '50+ people' },
];

const allModules = [
  { id: 'directory', label: 'Directory', icon: Users },
  { id: 'cases', label: 'Cases', icon: LayoutGrid },
  { id: 'map', label: 'Map', icon: Map },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'volunteers', label: 'Volunteers', icon: HeartHandshake },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
];

export default function OnboardPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [orgType, setOrgType] = useState('mid');
  const [selected, setSelected] = useState<string[]>(['directory', 'cases', 'map']);
  const [orgName, setOrgName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [invites, setInvites] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await api.crmOnboardOrg({
        org_type: orgType,
        modules: selected,
        name: orgName,
        contact_email: contactEmail,
      });
      router.push('/cases');
    } catch {
      toast.error('Failed to create org — please try again');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0F1E2B] text-white flex items-center justify-center px-5">
      <div className="max-w-lg w-full py-12">
        <div className="flex items-center gap-2.5 mb-8">
          <SosLogo size={28} />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">Onboarding · {step + 1} of 3</span>
        </div>

        <div className="flex gap-1.5 mb-8">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-[#89CFF0]' : 'bg-white/10'}`} />
          ))}
        </div>

        {step === 0 && (
          <>
            <h1 className="text-[28px] font-semibold tracking-tight">What kind of org?</h1>
            <p className="text-white/55 mt-2">This calibrates the UI density and which modules ship enabled.</p>
            <div className="mt-6 space-y-2">
              {orgTypes.map((o) => (
                <button
                  key={o.id}
                  onClick={() => setOrgType(o.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition text-left ${
                    orgType === o.id ? 'border-[#89CFF0] bg-[#89CFF0]/8' : 'border-white/10 bg-white/5 hover:bg-white/8'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${orgType === o.id ? 'border-[#89CFF0] bg-[#89CFF0]' : 'border-white/30'}`}>
                    {orgType === o.id && <Check size={12} className="text-[#0F1E2B]" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{o.label}</p>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-white/45">{o.sub}</p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="text-[28px] font-semibold tracking-tight">Pick your modules</h1>
            <p className="text-white/55 mt-2">You can enable more later in Settings.</p>
            <div className="mt-6 grid grid-cols-2 gap-2">
              {allModules.map((m) => {
                const on = selected.includes(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelected((s) => (s.includes(m.id) ? s.filter((x) => x !== m.id) : [...s, m.id]))}
                    className={`flex items-center gap-2.5 px-3 py-3 rounded-xl border text-left transition ${
                      on ? 'border-[#89CFF0] bg-[#89CFF0]/8' : 'border-white/10 bg-white/5 hover:bg-white/8'
                    }`}
                  >
                    <m.icon size={16} className={on ? 'text-[#89CFF0]' : 'text-white/55'} strokeWidth={1.75} />
                    <span className="text-[13px] font-medium">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="text-[28px] font-semibold tracking-tight">Finish setup</h1>
            <p className="text-white/55 mt-2">Tell us about your org, then optionally invite your team.</p>
            <div className="mt-6 space-y-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-1.5">Org name</p>
                <input
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Mountain Area Aid"
                  className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#89CFF0]/40"
                />
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-1.5">Contact email</p>
                <input
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="ops@yourorg.com"
                  type="email"
                  className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#89CFF0]/40"
                />
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-1.5">Invite team (optional)</p>
                <textarea
                  value={invites}
                  onChange={(e) => setInvites(e.target.value)}
                  placeholder={'alex@yourorg.com\njess@yourorg.com'}
                  rows={4}
                  className="w-full rounded-xl bg-white/5 border border-white/10 p-4 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#89CFF0]/40"
                />
              </div>
            </div>
          </>
        )}

        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="text-[13px] text-white/45 hover:text-white transition disabled:opacity-30"
            disabled={step === 0}
          >
            Back
          </button>
          {step < 2 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[#EF4E4B] hover:bg-[#d94340] font-medium text-[13px] transition"
            >
              Continue <ArrowRight size={14} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[#EF4E4B] hover:bg-[#d94340] font-medium text-[13px] transition disabled:opacity-60"
            >
              {submitting ? 'Setting up…' : 'Open SOS Connect'} <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
