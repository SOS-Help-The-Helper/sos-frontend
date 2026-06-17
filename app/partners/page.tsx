'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Loader2, Map, Heart, Layers } from 'lucide-react';
import { z } from 'zod';

const schema = z.object({
  first_name: z.string().trim().min(1, 'Required').max(80),
  last_name: z.string().trim().min(1, 'Required').max(80),
  email: z.string().trim().email('Enter a valid email').max(255),
  organization_name: z.string().trim().min(1, 'Required').max(160),
  organization_website: z
    .string()
    .trim()
    .max(255)
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || /^(https?:\/\/)?[^\s.]+\.[^\s]+$/.test(v), 'Enter a valid URL'),
  use_case: z.string().trim().min(10, 'Tell us a bit more (10+ chars)').max(1000),
});

type FormState = z.infer<typeof schema>;

const empty: FormState = {
  first_name: '',
  last_name: '',
  email: '',
  organization_name: '',
  organization_website: '',
  use_case: '',
};

export default function PartnersPage() {
  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState('');
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

  const update =
    (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof FormState, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FormState;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setStatus('submitting');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...parsed.data,
          organization_website: parsed.data.organization_website || null,
          utm: Object.keys(utm).length ? utm : undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus('error');
        setErrMsg(json.error || 'Something went wrong.');
        return;
      }
      setStatus('done');
      setForm(empty);
    } catch {
      setStatus('error');
      setErrMsg('Network error. Please try again.');
    }
  }

  return (
    <div className="min-h-dvh bg-[var(--sos-navy)] on-dark text-white">
      <header className="h-14 px-5 md:px-10 flex items-center justify-between border-b border-white/10">
        <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition">
          <img src="/logomark-white.svg" alt="SOS Connect" width={24} height={24} />
          <span className="text-[13px] font-semibold tracking-tight">SOS Connect</span>
        </Link>
        <a href="#waitlist" className="text-[12px] text-white/70 hover:text-white transition">
          Join waitlist →
        </a>
      </header>

      <main className="max-w-6xl mx-auto px-5 md:px-10 py-12 md:py-20 grid md:grid-cols-2 gap-10 md:gap-16 items-start">
        {/* Left: pitch */}
        <section>
          <span className="inline-block font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">
            For partner organizations
          </span>
          <h1 className="font-serif text-[44px] md:text-[60px] leading-[1.02] tracking-tight mt-4">
            Community
            <br />
            Coordination
          </h1>
          <p className="text-white/65 mt-5 text-[16px] md:text-[17px] leading-relaxed max-w-md">
            SOS Connect is the operating system for humanitarian response — one shared workspace for
            coordinators, responders, and the people they serve.
          </p>

          <ul className="mt-10 space-y-4">
            <Feature icon={Map} color="#89CFF0" title="See the whole picture" body="Live map of requests, resources, facilities, and events across your region." />
            <Feature icon={Heart} color="#EF4E4B" title="Match faster" body="Pair needs to nearby organizations and volunteers — without spreadsheets." />
            <Feature icon={Layers} color="#34D399" title="Manage one system" body="Directory, cases, intake, and reporting — connected, not duplicated." />
          </ul>
        </section>

        {/* Right: form */}
        <section id="waitlist" className="md:sticky md:top-10">
          <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-6 md:p-8 backdrop-blur">
            {status === 'done' ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto rounded-full bg-[#34D399]/15 flex items-center justify-center">
                  <CheckCircle2 size={24} className="text-[#34D399]" />
                </div>
                <h2 className="font-serif text-[24px] mt-5">You&apos;re on the list</h2>
                <p className="text-white/65 text-[14px] mt-3 leading-relaxed">
                  Thanks for your interest. We&apos;ll reach out as we open access to new partner
                  organizations.
                </p>
                <button
                  onClick={() => setStatus('idle')}
                  className="mt-6 text-[13px] text-white/60 hover:text-white transition underline underline-offset-4"
                >
                  Submit another response
                </button>
              </div>
            ) : (
              <>
                <h2 className="font-serif text-[24px] md:text-[28px] leading-tight">
                  Join the partner waitlist
                </h2>
                <p className="text-white/60 text-[13px] mt-2">
                  Takes under a minute. We&apos;ll be in touch.
                </p>

                <form onSubmit={onSubmit} className="mt-6 space-y-4">
                  {/* honeypot */}
                  <input
                    type="text"
                    name="company_url_hp"
                    tabIndex={-1}
                    autoComplete="off"
                    className="hidden"
                    aria-hidden="true"
                    value={''}
                    onChange={() => {}}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <FieldWrap label="First name" error={errors.first_name}>
                      <input className={inputCls} value={form.first_name} onChange={update('first_name')} autoComplete="given-name" />
                    </FieldWrap>
                    <FieldWrap label="Last name" error={errors.last_name}>
                      <input className={inputCls} value={form.last_name} onChange={update('last_name')} autoComplete="family-name" />
                    </FieldWrap>
                  </div>
                  <FieldWrap label="Work email" error={errors.email}>
                    <input type="email" className={inputCls} value={form.email} onChange={update('email')} autoComplete="email" />
                  </FieldWrap>
                  <FieldWrap label="Organization" error={errors.organization_name}>
                    <input className={inputCls} value={form.organization_name} onChange={update('organization_name')} autoComplete="organization" />
                  </FieldWrap>
                  <FieldWrap label="Organization website" hint="Optional" error={errors.organization_website}>
                    <input className={inputCls} placeholder="https://" value={form.organization_website} onChange={update('organization_website')} autoComplete="url" />
                  </FieldWrap>
                  <FieldWrap label="What would you like to use SOS for?" error={errors.use_case}>
                    <textarea rows={4} className={inputCls + ' resize-none'} value={form.use_case} onChange={update('use_case')} placeholder="e.g. Coordinating mutual-aid response across our county" />
                  </FieldWrap>

                  {status === 'error' && (
                    <p className="text-[12px] text-[#EF4E4B]">Something went wrong: {errMsg}</p>
                  )}

                  <button
                    type="submit"
                    disabled={status === 'submitting'}
                    className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-[#EF4E4B] text-white text-[14px] font-semibold hover:bg-[#d94340] transition disabled:opacity-60"
                  >
                    {status === 'submitting' ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Submitting…
                      </>
                    ) : (
                      <>
                        Request access <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-white/40 text-center">
                    By submitting you agree to our{' '}
                    <a className="underline">terms</a> and <a className="underline">privacy</a>.
                  </p>
                </form>
              </>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 mt-10">
        <div className="max-w-6xl mx-auto px-5 md:px-10 py-6 flex items-center justify-between text-[12px] text-white/45">
          <span>© {new Date().getFullYear()} SOS Connect</span>
          <Link href="/" className="hover:text-white/70 transition">
            Home
          </Link>
        </div>
      </footer>
    </div>
  );
}

const inputCls =
  'w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 focus:bg-white/[0.06] transition';

function FieldWrap({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between text-[12px] text-white/70 mb-1.5">
        <span>{label}</span>
        {hint && <span className="text-white/35">{hint}</span>}
      </span>
      {children}
      {error && <span className="block mt-1 text-[11.5px] text-[#EF4E4B]">{error}</span>}
    </label>
  );
}

function Feature({
  icon: Icon,
  color,
  title,
  body,
}: {
  icon: typeof Map;
  color: string;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-4">
      <div
        className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center"
        style={{ background: `${color}22`, color }}
      >
        <Icon size={16} strokeWidth={1.75} />
      </div>
      <div>
        <p className="font-medium text-[15px]">{title}</p>
        <p className="text-[13.5px] text-white/55 leading-relaxed mt-0.5">{body}</p>
      </div>
    </li>
  );
}
