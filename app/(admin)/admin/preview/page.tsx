'use client';

import { useRouter } from 'next/navigation';

const PREVIEWS = [
  { id: 'citizen-demo', label: '👤 Citizen (Demo Data)', desc: 'Pre-seeded citizen with score, matches, community', href: '/c' },
  { id: 'citizen-new', label: '👤 New Citizen', desc: 'Fresh onboarding experience', href: '/auth' },
  { id: 'partner-new', label: '🏢 New Partner', desc: 'Agent-driven partner onboarding', href: '/onboard' },
  { id: 'partner-erv', label: '🚐 Emergency RV', desc: 'Transport/housing portal', href: '/partner/erv' },
  { id: 'partner-fhm', label: '🍽️ Free Hot Meals', desc: 'Food service portal', href: '/partner/fhm' },
  { id: 'partner-aa', label: '🤝 Aid Arena', desc: 'Coordination portal', href: '/partner/aa' },
  { id: 'partner-gg', label: '📦 Greater Good', desc: 'Supply warehouse portal', href: '/partner/gg' },
  { id: 'partner-endurant', label: '🔨 Endurant', desc: 'Vendor portal', href: '/partner/endurant' },
];

export default function AdminPreview() {
  const router = useRouter();

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-xl font-bold text-sos-blue-800 mb-1">Preview Portals</h1>
      <p className="text-sm text-sos-gray-500 mb-6">View the experience as any persona</p>
      <div className="grid gap-3">
        {PREVIEWS.map(p => (
          <button
            key={p.id}
            onClick={() => window.open(p.href, '_blank')}
            className="flex items-center gap-4 p-4 bg-white rounded-xl border border-sos-gray-300 hover:shadow-md transition-shadow text-left"
          >
            <div>
              <p className="text-sm font-bold text-sos-blue-800">{p.label}</p>
              <p className="text-xs text-sos-gray-500">{p.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
