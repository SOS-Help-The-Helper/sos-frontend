'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Map, GitMerge, ClipboardList,
  LayoutGrid, ListChecks, Calendar, Package, UserPlus, LineChart, Sparkles, Settings,
} from 'lucide-react';
import { api } from '@/lib/api';

type ModuleId = 'directory' | 'cases' | 'map' | 'calendar' | 'inventory' | 'volunteers' | 'reporting' | 'agent';

const DEFAULT_MODULES: ModuleId[] = ['directory', 'cases', 'map', 'agent'];

const MODULE_NAV: Record<ModuleId, { path: string; label: string; icon: React.ElementType }> = {
  directory:  { path: '/directory',  label: 'Directory',  icon: LayoutGrid },
  cases:      { path: '/cases',      label: 'Cases',      icon: ListChecks },
  map:        { path: '/map',        label: 'Map',        icon: Map },
  calendar:   { path: '/calendar',   label: 'Calendar',   icon: Calendar },
  inventory:  { path: '/inventory',  label: 'Inventory',  icon: Package },
  volunteers: { path: '/volunteers', label: 'Volunteers', icon: UserPlus },
  reporting:  { path: '/reporting',  label: 'Reporting',  icon: LineChart },
  agent:      { path: '/agent',      label: 'Agent',      icon: Sparkles },
};

interface PartnerShellProps {
  children: React.ReactNode;
  orgSlug: string;
  orgId?: string;
  tabs?: { path: string; label: string; icon: React.ElementType }[];
}

export function PartnerShell({ children, orgSlug, orgId, tabs }: PartnerShellProps) {
  const pathname = usePathname();
  const [portalModules, setPortalModules] = useState<ModuleId[]>(DEFAULT_MODULES);

  useEffect(() => {
    if (!orgId) return;
    api.efCall('crm-onboard', { action: 'get_modules', org_id: orgId })
      .then((res: unknown) => {
        const r = res as { modules?: unknown };
        if (Array.isArray(r?.modules) && r.modules.length > 0) {
          setPortalModules(r.modules as ModuleId[]);
        }
      })
      .catch(() => {
        // keep DEFAULT_MODULES
      });
  }, [orgId]);

  const resolvedTabs = tabs ?? [
    { path: `/app`,        label: 'Map',    icon: Map },
    { path: `/app/match`,  label: 'Match',  icon: GitMerge },
    { path: `/app/manage`, label: 'Manage', icon: ClipboardList },
  ];

  function isActive(path: string) {
    if (path === '/app') return pathname === '/app';
    return pathname.startsWith(path);
  }

  const crmItems = portalModules
    .filter((m): m is ModuleId => m in MODULE_NAV)
    .map(m => ({ ...MODULE_NAV[m], key: m }));

  return (
    <div style={{ width: '100vw', height: '100dvh', display: 'flex', background: '#0F1E2B', overflow: 'hidden', overscrollBehavior: 'none' }}>

      {/* Left sidebar */}
      <nav className="flex flex-col w-52 shrink-0 bg-[#1A3850] border-r border-white/10 pt-4 pb-[env(safe-area-inset-bottom)]">

        {/* CRM section */}
        <div className="px-5 mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-white/30">CRM</span>
        </div>
        {crmItems.map(item => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link key={item.key} href={item.path}
              className={`flex items-center gap-3 px-3 py-2 mx-2 rounded-lg transition-colors ${
                active ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}>
              <Icon className="h-4 w-4 shrink-0" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}

        {/* Divider + existing tabs */}
        <div className="my-3 mx-3 border-t border-white/10" />
        {resolvedTabs.map(tab => {
          const Icon = tab.icon;
          const active = isActive(tab.path);
          return (
            <Link key={tab.path} href={tab.path}
              className={`flex items-center gap-3 px-3 py-2 mx-2 rounded-lg transition-colors ${
                active ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}>
              <Icon className="h-4 w-4 shrink-0" />
              <span className="text-sm font-medium">{tab.label}</span>
            </Link>
          );
        })}

        {/* Push Manage Modules to bottom */}
        <div className="flex-1" />

        <div className="mx-3 mb-3 border-t border-white/10 pt-3">
          <Link href="/settings"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              pathname === '/settings' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}>
            <Settings className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium">Manage Modules</span>
          </Link>
        </div>
      </nav>

      {/* Main content */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {children}
      </div>

    </div>
  );
}
