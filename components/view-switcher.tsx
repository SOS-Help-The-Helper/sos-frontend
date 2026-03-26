'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuthContext } from '@/lib/auth-context';
import { ChevronDown, Shield, User, Building2 } from 'lucide-react';

const VIEWS = [
  { id: 'admin', label: 'Admin (All)', icon: '🛡️', type: 'admin' },
  { id: 'citizen', label: 'Citizen View', icon: '👤', type: 'citizen' },
  { divider: true },
  { id: '43299807-6229-49be-9a6b-0498c9188178', label: 'Aid Arena', icon: '🤝', type: 'partner' },
  { id: 'da86c92f-d52d-4b13-a474-30e1be8fb808', label: 'Emergency RV', icon: '🚐', type: 'partner' },
  { id: '9d894368-51af-4cf7-9318-444a3c216f5d', label: 'Free Hot Meals', icon: '🍽️', type: 'partner' },
  { id: 'c1e74116-5e12-410a-9b21-dc80c7646d77', label: 'Greater Good', icon: '📦', type: 'partner' },
  { id: '2d84a5d4-41a6-4817-8c36-37d6f8cd727a', label: 'Endurant', icon: '🔨', type: 'vendor' },
] as const;

interface ViewSwitcherProps {
  currentView: string;
  onViewChange: (viewId: string) => void;
}

export function ViewSwitcher({ currentView, onViewChange }: ViewSwitcherProps) {
  const { isAdmin } = useAuthContext();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Always show toggle — for demos and admin review without auth

  const current = VIEWS.find(v => 'id' in v && v.id === currentView) || VIEWS[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
      >
        <span className="text-xs text-white/60">Viewing as:</span>
        <span className="text-xs font-semibold text-white">
          {'icon' in current! ? current!.icon : ''} {'label' in current! ? current!.label : 'Admin'}
        </span>
        <ChevronDown className={`h-3 w-3 text-white/60 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-[#FDFCFA] rounded-xl border border-sos-gray-300 shadow-lg py-1 z-50">
          {VIEWS.map((view, i) => {
            if ('divider' in view) {
              return <div key={i} className="h-px bg-sos-gray-300 my-1" />;
            }
            const isActive = currentView === view.id;
            return (
              <button
                key={view.id}
                onClick={() => { onViewChange(view.id); setOpen(false); }}
                className={`w-full text-left px-3 py-2 flex items-center gap-2.5 text-xs transition-colors ${
                  isActive
                    ? 'bg-sos-accent-50 text-sos-blue-800 font-semibold'
                    : 'text-sos-gray-700 hover:bg-sos-gray-200'
                }`}
              >
                <span className="text-sm">{view.icon}</span>
                <span>{view.label}</span>
                {isActive && <span className="ml-auto text-sos-accent-600 text-[10px]">●</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
