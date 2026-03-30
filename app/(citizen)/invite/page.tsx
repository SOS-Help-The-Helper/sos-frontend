'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rtduqguwhkczexnoawej.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export default function InvitePage() {
  const router = useRouter();
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState({ invited: 0, signedUp: 0, pointsEarned: 0 });
  const personId = typeof window !== 'undefined' ? localStorage.getItem('sos-person-id') : null;

  useEffect(() => {
    if (!personId) { setLoading(false); return; }
    async function load() {
      // Generate or retrieve referral code via EF
      const res = await fetch(`${SUPABASE_URL}/functions/v1/referral-track`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', person_id: personId }),
      });
      if (res.ok) {
        const data = await res.json();
        setReferralCode(data.referral_code || '');
        setStats({ invited: data.invited || 0, signedUp: data.signed_up || 0, pointsEarned: data.points_earned || 0 });
      }
      setLoading(false);
    }
    load();
  }, [personId]);

  const shareUrl = `https://sosconnect.org/join?ref=${referralCode}`;
  const shareText = `Join SOS Connect — be prepared, help your neighbors, and know what's happening in your community. Everyone is a helper. ${shareUrl}`;

  async function handleShare() {
    if (navigator.share) {
      await navigator.share({ title: 'Join SOS Connect', text: shareText, url: shareUrl });
    } else {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F5F0] flex flex-col max-w-lg mx-auto">
      <header className="bg-sos-blue-800 text-white px-4 py-3 pt-[calc(env(safe-area-inset-top,0px)+12px)] flex items-center gap-3">
        <button onClick={() => router.push('/c')} className="text-white/60 hover:text-white">←</button>
        <p className="text-sm font-bold">Invite Neighbors</p>
      </header>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-3 border-sos-accent-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="flex-1 px-4 py-5 space-y-4">
          {/* Hero */}
          <div className="bg-sos-blue-800 text-white rounded-2xl p-6 text-center">
            <span className="text-4xl block mb-3">🤝</span>
            <h2 className="text-lg font-bold mb-1">Stronger Together</h2>
            <p className="text-sm text-white/70">Invite neighbors to join your community. Every person who joins makes everyone safer.</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-sos-gray-300 p-3 text-center">
              <p className="text-xl font-bold text-sos-blue-800">{stats.invited}</p>
              <p className="text-[9px] text-sos-gray-500">Invited</p>
            </div>
            <div className="bg-white rounded-xl border border-sos-gray-300 p-3 text-center">
              <p className="text-xl font-bold text-green-600">{stats.signedUp}</p>
              <p className="text-[9px] text-sos-gray-500">Joined</p>
            </div>
            <div className="bg-white rounded-xl border border-sos-gray-300 p-3 text-center">
              <p className="text-xl font-bold text-sos-accent-700">+{stats.pointsEarned}</p>
              <p className="text-[9px] text-sos-gray-500">Points</p>
            </div>
          </div>

          {/* Share link */}
          <div className="bg-white rounded-xl border border-sos-gray-300 p-4">
            <p className="text-xs font-medium text-sos-gray-600 mb-2">Your invite link</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs text-sos-blue-800 bg-sos-gray-200 px-3 py-2 rounded-lg truncate">{shareUrl}</code>
              <button onClick={() => { navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className="text-xs font-bold px-3 py-2 rounded-lg bg-sos-gray-200 text-sos-blue-800 hover:bg-sos-gray-300 transition-colors flex-shrink-0">
                {copied ? '✓' : '📋'}
              </button>
            </div>
          </div>

          {/* Share button */}
          <button onClick={handleShare}
            className="w-full py-4 rounded-xl bg-sos-red-500 text-white font-bold text-base hover:bg-sos-red-600 transition-colors">
            📤 Share Invite
          </button>

          {/* How it works */}
          <div className="bg-white rounded-xl border border-sos-gray-300 p-4">
            <p className="text-xs font-bold text-sos-blue-800 mb-2">How It Works</p>
            <div className="space-y-2 text-xs text-sos-gray-700">
              <p>1️⃣ Share your link via text, WhatsApp, or social</p>
              <p>2️⃣ They sign up → you earn <strong>+6 Community points</strong></p>
              <p>3️⃣ They add skills → you earn <strong>+2 more points</strong></p>
              <p>4️⃣ Your community gets stronger 💪</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
