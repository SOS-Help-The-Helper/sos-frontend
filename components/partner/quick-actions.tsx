'use client';

interface QuickActionsProps {
  type: 'request' | 'resource' | 'driver';
  onAction: (action: string) => void;
  onClose: () => void;
}

const ACTIONS: Record<string, { label: string; color: string }[]> = {
  request: [
    { label: 'Find Match', color: 'bg-green-500/20 text-green-300' },
    { label: 'Update Status', color: 'bg-blue-500/20 text-blue-300' },
    { label: 'Contact', color: 'bg-purple-500/20 text-purple-300' },
    { label: 'View Details', color: 'bg-white/10 text-white/60' },
  ],
  resource: [
    { label: 'Create Delivery', color: 'bg-orange-500/20 text-orange-300' },
    { label: 'Update Condition', color: 'bg-yellow-500/20 text-yellow-300' },
    { label: 'Move to Facility', color: 'bg-blue-500/20 text-blue-300' },
    { label: 'View Details', color: 'bg-white/10 text-white/60' },
  ],
  driver: [
    { label: 'Call', color: 'bg-green-500/20 text-green-300' },
    { label: 'View Route', color: 'bg-blue-500/20 text-blue-300' },
    { label: 'Report Issue', color: 'bg-red-500/20 text-red-300' },
    { label: 'View Details', color: 'bg-white/10 text-white/60' },
  ],
};

export function QuickActions({ type, onAction, onClose }: QuickActionsProps) {
  const actions = ACTIONS[type] || ACTIONS.request;
  return (
    <div className="absolute bottom-20 left-3 right-3 z-30 bg-[#1A3850]/95 backdrop-blur rounded-xl p-2 flex gap-2 shadow-xl border border-white/10">
      {actions.map(a => (
        <button key={a.label} onClick={() => { onAction(a.label); onClose(); }}
          className={`flex-1 text-[10px] font-medium py-2 rounded-lg ${a.color} transition active:scale-95`}>
          {a.label}
        </button>
      ))}
    </div>
  );
}
