'use client';

import { useState, type CSSProperties } from 'react';
import Link from 'next/link';
import '@/styles/home.css';

const ACCENT = '#89CFF0';
const NAVY = '#0F1E2B';

type Candidate = 'bass' | 'pratt' | 'raman' | 'other';

const CANDIDATES: { id: Candidate; name: string }[] = [
  { id: 'bass', name: 'Karen Bass' },
  { id: 'pratt', name: 'Spencer Pratt' },
  { id: 'raman', name: 'Nithya Raman' },
  { id: 'other', name: 'Other' },
];

export default function VotePage() {
  // Form is display-only for v1 — no API calls.
  const [step, setStep] = useState<'phone' | 'code' | 'match' | 'vote'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 5000);
  }

  function next(e: React.FormEvent, to: typeof step) {
    e.preventDefault();
    setStep(to);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    showToast('VoteVerify launches soon. Join the waitlist.');
  }

  return (
    <main>
      {/* ══════════════════════════════ HERO ══════════════════════════════ */}
      <section
        className="bg-navy"
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '120px 32px',
        }}
      >
        {/* Logomark top-left */}
        <Link
          href="/"
          style={{ position: 'absolute', top: 28, left: 28, display: 'inline-flex' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logomark.svg" alt="SOS" style={{ height: 30, opacity: 0.85 }} />
        </Link>

        <div style={{ maxWidth: 720 }}>
          <p className="label" style={{ color: ACCENT, marginBottom: 20 }}>
            A civic experiment by SOS
          </p>
          <h1 className="serif" style={{ color: '#fff', fontSize: 'clamp(40px, 8vw, 64px)' }}>
            Did Your Vote Count?
          </h1>
          <p
            className="body-lg"
            style={{ color: 'rgba(255,255,255,0.65)', marginTop: 20, fontSize: 18, maxWidth: 480, margin: '20px auto 0' }}
          >
            Tell us who you voted for in the LA mayor&apos;s race.
            We verify you&apos;re a real voter. You stay anonymous.
          </p>

          <div style={{ marginTop: 36 }}>
            <a href="#attest-form" style={ctaButtonStyle}>
              I Voted — Count Me
            </a>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 14 }}>
              60 seconds · Phone verified · Data deleted after certification
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════ HOW IT WORKS ══════════════════════════ */}
      <section className="bg-light">
        <div className="wide">
          <p className="label text-center">How It Works</p>
          <h2 className="text-center">Three steps. One minute.</h2>
          <div className="accent-line accent-line-center" />

          <div className="eco-grid" style={{ marginTop: 48 }}>
            {[
              {
                n: '01',
                title: 'Verify Your Identity',
                body: 'Enter your phone number. We send a one-time code to confirm you are who you say you are.',
              },
              {
                n: '02',
                title: 'Confirm Your Registration',
                body: 'We cross-reference your name and address against the official LA County voter file to verify you are a registered City of LA voter.',
              },
              {
                n: '03',
                title: 'Attest Your Vote',
                body: 'Select the candidate you voted for. Your choice is recorded anonymously and added to the public aggregate count.',
              },
            ].map((s) => (
              <div className="eco-card" key={s.n}>
                <p className="eco-label">Step {s.n}</p>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════ LIVE RESULTS ═══════════════════════════ */}
      <section className="bg-navy">
        <div className="narrow">
          <p className="label text-center">Live Results</p>
          <h2 className="text-center">Live Attestation Results</h2>
          <div className="accent-line accent-line-center" />

          <div style={{ marginTop: 48, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {CANDIDATES.map((c) => (
              <div
                key={c.id}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 16,
                  padding: '20px 24px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: 12,
                  }}
                >
                  <span style={{ color: '#fff', fontSize: 17, fontWeight: 600 }}>
                    {c.name}
                  </span>
                  <span style={{ color: ACCENT, fontSize: 15, fontWeight: 700 }}>
                    — attestations
                  </span>
                </div>
                {/* Percentage bar — placeholder at 0% until data is wired */}
                <div
                  style={{
                    height: 8,
                    borderRadius: 4,
                    background: 'rgba(255,255,255,0.08)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{ height: '100%', width: '0%', background: ACCENT, borderRadius: 4 }}
                  />
                </div>
              </div>
            ))}
          </div>

          <p
            style={{
              color: 'rgba(255,255,255,0.4)',
              fontSize: 13,
              textAlign: 'center',
              marginTop: 32,
              lineHeight: 1.7,
              fontWeight: 300,
            }}
          >
            These are crowd-sourced attestations from verified voters, not official election results. Official results at lavote.gov.
            Official election results from{' '}
            <a
              href="https://www.lavote.gov"
              target="_blank"
              rel="noopener"
              style={{ color: ACCENT }}
            >
              lavote.gov
            </a>
            .
          </p>
        </div>
      </section>

      {/* ═══════════════════════ TRUST & TRANSPARENCY ═══════════════════════ */}
      <section className="bg-white">
        <div className="wide">
          <p className="label text-center">Trust &amp; Transparency</p>
          <h2 className="text-center">Built for Trust</h2>
          <div className="accent-line accent-line-center" />

          <div className="eco-grid" style={{ marginTop: 48 }}>
            {[
              {
                title: 'Voter File Verified',
                body: 'Every attestation is matched against the official LA County voter registration file. Non-registered or out-of-district submissions are excluded.',
              },
              {
                title: 'Data Deleted After Certification',
                body: 'Individual attestation records are permanently deleted within 30 days of election certification. Only aggregate statistics are retained.',
              },
              {
                title: 'Open & Nonpartisan',
                body: 'This is a civic experiment, not an official election tool. Built by SOS Global, a 501(c)(3) nonprofit. All candidates are listed equally.',
              },
            ].map((t) => (
              <div className="eco-card" key={t.title}>
                <h3>{t.title}</h3>
                <p>{t.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════ FORM ════════════════════════════ */}
      <section id="attest-form" className="bg-light">
        <div style={{ maxWidth: 440, margin: '0 auto' }}>
          <p className="label text-center">Attestation</p>
          <h2 className="text-center">Verify My Vote</h2>
          <div className="accent-line accent-line-center" />

          {/* Step indicator */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 8,
              margin: '32px 0',
            }}
          >
            {(['phone', 'code', 'match', 'vote'] as const).map((s) => (
              <span
                key={s}
                style={{
                  width: 28,
                  height: 4,
                  borderRadius: 2,
                  background:
                    ['phone', 'code', 'match', 'vote'].indexOf(step) >=
                    ['phone', 'code', 'match', 'vote'].indexOf(s)
                      ? ACCENT
                      : 'rgba(15,30,43,0.12)',
                }}
              />
            ))}
          </div>

          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              border: '1px solid rgba(15,30,43,0.08)',
              padding: 28,
              boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
            }}
          >
            {step === 'phone' && (
              <form onSubmit={(e) => next(e, 'code')} style={formStyle}>
                <label style={labelStyle} htmlFor="v-phone">
                  Phone number
                </label>
                <input
                  id="v-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(213) 555-0142"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={inputStyle}
                  required
                />
                <button type="submit" style={primaryBtn}>
                  Send Code
                </button>
                <p style={hintStyle}>
                  We&apos;ll text a one-time code to confirm your identity.
                </p>
              </form>
            )}

            {step === 'code' && (
              <form onSubmit={(e) => next(e, 'match')} style={formStyle}>
                <label style={labelStyle} htmlFor="v-code">
                  6-digit code
                </label>
                <input
                  id="v-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="••••••"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  style={{ ...inputStyle, letterSpacing: '0.4em', textAlign: 'center', fontSize: 22 }}
                  required
                />
                <button type="submit" style={primaryBtn}>
                  Verify Code
                </button>
                <button type="button" onClick={() => setStep('phone')} style={linkBtn}>
                  ← Change number
                </button>
              </form>
            )}

            {step === 'match' && (
              <form onSubmit={(e) => next(e, 'vote')} style={formStyle}>
                <p style={{ ...hintStyle, marginBottom: 4 }}>
                  We&apos;ll match this against the official LA County voter file.
                </p>
                <label style={labelStyle} htmlFor="v-name">
                  Full name
                </label>
                <input
                  id="v-name"
                  type="text"
                  autoComplete="name"
                  placeholder="Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={inputStyle}
                  required
                />
                <label style={labelStyle} htmlFor="v-address">
                  Registered address
                </label>
                <input
                  id="v-address"
                  type="text"
                  autoComplete="street-address"
                  placeholder="123 Main St, Los Angeles, CA 90012"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  style={inputStyle}
                  required
                />
                <button type="submit" style={primaryBtn}>
                  Verify Registration
                </button>
              </form>
            )}

            {step === 'vote' && (
              <form onSubmit={submit} style={formStyle}>
                <label style={labelStyle}>Who did you vote for?</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {CANDIDATES.map((c) => (
                    <label
                      key={c.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '14px 16px',
                        borderRadius: 12,
                        cursor: 'pointer',
                        border: `1px solid ${
                          candidate === c.id ? ACCENT : 'rgba(15,30,43,0.12)'
                        }`,
                        background: candidate === c.id ? 'rgba(137,207,240,0.08)' : '#fff',
                        transition: 'all 120ms',
                      }}
                    >
                      <input
                        type="radio"
                        name="candidate"
                        value={c.id}
                        checked={candidate === c.id}
                        onChange={() => setCandidate(c.id)}
                        style={{ accentColor: ACCENT, width: 18, height: 18 }}
                        required
                      />
                      <span style={{ fontSize: 15, fontWeight: 600, color: NAVY }}>
                        {c.name}
                      </span>
                    </label>
                  ))}
                </div>
                <button type="submit" style={primaryBtn}>
                  Submit My Attestation
                </button>
                <p style={hintStyle}>
                  Your choice is recorded anonymously and deleted after certification.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ════════════════════════════ FOOTER ════════════════════════════ */}
      <footer>
        <p className="mb-12">
          <Link href="/" className="footer-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logomark.svg" alt="SOS" />
            VoteVerify by SOS
          </Link>
        </p>
        <p style={{ maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>
          A civic experiment by SOS Global Inc., a 501(c)(3) nonprofit. This is not an official election tool.
        </p>
        <p style={{ marginTop: 12 }}>
          <a href="https://sosconnect.org" target="_blank" rel="noopener">
            sosconnect.org
          </a>
          &nbsp;&nbsp;·&nbsp;&nbsp;
          <a href="mailto:hello@sosconnect.org">hello@sosconnect.org</a>
        </p>
        <p className="footer-copy">© 2026 SOS Global Inc.</p>
      </footer>

      {/* Toast */}
      {toast && (
        <div
          role="status"
          style={{
            position: 'fixed',
            left: '50%',
            bottom: 28,
            transform: 'translateX(-50%)',
            background: NAVY,
            color: '#fff',
            padding: '14px 22px',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 600,
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
            border: `1px solid ${ACCENT}`,
            zIndex: 1000,
            maxWidth: 'calc(100vw - 32px)',
            textAlign: 'center',
          }}
        >
          {toast}
        </div>
      )}
    </main>
  );
}

/* ── Styles ── */
const ctaButtonStyle: CSSProperties = {
  display: 'inline-block',
  background: ACCENT,
  color: NAVY,
  padding: '16px 40px',
  borderRadius: 10,
  fontSize: 15,
  fontWeight: 700,
  textDecoration: 'none',
  letterSpacing: '0.02em',
};

const formStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

const labelStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: NAVY,
  letterSpacing: '0.02em',
};

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: 12,
  background: '#f8f9fa',
  border: '1px solid rgba(15,30,43,0.12)',
  color: NAVY,
  fontSize: 16,
  outline: 'none',
};

const primaryBtn: CSSProperties = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: 12,
  background: ACCENT,
  color: NAVY,
  fontSize: 15,
  fontWeight: 700,
  border: 'none',
  cursor: 'pointer',
  marginTop: 4,
};

const linkBtn: CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#0F1E2B',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  padding: 0,
  textDecoration: 'underline',
};

const hintStyle: CSSProperties = {
  fontSize: 12,
  color: '#6b7280',
  lineHeight: 1.6,
  margin: 0,
};
