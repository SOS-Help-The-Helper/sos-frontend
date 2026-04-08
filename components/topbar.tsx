'use client';

import { ViewSwitcher } from './view-switcher';

interface TopbarProps {
  title: string;
  subtitle?: string;
  currentView?: string;
  onViewChange?: (viewId: string) => void;
}

export function Topbar({ title, subtitle, currentView, onViewChange }: TopbarProps) {
  return (
    <header className="min-h-[56px] md:min-h-[56px] pt-[env(safe-area-inset-top)] border-b border-white/10 bg-sos-blue-800 flex items-center justify-between px-4 md:px-6 py-3">
      <div>
        <h2 className="text-lg font-bold text-white leading-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs text-sos-accent-400 mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        {currentView && onViewChange && (
          <ViewSwitcher currentView={currentView} onViewChange={onViewChange} />
        )}
        <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">
          SOS
        </div>
      </div>
    </header>
  );
}
