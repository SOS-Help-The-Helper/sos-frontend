'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Map, Users, Package, Truck } from 'lucide-react';

interface PartnerShellProps {
  children: React.ReactNode;
  orgSlug: string;
  tabs?: { path: string; label: string; icon: any }[];
}

export function PartnerShell({ children, orgSlug, tabs }: PartnerShellProps) {
  const pathname = usePathname();

  const resolvedTabs = tabs ?? [
    { path: `/app`,          label: 'Map',        icon: Map },
    { path: `/app/people`,   label: 'People',     icon: Users },
    { path: `/app/assets`,   label: 'Assets',     icon: Package },
    { path: `/app/deliver`,  label: 'Deliveries', icon: Truck },
  ];

  function isActive(path: string) {
    const base = `/p/${orgSlug}`;
    if (path === base) return pathname === base;
    return pathname.startsWith(path);
  }

  return (
    <div style={{ width: '100vw', height: '100dvh', display: 'flex', flexDirection: 'column', background: '#0F1E2B', overflow: 'hidden', overscrollBehavior: 'none' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        {children}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-[#1A3850] border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
          {resolvedTabs.map(tab => {
            const Icon = tab.icon;
            const active = isActive(tab.path);
            return (
              <Link key={tab.path} href={tab.path}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                  active ? 'text-sos-red-400' : 'text-white/40'
                }`}>
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
