import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0F1E2B] text-white">
      {/* Hero */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 text-center relative overflow-hidden">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0F1E2B] via-[#1A3850]/30 to-[#0F1E2B] pointer-events-none" />
        
        <div className="relative z-10 max-w-2xl mx-auto">
          <img src="/logomark.svg" alt="SOS" className="h-14 w-14 mx-auto mb-8 opacity-80" />
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight tracking-tight">
            We&apos;ve spent years studying how people actually coordinate when systems fail.
          </h1>
          
          <p className="text-xl sm:text-2xl text-[#89CFF0] font-medium mt-6 leading-relaxed">
            What we found surprised us.
          </p>
          
          <p className="text-lg sm:text-xl text-white/70 mt-8 leading-relaxed max-w-xl mx-auto">
            The resources are there. The volunteers show up. The agencies have budgets.
            What&apos;s missing is the connective tissue between all of it.
          </p>
          
          <div className="mt-12 flex items-center justify-center gap-2 text-white/40 text-sm">
            <span className="animate-bounce">↓</span>
            <span>Scroll</span>
          </div>
        </div>
      </section>

      {/* Thesis */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-lg sm:text-xl text-white/60 leading-relaxed mb-8">
            And the people filling that gap?<br />
            They&apos;re not who you&apos;d think.
          </p>
          
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight">
            Everyone is a helper.
          </h2>
          
          <p className="text-lg text-white/50 mt-6">
            A displaced family with a truck clears roads. A nurse in a flood zone triages injuries.
            A teenager who speaks three languages runs comms.
          </p>
        </div>
      </section>

      {/* What SOS Does */}
      <section className="py-24 px-6 bg-[#1A3850]/20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-16">
            We&apos;re building the infrastructure to make that count.
          </h2>
          
          <div className="grid gap-8 sm:grid-cols-2">
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <div className="text-2xl mb-3">🔴</div>
              <h3 className="text-lg font-semibold mb-2">Citizen Coordination</h3>
              <p className="text-white/50 text-sm leading-relaxed">
                Tell us what you need. Our AI agent matches you with real help — food, shelter, transport, 
                services — from 2M+ verified resources and community partners.
              </p>
            </div>
            
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <div className="text-2xl mb-3">🤝</div>
              <h3 className="text-lg font-semibold mb-2">Partner Tools</h3>
              <p className="text-white/50 text-sm leading-relaxed">
                Nonprofits, churches, mutual aid groups — manage matches, dispatch resources, 
                track capacity, and coordinate with other partners. One dashboard.
              </p>
            </div>
            
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <div className="text-2xl mb-3">🗺️</div>
              <h3 className="text-lg font-semibold mb-2">Real-Time Map</h3>
              <p className="text-white/50 text-sm leading-relaxed">
                Every request, resource, and report on one map. Filter by need type, 
                disaster, or partner. Watch coordination happen in real time.
              </p>
            </div>
            
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <div className="text-2xl mb-3">📊</div>
              <h3 className="text-lg font-semibold mb-2">Intelligence Layer</h3>
              <p className="text-white/50 text-sm leading-relaxed">
                Every interaction generates signal. What&apos;s needed where, 
                what&apos;s working, what&apos;s not. The system gets smarter with every match.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Loop */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-12">The Coordination Loop</h2>
          
          <div className="flex flex-col gap-4 text-left max-w-md mx-auto">
            {[
              { step: 'Intake', desc: 'Someone needs help. Or someone can help. Both enter the same system.' },
              { step: 'Matching', desc: 'AI matches needs to resources by proximity, urgency, capacity, and trust.' },
              { step: 'Logistics', desc: 'Dispatch, transport, scheduling — the connective tissue that was always missing.' },
              { step: 'Fulfillment', desc: 'Help arrives. Confirmed. Tracked. No one falls through the cracks.' },
              { step: 'Learning', desc: 'Every match makes the next one smarter. Coordination science, not coordination chaos.' },
            ].map((item, i) => (
              <div key={i} className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-[#89CFF0]/20 text-[#89CFF0] flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <div>
                  <h3 className="font-semibold text-white">{item.step}</h3>
                  <p className="text-white/50 text-sm mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partners */}
      <section className="py-24 px-6 bg-[#1A3850]/20">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">Active Partners</h2>
          <p className="text-white/50 mb-12">Organizations already coordinating through SOS</p>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
            {[
              { name: 'Emergency RV', type: 'Transport & Housing' },
              { name: 'Free Hot Meals', type: 'Food Service' },
              { name: 'Aid Arena', type: 'Multi-Org Coordination' },
              { name: 'Greater Good', type: 'Supply Distribution' },
              { name: 'Endurant', type: 'Restoration & Debris' },
              { name: '211 Network', type: '2M+ Verified Resources' },
            ].map((partner, i) => (
              <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="font-semibold text-sm">{partner.name}</p>
                <p className="text-white/40 text-xs mt-1">{partner.type}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">We help the helpers.</h2>
          <p className="text-white/50 mb-10">
            SOS is in active development with partners across North Carolina.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/c" 
              className="px-8 py-3.5 bg-[#EF4E4B] text-white font-semibold rounded-xl hover:bg-[#EF4E4B]/90 transition-colors"
            >
              I Need Help
            </Link>
            <Link 
              href="/register" 
              className="px-8 py-3.5 bg-white/10 text-white font-semibold rounded-xl border border-white/20 hover:bg-white/15 transition-colors"
            >
              Partner With Us
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-white/10">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/30">
          <div className="flex items-center gap-2">
            <img src="/logomark.svg" alt="SOS" className="h-5 w-5 opacity-50" />
            <span>SOS Global · Community Coordination</span>
          </div>
          <div className="flex gap-6">
            <Link href="/c" className="hover:text-white/50 transition-colors">Citizen App</Link>
            <Link href="/matching" className="hover:text-white/50 transition-colors">Partners</Link>
            <a href="mailto:info@sos-help.org" className="hover:text-white/50 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
