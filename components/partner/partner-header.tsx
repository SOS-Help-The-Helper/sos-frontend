'use client';

import { Bell, Building2, MessageSquare } from 'lucide-react';

interface PartnerHeaderProps {
  orgName: string;
  logoUrl?: string;
  primaryColor?: string;
  onAgentTap: () => void;
  notificationCount?: number;
}

export function PartnerHeader({
  orgName,
  logoUrl,
  primaryColor = '#FF6B00',
  onAgentTap,
  notificationCount,
}: PartnerHeaderProps) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes partner-radar-ping {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      ` }} />
      <div className="absolute top-0 left-0 right-0 z-[60] pt-[env(safe-area-inset-top,0px)]">
        <div className="flex items-center justify-between px-5 py-4 pb-8 bg-gradient-to-b from-[#1A3850] via-[#1A3850]/80 via-60% to-transparent">
          {/* Left: org logo + name */}
          <div className="flex items-center gap-2">
            {logoUrl
              ? <img src={logoUrl} alt={orgName} className="h-8 w-8 rounded object-contain bg-white/10" />
              : <Building2 size={28} className="text-white/70" />}
            <span className="text-sm font-semibold text-white leading-tight max-w-[140px] truncate">{orgName}</span>
          </div>

          {/* Right: bell + agent trigger */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bell size={22} className="text-white/80" />
              {notificationCount != null && notificationCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-0.5 flex items-center justify-center rounded-full bg-[#EF4E4B] text-white text-[9px] font-bold leading-none">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </div>
            <button
              onClick={onAgentTap}
              className="relative h-9 w-9 flex items-center justify-center overflow-visible"
              aria-label="Open Partner Agent"
            >
              <span className="absolute inset-0 rounded-full border-2" style={{ borderColor: primaryColor, animation: 'partner-radar-ping 3s ease-out infinite' }} />
              <span className="absolute inset-0 rounded-full border-2" style={{ borderColor: primaryColor, animation: 'partner-radar-ping 3s ease-out 1s infinite' }} />
              <span className="absolute inset-0 rounded-full border-2" style={{ borderColor: primaryColor, animation: 'partner-radar-ping 3s ease-out 2s infinite' }} />
              <MessageSquare size={18} className="relative z-10 text-white" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
