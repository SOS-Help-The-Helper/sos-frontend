'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Map, List, MessageSquare, User } from 'lucide-react';

const TABS = [
  { path: '/c', label: 'Map', icon: Map },
  { path: '/c/match', label: 'Match', icon: MessageSquare },
  { path: '/c/manage', label: 'Manage', icon: User },
];

interface CitizenShellProps {
  children: React.ReactNode;
  onSOSTap?: () => void;
  hideSOSButton?: boolean;
}

export function CitizenShell({ children, onSOSTap, hideSOSButton }: CitizenShellProps) {
  const pathname = usePathname();

  function isActive(path: string) {
    if (path === '/c') return pathname === '/c' || pathname === '/c/map';
    return pathname.startsWith(path);
  }

  return (
    <div style={{ width: '100vw', height: '100dvh', display: 'flex', flexDirection: 'column', background: '#0F1E2B', overflow: 'hidden', overscrollBehavior: 'none' }}>
      {/* Content */}
      <div style={{ flex: 1, position: 'relative' }}>
        {children}
      </div>

      {/* Floating SOS Button — REMOVED: agent trigger is now the pulsing logomark in header */}

      {/* Bottom Nav */}
      <nav className="on-dark fixed bottom-0 left-0 right-0 z-30 bg-[#0F1E2B] border-t border-white/20 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = isActive(tab.path);
            return (
              <Link key={tab.path} href={tab.path}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                  active ? 'text-[#EF4E4B]' : 'text-white/60'
                }`}>
                <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 1.8} />
                <span className="text-[10px] font-semibold tracking-wide">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
