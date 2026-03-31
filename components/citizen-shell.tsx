'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Map, List, MessageSquare, User } from 'lucide-react';

const TABS = [
  { path: '/c', label: 'Map', icon: Map },
  { path: '/c/feed', label: 'Feed', icon: List },
  { path: '/c/agent', label: 'Agent', icon: MessageSquare },
  { path: '/c/profile', label: 'Profile', icon: User },
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
    <div className="min-h-screen bg-[#0F1E2B] flex flex-col">
      {/* Content */}
      <div className="flex-1 relative overflow-x-hidden" style={{ height: 'calc(100vh - 56px - env(safe-area-inset-bottom, 0px))' }}>
        {children}
      </div>

      {/* Floating SOS Button */}
      {!hideSOSButton && (
        <button
          onClick={onSOSTap}
          className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-[#EF4E4B] shadow-lg ring-2 ring-white/30 flex items-center justify-center active:scale-95 transition-transform"
          style={{ boxShadow: '0 0 20px rgba(239, 78, 75, 0.4)' }}
        >
          <img src="/logomark-white.svg" alt="SOS" className="h-7 w-7" />
          {/* Pulse ring */}
          <span className="absolute inset-0 rounded-full bg-sos-red-500 animate-ping opacity-20" />
        </button>
      )}

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-[#1A3850] border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
          {TABS.map(tab => {
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
