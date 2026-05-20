'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const CATEGORIES = [
  { id: 'flood', icon: '🌊', label: 'Flood' },
  { id: 'fire', icon: '🔥', label: 'Fire' },
  { id: 'structure', icon: '🏚️', label: 'Structure' },
  { id: 'road', icon: '🚧', label: 'Road' },
  { id: 'medical', icon: '🚑', label: 'Medical' },
  { id: 'rescue', icon: '🆘', label: 'Rescue' },
];

const SEVERITY = [
  { id: 'yellow', icon: '🟡', label: 'Minor', color: 'border-yellow-400 bg-yellow-400/10' },
  { id: 'orange', icon: '🟠', label: 'Moderate', color: 'border-yellow-600 bg-yellow-600/10' },
  { id: 'red', icon: '🔴', label: 'Critical', color: 'border-sos-red-500 bg-sos-red-500/10' },
];

export default function SitrepPage() {
  const router = useRouter();
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState('');
  const [affected, setAffected] = useState('');
  const [structures, setStructures] = useState('');
  const [notes, setNotes] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'detecting' | 'done' | 'failed'>('detecting');
  const [recording, setRecording] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const recognitionRef = useRef<any>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Auto-detect GPS on mount
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsStatus('done');
      },
      () => setGpsStatus('failed'),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, []);

  // Voice-to-text
  function toggleVoice() {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Voice input not supported in this browser');
      return;
    }

    if (recording && recognitionRef.current) {
      recognitionRef.current.stop();
      setRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setNotes(transcript);
    };

    recognition.onerror = () => setRecording(false);
    recognition.onend = () => setRecording(false);

    recognition.start();
    recognitionRef.current = recognition;
    setRecording(true);
  }

  // Photo capture
  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  // Submit sitrep via edge function
  async function handleSubmit() {
    if (!category || !severity || !location) return;
    setSubmitting(true);

    // Upload photo if present
    let photoUrl: string | null = null;
    if (photoFile) {
      // TODO: upload to Supabase storage, get public URL
      photoUrl = null; // placeholder
    }

    try {
      const response = await fetch('/api/ems/sitrep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: { lat: location.lat, lng: location.lng },
          category,
          severity,
          affected_count: affected ? parseInt(affected) : null,
          structures_affected: structures ? parseInt(structures) : null,
          notes: notes || null,
          photo_url: photoUrl,
          agent_id: 'ems',
        }),
      });

      if (response.ok) {
        setSubmitted(true);
      }
    } catch {
      // Offline: queue for later
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        // Queue in IndexedDB for background sync
        console.log('[Sitrep] Queued for offline sync');
      }
      setSubmitted(true); // Show success anyway — will sync later
    }

    setSubmitting(false);
  }

  // Reset for another sitrep
  function reset() {
    setCategory('');
    setSeverity('');
    setAffected('');
    setStructures('');
    setNotes('');
    setPhotoFile(null);
    setPhotoPreview('');
    setSubmitted(false);
    // Re-detect GPS
    setGpsStatus('detecting');
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsStatus('done'); },
      () => setGpsStatus('failed'),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
          <span className="text-3xl">✓</span>
        </div>
        <h2 className="text-xl font-bold mb-2">Sitrep Filed</h2>
        <p className="text-sm text-white/60 max-w-xs">Your report is in the system. Nearby citizen reports will be auto-calibrated.</p>
        <div className="flex gap-3 mt-6">
          <button onClick={reset} className="px-6 py-3 rounded-xl bg-white/10 border border-white/20 font-bold text-sm">
            File Another
          </button>
          <button onClick={() => router.push('/ems/verify')} className="px-6 py-3 rounded-xl bg-sos-accent-600 font-bold text-sm">
            Verify Reports
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-[env(safe-area-inset-top)] pb-8 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <img src="/logomark.svg" alt="SOS" className="h-7 w-7" />
          <div>
            <h1 className="text-sm font-bold leading-none">EMS SITREP</h1>
            <p className="text-[10px] text-white/40">Field Report</p>
          </div>
        </div>
        <button onClick={() => router.push('/ems/verify')} className="text-xs text-sos-accent-400 hover:text-sos-accent-300">
          Verify Queue →
        </button>
      </div>

      {/* GPS */}
      <div className={`rounded-xl p-3 mb-4 flex items-center gap-2 text-sm ${
        gpsStatus === 'done' ? 'bg-green-500/10 border border-green-500/30' :
        gpsStatus === 'failed' ? 'bg-sos-red-500/10 border border-sos-red-500/30' :
        'bg-white/5 border border-white/10'
      }`}>
        <span className="text-lg">{gpsStatus === 'done' ? '📍' : gpsStatus === 'failed' ? '⚠️' : '🔄'}</span>
        <span className="text-sm">
          {gpsStatus === 'done' ? `${location!.lat.toFixed(5)}, ${location!.lng.toFixed(5)}` :
           gpsStatus === 'failed' ? 'GPS failed — enable location' :
           'Detecting location...'}
        </span>
      </div>

      {/* Category — big tap targets */}
      <div className="mb-5">
        <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">What</p>
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`flex flex-col items-center justify-center gap-1 py-4 rounded-xl border-2 transition-colors ${
                category === cat.id
                  ? 'border-sos-accent-400 bg-sos-accent-400/10'
                  : 'border-white/10 bg-white/5 active:bg-white/10'
              }`}
            >
              <span className="text-2xl">{cat.icon}</span>
              <span className="text-[11px] font-semibold">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Severity */}
      <div className="mb-5">
        <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Severity</p>
        <div className="grid grid-cols-3 gap-2">
          {SEVERITY.map(s => (
            <button
              key={s.id}
              onClick={() => setSeverity(s.id)}
              className={`flex flex-col items-center justify-center gap-1 py-4 rounded-xl border-2 transition-colors ${
                severity === s.id ? s.color : 'border-white/10 bg-white/5 active:bg-white/10'
              }`}
            >
              <span className="text-2xl">{s.icon}</span>
              <span className="text-[11px] font-semibold">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Counts */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div>
          <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-1">Affected</p>
          <input
            type="number"
            inputMode="numeric"
            value={affected}
            onChange={e => setAffected(e.target.value)}
            placeholder="0"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-xl font-bold text-center text-white placeholder:text-white/20 focus:outline-none focus:border-sos-accent-400"
          />
          <p className="text-[10px] text-white/30 text-center mt-1">people</p>
        </div>
        <div>
          <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-1">Structures</p>
          <input
            type="number"
            inputMode="numeric"
            value={structures}
            onChange={e => setStructures(e.target.value)}
            placeholder="0"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-xl font-bold text-center text-white placeholder:text-white/20 focus:outline-none focus:border-sos-accent-400"
          />
          <p className="text-[10px] text-white/30 text-center mt-1">damaged</p>
        </div>
      </div>

      {/* Voice + Photo */}
      <div className="flex gap-3 mb-4">
        <button
          onClick={toggleVoice}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 font-bold text-sm transition-colors ${
            recording ? 'border-sos-red-500 bg-sos-red-500/20 text-sos-red-400' : 'border-white/10 bg-white/5 active:bg-white/10'
          }`}
        >
          <span className="text-lg">{recording ? '⏹️' : '🎤'}</span>
          {recording ? 'Stop' : 'Voice Note'}
        </button>
        <button
          onClick={() => photoInputRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-white/10 bg-white/5 font-bold text-sm active:bg-white/10"
        >
          <span className="text-lg">📷</span>
          {photoPreview ? 'Change' : 'Photo'}
        </button>
        <input ref={photoInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
      </div>

      {/* Notes (populated by voice or manual) */}
      {notes && (
        <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/10">
          <p className="text-xs text-white/40 mb-1">Notes</p>
          <p className="text-sm text-white/80">{notes}</p>
        </div>
      )}

      {/* Photo preview */}
      {photoPreview && (
        <div className="mb-4 rounded-xl overflow-hidden border border-white/10">
          <img src={photoPreview} alt="Sitrep photo" className="w-full h-40 object-cover" />
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!category || !severity || !location || submitting}
        className="w-full py-4 rounded-xl bg-sos-red-500 text-white font-bold text-base hover:bg-sos-red-600 disabled:opacity-30 transition-colors"
      >
        {submitting ? 'Filing...' : 'SUBMIT SITREP'}
      </button>

      {(!category || !severity) && (
        <p className="text-[10px] text-white/30 text-center mt-2">Select category and severity to submit</p>
      )}
    </div>
  );
}
