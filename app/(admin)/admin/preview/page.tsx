'use client';

import { useRouter } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';

export default function AdminPreviewPage() {
  const router = useRouter();

  const previews = [
    {
      icon: '📱',
      title: 'Citizen Experience',
      desc: 'Home screen with map, alerts, SOS Score, community chat, action buttons — seeded with demo data',
      href: '/c?admin=true',
      color: 'border-sos-red-400 bg-sos-red-50',
      cta: 'Preview Citizen →',
    },
    {
      icon: '🆕',
      title: 'New Citizen Onboarding',
      desc: 'Phone auth flow — what a first-time citizen sees. Fresh state, no prior data.',
      href: '/auth',
      color: 'border-sos-accent-400 bg-sos-accent-50',
      cta: 'Preview Citizen Auth →',
    },
    {
      icon: '🏢',
      title: 'New Partner Onboarding',
      desc: 'Agent-driven onboarding — the partner talks to SOS, not a form. Agent handles org registration.',
      href: '/onboard',
      color: 'border-green-400 bg-green-50',
      cta: 'Preview Partner Onboarding →',
    },
    {
      icon: '📝',
      title: 'Partner Registration Form',
      desc: 'Traditional multi-step form — org type, location, capabilities. For partners who prefer structured input.',
      href: '/register',
      color: 'border-sos-gray-400 bg-sos-gray-100',
      cta: 'Preview Registration →',
    },
    {
      icon: '🆘',
      title: 'Emergency Intake (Tap Grids)',
      desc: '5-tap emergency flow: triage → what → who → where → when. 30 seconds.',
      href: '/help',
      color: 'border-sos-red-400 bg-sos-red-50',
      cta: 'Preview Intake →',
    },
    {
      icon: '🤝',
      title: 'Helper Profile',
      desc: 'Helper registration — trade + non-trade skills, availability, distance.',
      href: '/offer',
      color: 'border-green-400 bg-green-50',
      cta: 'Preview Helper Flow →',
    },
    {
      icon: '📢',
      title: 'Community Chat',
      desc: 'Location-scoped chat with @SOS agent trigger, photos, and moderation.',
      href: '/community',
      color: 'border-sos-accent-400 bg-sos-accent-50',
      cta: 'Preview Community →',
    },
    {
      icon: '🏆',
      title: 'Leaderboard',
      desc: 'Neighborhood SOS Score rankings.',
      href: '/leaderboard',
      color: 'border-yellow-400 bg-yellow-50',
      cta: 'Preview Leaderboard →',
    },
  ];

  return (
    <AdminShell title="Preview" subtitle="Preview all user experiences with demo data">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {previews.map(p => (
          <button key={p.href} onClick={() => router.push(p.href)}
            className={`text-left p-5 rounded-xl border-2 ${p.color} hover:shadow-md transition-all active:scale-[0.98]`}>
            <div className="flex items-start gap-3">
              <span className="text-2xl">{p.icon}</span>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-sos-blue-800">{p.title}</h3>
                <p className="text-xs text-sos-gray-600 mt-1">{p.desc}</p>
                <p className="text-xs font-bold text-sos-accent-700 mt-2">{p.cta}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-6 bg-sos-accent-50 border border-sos-accent-200 rounded-xl p-4">
        <p className="text-xs text-sos-blue-800">
          <strong>Note:</strong> Citizen Experience preview uses seeded demo data (alerts, score, community messages, partner pins).
          All other previews use live data. To test the full citizen flow end-to-end, open <code className="bg-white px-1 rounded">/c?admin=true</code> in an incognito window.
        </p>
      </div>
    </AdminShell>
  );
}
