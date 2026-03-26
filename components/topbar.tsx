'use client';

import { UserButton } from '@clerk/nextjs';
import { ViewSwitcher } from './view-switcher';

interface TopbarProps {
  title: string;
  subtitle?: string;
  currentView?: string;
  onViewChange?: (viewId: string) => void;
}

export function Topbar({ title, subtitle, currentView, onViewChange }: TopbarProps) {
  return (
    <header className="h-14 border-b border-white/10 bg-sos-blue-800 flex items-center justify-between px-6">
      <div>
        <h2 className="text-base font-bold text-white leading-none">
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
        <UserButton
          appearance={{
            elements: {
              avatarBox: 'h-8 w-8',
            },
          }}
        />
      </div>
    </header>
  );
}
