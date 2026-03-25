'use client';

import { UserButton } from '@clerk/nextjs';

interface TopbarProps {
  title: string;
  subtitle?: string;
}

export function Topbar({ title, subtitle }: TopbarProps) {
  return (
    <header className="h-14 border-b border-sos-gray-300 bg-white flex items-center justify-between px-6">
      <div>
        <h2 className="text-base font-bold text-sos-blue-800 leading-none">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs text-sos-gray-600 mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-4">
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
