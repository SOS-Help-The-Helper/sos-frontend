'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getPersonId } from '@/lib/person-cookie';

function JoinHandler() {
  const router = useRouter();
  const params = useSearchParams();
  const ref = params.get('ref');

  useEffect(() => {
    // Store referral code → used after auth to call referral-track EF
    if (ref) {
      localStorage.setItem('sos-referral-code', ref);
    }
    // Redirect to auth (or home if already authed)
    const personId = getPersonId();
    if (personId) {
      // Already signed in — convert referral
      convertReferral(ref, personId);
      router.replace('/c');
    } else {
      router.replace('/auth');
    }
  }, [ref, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <img src="/logomark.svg" alt="SOS" className="h-14 w-14 mb-4" />
      <h1 className="text-xl font-bold text-sos-blue-800">Welcome to SOS</h1>
      <p className="text-sm text-sos-gray-600 mt-2">You&apos;ve been invited to join your community.</p>
      <div className="mt-6 w-8 h-8 border-3 border-sos-accent-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

async function convertReferral(code: string | null, personId: string) {
  if (!code) return;
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rtduqguwhkczexnoawej.supabase.co';
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/referral-track`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'convert', referral_code: code, new_person_id: personId }),
    });
    localStorage.removeItem('sos-referral-code');
  } catch { /* will retry on next visit */ }
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-3 border-sos-accent-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <JoinHandler />
    </Suspense>
  );
}
