'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Map, BarChart3, FileText } from 'lucide-react';

const NAV = [
  { path: '/gov/map', label: 'Situational Map', icon: Map },
  { path: '/gov/gaps', label: 'Gap Analysis', icon: BarChart3 },
  { path: '/gov/reports', label: 'Reports', icon: FileText },
];

export function GovShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const path = usePathname();

  return (
    <div className="min-h-screen bg-[#F7F5F0]">
      {/* Header */}
      <header className="bg-sos-blue-800 text-white px-6 py-4 border-b border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logomark.svg" alt="SOS" className="h-8 w-8" />
            <div>
              <h1 className="text-base font-bold leading-none">SOS | Government</h1>
              <p className="text-[10px] text-white/40 mt-0.5">READ ONLY — Aggregated Data — No PII</p>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
            {NAV.map(item => {
              const Icon = item.icon;
              const active = path === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    active ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* Title bar */}
      <div className="bg-white border-b border-sos-gray-300 px-6 py-3">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-base font-bold text-sos-blue-800">{title}</h2>
          {subtitle && <p className="text-xs text-sos-gray-600 mt-0.5">{subtitle}</p>}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}
