import { DashboardShell } from '@/components/dashboard-shell';

export default function Matching() {
  return (
    <DashboardShell title="Matching" subtitle="View and manage match proposals">
      <div className="bg-white rounded-xl border border-sos-gray-300 p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-sos-accent-50 flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-sos-accent-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-sos-blue-800">Match Queue</h3>
        <p className="text-sm text-sos-gray-600 mt-1 max-w-md mx-auto">
          19 matches awaiting consent. Accept, decline, or counter-propose matches for your organization.
        </p>
      </div>
    </DashboardShell>
  );
}
