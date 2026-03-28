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
        <div className="hidden md:block">
          <Topbar title={title} subtitle={subtitle} currentView={currentView} onViewChange={onViewChange} />
        </div>
        <main className="pt-[env(safe-area-inset-top)] p-2 md:p-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>
    </div>
  );
}
