'use client';

import { useRouter } from 'next/navigation';

export default function CommunityBoard() {
  const router = useRouter();

  return (
    <div className="max-w-lg mx-auto px-4 pt-[env(safe-area-inset-top)] pb-8 min-h-screen">
      <div className="flex items-center gap-3 py-4">
        <button onClick={() => router.push('/c')} className="text-sos-gray-500 hover:text-sos-blue-800">← Back</button>
        <h1 className="text-base font-bold text-sos-blue-800">Community</h1>
      </div>

      {/* Mutual aid */}
      <div className="mb-6">
        <h2 className="text-xs font-bold text-sos-gray-600 uppercase tracking-wider mb-3 px-1">Mutual Aid</h2>
        <div className="bg-white rounded-2xl border border-sos-gray-300 divide-y divide-sos-gray-200">
          {[
            { icon: '🔧', title: 'Chainsaw available', detail: 'John — 0.3 mi away', time: '2h ago' },
            { icon: '🚗', title: 'Rides to pharmacy', detail: 'Sarah — available tomorrow', time: '5h ago' },
            { icon: '👶', title: 'Babysitting offered', detail: 'Maria — weekday mornings', time: '1d ago' },
            { icon: '🍲', title: 'Extra meals available', detail: 'Community kitchen — tonight 6pm', time: '3h ago' },
          ].map((item, i) => (
            <div key={i} className="p-4 flex items-center gap-3">
              <span className="text-lg">{item.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-sos-blue-800">{item.title}</p>
                <p className="text-xs text-sos-gray-500">{item.detail}</p>
              </div>
              <span className="text-[10px] text-sos-gray-400">{item.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Events */}
      <div className="mb-6">
        <h2 className="text-xs font-bold text-sos-gray-600 uppercase tracking-wider mb-3 px-1">Upcoming</h2>
        <div className="space-y-3">
          {[
            { icon: '📅', title: 'Emergency Prep Workshop', detail: 'Saturday 10am — Community Center', color: 'bg-sos-accent-50 border-sos-accent-200' },
            { icon: '🗳️', title: 'Water Board Vote', detail: 'Thursday 6pm — Town Hall', color: 'bg-yellow-50 border-yellow-200' },
          ].map((item, i) => (
            <div key={i} className={`${item.color} border rounded-xl p-4 flex items-center gap-3`}>
              <span className="text-lg">{item.icon}</span>
              <div>
                <p className="text-sm font-bold text-sos-blue-800">{item.title}</p>
                <p className="text-xs text-sos-gray-600">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="bg-sos-blue-800 rounded-2xl p-5 text-center">
        <p className="text-xs text-white/60 uppercase tracking-wider mb-2">Your Community</p>
        <div className="grid grid-cols-3 gap-4">
          <div><p className="text-xl font-bold text-white">340</p><p className="text-[10px] text-white/50">Members</p></div>
          <div><p className="text-xl font-bold text-white">12</p><p className="text-[10px] text-white/50">Helpers</p></div>
          <div><p className="text-xl font-bold text-white">5</p><p className="text-[10px] text-white/50">Partners</p></div>
        </div>
      </div>
    </div>
  );
}
