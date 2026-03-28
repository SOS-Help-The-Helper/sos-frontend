'use client';

import { DashboardShell } from '@/components/dashboard-shell';
import { useAuthContext } from '@/lib/auth-context';
import { useViewContext } from '@/lib/view-context';
import { Shield, User, Building2, Check } from 'lucide-react';

const VIEWS = [
  { id: 'admin', label: 'Admin', description: 'See all data across all organizations', icon: '🛡️', color: 'border-sos-red-300 bg-sos-red-50' },
  { id: 'citizen', label: 'Citizen View', description: 'See what a disaster survivor sees', icon: '👤', color: 'border-sos-accent-300 bg-sos-accent-50' },
  { divider: true, label: 'Partner Views' },
  { id: '43299807-6229-49be-9a6b-0498c9188178', label: 'Aid Arena', description: 'Coordination hub — manages volunteers and multi-org response', icon: '🤝', color: 'border-green-300 bg-green-50' },
  { id: 'da86c92f-d52d-4b13-a474-30e1be8fb808', label: 'Emergency RV', description: 'Transport & housing — RV fleet deployment', icon: '🚐', color: 'border-sos-accent-300 bg-sos-accent-50' },
  { id: '9d894368-51af-4cf7-9318-444a3c216f5d', label: 'Free Hot Meals', description: 'Food service — meal distribution events', icon: '🍽️', color: 'border-yellow-300 bg-yellow-50' },
  { id: 'c1e74116-5e12-410a-9b21-dc80c7646d77', label: 'Greater Good', description: 'Supply warehouse — emergency supplies & equipment', icon: '📦', color: 'border-sos-blue-200 bg-sos-blue-50' },
  { divider: true, label: 'Vendor Views' },
  { id: '2d84a5d4-41a6-4817-8c36-37d6f8cd727a', label: 'Endurant', description: 'Vendor — restoration, debris removal, heavy equipment', icon: '🔨', color: 'border-yellow-300 bg-yellow-50' },
];

export default function ViewAs() {
  // For now, store view selection in localStorage and read from auth context
  const { currentView: activeView, setCurrentView } = useViewContext();
  const currentView = activeView;

  function selectView(viewId: string) {
    setCurrentView(viewId);
    // Reload to apply the new view across all pages
    window.location.href = '/';
  }

  return (
    <DashboardShell title="View As" subtitle="Switch perspective to see what each user sees">
      <div className="max-w-lg space-y-2">
        {VIEWS.map((view, i) => {
          if ('divider' in view && view.divider) {
            return (
              <div key={i} className="pt-4 pb-1">
                <p className="text-[10px] font-bold text-sos-gray-500 uppercase tracking-wider">{view.label}</p>
              </div>
            );
          }

          const isActive = currentView === view.id;

          return (
            <button
              key={view.id}
              onClick={() => selectView(view.id!)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                isActive
                  ? `${view.color} shadow-sm`
                  : 'border-sos-gray-300 bg-white hover:border-sos-accent-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{view.icon}</span>
                  <div>
                    <p className="text-sm font-bold text-sos-blue-800">{view.label}</p>
                    <p className="text-xs text-sos-gray-600 mt-0.5">{view.description}</p>
                  </div>
                </div>
                {isActive && (
                  <div className="w-6 h-6 rounded-full bg-sos-red-500 flex items-center justify-center flex-shrink-0">
                    <Check className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-[10px] text-sos-gray-500 mt-6 max-w-lg">
        Switching views changes what data you see across all pages. Admin sees everything. Partner views are scoped to that organization's data only.
      </p>
    </DashboardShell>
  );
}
