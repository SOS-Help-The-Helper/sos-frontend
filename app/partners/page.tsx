'use client';

import { useState, useEffect } from 'react';

const ORG_TYPES = [
  'Nonprofit / NGO',
  'Government / Emergency Mgmt',
  'Faith-based organization',
  'Mutual aid / Community group',
  'Business / Corporate',
  'Foundation / Funder',
  'Other',
];

export default function PartnersWaitlistPage() {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [utm, setUtm] = useState<Record<string, string>>({});

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const captured: Record<string, string> = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref'].forEach((k) => {
      const v = p.get(k);
      if (v) captured[k] = v.slice(0, 120);
    });
    setUtm(captured);
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('submitting');
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      org_name: fd.get('org_name'),
      contact_name: fd.get('contact_name'),
      email: fd.get('email'),
      phone: fd.get('phone'),
      website: fd.get('website'),
      org_type: fd.get('org_type'),
      state: fd.get('state'),
      coverage_area: fd.get('coverage_area'),
      disaster_focus: fd.get('disaster_focus'),
      message: fd.get('message'),
      company_url_hp: fd.get('company_url_hp'), // honeypot
      utm: Object.keys(utm).length ? utm : undefined,
    };
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || 'Something went wrong. Please try again.');
        setStatus('error');
        return;
      }
      setStatus('done');
    } catch {
      setError('Network error. Please try again.');
      setStatus('error');
    }
  }

  return (
    <div className="min-h-screen bg-[#0F1E2B] text-white font-sans flex flex-col">
      {/* Header */}
      <header className="w-full px-6 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <a href="https://sosconnect.org" className="flex items-center gap-2.5">
          <img src="/logomark-white.svg" alt="SOS" className="w-8 h-8" />
          <span className="font-serif text-lg tracking-tight">SOS&nbsp;|&nbsp;Connect</span>
        </a>
        <a
          href="https://sosconnect.org"
          className="text-sm text-white/60 hover:text-white transition"
        >
          sosconnect.org
        </a>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-10 lg:py-16 grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
        {/* Left: pitch */}
        <div className="lg:pt-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#89CFF0]/12 border border-[#89CFF0]/25 px-3 py-1 text-[12px] font-medium text-[#89CFF0] mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#89CFF0]" /> Partner Waitlist
          </span>
          <h1 className="font-serif text-4xl lg:text-[3.25rem] leading-[1.05] tracking-tight">
            Coordinate disaster response{' '}
            <span className="text-[#89CFF0]">before</span> the storm hits.
          </h1>
          <p className="mt-5 text-base lg:text-lg text-white/70 leading-relaxed max-w-md">
            SOS connects survivors, helpers, and responding organizations on one always-on
            platform. Join the partner waitlist to get early access, onboarding support, and a
            dedicated agent in the tools your team already uses.
          </p>

          <ul className="mt-8 space-y-3.5 max-w-md">
            {[
              ['Early access', 'Be first onto the platform as we onboard partners region by region.'],
              ['Your tools, not ours', 'An SOS agent inside Slack, WhatsApp, or iMessage — no new dashboard to learn.'],
              ['Built for Hour Zero', 'Designed for the first 48–72 hours, when coordination matters most.'],
            ].map(([t, d]) => (
              <li key={t} className="flex gap-3">
                <svg className="w-5 h-5 mt-0.5 shrink-0 text-[#34D399]" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.3 3.3 6.8-6.8a1 1 0 011.4 0z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-semibold text-[15px]">{t}</p>
                  <p className="text-[13.5px] text-white/55 leading-snug">{d}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Right: form / success */}
        <div className="w-full">
          {status === 'done' ? (
            <div className="rounded-2xl bg-white/5 border border-white/10 p-8 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-[#34D399]/15 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-[#34D399]" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.3 3.3 6.8-6.8a1 1 0 011.4 0z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="font-serif text-2xl">You&apos;re on the list.</h2>
              <p className="mt-2 text-white/65 text-sm leading-relaxed">
                Thanks for joining the SOS partner waitlist. We&apos;ll reach out as we onboard
                organizations in your region.
              </p>
              <a
                href="https://sosconnect.org"
                className="inline-block mt-6 text-sm text-[#89CFF0] hover:text-white transition"
              >
                Back to sosconnect.org →
              </a>
            </div>
          ) : (
            <form
              onSubmit={onSubmit}
              className="rounded-2xl bg-white/[0.04] border border-white/10 p-6 lg:p-7 space-y-4"
            >
              <div>
                <h2 className="font-serif text-xl">Join the partner waitlist</h2>
                <p className="text-[13px] text-white/50 mt-1">Takes about a minute.</p>
              </div>

              {/* honeypot (hidden from humans) */}
              <input
                type="text"
                name="company_url_hp"
                tabIndex={-1}
                autoComplete="off"
                className="hidden"
                aria-hidden="true"
              />

              <Field label="Organization name" name="org_name" required placeholder="Open Source Medical Supplies" />
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Your name" name="contact_name" required placeholder="Jane Doe" />
                <Field label="Email" name="email" type="email" required placeholder="jane@org.org" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Phone" name="phone" type="tel" placeholder="(555) 123-4567" optional />
                <Field label="Website" name="website" placeholder="org.org" optional />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Organization type</Label>
                  <select
                    name="org_type"
                    defaultValue=""
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-[14px] text-white outline-none focus:border-[#89CFF0]/60 transition appearance-none"
                  >
                    <option value="" disabled className="text-black">Select…</option>
                    {ORG_TYPES.map((t) => (
                      <option key={t} value={t} className="text-black">{t}</option>
                    ))}
                  </select>
                </div>
                <Field label="State / region" name="state" placeholder="NC" optional />
              </div>

              <Field label="Areas you serve" name="coverage_area" placeholder="Western NC — Buncombe, Henderson, Madison" optional />
              <Field label="Disasters you respond to" name="disaster_focus" placeholder="Hurricanes, flooding, wildfire" optional />

              <div>
                <Label optional>Anything else?</Label>
                <textarea
                  name="message"
                  rows={3}
                  placeholder="Tell us about your organization and how you respond."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-[14px] text-white outline-none focus:border-[#89CFF0]/60 transition placeholder:text-white/30 resize-none"
                />
              </div>

              {status === 'error' && error && (
                <p className="text-[13px] text-[#EF4E4B] bg-[#EF4E4B]/10 border border-[#EF4E4B]/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={status === 'submitting'}
                className="w-full bg-[#EF4E4B] hover:bg-[#d94340] disabled:opacity-60 rounded-lg py-3 font-semibold text-[15px] transition-colors"
              >
                {status === 'submitting' ? 'Joining…' : 'Join the waitlist'}
              </button>
              <p className="text-[11.5px] text-white/35 text-center leading-snug">
                We&apos;ll only use your details to contact you about partnering with SOS.
              </p>
            </form>
          )}
        </div>
      </main>

      <footer className="w-full max-w-6xl mx-auto px-6 py-6 text-[12.5px] text-white/35 border-t border-white/8 flex flex-wrap items-center justify-between gap-2">
        <span>© {new Date().getFullYear()} SOS Global, Inc.</span>
        <a href="https://sosconnect.org" className="hover:text-white/60 transition">sosconnect.org</a>
      </footer>
    </div>
  );
}

function Label({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <label className="block text-[12.5px] font-medium text-white/70 mb-1.5">
      {children}
      {optional && <span className="text-white/30 font-normal"> (optional)</span>}
    </label>
  );
}

function Field({
  label, name, type = 'text', required, optional, placeholder,
}: {
  label: string; name: string; type?: string; required?: boolean; optional?: boolean; placeholder?: string;
}) {
  return (
    <div>
      <Label optional={optional}>
        {label}
        {required && <span className="text-[#EF4E4B]"> *</span>}
      </Label>
      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-[14px] text-white outline-none focus:border-[#89CFF0]/60 transition placeholder:text-white/30"
      />
    </div>
  );
}
