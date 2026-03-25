'use client';

import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

interface DashboardShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function DashboardShell({ title, subtitle, children }: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-sos-gray-200">
      <Sidebar />
      <div className="ml-56">
        <Topbar title={title} subtitle={subtitle} />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
