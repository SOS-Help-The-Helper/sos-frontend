'use client';

import { useNotifications } from '@/lib/notification-context';
import { useRouter } from 'next/navigation';

export function NotificationToasts() {
  const { toasts, dismissToast } = useNotifications();
  const router = useRouter();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className="bg-white rounded-xl border border-sos-gray-300 shadow-xl p-4 flex items-start gap-3 animate-slide-in cursor-pointer"
          onClick={() => {
            dismissToast(toast.id);
            if (toast.matchId) router.push(`/matching?match=${toast.matchId}`);
          }}
        >
          <div className="w-8 h-8 rounded-full bg-sos-red-50 flex items-center justify-center flex-shrink-0">
            <span className="text-lg">🔔</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-sos-blue-800">{toast.title}</p>
            <p className="text-xs text-sos-gray-600 mt-0.5 line-clamp-2">{toast.body}</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); dismissToast(toast.id); }}
            className="text-sos-gray-400 hover:text-sos-gray-600 text-sm flex-shrink-0"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
