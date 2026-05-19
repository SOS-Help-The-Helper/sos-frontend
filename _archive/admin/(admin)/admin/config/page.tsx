'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/admin-shell';
// TODO: rewire to lib/api.ts (Phase 3-5) — import { getSystemConfig } from '@/lib/org-queries';
import { NervousSystem } from '@/components/nervous-system';

export default function AdminConfigPage() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNervousSystem, setShowNervousSystem] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await getSystemConfig();
      setConfigs(data);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <AdminShell title="Configuration" subtitle="System weights, agent settings, and platform info">
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-3 border-sos-accent-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-5">
          {/* Nervous System toggle */}
          <div className="bg-white rounded-xl border border-sos-gray-300 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-sos-blue-800">Nervous System Visualization</h3>
              <button
                onClick={() => setShowNervousSystem(!showNervousSystem)}
                className="text-xs px-3 py-1.5 rounded-lg bg-sos-blue-800 text-white font-semibold hover:bg-sos-blue-700 transition-colors"
              >
                {showNervousSystem ? 'Hide' : 'Show'}
              </button>
            </div>
            {showNervousSystem && <NervousSystem metrics={undefined} />}
          </div>

          {/* System configs */}
          {configs.map((config: any) => (
            <div key={config.id} className="bg-white rounded-xl border border-sos-gray-300 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-sos-blue-800 capitalize">
                    {config.config_key?.replace(/_/g, ' ')}
                  </h3>
                  <p className="text-[10px] text-sos-gray-500 mt-0.5">
                    Version {config.version} · {config.change_reason || 'No reason documented'}
                  </p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sos-gray-200 text-sos-gray-600">v{config.version}</span>
              </div>
              {config.config_value && typeof config.config_value === 'object' && (
                <div className="space-y-2.5">
                  {Object.entries(config.config_value).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-xs text-sos-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-1.5 bg-sos-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-sos-accent-500 rounded-full" style={{ width: `${Math.min(100, (value as number) * 3.33)}%` }} />
                        </div>
                        <span className="text-sm font-bold text-sos-blue-800 w-8 text-right">{value as number}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Platform info */}
          <div className="bg-white rounded-xl border border-sos-gray-300 p-5">
            <h3 className="text-sm font-bold text-sos-blue-800 mb-4">Platform</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] text-sos-gray-500 uppercase tracking-wider">Operational DB</span>
                <p className="text-xs text-sos-blue-800">Supabase · rtduqguwhkczexnoawej · us-east-2</p>
              </div>
              <div>
                <span className="text-[10px] text-sos-gray-500 uppercase tracking-wider">Intelligence DB</span>
                <p className="text-xs text-sos-blue-800">Henry Brain · vqudlavumxwslfejqupy</p>
              </div>
              <div>
                <span className="text-[10px] text-sos-gray-500 uppercase tracking-wider">Schema</span>
                <p className="text-xs text-sos-blue-800">SIGNAL V2 — 29 tables</p>
              </div>
              <div>
                <span className="text-[10px] text-sos-gray-500 uppercase tracking-wider">Runtime</span>
                <p className="text-xs text-sos-blue-800">OpenClaw · 5 SOS agents</p>
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div className="bg-white rounded-xl border border-sos-gray-300 p-5">
            <h3 className="text-sm font-bold text-sos-blue-800 mb-3">Quick Links</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[
                { label: 'Supabase', href: 'https://supabase.com/dashboard/project/rtduqguwhkczexnoawej' },
                { label: 'Henry Brain', href: 'https://supabase.com/dashboard/project/vqudlavumxwslfejqupy' },
                { label: 'Vercel', href: 'https://vercel.com/sos2' },
                { label: 'GitHub', href: 'https://github.com/SOS-Help-The-Helper/sos-frontend' },
                { label: 'Figma', href: 'https://figma.com/design/zm3th1z8vqPHTZepACCWD5' },
                { label: 'sosconnect.org', href: 'https://sosconnect.org' },
              ].map(link => (
                <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-sos-accent-700 hover:text-sos-accent-900 py-1.5 px-3 rounded-lg bg-sos-gray-100 hover:bg-sos-accent-50 transition-colors">
                  {link.label} ↗
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
