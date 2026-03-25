import { DashboardShell } from '@/components/dashboard-shell';

export default function Organizations() {
  return (
    <DashboardShell title="Organizations" subtitle="Manage partner organizations">
      <div className="bg-white rounded-xl border border-sos-gray-300 p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-sos-accent-50 flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-sos-accent-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-sos-blue-800">Partner Network</h3>
        <p className="text-sm text-sos-gray-600 mt-1 max-w-md mx-auto">
          4 partners active: Aid Arena, Emergency RV, Free Hot Meals, Greater Good Charities.
        </p>
      </div>
    </DashboardShell>
  );
}
