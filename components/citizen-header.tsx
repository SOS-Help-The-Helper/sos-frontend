'use client';

import { NotificationBell } from '@/components/notification-panel';
import { getPersonId } from '@/lib/person-cookie';

const STATUS_MAP: Record<string, { emoji: string; label: string }> = {
  safe: { emoji: '🟢', label: 'Safe' },
  monitoring: { emoji: '🟡', label: 'Monitoring' },
  impacted: { emoji: '🔴', label: 'Impacted' },
  // Legacy keys from map page
  watch: { emoji: '🟡', label: 'Watch' },
  active: { emoji: '🔴', label: 'Active' },
};

interface CitizenHeaderProps {
  onAgentTap: () => void;
  locationName: string;
  status: string;
}

export function CitizenHeader({ onAgentTap, locationName, status }: CitizenHeaderProps) {
  const resolved = STATUS_MAP[status] || STATUS_MAP['safe'];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes radar-ping {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      ` }} />
      <div className="absolute top-0 left-0 right-0 z-[60] pt-[env(safe-area-inset-top,0px)]">
        <div className="flex items-center justify-between px-5 py-4 pb-12 bg-gradient-to-b from-[#1A3850] via-[#1A3850]/80 via-60% to-transparent">
          {/* Left: logomark */}
          <button
            onClick={onAgentTap}
            className="relative h-9 w-9 flex items-center justify-center overflow-visible"
            aria-label="Open SOS Agent"
          >
            <span className="absolute inset-0 rounded-full border-2 border-[#EF4E4B]" style={{ animation: 'radar-ping 3s ease-out infinite' }} />
            <span className="absolute inset-0 rounded-full border-2 border-[#EF4E4B]" style={{ animation: 'radar-ping 3s ease-out 1s infinite' }} />
            <span className="absolute inset-0 rounded-full border-2 border-[#EF4E4B]" style={{ animation: 'radar-ping 3s ease-out 2s infinite' }} />
            <img src="/logomark.svg" alt="SOS" className="h-8 w-8 relative z-10" />
          </button>

          {/* Center: status chip + location */}
          <div className="absolute left-0 right-0 flex flex-col items-center pointer-events-none">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/30 backdrop-blur-sm pointer-events-auto">
              <span className="text-xs">{resolved.emoji}</span>
              <span className="text-[10px] font-bold text-white">{resolved.label}</span>
            </div>
            <span className="text-[11px] font-medium text-white/70 mt-0.5">📍 {locationName}</span>
          </div>

          {/* Right: notification bell */}
          <div className="relative">
            <NotificationBell personId={typeof window !== 'undefined' ? getPersonId() : null} />
          </div>
        </div>
      </div>
    </>
  );
}
