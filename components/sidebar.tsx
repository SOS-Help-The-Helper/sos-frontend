'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  GitCompare,
  BarChart3,
  MessageSquare,
  Building2,
  Settings,
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Command Center', icon: LayoutDashboard },
  { path: '/matching', label: 'Matching', icon: GitCompare },
  { path: '/reporting', label: 'Reporting', icon: BarChart3 },
  { path: '/organizations', label: 'Organizations', icon: Building2 },
  { path: '/agent', label: 'SOS Agent', icon: MessageSquare },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-56 flex flex-col bg-sos-blue-800 z-50">
      {/* Logo */}
      <div className="p-5 border-b border-white/10">
        <Link href="/" className="flex items-center gap-3">
          <img
            src="/logomark.svg"
            alt="SOS"
            className="h-8 w-8"
          />
          <div>
            <h1 className="text-white text-base font-bold tracking-tight leading-none">
              SOS
            </h1>
            <p className="text-sos-accent-500 text-[10px] font-medium tracking-wide mt-0.5">
              CONNECT
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-150
                ${active
                  ? 'bg-sos-red-500 text-white shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
                }
              `}
            >
              <Icon className="h-[18px] w-[18px] flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <p className="text-[10px] text-white/30 font-medium">
          Everyone Is a Helper
        </p>
      </div>
    </aside>
  );
}
