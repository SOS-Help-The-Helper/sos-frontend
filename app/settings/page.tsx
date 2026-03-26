'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/dashboard-shell';
import { getSystemConfig } from '@/lib/org-queries';

export default function SettingsPage() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await getSystemConfig();
      setConfigs(data);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <DashboardShell title="Settings" subtitle="Loading...">
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-5 h-40 animate-pulse" />
          ))}
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Settings" subtitle="Platform configuration and system weights">
      <div className="space-y-4">
        {configs.map((config: any) => (
          <div key={config.id} className="bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-sos-blue-800 capitalize">
                  {config.config_key?.replace(/_/g, ' ')}
                </h3>
                <p className="text-[10px] text-sos-gray-500 mt-0.5">
                  Version {config.version} · {config.change_reason || 'No reason documented'}
                </p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-sos-gray-200 text-sos-gray-600">
                v{config.version}
              </span>
            </div>

            {config.config_value && typeof config.config_value === 'object' && (
              <div className="space-y-2.5">
                {Object.entries(config.config_value).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-xs text-sos-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                    <div className="flex items-center gap-3">
                      {/* Visual weight bar */}
                      <div className="w-24 h-1.5 bg-sos-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-sos-accent-500 rounded-full"
                          style={{ width: `${Math.min(100, (value as number) * (config.config_key === 'triage_factors' ? 4 : 3.33))}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-sos-blue-800 w-8 text-right">{value as number}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Platform Info */}
        <div className="bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-5">
          <h3 className="text-sm font-bold text-sos-blue-800 mb-4">Platform</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div>
              <span className="text-[10px] text-sos-gray-500 uppercase tracking-wider">Database</span>
              <p className="text-xs text-sos-blue-800">Supabase · us-east-2</p>
              <p className="text-[10px] text-sos-gray-500">rtduqguwhkczexnoawej</p>
            </div>
            <div>
              <span className="text-[10px] text-sos-gray-500 uppercase tracking-wider">Schema</span>
              <p className="text-xs text-sos-blue-800">SIGNAL V2</p>
              <p className="text-[10px] text-sos-gray-500">29 intelligence tables + operational</p>
            </div>
            <div>
              <span className="text-[10px] text-sos-gray-500 uppercase tracking-wider">Repo</span>
              <p className="text-xs text-sos-accent-700">SOS-Help-The-Helper/sos-frontend</p>
            </div>
            <div>
              <span className="text-[10px] text-sos-gray-500 uppercase tracking-wider">Runtime</span>
              <p className="text-xs text-sos-blue-800">OpenClaw · 12 agents</p>
              <p className="text-[10px] text-sos-gray-500">7 SOS product agents</p>
            </div>
          </div>
        </div>

        {/* Links */}
        <div className="bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-5">
          <h3 className="text-sm font-bold text-sos-blue-800 mb-3">Quick Links</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {[
              { label: 'Supabase Dashboard', href: 'https://supabase.com/dashboard/project/rtduqguwhkczexnoawej' },
              { label: 'Vercel Dashboard', href: 'https://vercel.com/sos2' },
              { label: 'GitHub Repo', href: 'https://github.com/SOS-Help-The-Helper/sos-frontend' },
              { label: 'Figma UI Kit', href: 'https://figma.com/design/zm3th1z8vqPHTZepACCWD5' },
              { label: 'sosconnect.org', href: 'https://sosconnect.org' },
              { label: 'Architecture Viz', href: 'https://sos-architecture-viz.vercel.app' },
            ].map(link => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-sos-accent-700 hover:text-sos-accent-900 py-1.5 px-3 rounded-lg bg-sos-gray-200/50 hover:bg-sos-accent-50 transition-colors"
              >
                {link.label} ↗
              </a>
            ))}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
