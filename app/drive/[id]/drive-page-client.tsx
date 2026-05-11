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

const STATUS_PILL_COLORS: Record<string, string> = {
  accepted: 'bg-blue-500/20 text-blue-300',
  en_route: 'bg-yellow-500/20 text-yellow-300',
  at_pickup: 'bg-orange-500/20 text-orange-300',
  loaded: 'bg-orange-400/20 text-orange-200',
  hooked_up: 'bg-orange-400/20 text-orange-200',
  in_transit: 'bg-purple-500/20 text-purple-300',
  arrived: 'bg-green-400/20 text-green-300',
  delivered: 'bg-green-500/20 text-green-300',
  verified: 'bg-green-600/20 text-green-200',
};

const PHOTO_PROMPTS: Record<string, string> = {
  at_pickup: 'Photo of the RV before hookup',
  hooked_up: 'Photo of the hitch connection',
  loaded: 'Photo showing the load is secure',
  delivered: 'Photo of the signed title and RV at its new location',
  default: 'Take a photo for this stage',
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
    <div className="fixed bottom-0 left-0 right-0 bg-[#1A3850] rounded-t-2xl p-5 z-20">
      <div className="flex items-center gap-2 mb-1">
        <Camera className="w-5 h-5 text-white/70" />
        <p className="text-sm font-semibold text-white">Take a photo</p>
      </div>
      <p className="text-xs text-white/50 mb-4">{prompt}</p>

      {preview ? (
        <div className="mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Preview"
            className="w-full max-h-40 object-cover rounded-xl"
          />
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full py-4 rounded-2xl bg-white/10 text-white text-sm font-medium flex items-center justify-center gap-2 active:opacity-70 transition-opacity mb-4"
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
          className="w-full py-4 rounded-2xl bg-[#EF4E4B] text-white font-bold text-sm active:opacity-80 transition-opacity"
        >
          Continue
        </button>
      ) : null}

      <div className="flex justify-center mt-3">
        <button onClick={onSkip} className="text-xs text-white/30 underline">
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

  const pillClass =
    STATUS_PILL_COLORS[currentStatus] ?? 'bg-white/10 text-white/60';

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

      {/* Main content */}
      <div className="px-5 pt-20 pb-24">
        {/* No driver banner */}
        {!transport.driver_person_id && (
          <div className="mb-4 rounded-xl border border-[#EF4E4B]/40 bg-[#EF4E4B]/10 px-4 py-3 text-center">
            <p className="text-sm font-medium text-white">
              Tap the SOS button to get started
            </p>
            <p className="mt-0.5 text-xs text-white/50">
              The agent will guide you through onboarding
            </p>
          </div>
        )}

        {/* Transport card */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          {/* Title + status */}
          <div className="flex items-start justify-between gap-3">
            <p className="text-lg font-semibold text-white leading-tight">
              {resourceDescription}
            </p>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${pillClass}`}
            >
              {currentStatus.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="border-t border-white/10 my-4" />

          {/* Pickup */}
          <div className="mb-4">
            <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">
              Pickup
            </p>
            <p className="text-sm text-white mb-2">
              {transport.origin_text || '—'}
            </p>
            {transport.origin_text && (
              <button
                onClick={() =>
                  window.open(
                    'https://maps.google.com/?q=' +
                      encodeURIComponent(transport.origin_text!),
                    '_blank'
                  )
                }
                className="text-xs bg-white/10 px-3 py-1.5 rounded-lg text-white/80 hover:bg-white/20 transition-colors"
              >
                Navigate
              </button>
            )}
          </div>

          {/* Dropoff */}
          <div className="mb-4">
            <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">
              Dropoff
            </p>
            <p className="text-sm text-white mb-2">
              {displayedDestination || '—'}
            </p>
            {destination && (
              <button
                onClick={() =>
                  window.open(
                    'https://maps.google.com/?q=' +
                      encodeURIComponent(destination),
                    '_blank'
                  )
                }
                className="text-xs bg-white/10 px-3 py-1.5 rounded-lg text-white/80 hover:bg-white/20 transition-colors"
              >
                Navigate
              </button>
            )}
          </div>

          {/* Distance */}
          {transport.distance_miles != null ? (
            <p className="text-xs text-white/30 mb-4">
              {transport.distance_miles} miles
            </p>
          ) : transport.origin_text && destination ? (
            <p className="text-xs text-white/30 mb-4">
              Estimated distance will be calculated
            </p>
          ) : null}

          {/* Driver notes */}
          {notes && (
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">
                Notes
              </p>
              <p className="text-sm text-white/70">{notes}</p>
            </div>
          )}
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

      {/* CTA button */}
      {!photoPrompt && (
        <div className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-4 bg-gradient-to-t from-[#0F1E2B] via-[#0F1E2B]/95 to-transparent">
          {/* Progress dots */}
          <div className="flex flex-col items-center gap-1 mb-4">
            <div className="flex gap-1">
              {pipeline.map((stage, i) => {
                const isCompleted = i < currentIndex;
                const isCurrent = i === currentIndex;
                return (
                  <span
                    key={stage}
                    className={
                      'w-2 h-2 rounded-full ' +
                      (isCompleted
                        ? 'bg-green-400'
                        : isCurrent
                        ? 'bg-white animate-pulse'
                        : 'bg-white/20')
                    }
                  />
                );
              })}
            </div>
            <p className="text-xs text-white/50">{currentStatus.replace(/_/g, ' ')}</p>
            {gpsEnabled && (
              <div className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${gps.error ? 'bg-yellow-400' : 'bg-green-400'}`} />
                <span className={`text-[10px] ${gps.error ? 'text-yellow-400' : 'text-green-400'}`}>
                  {gps.error ? 'Location unavailable' : 'Location sharing active'}
                </span>
              </div>
            )}
          </div>

          {atEnd ? (
            <button
              disabled
              className="w-full py-4 rounded-2xl text-white font-bold text-sm bg-green-600/60 cursor-default"
            >
              Delivery Complete ✓
            </button>
          ) : nextStatus ? (
            <button
              onClick={handleCTAPress}
              disabled={updating}
              className={
                'w-full py-4 rounded-2xl text-white font-bold text-sm transition-opacity active:opacity-80 ' +
                (updating ? 'opacity-50' : '')
              }
              style={{ backgroundColor: brandColor }}
            >
              {updating ? 'Updating...' : (STATUS_LABELS[nextStatus] ?? nextStatus.replace(/_/g, ' '))}
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
