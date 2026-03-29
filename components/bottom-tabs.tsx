'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthContext } from '@/lib/auth-context';
import { useViewContext } from '@/lib/view-context';
import { getPortalConfig } from '@/lib/portal-config';
import { useNotifications } from '@/lib/notification-context';
import {
  MessageSquare,
  Map,
  GitCompare,
  MoreHorizontal,
  BarChart3,
  ClipboardList,
  Building2,
  Settings,
  Eye,
  X,
} from 'lucide-react';
import { useState } from 'react';

const mainTabs = [
  { path: '/', label: 'Agent', icon: MessageSquare },
  { path: '/map', label: 'Map', icon: Map },
  { path: '/matching', label: 'Matches', icon: GitCompare },
];

const moreTabs = [
  { path: '/management', label: 'Management', icon: ClipboardList, adminOnly: false },
  { path: '/reporting', label: 'Reports', icon: BarChart3, adminOnly: false },
  { path: '/view', label: 'View As', icon: Eye, adminOnly: true },
  { path: '/organizations', label: 'Organizations', icon: Building2, adminOnly: true },
  { path: '/settings', label: 'Settings', icon: Settings, adminOnly: true },
];

export function BottomTabs() {
  const pathname = usePathname();
  const { isAdmin, orgType } = useAuthContext();
  const { effectiveOrgType } = useViewContext();
  const { unreadCount } = useNotifications();
  const portalConfig = getPortalConfig(effectiveOrgType);
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  const isMoreActive = moreTabs.some(t => isActive(t.path));
  const filteredMore = moreTabs.filter(t => isAdmin || !t.adminOnly);

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="absolute bottom-[calc(56px+env(safe-area-inset-bottom))] left-0 right-0 bg-white rounded-t-2xl border-t border-sos-gray-300 shadow-xl p-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-sos-blue-800">More</span>
              <button onClick={() => setMoreOpen(false)} className="p-1">
                <X className="h-4 w-4 text-sos-gray-500" />
              </button>
            </div>
            <div className="space-y-1">
              {filteredMore.map(tab => {
                const Icon = tab.icon;
                const active = isActive(tab.path);
                return (
                  <Link
                    key={tab.path}
                    href={tab.path}
                    onClick={() => setMoreOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                      active ? 'bg-sos-red-50 text-sos-red-500' : 'text-sos-gray-700 hover:bg-sos-gray-200'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-sm font-medium">{tab.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-sos-blue-800 border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-16">
          {mainTabs.map(tab => {
            const Icon = tab.icon;
            const active = isActive(tab.path);
            return (
              <Link
                key={tab.path}
                href={tab.path}
                className={`relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                  active ? 'text-sos-red-400' : 'text-white/50'
                }`}
              >
                <div className="relative">
                  <Icon className="h-5.5 w-5.5" />
                  {tab.path === '/matching' && unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 bg-sos-red-500 text-white text-[8px] font-bold px-1 py-0 rounded-full min-w-[14px] text-center leading-[14px]">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-medium mt-0.5">{
                  tab.path === '/' ? portalConfig.labels.agent :
                  tab.path === '/map' ? portalConfig.labels.map :
                  tab.path === '/matching' ? portalConfig.labels.matching :
                  tab.label
                }</span>
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
              isMoreActive || moreOpen ? 'text-sos-red-400' : 'text-white/50'
            }`}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
