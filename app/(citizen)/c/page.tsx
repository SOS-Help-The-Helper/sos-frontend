'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCitizenState, type CitizenState } from '@/lib/citizen-context';

function ActionCard({ icon, title, subtitle, badge, href, color = 'bg-white' }: {
  icon: string; title: string; subtitle: string; badge?: string; href: string; color?: string;
}) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(href)}
      className={`${color} rounded-2xl border border-sos-gray-300 p-5 flex flex-col items-center text-center gap-2 shadow-sm hover:shadow-md transition-all active:scale-[0.98] relative`}
    >
      {badge && (
        <span className="absolute -top-2 -right-2 bg-sos-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
      <span className="text-3xl">{icon}</span>
      <h3 className="text-sm font-bold text-sos-blue-800">{title}</h3>
      <p className="text-xs text-sos-gray-600 leading-snug">{subtitle}</p>
    </button>
  );
}

function PeacetimeMode({ state }: { state: CitizenState }) {
  const readiness = state.person?.readiness_score || 0;
  const contacts = state.person?.emergency_contacts || 0;
  const hasRoute = state.person?.evacuation_route || false;
  const hasGoBag = state.person?.go_bag || false;

  return (
    <div className="space-y-5">
      {/* Location + status */}
      <div className="bg-white rounded-2xl border border-sos-gray-300 p-4 flex items-center gap-3">
        <span className="text-xl">📍</span>
        <div className="flex-1">
          <p className="text-sm font-bold text-sos-blue-800">{state.person?.location_name || 'Set your location'}</p>
          <p className="text-xs text-green-600 font-medium">🟢 No active emergencies</p>
        </div>
      </div>

      {/* Community board */}
      <div>
        <h2 className="text-xs font-bold text-sos-gray-600 uppercase tracking-wider mb-3 px-1">Your Community</h2>
        <div className="bg-white rounded-2xl border border-sos-gray-300 divide-y divide-sos-gray-200">
          <div className="p-4 flex items-center gap-3">
            <span className="text-lg">🤝</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-sos-blue-800">Mutual aid requests nearby</p>
              <p className="text-xs text-sos-gray-500">4 neighbors need help this week</p>
            </div>
            <span className="text-xs font-bold text-sos-accent-700 bg-sos-accent-50 px-2 py-1 rounded-full">4</span>
          </div>
          <div className="p-4 flex items-center gap-3">
            <span className="text-lg">🔧</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-sos-blue-800">Tool library</p>
              <p className="text-xs text-sos-gray-500">3 items available to borrow</p>
            </div>
          </div>
          <div className="p-4 flex items-center gap-3">
            <span className="text-lg">📅</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-sos-blue-800">Community prep workshop</p>
              <p className="text-xs text-sos-gray-500">Saturday 10am — Emergency readiness</p>
            </div>
          </div>
        </div>
      </div>

      {/* Readiness score */}
      <div>
        <h2 className="text-xs font-bold text-sos-gray-600 uppercase tracking-wider mb-3 px-1">Readiness Score</h2>
        <div className="bg-white rounded-2xl border border-sos-gray-300 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-3xl font-bold text-sos-blue-800">{readiness}<span className="text-lg text-sos-gray-400">/100</span></span>
            <button className="text-xs font-semibold text-sos-accent-700 bg-sos-accent-50 px-3 py-1.5 rounded-full hover:bg-sos-accent-100 transition-colors">
              Improve →
            </button>
          </div>
          <div className="h-2 bg-sos-gray-200 rounded-full overflow-hidden mb-4">
            <div className="h-full bg-sos-accent-500 rounded-full transition-all" style={{ width: `${readiness}%` }} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <span>{contacts > 0 ? '✅' : '⚠️'}</span>
              <span className={contacts > 0 ? 'text-sos-blue-800' : 'text-sos-gray-500'}>
                Emergency contacts {contacts > 0 ? `(${contacts})` : '— not set'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span>{hasRoute ? '✅' : '⚠️'}</span>
              <span className={hasRoute ? 'text-sos-blue-800' : 'text-sos-gray-500'}>
                Evacuation route {hasRoute ? 'saved' : '— not saved'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span>{hasGoBag ? '✅' : '⚠️'}</span>
              <span className={hasGoBag ? 'text-sos-blue-800' : 'text-sos-gray-500'}>
                Go-bag checklist {hasGoBag ? 'complete' : '— incomplete'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Persistent "I can help" */}
      <ActionCard
        icon="🤝"
        title="I Can Help"
        subtitle="Offer skills, resources, or time to your community"
        href="/offer"
        color="bg-green-50"
      />
    </div>
  );
}

function WatchMode({ state }: { state: CitizenState }) {
  return (
    <div className="space-y-5">
      {/* Watch banner */}
      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">⚠️</span>
          <h2 className="text-base font-bold text-yellow-800">
            {state.disaster?.disaster_type?.toUpperCase() || 'WEATHER'} WATCH
          </h2>
        </div>
        <p className="text-sm text-yellow-700">{state.disaster?.name || 'Elevated risk in your area'}</p>
      </div>

      {/* Prep checklist */}
      <div>
        <h2 className="text-xs font-bold text-sos-gray-600 uppercase tracking-wider mb-3 px-1">Your Prep Checklist</h2>
        <div className="bg-white rounded-2xl border border-sos-gray-300 p-4 space-y-3">
          {['Charge all devices', 'Fill water containers', 'Review evacuation route', 'Check on elderly neighbors', 'Secure outdoor items', 'Gas up vehicles'].map((item, i) => (
            <label key={i} className="flex items-center gap-3 text-sm text-sos-blue-800">
              <input type="checkbox" className="h-4 w-4 rounded border-sos-gray-300 text-sos-accent-500" />
              {item}
            </label>
          ))}
        </div>
      </div>

      {/* Community status */}
      <div className="bg-white rounded-2xl border border-sos-gray-300 p-4">
        <h3 className="text-xs font-bold text-sos-gray-600 uppercase tracking-wider mb-2">Community Status</h3>
        <p className="text-sm text-sos-blue-800">340 members • 12 helpers on standby</p>
        <p className="text-xs text-sos-gray-500 mt-1">Partners staging: ERV ready, FHM preparing food</p>
      </div>

      {/* Action cards */}
      <div className="grid grid-cols-2 gap-3">
        <ActionCard icon="🗺️" title="Evacuation Route" subtitle="Review your exit plan" href="/readiness" />
        <ActionCard icon="🤝" title="I Can Help" subtitle="Sign up as a standby helper" href="/offer" color="bg-green-50" />
      </div>
    </div>
  );
}

function ActiveMode({ state }: { state: CitizenState }) {
  const hasMatches = state.activeMatchCount > 0;
  const hasRequest = state.activeRequestCount > 0;

  return (
    <div className="space-y-5">
      {/* Disaster banner */}
      <div className="bg-sos-red-500 text-white rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">🔴</span>
          <h2 className="text-base font-bold">ACTIVE: {state.disaster?.name || 'Emergency'}</h2>
        </div>
        <p className="text-sm text-white/80">Help is available. Choose what you need.</p>
      </div>

      {/* Priority: matches found */}
      {hasMatches && (
        <ActionCard
          icon="🔔"
          title={`${state.activeMatchCount} Match${state.activeMatchCount > 1 ? 'es' : ''} Found`}
          subtitle="Help is available for you — review now"
          href="/matches"
          badge={String(state.activeMatchCount)}
          color="bg-green-50"
        />
      )}

      {/* 4-card grid — adapts to context */}
      <div className="grid grid-cols-2 gap-3">
        {hasRequest ? (
          <ActionCard icon="📋" title="Update Status" subtitle="Update your current request" href="/help" />
        ) : (
          <ActionCard icon="🆘" title="I Need Help" subtitle="Tell us what you need" href="/help" />
        )}
        <ActionCard
          icon="🤝"
          title={state.hasOfferedHelp ? 'Help More' : 'I Can Help'}
          subtitle={state.hasOfferedHelp ? 'Add another offer' : 'Share what you can give'}
          href="/offer"
          color="bg-green-50"
        />
        <ActionCard icon="🔍" title="Find Someone" subtitle="Report or search for a missing person" href="/find" />
        <ActionCard icon="💬" title="Talk to Agent" subtitle="Get help from our AI coordinator" href="/chat" />
      </div>
    </div>
  );
}

function RecoveryMode({ state }: { state: CitizenState }) {
  return (
    <div className="space-y-5">
      {/* Recovery banner */}
      <div className="bg-sos-accent-50 border border-sos-accent-300 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">🌤️</span>
          <h2 className="text-base font-bold text-sos-blue-800">Recovery Phase</h2>
        </div>
        <p className="text-sm text-sos-gray-600">The community is rebuilding. Every bit helps.</p>
      </div>

      {/* Recovery actions */}
      <div className="grid grid-cols-1 gap-3">
        <ActionCard icon="⭐" title="Thank a Helper" subtitle="Rate and review the people who helped you" href="/matches" color="bg-yellow-50" />
        <ActionCard icon="🔄" title="Help Someone Else" subtitle="You received help — now pay it forward" href="/offer" color="bg-green-50" />
        <ActionCard icon="📖" title="My SOS Story" subtitle="View your full interaction history" href="/matches" />
      </div>

      {/* Community recovery */}
      <div className="bg-white rounded-2xl border border-sos-gray-300 p-5">
        <h3 className="text-xs font-bold text-sos-gray-600 uppercase tracking-wider mb-3">Community Recovery</h3>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-sos-blue-800 font-medium">78% of needs fulfilled</span>
          <span className="text-xs text-sos-gray-500">12 helpers contributed</span>
        </div>
        <div className="h-3 bg-sos-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full" style={{ width: '78%' }} />
        </div>
      </div>
    </div>
  );
}

export default function CitizenHome() {
  const [state, setState] = useState<CitizenState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const personId = typeof window !== 'undefined' ? localStorage.getItem('sos-person-id') || undefined : undefined;
    getCitizenState(personId).then(s => {
      setState(s);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-3 border-sos-accent-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!state) return null;

  return (
    <div className="max-w-lg mx-auto px-4 pt-[env(safe-area-inset-top)] pb-8">
      {/* Header */}
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <img src="/logomark.svg" alt="SOS" className="h-8 w-8" />
          <div>
            <h1 className="text-base font-bold text-sos-blue-800 leading-none">SOS</h1>
            <p className="text-[10px] text-sos-accent-600 font-medium">CONNECT</p>
          </div>
        </div>
        <a href="/auth" className="text-xs text-sos-gray-500 hover:text-sos-blue-800 transition-colors">
          {state.person ? '👤 Profile' : 'Sign in'}
        </a>
      </div>

      {/* Mode-specific content */}
      {state.mode === 'peacetime' && <PeacetimeMode state={state} />}
      {state.mode === 'watch' && <WatchMode state={state} />}
      {state.mode === 'active' && <ActiveMode state={state} />}
      {state.mode === 'recovery' && <RecoveryMode state={state} />}
    </div>
  );
}
