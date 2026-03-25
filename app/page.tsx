import { DashboardShell } from '@/components/dashboard-shell';
import { StatCard } from '@/components/stat-card';

export default function CommandCenter() {
  return (
    <DashboardShell
      title="Command Center"
      subtitle="Real-time coordination overview"
    >
      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Open Requests"
          value={23}
          subtitle="Across 2 active disasters"
          trend="up"
          trendValue="3 today"
          accent="red"
        />
        <StatCard
          label="Active Matches"
          value={19}
          subtitle="All awaiting consent"
          accent="accent"
        />
        <StatCard
          label="Partners Online"
          value={4}
          subtitle="Aid Arena, ERV, FHM, GG"
          accent="blue"
        />
        <StatCard
          label="Fulfillment Rate"
          value="—"
          subtitle="No matches resolved yet"
          trend="neutral"
          trendValue="Awaiting first resolution"
          accent="blue"
        />
      </div>

      {/* Map + Activity */}
      <div className="grid grid-cols-3 gap-4">
        {/* Map Placeholder */}
        <div className="col-span-2 bg-white rounded-xl border border-sos-gray-300 overflow-hidden">
          <div className="h-[420px] bg-sos-blue-900 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-sos-blue-800 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-sos-accent-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <p className="text-white/60 text-sm font-medium">Map View</p>
              <p className="text-white/30 text-xs mt-1">Mapbox integration pending</p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-sos-gray-300 p-5">
          <h3 className="text-sm font-bold text-sos-blue-800 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {[
              { time: '2m ago', text: 'Match proposed: housing, score 83', type: 'match' },
              { time: '5m ago', text: 'New request: medical supplies', type: 'request' },
              { time: '12m ago', text: 'ERV capacity updated: 3 units', type: 'capacity' },
              { time: '18m ago', text: 'Match proposed: food, score 72', type: 'match' },
              { time: '25m ago', text: 'New offer: debris removal', type: 'offer' },
              { time: '32m ago', text: 'NWS alert: flood warning extended', type: 'alert' },
              { time: '1h ago', text: 'Greater Good inventory synced', type: 'capacity' },
              { time: '1h ago', text: 'Match proposed: transport, score 68', type: 'match' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                  item.type === 'match' ? 'bg-sos-accent-500' :
                  item.type === 'request' ? 'bg-sos-red-500' :
                  item.type === 'offer' ? 'bg-sos-blue-500' :
                  item.type === 'alert' ? 'bg-sos-red-400' :
                  'bg-sos-gray-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-sos-blue-800 leading-snug">{item.text}</p>
                  <p className="text-[10px] text-sos-gray-500 mt-0.5">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active Disasters */}
      <div className="mt-4 bg-white rounded-xl border border-sos-gray-300 p-5">
        <h3 className="text-sm font-bold text-sos-blue-800 mb-3">Active Disasters</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-sos-red-50 border border-sos-red-100">
            <div className="w-2 h-2 rounded-full bg-sos-red-500 animate-pulse" />
            <div>
              <p className="text-sm font-medium text-sos-blue-800">March 2026 Bomb Cyclone</p>
              <p className="text-xs text-sos-gray-600">Multi-state · Active</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-sos-accent-50 border border-sos-accent-100">
            <div className="w-2 h-2 rounded-full bg-sos-accent-600 animate-pulse" />
            <div>
              <p className="text-sm font-medium text-sos-blue-800">Hawaii Kona Low Flooding</p>
              <p className="text-xs text-sos-gray-600">Oahu · Active</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
