'use client';

import { useState } from 'react';
import { sendOTP, verifyOTP } from '@/packages/auth/phone-auth';
import { useRouter } from 'next/navigation';

type Step = 'phone' | 'otp' | 'verifying';

export default function CitizenAuth() {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function formatPhoneForAPI(input: string): string {
    const digits = input.replace(/\D/g, '');
    if (digits.startsWith('1') && digits.length === 11) return '+' + digits;
    if (digits.length === 10) return '+1' + digits;
    if (input.startsWith('+')) return input;
    return '+1' + digits;
  }

  async function handleSendOTP(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const formattedPhone = formatPhoneForAPI(phone);
    const result = await sendOTP(formattedPhone);
    setLoading(false);
    if (result.success) {
      setStep('otp');
    } else {
      setError(result.error || 'Failed to send code');
    }
  }

  async function handleVerifyOTP(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    setStep('verifying');
    const result = await verifyOTP(formatPhoneForAPI(phone), otp);
    setLoading(false);
    if (result.success) {
      // Store person ID in localStorage for citizen context
      if (result.personId) {
        localStorage.setItem('sos-person-id', result.personId);
      }
      router.push('/c');
    } else {
      setStep('otp');
      setError(result.error || 'Invalid code');
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <img src="/logomark.svg" alt="SOS" className="h-14 w-14 mb-4" />
      <h1 className="text-2xl font-bold text-sos-blue-800 mb-1">SOS | Connect</h1>
      <p className="text-sm text-sos-gray-600 mb-8">Everyone is a helper</p>

      {step === 'phone' && (
        <form onSubmit={handleSendOTP} className="w-full max-w-xs space-y-4">
          <div>
            <label className="text-xs font-medium text-sos-gray-600 uppercase tracking-wider">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="(555) 000-0000"
              className="w-full mt-1 px-4 py-3 rounded-xl border-2 border-sos-gray-300 text-lg text-sos-blue-800 text-center focus:outline-none focus:border-sos-accent-400"
              autoFocus
            />
          </div>
          {error && <p className="text-sm text-sos-red-500 text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading || phone.length < 10}
            className="w-full py-3.5 rounded-xl bg-sos-red-500 text-white font-bold text-base hover:bg-sos-red-600 disabled:opacity-40 transition-colors"
          >
            {loading ? 'Sending...' : 'Send Code'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/c')}
            className="w-full py-2 text-sm text-sos-gray-500 hover:text-sos-blue-800 transition-colors"
          >
            Continue without signing in
          </button>
        </form>
      )}

      {step === 'otp' && (
        <form onSubmit={handleVerifyOTP} className="w-full max-w-xs space-y-4">
          <p className="text-sm text-sos-gray-600 text-center">Enter the code sent to <strong>{phone}</strong></p>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="w-full px-4 py-3 rounded-xl border-2 border-sos-gray-300 text-2xl text-sos-blue-800 text-center tracking-[0.5em] font-bold focus:outline-none focus:border-sos-accent-400"
            autoFocus
          />
          {error && <p className="text-sm text-sos-red-500 text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading || otp.length < 6}
            className="w-full py-3.5 rounded-xl bg-sos-red-500 text-white font-bold text-base hover:bg-sos-red-600 disabled:opacity-40 transition-colors"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>
          <button
            type="button"
            onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
            className="w-full py-2 text-sm text-sos-gray-500 hover:text-sos-blue-800 transition-colors"
          >
            ← Change number
          </button>
        </form>
      )}

      {step === 'verifying' && (
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-sos-accent-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-sos-gray-600">Setting up your profile...</p>
        </div>
      )}
    </div>
  );
}
