'use client';

import { useState } from 'react';
import { Shell } from '@/components/onboarding/Shell';
import { Screen1OrgType } from '@/components/onboarding/Screen1OrgType';
import { Screen2Details } from '@/components/onboarding/Screen2Details';
import { Screen3Modules } from '@/components/onboarding/Screen3Modules';
import { Screen4Import } from '@/components/onboarding/Screen4Import';
import { Screen5Done } from '@/components/onboarding/Screen5Done';
import { DEFAULT_MODULES, type OrgType, type ModuleId, type OnboardingData } from '@/components/onboarding/types';
import { api } from '@/lib/api';

const EMPTY: OnboardingData = {
  orgType: null, orgName: '', domain: '', location: '', email: '',
  modules: [], importedFile: null, importedCount: 0,
};

export default function OnboardPage() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(EMPTY);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const update = (partial: Partial<OnboardingData>) => setData(prev => ({ ...prev, ...partial }));

  const next = () => setStep(s => s + 1);
  const back = () => setStep(s => Math.max(1, s - 1));

  async function handleStep2Continue() {
    setLoading(true);
    try {
      const res = await api.efCall<{ org_id: string }>('crm-onboard', {
        action: 'create_org',
        name: data.orgName,
        org_type: data.orgType,
        contact_email: data.email,
        location_name: data.location,
      });
      setOrgId(res.org_id);
    } catch { /* non-blocking — proceed anyway */ }
    setLoading(false);
    next();
  }

  async function handleStep3Continue() {
    setLoading(true);
    try {
      await api.efCall('crm-onboard', { action: 'set_modules', org_id: orgId, modules: data.modules });
    } catch { /* non-blocking */ }
    setLoading(false);
    next();
  }

  async function handleStep4Continue() {
    setLoading(true);
    try {
      await api.efCall('crm-onboard', { action: 'complete_onboarding', org_id: orgId });
    } catch { /* non-blocking */ }
    setLoading(false);
    next();
  }

  return (
    <Shell step={step - 1} onBack={step > 1 && step < 5 ? back : undefined}>
      {step === 1 && (
        <Screen1OrgType
          selected={data.orgType}
          onSelect={(id: OrgType) => update({ orgType: id, modules: DEFAULT_MODULES[id] })}
          onContinue={next}
        />
      )}
      {step === 2 && (
        <Screen2Details
          data={data}
          onUpdate={update}
          onContinue={handleStep2Continue}
        />
      )}
      {step === 3 && (
        <Screen3Modules
          selected={data.modules}
          onToggle={(id: ModuleId) => update({ modules: data.modules.includes(id) ? data.modules.filter(m => m !== id) : [...data.modules, id] })}
          onContinue={handleStep3Continue}
        />
      )}
      {step === 4 && (
        <Screen4Import
          data={data}
          onUpdate={update}
          onContinue={handleStep4Continue}
          onSkip={handleStep4Continue}
        />
      )}
      {step === 5 && <Screen5Done data={data} />}
      {loading && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,30,43,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ width: 32, height: 32, border: '3px solid rgba(255,255,255,0.2)', borderTopColor: '#EF4E4B', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </Shell>
  );
}
