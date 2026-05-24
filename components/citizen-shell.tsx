'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Map, Heart, Inbox } from 'lucide-react';
import { TopNav } from '@/components/shell/top-nav';

const BOTTOM_TABS = [
  { path: '/c', label: 'Map', icon: Map },
  { path: '/c/match', label: 'Match', icon: Heart },
  { path: '/c/manage', label: 'Manage', icon: Inbox },
];

interface CitizenShellProps {
  children: React.ReactNode;
  title?: string;
  onSOSTap?: () => void;
  hideSOSButton?: boolean;
}

export function CitizenShell({ children, title, onSOSTap, hideSOSButton }: CitizenShellProps) {
  const pathname = usePathname();

  function isActive(path: string) {
    if (path === '/c') return pathname === '/c' || pathname === '/c/map';
    return pathname.startsWith(path);
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-app)', color: 'var(--foreground)', display: 'flex', flexDirection: 'column' }}>
      <TopNav
        enabledModules={[]}
        labels={{}}
      />
      {title && (
        <div style={{ padding: '16px 20px 0', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--sos-coral)' }}>
          {title}
        </div>
      )}
      <main style={{ flex: 1, paddingBottom: 88 }}>{children}</main>

      {/* Mobile bottom tabs */}
      <nav
        className="md:hidden"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'var(--sos-white)', borderTop: '1px solid var(--sos-hairline)',
          display: 'flex', justifyContent: 'space-around',
          paddingTop: 8, paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
          zIndex: 30,
        }}
      >
        {BOTTOM_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.path);
          return (
            <Link
              key={tab.path}
              href={tab.path}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 4, padding: '4px 20px',
                color: active ? 'var(--sos-coral)' : 'var(--sos-muted)',
                textDecoration: 'none', fontSize: 11, fontWeight: 600,
              }}
            >
              <Icon size={20} strokeWidth={1.75} />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
