'use client';

import { Sidebar } from './sidebar';
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
    <div className="min-h-screen bg-sos-gray-200">
      <Sidebar />
      <div className="ml-56">
        <Topbar title={title} subtitle={subtitle} currentView={currentView} onViewChange={onViewChange} />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
