'use client';

import { useState, useRef, useEffect } from 'react';
import { Camera } from 'lucide-react';
import { CitizenHeader } from '@/components/citizen-header';
import { SOSBottomSheet } from '@/components/sos-bottom-sheet';

interface PartnerConfig {
  db_url: string;
  anon_key: string;
  api_key: string;
}

interface Transport {
  id: string;
  match_id?: string;
  resource_id?: string;
  request_id?: string;
  driver_person_id?: string | null;
  status: string;
  origin_text?: string;
  destination_text?: string;
  coordinator_notes?: string;
  driver_name?: string;
  distance_miles?: number | null;
  current_lat?: number | null;
  current_lng?: number | null;
}

interface TransportConfig {
  status_pipeline?: string[];
  require_photos_at?: string[];
  driver_onboarding?: Record<string, unknown>;
  branding?: { color?: string; name?: string };
}

interface DrivePageClientProps {
  transport: Transport;
  orgName: string;
  orgSlug: string;
  partnerConfig: PartnerConfig;
  transportConfig: TransportConfig;
  resourceDescription: string;
}

const DEFAULT_PIPELINE = [
  'accepted',
  'en_route',
  'at_pickup',
  'loaded',
  'in_transit',
  'delivered',
  'verified',
];

const STATUS_LABELS: Record<string, string> = {
  accepted: 'Accept Delivery',
  en_route: 'On My Way',
  at_pickup: 'At Pickup Location',
  loaded: 'Loaded Up',
  hooked_up: 'Hooked Up',
  in_transit: 'Driving',
  arrived: 'Arrived',
  delivered: 'Mark as Delivered',
  verified: 'Complete',
};

const STATUS_PILL_COLORS: Record<string, { bg: string; text: string }> = {
  created:    { bg: 'rgba(255,255,255,0.08)',  text: 'rgba(255,255,255,0.5)' },
  accepted:   { bg: 'rgba(59,130,246,0.18)',   text: '#93C5FD' },
  en_route:   { bg: 'rgba(251,146,60,0.18)',   text: '#FCA05E' },
  at_pickup:  { bg: 'rgba(251,146,60,0.18)',   text: '#FCA05E' },
  loaded:     { bg: 'rgba(251,146,60,0.14)',   text: '#FDBA74' },
  hooked_up:  { bg: 'rgba(251,146,60,0.14)',   text: '#FDBA74' },
  in_transit: { bg: 'rgba(168,85,247,0.18)',   text: '#C084FC' },
  arrived:    { bg: 'rgba(34,197,94,0.18)',    text: '#86EFAC' },
  delivered:  { bg: 'rgba(34,197,94,0.18)',    text: '#86EFAC' },
  verified:   { bg: 'rgba(34,197,94,0.14)',    text: '#6EE7B7' },
};

const PHOTO_PROMPTS: Record<string, string> = {
  at_pickup: 'Photo of the RV before hookup',
  hooked_up: 'Photo of the hitch connection',
  loaded: 'Photo showing the load is secure',
  delivered: 'Photo of the signed title and RV at its new location',
  default: 'Take a photo for this stage',
};

// Pipeline step display labels (short)
const STEP_SHORT: Record<string, string> = {
  accepted:   'Accept',
  en_route:   'Depart',
  at_pickup:  'Pickup',
  loaded:     'Loaded',
  hooked_up:  'Hooked',
  in_transit: 'Drive',
  arrived:    'Arrive',
  delivered:  'Deliver',
  verified:   'Done',
};

function cityOnly(address: string): string {
  const parts = address.split(',').map((p) => p.trim());
  if (parts.length <= 2) return address;
  return parts.slice(-2).join(', ');
}

function PhotoCapture({
  stage,
  onComplete,
  onSkip,
}: {
  stage: string;
  onComplete: (url: string) => void;
  onSkip: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const prompt = PHOTO_PROMPTS[stage] ?? PHOTO_PROMPTS.default;

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  function handleContinue() {
    // Placeholder URL — full Supabase Storage upload wired when bucket is ready
    onComplete(preview ?? 'placeholder://photo');
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 rounded-t-3xl p-6"
      style={{
        background: 'rgba(26, 56, 80, 0.97)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}>
      <div className="flex items-center gap-2 mb-1">
        <Camera className="w-5 h-5 text-white/70" />
        <p className="text-sm font-semibold text-white">Take a photo</p>
      </div>
      <p className="text-xs text-white/40 mb-5">{prompt}</p>

      {preview ? (
        <div className="mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Preview"
            className="w-full max-h-44 object-cover rounded-2xl"
          />
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full py-4 rounded-2xl bg-white/8 text-white text-sm font-medium flex items-center justify-center gap-2 active:opacity-70 transition-opacity mb-4 border border-white/10"
        >
          <Camera className="w-5 h-5" />
          Open Camera
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />

      {preview ? (
        <button
          onClick={handleContinue}
          className="w-full py-4 rounded-[20px] text-white font-bold text-sm active:scale-[0.98] transition-transform"
          style={{
            background: 'linear-gradient(135deg, #EF4E4B, #d43a37)',
            boxShadow: '0 8px 32px rgba(239,78,75,0.3)',
          }}
        >
          Continue
        </button>
      ) : null}

      <div className="flex justify-center mt-4">
        <button onClick={onSkip} className="text-xs text-white/25 underline">
          Skip
        </button>
      </div>
    </div>
  );
}

const GPS_ACTIVE_STATUSES = ['en_route', 'in_transit', 'arrived'];

function useGPSTracker(transportId: string, partnerConfig: PartnerConfig, enabled: boolean) {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState(false);
  const watchId = useRef<number | null>(null);
  const lastSent = useRef<number>(0);
  const offlineQueue = useRef<Array<{ lat: number; lng: number }>>([]);

  useEffect(() => {
    if (!enabled) {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
      return;
    }

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPosition({ lat, lng });
        setError(false);

        const now = Date.now();
        if (now - lastSent.current < 30_000) return;
        lastSent.current = now;

        offlineQueue.current.push({ lat, lng });
        const batch = offlineQueue.current.splice(0);
        const latest = batch[batch.length - 1];
        fetch(partnerConfig.db_url + '/functions/v1/partner-update', {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + partnerConfig.anon_key,
            'x-partner-key': partnerConfig.api_key,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'update_transport_location',
            transport_id: transportId,
            lat: latest.lat,
            lng: latest.lng,
          }),
        }).catch(() => {
          offlineQueue.current.unshift(...batch);
        });
      },
      (err) => {
        console.error('GPS error:', err);
        setError(true);
      },
      { enableHighAccuracy: true, maximumAge: 10_000 },
    );

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    };
  }, [enabled, transportId, partnerConfig]);

  return { lat: position?.lat ?? null, lng: position?.lng ?? null, tracking: enabled && !error, error };
}

export default function DrivePageClient({
  transport,
  orgName,
  orgSlug,
  partnerConfig,
  transportConfig,
  resourceDescription,
}: DrivePageClientProps) {
  const [agentOpen, setAgentOpen] = useState(!transport.driver_person_id);
  const [currentStatus, setCurrentStatus] = useState(transport.status);
  const [updating, setUpdating] = useState(false);
  const [photoPrompt, setPhotoPrompt] = useState<string | null>(null);

  const gpsEnabled = GPS_ACTIVE_STATUSES.includes(currentStatus);
  const gps = useGPSTracker(transport.id, partnerConfig, gpsEnabled);

  const pipeline = transportConfig.status_pipeline ?? DEFAULT_PIPELINE;
  const requirePhotosAt = transportConfig.require_photos_at ?? [];
  const brandColor = transportConfig.branding?.color ?? '#EF4E4B';

  const currentIndex = pipeline.indexOf(currentStatus);
  const nextStatus = currentIndex >= 0 && currentIndex < pipeline.length - 1
    ? pipeline[currentIndex + 1]
    : null;
  const atEnd = currentIndex >= pipeline.length - 1;

  const beforeAtPickup =
    currentIndex < 0 || currentIndex < pipeline.indexOf('at_pickup');

  const destination = transport.destination_text ?? '';
  const displayedDestination =
    beforeAtPickup && destination ? cityOnly(destination) : destination;

  const pillStyle = STATUS_PILL_COLORS[currentStatus] ?? STATUS_PILL_COLORS.created;

  async function doAdvanceStatus(targetStatus: string) {
    setUpdating(true);
    try {
      const res = await fetch(partnerConfig.db_url + '/functions/v1/partner-update', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + partnerConfig.anon_key,
          'x-partner-key': partnerConfig.api_key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update_transport_status',
          transport_id: transport.id,
          status: targetStatus,
        }),
      });
      const data = await res.json();
      if (!data.error) {
        setCurrentStatus(targetStatus);
      } else {
        console.error('Status update failed:', data.error);
      }
    } catch (err) {
      console.error('Status update error:', err);
    }
    setUpdating(false);
  }

  async function recordPhotoEvent(stage: string, photoUrl: string) {
    try {
      await fetch(partnerConfig.db_url + '/functions/v1/partner-update', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + partnerConfig.anon_key,
          'x-partner-key': partnerConfig.api_key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delivery_event',
          transport_id: transport.id,
          event_type: 'photo',
          metadata: { stage, url: photoUrl },
        }),
      });
    } catch (err) {
      console.error('Photo event error:', err);
    }
  }

  function handleCTAPress() {
    if (!nextStatus || updating) return;
    if (requirePhotosAt.includes(nextStatus)) {
      setPhotoPrompt(nextStatus);
    } else {
      doAdvanceStatus(nextStatus);
    }
  }

  async function handlePhotoComplete(url: string) {
    const stage = photoPrompt!;
    setPhotoPrompt(null);
    await recordPhotoEvent(stage, url);
    await doAdvanceStatus(stage);
  }

  function handlePhotoSkip() {
    const stage = photoPrompt!;
    setPhotoPrompt(null);
    doAdvanceStatus(stage);
  }

  const notes = transport.coordinator_notes;

  return (
    <div className="relative w-full bg-[#0F1E2B]" style={{ minHeight: '100dvh' }}>
      <CitizenHeader
        onAgentTap={() => setAgentOpen(true)}
        locationName={`${orgName} Delivery`}
        status="safe"
        agentOpen={agentOpen}
      />

      {/* Scrollable main content */}
      <div
        className="overflow-y-auto"
        style={{
          paddingTop: '72px',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 180px)',
        }}
      >
        {/* No-driver animated prompt */}
        {!transport.driver_person_id && (
          <div className="mx-4 mb-6 rounded-2xl px-5 py-4 text-center"
            style={{
              background: 'rgba(239,78,75,0.07)',
              border: '1px solid rgba(239,78,75,0.2)',
            }}>
            {/* Pulsing logomark */}
            <div className="flex justify-center mb-3">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-[#EF4E4B]/20 animate-ping" />
                <div className="relative w-10 h-10 rounded-full flex items-center justify-center"
                  style={{
                    background: 'rgba(15,30,43,0.95)',
                    boxShadow: '0 0 16px rgba(239,78,75,0.35)',
                    border: '1.5px solid rgba(239,78,75,0.35)',
                  }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logomark-red.svg" alt="SOS" className="w-5 h-5" />
                </div>
              </div>
            </div>
            <p className="text-sm text-white/60 leading-snug">
              Tap the SOS button to get started as a volunteer driver
            </p>
            {/* Arrow pointing down */}
            <p className="mt-2 text-lg text-white/20 select-none">↓</p>
          </div>
        )}

        {/* HERO CARD */}
        <div className="relative mx-4 mt-7">
          {/* Floating logomark above card */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-7 z-10">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{
                background: 'rgba(15,30,43,0.95)',
                boxShadow: '0 0 24px rgba(255,107,0,0.35)',
                border: '2px solid rgba(255,107,0,0.3)',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logomark-red.svg" alt="SOS" className="w-8 h-8" />
            </div>
          </div>

          {/* Card */}
          <div
            style={{
              background: 'rgba(26, 56, 80, 0.85)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '24px',
              boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
              padding: '24px',
            }}
          >
            {/* Resource name */}
            <p className="text-xl font-semibold text-white text-center mt-8 leading-tight">
              {resourceDescription.toUpperCase()}
            </p>

            {/* Status pill */}
            <div className="flex justify-center mt-3">
              <span
                className="text-[11px] uppercase tracking-widest font-bold px-3 py-1 rounded-full"
                style={{ background: pillStyle.bg, color: pillStyle.text }}
              >
                {currentStatus.replace(/_/g, ' ')}
              </span>
            </div>

            {/* Divider */}
            <div className="border-t border-white/5 my-5" />

            {/* Route section */}
            <div className="flex flex-col gap-0">
              {/* From row */}
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center mt-1 shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400 shrink-0" />
                  <div className="w-px h-6 bg-white/10 mt-1" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-widest text-white/30 mb-0.5">From</p>
                  <p className="text-sm text-white leading-snug truncate">
                    {transport.origin_text || '—'}
                  </p>
                </div>
                {transport.origin_text && (
                  <button
                    onClick={() =>
                      window.open(
                        'https://maps.google.com/?q=' + encodeURIComponent(transport.origin_text!),
                        '_blank',
                      )
                    }
                    className="text-[10px] text-white/30 hover:text-white transition-colors shrink-0 mt-4"
                  >
                    Navigate ›
                  </button>
                )}
              </div>

              {/* To row */}
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#EF4E4B] shrink-0 mt-1" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-widest text-white/30 mb-0.5">To</p>
                  <p className="text-sm text-white leading-snug truncate">
                    {displayedDestination || '—'}
                  </p>
                </div>
                {destination && (
                  <button
                    onClick={() =>
                      window.open(
                        'https://maps.google.com/?q=' + encodeURIComponent(destination),
                        '_blank',
                      )
                    }
                    className="text-[10px] text-white/30 hover:text-white transition-colors shrink-0 mt-4"
                  >
                    Navigate ›
                  </button>
                )}
              </div>
            </div>

            {/* Distance */}
            {transport.distance_miles != null ? (
              <p className="text-[11px] text-white/30 text-center mt-4">
                {transport.distance_miles.toLocaleString()} miles
              </p>
            ) : transport.origin_text && destination ? (
              <p className="text-[11px] text-white/30 text-center mt-4">
                Distance calculating…
              </p>
            ) : null}

            {/* Notes */}
            {notes && (
              <div
                className="mt-5 rounded-xl p-4"
                style={{ background: 'rgba(255,255,255,0.03)' }}
              >
                <p className="text-[10px] uppercase tracking-widest text-white/25 mb-1.5">Notes</p>
                <p className="text-xs text-white/40 italic leading-relaxed">{notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* PROGRESS SECTION */}
        <div className="mx-4 mt-6">
          {/* GPS badge */}
          {gpsEnabled && (
            <div className="flex justify-center mb-4">
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                style={{
                  background: gps.error ? 'rgba(251,191,36,0.08)' : 'rgba(34,197,94,0.08)',
                  border: gps.error ? '1px solid rgba(251,191,36,0.2)' : '1px solid rgba(34,197,94,0.2)',
                }}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${gps.error ? 'bg-yellow-400' : 'bg-green-400 animate-pulse'}`}
                />
                <span className={`text-[10px] font-medium ${gps.error ? 'text-yellow-400' : 'text-green-400'}`}>
                  {gps.error ? 'Location unavailable' : 'Location sharing active'}
                </span>
              </div>
            </div>
          )}

          {/* Pipeline dots rail */}
          <div className="flex items-start justify-between px-1">
            {pipeline.map((stage, i) => {
              const isCompleted = i < currentIndex;
              const isCurrent = i === currentIndex;
              const isFuture = i > currentIndex;
              return (
                <div key={stage} className="flex flex-col items-center gap-1.5 flex-1">
                  {/* Connecting line left */}
                  <div className="flex items-center w-full relative">
                    {/* Left connector */}
                    {i > 0 && (
                      <div
                        className="absolute left-0 right-1/2 h-px"
                        style={{
                          background: i <= currentIndex
                            ? 'rgba(34,197,94,0.35)'
                            : 'rgba(255,255,255,0.08)',
                        }}
                      />
                    )}
                    {/* Right connector */}
                    {i < pipeline.length - 1 && (
                      <div
                        className="absolute left-1/2 right-0 h-px"
                        style={{
                          background: i < currentIndex
                            ? 'rgba(34,197,94,0.35)'
                            : 'rgba(255,255,255,0.08)',
                        }}
                      />
                    )}

                    {/* Dot */}
                    <div className="relative z-10 mx-auto">
                      {isCompleted ? (
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center"
                          style={{ background: 'rgba(34,197,94,0.2)', border: '1.5px solid rgba(34,197,94,0.5)' }}
                        >
                          <span className="text-[11px] text-green-400 font-bold">✓</span>
                        </div>
                      ) : isCurrent ? (
                        <div className="relative">
                          <div className="absolute inset-0 rounded-full bg-white/20 animate-ping" />
                          <div
                            className="relative w-8 h-8 rounded-full bg-white"
                            style={{ boxShadow: '0 0 12px rgba(255,255,255,0.4)' }}
                          />
                        </div>
                      ) : (
                        <div
                          className="w-8 h-8 rounded-full"
                          style={{ border: '1.5px solid rgba(255,255,255,0.1)' }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Step label */}
                  <p
                    className="text-[9px] text-center leading-none"
                    style={{
                      color: isCompleted
                        ? 'rgba(134,239,172,0.7)'
                        : isCurrent
                        ? 'rgba(255,255,255,0.8)'
                        : 'rgba(255,255,255,0.18)',
                    }}
                  >
                    {STEP_SHORT[stage] ?? stage}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Photo capture overlay */}
      {photoPrompt && (
        <PhotoCapture
          stage={photoPrompt}
          onComplete={handlePhotoComplete}
          onSkip={handlePhotoSkip}
        />
      )}

      {/* CTA button — fixed above safe area */}
      {!photoPrompt && (
        <div
          className="fixed bottom-0 left-0 right-0 px-5 pt-4"
          style={{
            paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)',
            background: 'linear-gradient(to top, rgba(15,30,43,1) 60%, transparent)',
          }}
        >
          {atEnd ? (
            <button
              disabled
              className="w-full py-4 text-white font-bold text-sm uppercase tracking-wider cursor-default"
              style={{
                borderRadius: '20px',
                background: 'rgba(34,197,94,0.25)',
                border: '1px solid rgba(34,197,94,0.3)',
              }}
            >
              Delivery Complete ✓
            </button>
          ) : nextStatus ? (
            <button
              onClick={handleCTAPress}
              disabled={updating}
              className="w-full py-4 text-white font-bold text-sm uppercase tracking-wider active:scale-[0.98] transition-transform"
              style={{
                borderRadius: '20px',
                background: updating
                  ? 'rgba(239,78,75,0.4)'
                  : `linear-gradient(135deg, ${brandColor}, ${brandColor}cc)`,
                boxShadow: updating ? 'none' : '0 8px 32px rgba(239,78,75,0.3)',
                opacity: updating ? 0.6 : 1,
              }}
            >
              {updating ? 'Updating…' : (STATUS_LABELS[nextStatus] ?? nextStatus.replace(/_/g, ' '))}
            </button>
          ) : null}
        </div>
      )}

      <SOSBottomSheet
        open={agentOpen}
        onClose={() => setAgentOpen(false)}
        context="partner"
        partner={orgSlug}
        transportId={transport.id}
      />
    </div>
  );
}
