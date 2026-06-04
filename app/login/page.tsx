'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-auth';

/**
 * Normalize a user-typed phone number to E.164.
 * Defaults to US (+1) when no country code is given.
 */
function toE164(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.startsWith('+')) {
    const digits = trimmed.slice(1).replace(/\D/g, '');
    return digits.length >= 8 ? `+${digits}` : null;
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

/** Pretty-print E.164 for display, e.g. +17745032112 → +1 (774) 503-2112 */
function prettyPhone(e164: string): string {
  const m = e164.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  return m ? `+1 (${m[1]}) ${m[2]}-${m[3]}` : e164;
}

const ACCENT = '#89CFF0';

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/app';

  const supabase = createSupabaseBrowserClient();

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneInput, setPhoneInput] = useState('');
  const [e164, setE164] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const normalized = toE164(phoneInput);
    if (!normalized) {
      setError('Enter a valid phone number, e.g. (774) 503-2112');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: normalized });
    setLoading(false);
    if (error) {
      setError(
        /rate|limit|too many/i.test(error.message)
          ? 'Too many attempts. Please wait a minute and try again.'
          : error.message || 'Could not send code. Try again.'
      );
      return;
    }
    setE164(normalized);
    setCode('');
    setStep('otp');
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (code.trim().length < 6) {
      setError('Enter the 6-digit code.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      phone: e164,
      token: code.trim(),
      type: 'sms',
    });
    setLoading(false);
    if (error) {
      setError(
        /expired|invalid|incorrect/i.test(error.message)
          ? 'That code is invalid or expired. Request a new one.'
          : error.message || 'Verification failed. Try again.'
      );
      return;
    }
    // Full reload so middleware + server see the fresh session cookie.
    window.location.assign(redirectTo);
  }

  async function resend() {
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: e164 });
    setLoading(false);
    if (error) {
      setError(/rate|limit|too many/i.test(error.message)
        ? 'Too many attempts. Please wait a minute.'
        : error.message);
    }
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#0F1E2B',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div style={{ width: '100%', maxWidth: 380 }}>
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logomark.svg" alt="SOS" width={48} height={48} />
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 24,
              marginTop: 12,
              marginBottom: 4,
              letterSpacing: '0.01em',
            }}
          >
            SOS Portal
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
            {step === 'phone'
              ? 'Sign in with your phone number'
              : `Code sent to ${prettyPhone(e164)}`}
          </p>
        </div>

        {step === 'phone' ? (
          <form onSubmit={sendCode} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={labelStyle} htmlFor="phone">
              Phone number
            </label>
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              autoFocus
              placeholder="(774) 503-2112"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              style={inputStyle}
            />
            {error && <p style={errorStyle}>{error}</p>}
            <button type="submit" disabled={loading} style={primaryBtn(loading)}>
              {loading ? 'Sending…' : 'Send Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={labelStyle} htmlFor="otp">
              6-digit code
            </label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={6}
              placeholder="••••••"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              style={{ ...inputStyle, letterSpacing: '0.4em', textAlign: 'center', fontSize: 22 }}
            />
            {error && <p style={errorStyle}>{error}</p>}
            <button type="submit" disabled={loading} style={primaryBtn(loading)}>
              {loading ? 'Verifying…' : 'Verify & Continue'}
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <button type="button" onClick={() => { setStep('phone'); setError(null); }} style={linkBtn}>
                ← Change number
              </button>
              <button type="button" onClick={resend} disabled={loading} style={linkBtn}>
                Resend code
              </button>
            </div>
          </form>
        )}

        <p style={{ marginTop: 28, fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'center', lineHeight: 1.5 }}>
          Standard message and data rates may apply. By continuing you agree to
          receive a one-time verification code via SMS.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100dvh', background: '#0F1E2B' }} />}>
      <LoginInner />
    </Suspense>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: 'rgba(255,255,255,0.6)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: 12,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.12)',
  color: '#fff',
  fontSize: 16,
  outline: 'none',
};

const errorStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#FCA5A5',
  margin: 0,
};

function primaryBtn(loading: boolean): React.CSSProperties {
  return {
    width: '100%',
    padding: '14px 16px',
    borderRadius: 12,
    background: ACCENT,
    color: '#0F1E2B',
    fontSize: 15,
    fontWeight: 700,
    border: 'none',
    cursor: loading ? 'default' : 'pointer',
    opacity: loading ? 0.7 : 1,
    marginTop: 4,
    transition: 'opacity 120ms',
  };
}

const linkBtn: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: ACCENT,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  padding: 0,
};
