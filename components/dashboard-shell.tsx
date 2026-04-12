'use client';

import { Sidebar } from './sidebar';
import { BottomTabs } from './bottom-tabs';
import { Topbar } from './topbar';

interface DashboardShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  currentView?: string;
  onViewChange?: (viewId: string) => void;
}

export function DashboardShell({ title, subtitle, children, currentView, onViewChange }: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-[#F7F5F0]">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile bottom tabs */}
      <div className="md:hidden">
        <BottomTabs />
      </div>

      {/* Content */}
      <div className="md:ml-56">
        {/* Mobile header */}
        <div className="md:hidden sticky top-0 z-30 bg-sos-blue-800 px-4 py-3 pt-[env(safe-area-inset-top)]">
          <h1 className="text-base font-bold text-white leading-tight">{title}</h1>
          {subtitle && <p className="text-[10px] text-sos-accent-400 mt-0.5">{subtitle}</p>}
        </div>

        {/* Desktop header */}
        <div className="hidden md:block">
          <Topbar title={title} subtitle={subtitle} currentView={currentView} onViewChange={onViewChange} />
        </div>
        <main className="p-4 md:p-6 pb-24 md:pb-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
