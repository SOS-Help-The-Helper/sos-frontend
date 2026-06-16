'use client';

import { NotificationBell } from '@/components/notification-bell';
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
  agentOpen?: boolean;
}

export function CitizenHeader({ onAgentTap, locationName, status, agentOpen = false }: CitizenHeaderProps) {
  const resolved = STATUS_MAP[status] || STATUS_MAP['safe'];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes radar-ping {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes logo-tap {
          0% { transform: scale(1); }
          30% { transform: scale(1.3); }
          60% { transform: scale(0.9); }
          100% { transform: scale(0); opacity: 0; }
        }
      ` }} />
      <div className="on-dark absolute top-0 left-0 right-0 z-[60] pt-[env(safe-area-inset-top,0px)]">
        <div className="flex items-center justify-between px-5 py-4 pb-12 bg-gradient-to-b from-[#1A3850] via-[#1A3850]/80 via-60% to-transparent">
          {/* Left: logomark — hidden when agent is open */}
          <button
            onClick={onAgentTap}
            className={`relative h-9 w-9 flex items-center justify-center overflow-visible transition-all duration-300 ${agentOpen ? 'opacity-0 scale-0 pointer-events-none' : 'opacity-100 scale-100'}`}
            aria-label="Open SOS Agent"
          >
            <span className="absolute inset-0 rounded-full border-2 border-[#EF4E4B]" style={{ animation: 'radar-ping 3s ease-out infinite' }} />
            <span className="absolute inset-0 rounded-full border-2 border-[#EF4E4B]" style={{ animation: 'radar-ping 3s ease-out 1s infinite' }} />
            <span className="absolute inset-0 rounded-full border-2 border-[#EF4E4B]" style={{ animation: 'radar-ping 3s ease-out 2s infinite' }} />
            <img src="/logomark.svg" alt="SOS" className="h-8 w-8 relative z-10" />
          </button>

          {/* Center: location */}
          <div className="absolute left-0 right-0 flex items-center justify-center pointer-events-none">
            <span className="text-[11px] font-medium text-white/70">📍 {locationName}</span>
          </div>

          {/* Right: notification bell */}
          <div className="relative">
            <NotificationBell recipientType="citizen" recipientId={typeof window !== 'undefined' ? getPersonId() : null} />
          </div>
        </div>
      </div>
    </>
  );
}
