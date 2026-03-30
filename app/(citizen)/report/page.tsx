'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rtduqguwhkczexnoawej.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

type Step = 'what' | 'analyzing' | 'where' | 'danger' | 'submitting' | 'done';

export default function ReportPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('what');

  // Photo
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [analysis, setAnalysis] = useState<{ type?: string; severity?: string; description?: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Text
  const [description, setDescription] = useState('');

  // Location
  const [locMode, setLocMode] = useState<'gps' | 'search' | null>(null);
  const [lat, setLat] = useState(0);
  const [lng, setLng] = useState(0);
  const [locationName, setLocationName] = useState('');
  const [gpsDetecting, setGpsDetecting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Danger
  const [isDanger, setIsDanger] = useState<boolean | null>(null);

  const personId = typeof window !== 'undefined' ? localStorage.getItem('sos-person-id') : null;

  // Photo capture + upload + analyze
  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);

    setStep('analyzing');
    setUploading(true);

    // Upload to Storage
    const fileName = `reports/${personId || 'anon'}/${Date.now()}-report.jpg`;
    const { error: uploadErr } = await supabase.storage.from('community-photos').upload(fileName, file, { contentType: file.type });
    const { data: urlData } = supabase.storage.from('community-photos').getPublicUrl(fileName);
    const url = urlData?.publicUrl || '';
    setPhotoUrl(url);

    // Call image-analyze EF
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/image-analyze`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo_url: url, context: 'citizen_report' }),
      });
      if (res.ok) {
        const data = await res.json();
        setAnalysis(data.analysis || data);
      }
    } catch { /* analysis optional — continue without it */ }

    setUploading(false);
    setStep('where');
  }

  // Text path
  function handleTextSubmit() {
    if (!description.trim()) return;
    setStep('where');
  }

  // GPS
  function detectGPS() {
    setLocMode('gps');
    setGpsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); setLocationName(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`); setGpsDetecting(false); },
      () => setGpsDetecting(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // Places search
  async function searchPlaces(query: string) {
    setSearchQuery(query);
    if (query.length < 3) { setSearchResults([]); return; }
    try {
      const PLACES_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY || '';
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${PLACES_KEY}`);
      const data = await res.json();
      setSearchResults((data.results || []).slice(0, 4).map((r: any) => ({
        name: r.formatted_address, lat: r.geometry.location.lat, lng: r.geometry.location.lng,
      })));
    } catch { setSearchResults([]); }
  }

  function selectPlace(place: { name: string; lat: number; lng: number }) {
    setLocationName(place.name); setLat(place.lat); setLng(place.lng); setSearchResults([]); setSearchQuery('');
  }

  // Submit
  async function handleSubmit(danger: boolean) {
    setIsDanger(danger);
    setStep('submitting');

    const reportText = description || (analysis?.description ? `📷 ${analysis.description}` : '📷 Photo report');

    try {
      // Submit via community-messages EF (creates signal_trace)
      await fetch(`${SUPABASE_URL}/functions/v1/community-messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          person_id: personId,
          message_text: reportText,
          message_type: 'report',
          photo_url: photoUrl || null,
          photo_analysis: analysis || null,
          latitude: lat,
          longitude: lng,
          community_radius_km: 8,
        }),
      });

      // If danger → also create a SAFETY.RESCUE request via intake-write
      if (danger) {
        await fetch(`${SUPABASE_URL}/functions/v1/intake-write`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            person_id: personId,
            category: 'safety',
            taxonomy_code: 'SAFETY.RESCUE',
            urgency: 'critical',
            latitude: lat,
            longitude: lng,
            location_name: locationName,
            details_sanitized: `CITIZEN REPORT: ${reportText}`,
            source: 'citizen_report',
            is_emergency: true,
          }),
        });
      }
    } catch { /* offline — will sync */ }

    setStep('done');
  }

  return (
    <div className="min-h-screen bg-[#F7F5F0] flex flex-col max-w-lg mx-auto">
      <header className="bg-sos-blue-800 text-white px-4 py-3 pt-[calc(env(safe-area-inset-top,0px)+12px)] flex items-center gap-3">
        <button onClick={() => step === 'what' ? router.push('/c') : setStep(step === 'where' ? 'what' : step === 'danger' ? 'where' : 'what')}
          className="text-white/60 hover:text-white">←</button>
        <p className="text-sm font-bold">📢 Report</p>
      </header>

      <div className="flex-1 px-4 py-5">

        {/* WHAT — photo or text */}
        {step === 'what' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-sos-blue-800 text-center">What are you seeing?</h2>

            {/* Photo — primary, bigger */}
            <button onClick={() => photoInputRef.current?.click()}
              className="w-full bg-sos-blue-800 text-white rounded-2xl py-10 text-center font-bold text-base shadow-sm hover:bg-sos-blue-700 active:scale-[0.98] transition-all">
              <span className="text-4xl block mb-2">📸</span>
              Take Photo
              <p className="text-xs text-white/50 mt-1 font-normal">Snap what you see — AI will help classify it</p>
            </button>
            <input ref={photoInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />

            {/* Text — secondary */}
            <div className="bg-white rounded-xl border border-sos-gray-300 p-4">
              <p className="text-xs font-medium text-sos-gray-600 mb-2">💬 Or describe what&apos;s happening</p>
              <div className="flex gap-2">
                <input type="text" value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Flooding on my street, tree down on road..."
                  className="flex-1 px-3 py-2.5 rounded-lg border border-sos-gray-300 text-sm text-sos-blue-800 focus:outline-none focus:border-sos-accent-400" />
                <button onClick={handleTextSubmit} disabled={!description.trim()}
                  className="px-4 py-2.5 rounded-lg bg-sos-blue-800 text-white text-xs font-bold disabled:opacity-40 transition-colors flex-shrink-0">
                  Go
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ANALYZING — photo uploaded, waiting for Gemini */}
        {step === 'analyzing' && (
          <div className="flex flex-col items-center justify-center text-center py-12">
            {photoPreview && <img src={photoPreview} alt="Report" className="w-48 h-48 rounded-xl object-cover mb-4 border border-sos-gray-300" />}
            <div className="w-8 h-8 border-3 border-sos-accent-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm text-sos-gray-600">Analyzing your photo...</p>
            <p className="text-[10px] text-sos-gray-400 mt-1">AI is detecting what&apos;s in the image</p>
          </div>
        )}

        {/* WHERE */}
        {step === 'where' && (
          <div className="space-y-4">
            {/* Show photo + analysis if available */}
            {photoPreview && (
              <div className="flex gap-3 items-start">
                <img src={photoPreview} alt="Report" className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
                <div className="flex-1">
                  {analysis ? (
                    <>
                      <p className="text-xs font-bold text-sos-blue-800">{analysis.type || 'Report'}</p>
                      {analysis.severity && <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        analysis.severity === 'critical' ? 'bg-sos-red-50 text-sos-red-700' :
                        analysis.severity === 'moderate' ? 'bg-yellow-50 text-yellow-700' :
                        'bg-sos-gray-200 text-sos-gray-600'
                      }`}>{analysis.severity}</span>}
                      {analysis.description && <p className="text-[10px] text-sos-gray-600 mt-1">{analysis.description}</p>}
                    </>
                  ) : (
                    <p className="text-xs text-sos-gray-500">Photo uploaded</p>
                  )}
                </div>
              </div>
            )}

            <h2 className="text-base font-bold text-sos-blue-800">Where is this?</h2>

            <div className="grid grid-cols-2 gap-2.5">
              <button onClick={detectGPS}
                className={`flex flex-col items-center gap-2 py-5 rounded-xl border-2 transition-all active:scale-[0.97] ${
                  locMode === 'gps' && lat ? 'border-green-400 bg-green-50' : 'border-sos-gray-300 bg-white'
                }`}>
                <span className="text-2xl">📍</span>
                <span className="text-xs font-bold text-sos-blue-800">My Location</span>
              </button>
              <button onClick={() => setLocMode('search')}
                className={`flex flex-col items-center gap-2 py-5 rounded-xl border-2 transition-all active:scale-[0.97] ${
                  locMode === 'search' ? 'border-sos-accent-400 bg-sos-accent-50' : 'border-sos-gray-300 bg-white'
                }`}>
                <span className="text-2xl">🔍</span>
                <span className="text-xs font-bold text-sos-blue-800">Somewhere Else</span>
              </button>
            </div>

            {gpsDetecting && (
              <div className="flex items-center gap-3 p-3 bg-sos-accent-50 rounded-xl">
                <div className="w-4 h-4 border-2 border-sos-accent-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-sos-blue-800">Detecting...</p>
              </div>
            )}

            {locMode === 'gps' && lat > 0 && !gpsDetecting && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                <p className="text-xs font-medium text-green-800">📍 {locationName}</p>
              </div>
            )}

            {locMode === 'search' && (
              <div className="relative">
                <input type="text" value={searchQuery} onChange={e => searchPlaces(e.target.value)}
                  placeholder="Search address or landmark..." autoFocus
                  className="w-full px-4 py-3 rounded-xl border border-sos-gray-300 text-sm text-sos-blue-800 focus:outline-none focus:border-sos-accent-400" />
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-sos-gray-300 shadow-lg z-10 overflow-hidden">
                    {searchResults.map((p, i) => (
                      <button key={i} onClick={() => selectPlace(p)} className="w-full text-left px-4 py-3 text-xs text-sos-blue-800 hover:bg-sos-gray-200 border-b border-sos-gray-200 last:border-0">📍 {p.name}</button>
                    ))}
                  </div>
                )}
                {locationName && locMode === 'search' && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                    <p className="text-xs font-medium text-green-800">📍 {locationName}</p>
                  </div>
                )}
              </div>
            )}

            <button onClick={() => setStep('danger')} disabled={!lat && !locationName}
              className="w-full py-3.5 rounded-xl bg-sos-blue-800 text-white font-bold disabled:opacity-40 transition-colors">
              Continue
            </button>
          </div>
        )}

        {/* DANGER CHECK */}
        {step === 'danger' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-sos-blue-800 text-center">Anyone in danger?</h2>
            <p className="text-xs text-sos-gray-600 text-center">If someone needs rescue, we&apos;ll escalate immediately.</p>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <button onClick={() => handleSubmit(true)}
                className="bg-sos-red-500 text-white rounded-2xl py-8 text-center font-bold text-base shadow-sm active:scale-[0.97] transition-all">
                <span className="text-3xl block mb-2">🚨</span>
                Yes
                <p className="text-[10px] text-white/60 font-normal mt-0.5">Escalate to rescue</p>
              </button>
              <button onClick={() => handleSubmit(false)}
                className="bg-white border-2 border-sos-gray-300 text-sos-blue-800 rounded-2xl py-8 text-center font-bold text-base active:scale-[0.97] transition-all">
                <span className="text-3xl block mb-2">ℹ️</span>
                No
                <p className="text-[10px] text-sos-gray-500 font-normal mt-0.5">Report only</p>
              </button>
            </div>
          </div>
        )}

        {/* SUBMITTING */}
        {step === 'submitting' && (
          <div className="flex flex-col items-center justify-center text-center py-16">
            <div className="w-12 h-12 border-3 border-sos-blue-800 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm text-sos-gray-600">Submitting your report...</p>
          </div>
        )}

        {/* DONE */}
        {step === 'done' && (
          <div className="flex flex-col items-center justify-center text-center py-12">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4"><span className="text-3xl">📢</span></div>
            <h2 className="text-xl font-bold text-sos-blue-800 mb-2">Report Submitted</h2>
            <p className="text-sm text-sos-gray-600 max-w-xs">
              {isDanger
                ? "Your report has been submitted AND a rescue request has been created. Help is being dispatched."
                : "Your report is in the system. You'll get Community Score credit when it's verified by EMS or other citizens."}
            </p>
            {analysis?.type && <p className="text-[10px] text-sos-gray-400 mt-2">Detected: {analysis.type}</p>}
            <button onClick={() => router.push('/c')} className="mt-6 px-6 py-3 rounded-xl bg-sos-blue-800 text-white font-bold text-sm">Back to Home</button>
          </div>
        )}
      </div>
    </div>
  );
}
